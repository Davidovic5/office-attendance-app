const jwt = require('jsonwebtoken');
const { Employee, Title, Tenant } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'office-attendance-super-secret-key-wadi-degla-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Sign JWT token for authenticated employee
 */
function signUserToken(user, tenantId = 'wadi-degla') {
  const resolvedTenantId = tenantId || user.tenantId || 'wadi-degla';
  const isSuper = Boolean(
    user.phone === '01010046078' ||
    user.isSuperAdmin ||
    user.titleCode === 'he_who_remains'
  );

  return jwt.sign(
    {
      userId: String(user.id || user._id),
      phone: user.phone,
      tenantId: resolvedTenantId,
      titleCode: user.titleCode,
      isSuperAdmin: isSuper,
      boundDeviceId: user.boundDeviceId || null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware: Sanitize client tenantId inputs & authenticate JWT
 * STRICT SECURITY RULE: Never accept tenantId from req.body, req.query, or req.params.
 */
async function authenticateUser(req, res, next) {
  // Strip any client-supplied tenantId to prevent tenant spoofing
  if (req.body && 'tenantId' in req.body) delete req.body.tenantId;
  if (req.query && 'tenantId' in req.query) delete req.query.tenantId;
  if (req.params && 'tenantId' in req.params) delete req.params.tenantId;

  req.tenantId = 'wadi-degla';
  req.user = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.tenantId = decoded.tenantId || 'wadi-degla';
      return next();
    } catch (err) {
      // Invalid/expired token, fallback below to session headers if available
    }
  }

  // Seamless Backward Compatibility: Support existing client sessions with x-user-id / x-user-phone
  const headerUserId = req.headers['x-user-id'];
  const headerUserPhone = req.headers['x-user-phone'];
  if (headerUserId || headerUserPhone) {
    try {
      const emp = await Employee.findOne({
        $or: [
          ...(headerUserId ? [{ id: headerUserId }] : []),
          ...(headerUserPhone ? [{ phone: headerUserPhone }] : [])
        ]
      }).lean();

      if (emp) {
        const isSuper = Boolean(
          emp.phone === '01010046078' ||
          emp.isSuperAdmin ||
          emp.titleCode === 'he_who_remains'
        );
        req.user = {
          userId: String(emp.id),
          phone: emp.phone,
          tenantId: emp.tenantId || 'wadi-degla',
          titleCode: emp.titleCode,
          isSuperAdmin: isSuper,
          boundDeviceId: emp.boundDeviceId || null
        };
        req.tenantId = emp.tenantId || 'wadi-degla';
        return next();
      }
    } catch (dbErr) {
      // Ignore DB error and continue
    }
  }

  next();
}

/**
 * Middleware: Require strict authentication
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "يجب تسجيل الدخول للوصول إلى هذا الرابط."
    });
  }
  next();
}

/**
 * Middleware: Enforce Device Lock (Anti-Cheat)
 * Returns 403 on device ID mismatch
 */
async function verifyDeviceLock(req, res, next) {
  if (!req.user) return next();

  // Super admins are exempt from single device lock
  if (req.user.isSuperAdmin) return next();

  try {
    const tenantId = req.tenantId || 'wadi-degla';
    const emp = await Employee.findOne({ id: req.user.userId, tenantId }).lean();
    if (!emp) return next();

    // If employee has a bound device, verify incoming device header
    if (emp.boundDeviceId) {
      const incomingDeviceId = req.headers['x-device-id'] || req.body?.deviceId;
      if (!incomingDeviceId || String(incomingDeviceId).trim() !== String(emp.boundDeviceId).trim()) {
        return res.status(403).json({
          success: false,
          error: "عذراً، حسابك مسجل على جهاز آخر. لا يمكن استخدام التطبيق أو إثبات الحضور إلا من جهازك المعتمد."
        });
      }
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Middleware: Enforce 12-Toggle RBAC based on database permissions
 * Checks whether user's role has permission flag enabled in MongoDB
 */
function requirePermission(permKeys) {
  const keys = Array.isArray(permKeys) ? permKeys : [permKeys];
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "يجب تسجيل الدخول للوصول إلى هذا الرابط."
      });
    }

    // Super Admin / He Who Remains bypasses all permission restrictions
    if (req.user.isSuperAdmin || req.user.phone === '01010046078' || req.user.titleCode === 'he_who_remains') {
      return next();
    }

    try {
      const tenantId = req.tenantId || 'wadi-degla';
      const title = await Title.findOne({ code: req.user.titleCode, tenantId }).lean();
      
      const hasPermission = keys.some(k => title && title.permissions && title.permissions[k] === true);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `عذراً، ليس لديك صلاحية الوصول لتنفيذ هذا الإجراء (${keys.join(' أو ')}).`
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };
}

/**
 * Middleware: Prevent Self-Lockout Guard
 * Block admin/Executive Director from disabling manage_titles_permissions for their own role
 */
function preventSelfLockout(req, res, next) {
  if (!req.user) return next();

  const { code } = req.params;
  const newPermissions = req.body?.permissions;

  // If user is editing their own role and trying to revoke permissions management
  if (req.user.titleCode === code && newPermissions && newPermissions.manage_titles_permissions === false) {
    return res.status(400).json({
      success: false,
      error: "لا يمكنك إلغاء صلاحية إدارة صلاحيات الأدوار عن المسمى الوظيفي الخاص بك لتجنب إغلاق النظام على نفسك."
    });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  signUserToken,
  authenticateUser,
  requireAuth,
  verifyDeviceLock,
  requirePermission,
  preventSelfLockout
};
