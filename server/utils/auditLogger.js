const { AuditLog } = require('../models');

/**
 * Non-blocking audit logger helper
 * Writes operational mutation events to the audit_logs collection.
 */
function logAudit({
  tenantId = 'wadi-degla',
  actorId = '',
  actorName = '',
  action,
  targetId = '',
  targetType = '',
  oldValue = null,
  newValue = null,
  req = null
}) {
  try {
    const ipAddress = req
      ? String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '')
      : '';
    const userAgent = req ? String(req.headers['user-agent'] || '') : '';

    const resolvedActorId = actorId || req?.user?.userId || req?.user?.id || '';
    const resolvedActorName = actorName || req?.user?.name || '';
    const resolvedTenantId = tenantId || req?.tenantId || req?.user?.tenantId || 'wadi-degla';

    // Non-blocking fire-and-forget
    AuditLog.create({
      tenantId: resolvedTenantId,
      actorId: String(resolvedActorId),
      actorName: String(resolvedActorName),
      action: String(action),
      targetId: String(targetId),
      targetType: String(targetType),
      oldValue: oldValue != null ? oldValue : null,
      newValue: newValue != null ? newValue : null,
      ipAddress,
      userAgent,
      timestamp: new Date()
    }).catch(err => {
      console.warn("Non-blocking audit log creation warning:", err.message);
    });
  } catch (err) {
    console.warn("Audit logger dispatch warning:", err.message);
  }
}

module.exports = {
  logAudit
};
