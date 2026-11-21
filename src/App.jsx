import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  Settings, 
  LogOut, 
  MapPin, 
  Download,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Camera,
  Image as ImageIcon,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Calendar,
  BarChart3,
  Trash2,
  Sun,
  Moon,
  Check,
  ScanFace,
  Fingerprint,
  Bell
} from 'lucide-react';
import { api } from './api';
import { AuthScreen } from './components/AuthScreen';
import { CheckInTab } from './components/CheckInTab';
import { OfficePresenceTab } from './components/OfficePresenceTab';
import { LeavesPermissionsTab } from './components/LeavesPermissionsTab';
import { RolesPermissionsTab } from './components/RolesPermissionsTab';
import { OfficeSettingsTab } from './components/OfficeSettingsTab';
import { MonthlyReportTab } from './components/MonthlyReportTab';
import { compressImage } from './utils/imageCompressor';
import { checkIsInstalledApp } from './utils/appEnvironment';
import { formatArabicDateWithDay } from './utils/dateHelpers';
import { registerPushNotifications } from './utils/pushNotifications';
import { getInitialTheme, applyTheme } from './utils/themeHelper';
import { checkBiometricSupport, registerBiometrics } from './utils/biometricHelper';

const DAYS_OF_WEEK = [
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' },
  { id: 'friday', name: 'الجمعة' }
];

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5B800'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [titles, setTitles] = useState(() => {
    try {
      const cached = localStorage.getItem('office_cached_titles');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [branches, setBranches] = useState(() => {
    try {
      const cached = localStorage.getItem('office_cached_branches');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('office_auth_user');
      if (!saved) return null;
      let user = JSON.parse(saved);
      // Auto-migrate David Jean to HE WHO REMAINS immediately
      if (user && (user.phone === '01010046078' || user.id === 'emp_1792955351678')) {
        user = {
          ...user,
          titleCode: 'he_who_remains',
          jobTitle: 'HE WHO REMAINS',
          isSuperAdmin: true,
          isGhost: true
        };
        localStorage.setItem('office_auth_user', JSON.stringify(user));
      }
      return user;
    } catch (e) {
      return null;
    }
  });
  const [officeSettings, setOfficeSettings] = useState({
    companyName: 'أندية وادي دجلة - Wadi Degla Clubs',
    shiftHours: 8,
    graceMinutes: 15,
    workStartTime: '09:00',
    workEndTime: '17:00'
  });
  const [activeTab, setActiveTab] = useState('check_in');
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled] = useState(() => checkIsInstalledApp());

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState(() => getInitialTheme());

  // Biometrics (Face ID & Touch ID) state
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [biometricRegisterLoading, setBiometricRegisterLoading] = useState(false);

  // In-App Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushSuccessMsg, setPushSuccessMsg] = useState('');
  const [pushErrorMsg, setPushErrorMsg] = useState('');
  const [isPushGranted, setIsPushGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // Track Notification permission changes dynamically
  useEffect(() => {
    const updatePushStatus = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setIsPushGranted(Notification.permission === 'granted');
      }
    };
    updatePushStatus();
    window.addEventListener('focus', updatePushStatus);

    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.onchange = () => {
          updatePushStatus();
        };
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('focus', updatePushStatus);
    };
  }, []);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await api.getNotifications(currentUser.id);
      if (res && res.success) {
        setNotifications(res.notifications || []);
        setUnreadNotificationsCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Error fetching notifications:", e);
    }
  };

  const handleMarkNotificationsAsRead = async (ids = null) => {
    if (!currentUser?.id) return;
    try {
      const res = await api.markNotificationsAsRead(currentUser.id, ids);
      if (res && res.success) {
        setNotifications(res.notifications || []);
        setUnreadNotificationsCount(res.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Error marking notifications read:", e);
    }
  };

  const handleEnablePush = async () => {
    if (!currentUser?.id) return;
    setPushEnabling(true);
    setPushErrorMsg('');
    setPushSuccessMsg('');
    try {
      const res = await registerPushNotifications(currentUser.id);
      if (res && res.success) {
        setPushSuccessMsg("تم تفعيل إشعارات الهاتف بنجاح 🔔");
        setIsPushGranted(true);
        setTimeout(() => setPushSuccessMsg(''), 4000);
      } else {
        const errorText = res?.reason === 'user_gesture_required' 
          ? 'يرجى الضغط مجدداً لتأكيد السماح بالإشعارات من المتصفح.'
          : (res?.error || res?.reason || 'تعذر تفعيل إشعارات الهاتف. تأكد من السماح بالإشعارات في إعدادات جهازك.');
        setPushErrorMsg(errorText);
        setTimeout(() => setPushErrorMsg(''), 5000);
      }
    } catch (err) {
      setPushErrorMsg(err?.message || 'حدث خطأ أثناء طلب إذن الإشعارات');
      setTimeout(() => setPushErrorMsg(''), 5000);
    } finally {
      setPushEnabling(false);
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setIsPushGranted(Notification.permission === 'granted');
      }
    }
  };

  // Poll in-app notifications
  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 25000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    checkBiometricSupport().then(setBiometricsAvailable).catch(() => setBiometricsAvailable(false));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // URL tab routing for push notifications & deep linking
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam && ['check_in', 'presence', 'leaves', 'reports', 'roles', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {}
  }, []);

  // Register push notifications when user is authenticated
  useEffect(() => {
    if (currentUser?.id) {
      registerPushNotifications(currentUser.id).catch(() => {});
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleTriggerNativeInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        setShowInstallModal(false);
      }
    }
  };

  // Profile Settings Form State
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileOffDays, setProfileOffDays] = useState([]);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load initial system data (lightning fast, non-blocking)
  const loadInitialData = async (isBackground = false) => {
    try {
      const isUserAuthed = Boolean(currentUser || localStorage.getItem('office_auth_user'));
      
      // Fetch metadata in parallel; fetch employees only when authenticated
      const promises = [
        api.getSettings(),
        api.getTitles(),
        api.getBranches()
      ];
      if (isUserAuthed) {
        promises.push(api.getEmployees());
      }

      const results = await Promise.all(promises);
      const settingsRes = results[0];
      const titlesRes = results[1];
      const branchesRes = results[2];
      const employeesRes = isUserAuthed ? results[3] : null;

      if (settingsRes && settingsRes.success) {
        setOfficeSettings(settingsRes.settings);
      }
      if (titlesRes && titlesRes.success && titlesRes.titles) {
        setTitles(titlesRes.titles);
        try {
          localStorage.setItem('office_cached_titles', JSON.stringify(titlesRes.titles));
        } catch (e) {}

        // Sync currentUser permissions from fresh titles
        const saved = localStorage.getItem('office_auth_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const myTitle = titlesRes.titles.find(t => t.code === parsed.titleCode);
            if (myTitle) {
              parsed.permissions = myTitle.permissions;
              parsed.titleDetails = myTitle;
              localStorage.setItem('office_auth_user', JSON.stringify(parsed));
              setCurrentUser(prev => prev ? { ...prev, permissions: myTitle.permissions, titleDetails: myTitle } : parsed);
            }
          } catch (e) {}
        }
      }
      if (branchesRes && branchesRes.success && branchesRes.branches) {
        setBranches(branchesRes.branches);
        try {
          localStorage.setItem('office_cached_branches', JSON.stringify(branchesRes.branches));
        } catch (e) {}
      }
      if (employeesRes && employeesRes.success && employeesRes.employees && employeesRes.employees.length > 0) {
        setEmployees(employeesRes.employees);

        const saved = localStorage.getItem('office_auth_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            let fresh = employeesRes.employees.find(e => e.id === parsed.id || e.phone === parsed.phone);
            
            // If user is Ghost Super Admin (David Jean), fetch their fresh record directly by ID
            if (!fresh && parsed.id) {
              const directRes = await api.getEmployeeById(parsed.id);
              if (directRes && directRes.success && directRes.employee) {
                fresh = directRes.employee;
              }
            }

            if (fresh) {
              setCurrentUser(fresh);
              setProfileAvatar(fresh.avatar);
              setProfileOffDays(fresh.weeklyOffDays || ['friday', 'saturday']);
              localStorage.setItem('office_auth_user', JSON.stringify(fresh));
            } else {
              setCurrentUser(prev => prev || parsed);
            }
          } catch (e) {
            // Keep existing user if parse fails
          }
        }
      }
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('office_auth_user');
    setCurrentUser(null);
  };

  // Profile Modal Open Handler
  const openProfileSettings = () => {
    if (!currentUser) return;
    setProfileAvatar(currentUser.avatar || '');
    setProfileOffDays(currentUser.weeklyOffDays || ['friday', 'saturday']);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowProfileModal(true);

    // Query WebAuthn status for current user
    if (currentUser.id) {
      api.getWebAuthnStatus(currentUser.id).then(res => {
        if (res && res.success) {
          setHasPasskey(Boolean(res.hasPasskey));
        }
      }).catch(() => {});
    }
  };

  // Toggle/Register Face ID / Touch ID
  const handleToggleBiometrics = async () => {
    if (!currentUser) return;
    setProfileErrorMsg('');
    setProfileSuccessMsg('');
    setBiometricRegisterLoading(true);
    try {
      const res = await registerBiometrics(currentUser.id);
      if (res.success) {
        setHasPasskey(true);
        setProfileSuccessMsg('تم تفعيل الدخول ببصمة الوجه / الإصبع (Face ID / Touch ID) بنجاح!');
        if (res.employee) {
          setCurrentUser(res.employee);
          try {
            localStorage.setItem('office_auth_user', JSON.stringify(res.employee));
          } catch (e) {}
        }
      } else {
        setProfileErrorMsg(res.error || 'تعذر تفعيل البصمة');
      }
    } catch (err) {
      setProfileErrorMsg(err.message || 'فشل تفعيل البصمة');
    } finally {
      setBiometricRegisterLoading(false);
    }
  };

  // Change Profile Photo
  const handleAvatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setAvatarLoading(true);
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    try {
      const compressedData = await compressImage(file, 400, 0.85);
      const res = await api.updateProfile(currentUser.id, { avatar: compressedData });
      if (res.success) {
        setProfileAvatar(compressedData);
        const updated = { ...currentUser, avatar: compressedData };
        setCurrentUser(updated);
        localStorage.setItem('office_auth_user', JSON.stringify(updated));
        setProfileSuccessMsg('تم تحديث الصورة الشخصية بنجاح!');
      } else {
        setProfileErrorMsg(res.error || 'فشل تحديث الصورة');
      }
    } catch (err) {
      setProfileErrorMsg('فشل معالجة الصورة: ' + err.message);
    } finally {
      setAvatarLoading(false);
    }
  };

  // Toggle Weekly Off in Profile
  const toggleProfileOffDay = (dayId) => {
    if (profileOffDays.includes(dayId)) {
      if (profileOffDays.length === 1) {
        setProfileErrorMsg('يجب اختيار يوم إجازة واحد على الأقل.');
        return;
      }
      setProfileOffDays(profileOffDays.filter(d => d !== dayId));
    } else {
      setProfileOffDays([...profileOffDays, dayId]);
    }
  };

  // Save Off Days
  const handleSaveOffDays = async () => {
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    try {
      const res = await api.updateProfile(currentUser.id, { weeklyOffDays: profileOffDays });
      if (res.success) {
        const updated = { ...currentUser, weeklyOffDays: profileOffDays };
        setCurrentUser(updated);
        localStorage.setItem('office_auth_user', JSON.stringify(updated));
        setProfileSuccessMsg('تم تحديث أيام الإجازة الأسبوعية بنجاح!');
      } else {
        setProfileErrorMsg(res.error || 'حدث خطأ في حفظ الإجازات');
      }
    } catch (err) {
      setProfileErrorMsg(err.message || 'فشل الاتصال بالخادم');
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      setPasswordErrorMsg('يرجى إدخال كلمة المرور الحالية.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setPasswordErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
      return;
    }

    setPasswordLoading(true);
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    try {
      const res = await api.changePassword(currentUser.id, oldPassword, newPassword);
      if (res.success) {
        setPasswordSuccessMsg('تم تغيير كلمة المرور بنجاح!');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordErrorMsg(res.error || 'فشل تغيير كلمة المرور، تأكد من كلمة المرور الحالية.');
      }
    } catch (err) {
      setPasswordErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Delete Account Handler
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await api.deleteAccount(currentUser.id);
      if (res.success) {
        localStorage.removeItem('office_auth_user');
        setShowDeleteConfirm(false);
        setShowProfileModal(false);
        setCurrentUser(null);
      } else {
        alert(res.error || 'فشل حذف الحساب');
      }
    } catch (err) {
      alert(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin || currentUser?.phone === '01010046078' || currentUser?.titleCode === 'he_who_remains');

  // Look up current user's title dynamically from titles list, falling back to currentUser.permissions
  const userTitleObj = (titles || []).find(t => t.code === currentUser?.titleCode);
  const basePermissions = userTitleObj?.permissions || currentUser?.permissions || {};
  const permissions = isSuperAdmin
    ? {
        check_in_out: true,
        view_own_attendance: true,
        view_office_presence: true,
        request_leave: true,
        request_permission: true,
        approve_leaves_permissions: true,
        approve_early_checkout: true,
        manage_employees: true,
        manage_titles_permissions: true,
        manage_office_settings: true,
        view_reports: true,
        view_all_branches: true,
        override_early_checkout: true,
        edit_employee_details: true
      }
    : basePermissions;

  const isDavid = Boolean(currentUser?.phone === '01010046078' || currentUser?.id === 'emp_1792955351678');
  const liveUser = currentUser ? { 
    ...currentUser, 
    titleCode: isDavid ? 'he_who_remains' : currentUser.titleCode,
    jobTitle: isDavid ? 'HE WHO REMAINS' : currentUser.jobTitle,
    isSuperAdmin, 
    permissions 
  } : null;

  // Tabs configuration strictly based on permissions without hardcoded role bypasses!
  const tabs = [
    {
      id: 'check_in',
      label: 'الحضور',
      icon: Clock,
      enabled: Boolean(isSuperAdmin || permissions.check_in_out !== false)
    },
    {
      id: 'presence',
      label: 'المتواجدين',
      icon: Users,
      enabled: Boolean(isSuperAdmin || permissions.view_office_presence !== false)
    },
    {
      id: 'leaves',
      label: 'الإجازات',
      icon: FileText,
      enabled: Boolean(isSuperAdmin || permissions.request_leave !== false || permissions.request_permission !== false || permissions.approve_leaves_permissions)
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: BarChart3,
      enabled: Boolean(isSuperAdmin || permissions.view_reports !== false)
    },
    {
      id: 'roles',
      label: 'الصلاحيات',
      icon: Shield,
      enabled: Boolean(isSuperAdmin || permissions.manage_titles_permissions || permissions.manage_employees)
    },
    {
      id: 'settings',
      label: 'الفروع',
      icon: Settings,
      enabled: Boolean(isSuperAdmin || permissions.manage_office_settings)
    }
  ].filter(t => t.enabled);

  // Auto fallback activeTab if current tab was disabled - MUST be called unconditionally before any early returns!
  useEffect(() => {
    if (currentUser && tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [currentUser, tabs, activeTab]);

  if (loading && !currentUser && branches.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center font-['Cairo',sans-serif]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <img src="/logo.png?v=4.0" alt="Wadi Degla" className="w-14 h-18 object-contain mb-2" />
        <h1 className="text-sm font-black text-amber-400">أندية وادي دجلة</h1>
        <p className="text-xs text-zinc-400 mt-1">جاري تحميل النظام...</p>
      </div>
    );
  }

  // If not logged in, render the AuthScreen
  if (!currentUser) {
    return (
      <AuthScreen
        titles={titles}
        branches={branches}
        officeSettings={officeSettings}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setProfileAvatar(user.avatar);
          setProfileOffDays(user.weeklyOffDays || ['friday', 'saturday']);
          loadInitialData(true);
          if (biometricsAvailable && (!user.passkeys || user.passkeys.length === 0)) {
            setTimeout(() => {
              setShowPasskeyPrompt(true);
            }, 700);
          }
        }}
      />
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'check_in':
        return (
          <CheckInTab 
            currentUser={liveUser} 
            officeSettings={officeSettings} 
            onAttendanceUpdated={() => loadInitialData(true)}
          />
        );
      case 'presence':
        return <OfficePresenceTab currentUser={liveUser} />;
      case 'leaves':
        return (
          <LeavesPermissionsTab 
            currentUser={liveUser} 
            onStatusChanged={() => loadInitialData(true)}
          />
        );
      case 'reports':
        return <MonthlyReportTab currentUser={liveUser} />;
      case 'roles':
        return (
          <RolesPermissionsTab 
            currentUser={liveUser} 
            onTitlesUpdated={(updatedTitle) => {
              loadInitialData(true);
              if (updatedTitle) {
                setTitles(prev => prev.map(t => t.code === updatedTitle.code ? updatedTitle : t));
                if (currentUser && currentUser.titleCode === updatedTitle.code) {
                  const updatedUser = {
                    ...currentUser,
                    permissions: updatedTitle.permissions,
                    titleDetails: updatedTitle
                  };
                  setCurrentUser(updatedUser);
                  localStorage.setItem('office_auth_user', JSON.stringify(updatedUser));
                }
              }
            }} 
          />
        );
      case 'settings':
        return (
          <OfficeSettingsTab 
            onSettingsUpdated={() => loadInitialData(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Cairo',sans-serif] selection:bg-amber-500 selection:text-black">
      {/* Top Bar with Wadi Degla Shield Logo */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-amber-500/20 px-3.5 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Branch Badge */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-10 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png?v=4.0" 
                alt="Wadi Degla" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,184,0,0.3)]" 
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-amber-400 leading-tight truncate">أندية وادي دجلة</h1>
              <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span className="truncate">فرع {currentUser?.branchName || 'اكتوبر ٢'}</span>
              </span>
            </div>
          </div>

          {/* User Controls - Spaced out safely */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
              title={theme === 'dark' ? 'التحويل إلى الوضع الفاتح (Light Mode)' : 'التحويل إلى الوضع الداكن (Dark Mode)'}
              aria-label={theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Notifications Bell - Only shown for users who have NOT granted push notification permissions yet */}
            {!isPushGranted && (
              <button
                onClick={handleEnablePush}
                disabled={pushEnabling}
                className="relative p-2 sm:p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/50 transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95 animate-pulse"
                title="اضغط هنا لتفعيل إشعارات الهاتف الفورية"
                aria-label="تفعيل إشعارات الهاتف"
              >
                {pushEnabling ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-xs">
                      !
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Profile Settings Button */}
            <button
              onClick={openProfileSettings}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 transition-colors flex items-center justify-center shadow-xs"
              title="إعدادات الحساب والصورة وكلمة المرور"
            >
              <User className="w-4 h-4" />
            </button>

            {/* Install App Button - Only shown when opened in web browser */}
            {!isAppInstalled && (
              <button
                onClick={() => setShowInstallModal(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition-colors flex items-center justify-center shadow-xs"
                title="تنزيل التطبيق على الهاتف"
              >
                <Download className="w-4 h-4 text-amber-400" />
              </button>
            )}

            {/* Subtle Divider between profile and logout */}
            <div className="w-[1px] h-5 bg-zinc-800 mx-0.5"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-800/80 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 transition-colors flex items-center justify-center border border-zinc-700/60 shadow-xs"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 flex flex-col">
        {/* Profile & Context Card in Wadi Degla Luxury Theme */}
        <div 
          onClick={openProfileSettings}
          className="cursor-pointer group bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-amber-500/30 hover:border-amber-500/60 text-zinc-100 rounded-3xl p-3.5 sm:p-4 shadow-xl mb-4 flex items-center justify-between gap-2.5 relative overflow-hidden transition-all"
        >
          {/* Subtle gold accent glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-2.5 min-w-0 flex-1 relative z-10">
            <div className="relative shrink-0">
              <img 
                src={currentUser?.avatar || DEFAULT_AVATAR} 
                alt={currentUser?.name || 'صورة الموظف'} 
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
              />
              <div className="absolute -bottom-1 -left-1 bg-amber-500 text-black p-0.5 rounded-md shadow-xs">
                <Camera className="w-3 h-3" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-zinc-400 font-bold block leading-tight">مرحباً بك،</span>
              <h2 className="text-sm font-black text-amber-300 leading-tight group-hover:text-amber-400 transition-colors truncate">
                {currentUser?.name || 'المستخدم'}
              </h2>
              <div className="text-[11px] font-bold text-amber-400 truncate mt-0.5 leading-tight">
                {currentUser?.phone === '01010046078' || currentUser?.titleCode === 'he_who_remains'
                  ? 'HE WHO REMAINS'
                  : (currentUser?.jobTitle || 'أندية وادي دجلة')}
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="truncate">فرع {currentUser?.branchName || 'وادي دجلة'}</span>
              </div>
            </div>
          </div>

          <div className="text-left bg-zinc-950/90 px-3 py-2 rounded-2xl border border-zinc-800 shrink-0 relative z-10 shadow-inner">
            <span className="text-[10px] text-zinc-400 font-semibold block leading-tight">اليوم</span>
            <span className="text-xs font-black text-amber-400 whitespace-nowrap">
              {formatArabicDateWithDay(new Date())}
            </span>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 pb-24">
          {renderTabContent()}
        </div>
      </main>

      {/* Fixed Bottom Navigation in Wadi Degla Dark Shield */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-md border-t border-amber-500/20 px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="max-w-lg mx-auto flex justify-around items-center gap-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-1 px-1 rounded-xl transition-all relative flex-1 min-w-0 ${
                  isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className={`w-4 h-4 mb-0.5 shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-[10px] tracking-tight truncate w-full text-center ${isActive ? 'font-black' : 'font-bold'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute bottom-0 shadow-sm shadow-amber-400"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ================= USER PROFILE & SETTINGS MODAL ================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-amber-500/30 max-h-[90vh] overflow-y-auto text-zinc-100 text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-400">إعدادات الحساب والملف الشخصي</h3>
                  <span className="text-[11px] text-zinc-400">{currentUser.name} ({currentUser?.phone === '01010046078' || currentUser?.titleCode === 'he_who_remains' ? 'HE WHO REMAINS' : currentUser.jobTitle})</span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Messages */}
            {profileSuccessMsg && (
              <div className="bg-emerald-950/70 border border-emerald-700/80 p-3 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold mb-3 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}
            {profileErrorMsg && (
              <div className="bg-rose-950/70 border border-rose-700/80 p-3 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold mb-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            {/* 1. Change Profile Picture with Gallery & Camera Options */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4 text-center">
              <label className="block text-xs font-bold text-zinc-300 mb-3">
                الصورة الشخصية الحالية:
              </label>

              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer group relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg bg-zinc-900 shrink-0">
                    <img 
                      src={profileAvatar || currentUser?.avatar || DEFAULT_AVATAR} 
                      alt={currentUser?.name || 'صورة الحساب'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={avatarLoading}
                    className="hidden"
                  />
                </label>

                <div className="flex flex-col gap-2 items-stretch flex-1">
                  {/* Option 1: Gallery / Photo Library */}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all">
                    {avatarLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 text-black" />
                        <span>🖼️ رفع صورة من المعرض</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                      className="hidden"
                    />
                  </label>

                  {/* Option 2: Camera Selfie */}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs active:scale-95 transition-all">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>📸 التقاط بالكاميرا</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Change Weekly Off Days */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>أيام الإجازة الأسبوعية:</span>
                </label>
                <button
                  type="button"
                  onClick={handleSaveOffDays}
                  className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>حفظ الإجازات</span>
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map(day => {
                  const isChecked = profileOffDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleProfileOffDay(day.id)}
                      className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-bold transition-all border ${
                        isChecked
                          ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {day.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Theme Mode Selection */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-zinc-200 block truncate">مظهر التطبيق:</span>
                <span className="text-[10px] text-zinc-500 block truncate">اختر المظهر المفضل لك</span>
              </div>
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => { setTheme('dark'); applyTheme('dark'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>داكن</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTheme('light'); applyTheme('light'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-amber-500 text-black shadow-xs font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>فاتح</span>
                </button>
              </div>
            </div>

            {/* 4. Biometric (Face ID / Touch ID) Section */}
            {biometricsAvailable && (
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <ScanFace className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">الدخول ببصمة الوجه / الإصبع:</span>
                      <span className="text-[10px] text-zinc-400 block">
                        {hasPasskey ? 'مفعلة على هذا الهاتف بنجاح ✅' : 'تسجيل الدخول السريع (Face ID / Touch ID)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={biometricRegisterLoading}
                  onClick={handleToggleBiometrics}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    hasPasskey
                      ? 'bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black shadow-md shadow-amber-500/20'
                  }`}
                >
                  {biometricRegisterLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق من البصمة...</span>
                    </>
                  ) : hasPasskey ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>إعادة ضبط أو ربط بصمة جديدة لهذا الجهاز</span>
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-4 h-4" />
                      <span>تفعيل الدخول ببصمة الوجه / الإصبع الآن</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 5. Change Password Section */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>تغيير كلمة المرور:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  {showPasswordFields ? 'إخفاء الحقول' : 'إظهار الحقول'}
                </button>
              </div>

              {passwordSuccessMsg && (
                <div className="bg-emerald-950/70 border border-emerald-700/80 p-2.5 rounded-xl text-emerald-300 text-xs font-bold mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}
              {passwordErrorMsg && (
                <div className="bg-rose-950/70 border border-rose-700/80 p-2.5 rounded-xl text-rose-300 text-xs font-bold mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    كلمة المرور الحالية:
                  </label>
                  <input
                    type={showPasswordFields ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الحالية"
                    dir="ltr"
                    required
                    className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      كلمة المرور الجديدة:
                    </label>
                    <input
                      type={showPasswordFields ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="الجديدة"
                      dir="ltr"
                      required
                      className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      تأكيد الجديدة:
                    </label>
                    <input
                      type={showPasswordFields ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="تأكيد"
                      dir="ltr"
                      required
                      className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-black" />
                  <span>{passwordLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
                </button>
              </form>
            </div>

            {/* Notification Center Access */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-200">مركز وسجل الإشعارات:</span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadNotificationsCount} غير مقروء
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setShowNotificationsModal(true);
                  fetchNotifications();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>عرض سجل الإشعارات والتنبيهات 🔔</span>
              </button>
            </div>

            {/* 6. Push Notifications Section */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mt-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">إشعارات الهاتف (Web Push):</span>
                    <span className="text-[10px] text-zinc-400 block">
                      إشعارات فورية على الهاتف حتى والتطبيق مغلق
                    </span>
                  </div>
                </div>
              </div>

              {pushSuccessMsg && (
                <div className="bg-emerald-950/70 border border-emerald-700/80 p-2.5 rounded-xl text-emerald-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pushSuccessMsg}</span>
                </div>
              )}
              {pushErrorMsg && (
                <div className="bg-rose-950/70 border border-rose-700/80 p-2.5 rounded-xl text-rose-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{pushErrorMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={pushEnabling}
                onClick={handleEnablePush}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                {pushEnabling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>جاري تفعيل إشعارات الهاتف...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>تفعيل / إعادة ربط إشعارات الهاتف (Web Push) 🔔</span>
                  </>
                )}
              </button>
            </div>

            {/* 7. Delete Account Danger Section */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-rose-950/80 mt-4 text-center">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-rose-400 block text-right">منطقة الخطر: حذف الحساب</span>
                  <span className="text-[10px] text-zinc-500 block text-right mt-0.5">مسح حسابك وبياناتك نهائياً من النظام</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>حذف الحساب</span>
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-800 text-zinc-100 text-right animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-black text-rose-400 mb-1.5">هل أنت متأكد من حذف حسابك نهائياً؟</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              سيتم مسح حسابك <b>({currentUser.name})</b> وبياناتك بالكامل من النظام ولن تتمكن من تسجيل الدخول به مجدداً.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف نهائياً</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INSTALL APP MODAL ================= */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 max-h-[90vh] overflow-y-auto text-zinc-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png?v=4.0" alt="" className="w-7 h-9 object-contain" />
                <h3 className="text-sm font-black text-amber-400">تنزيل تطبيق أندية وادي دجلة</h3>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              {/* Option A: Instant PWA Install (Recommended: Instant OTA Auto-updates) */}
              <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 p-4 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-black text-amber-400 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>تثبيت فوري على الشاشة (موصى به لجميع الأجهزة)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    تحديثات تلقائية ⚡
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  أفضل وأسرع طريقة: تثبيت البرنامج كأيقونة على هاتفك. <b>أي تحديث جديد يُنشَر على السيرفر يصله هاتفك فوراً وبشكل تلقائي</b> دون الحاجة لحذف البرنامج أو إعادة تنزيله نهائياً!
                </p>

                {installPrompt ? (
                  <button
                    type="button"
                    onClick={handleTriggerNativeInstall}
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl shadow-md transition-all active:scale-[0.98]"
                  >
                    <Smartphone className="w-4 h-4 text-black" />
                    <span>📲 اضغط هنا لتثبيت التطبيق على هاتفك الآن</span>
                  </button>
                ) : (
                  <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                    <div className="font-bold text-amber-400">طريقة التثبيت في 3 ثوانٍ من المتصفح:</div>
                    <div>• <b>للأندرويد (Chrome):</b> اضغط على القائمة (الثلاث نقاط ⠇ بالأعلى) ثم اختر <b>"تثبيت التطبيق" (Install app)</b>.</div>
                    <div>• <b>للآيفون (Safari):</b> اضغط على زر <b>المشاركة (Share ⬆️)</b> ثم اختر <b>"إضافة إلى الشاشة الرئيسية"</b>.</div>
                  </div>
                )}
              </div>

              {/* Option B: Android APK */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="font-black text-zinc-200 text-xs flex items-center justify-between">
                  <span>📱 ملف APK مباشر للأندرويد:</span>
                  <span className="text-[10px] text-emerald-400 font-bold">متوافق مع جميع أجهزة أندرويد</span>
                </div>
                <a
                  href="/download/OfficeAttendance.apk"
                  download="WadiDeglaAttendance.apk"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold rounded-xl transition-colors text-xs border border-zinc-700"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>تنزيل تطبيق أندية وادي دجلة (WadiDeglaAttendance.apk)</span>
                </a>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  حزمة أندرويد رسمية جاهزة للتثبيت المباشر على جميع الهواتف (Android 5+). ترتبط مباشرة بالسيرفر السحابي، <b>فتصلك كافة التحديثات والتحسينات تلقائياً بمجرد فتح التطبيق</b> دون الحاجة لحذفه أو إعادة تثبيته.
                </p>
              </div>

              {/* Option C: iOS Profile */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="font-black text-zinc-200 text-xs flex items-center justify-between">
                  <span>🍎 ملف بروفايل الآيفون (iOS MobileConfig):</span>
                </div>
                <a
                  href="/download/OfficeAttendance.mobileconfig?v=4.0"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl transition-colors text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>تنزيل ملف (WadiDegla.mobileconfig)</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ================= BIOMETRIC PASSKEY PROMOTION MODAL ================= */}
      {showPasskeyPrompt && biometricsAvailable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative text-zinc-100">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3.5 text-amber-400">
              <ScanFace className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-amber-400 mb-1.5">تفعيل الدخول السريع (Face ID)</h3>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              هل ترغب في ربط بصمة الوجه (Face ID / Touch ID) بهاتفك لتسجيل الدخول بلمسة واحدة في المرات القادمة دون كتابة كلمة المرور؟
            </p>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  await handleToggleBiometrics();
                  setShowPasskeyPrompt(false);
                }}
                disabled={biometricRegisterLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {biometricRegisterLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>جاري مسح البصمة...</span>
                  </>
                ) : (
                  <>
                    <ScanFace className="w-4 h-4 text-black" />
                    <span>نعم، تفعيل Face ID الآن</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPasskeyPrompt(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                تخطي الآن (يمكن تفعيلها لاحقاً من الملف الشخصي)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IN-APP NOTIFICATIONS MODAL ================= */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-amber-500/30 max-h-[90vh] overflow-hidden flex flex-col text-zinc-100 text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 relative">
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-900 animate-ping"></span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-400">مركز الإشعارات والتنبيهات</h3>
                  <span className="text-[10px] text-zinc-400">
                    {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadNotificationsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMarkNotificationsAsRead()}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline px-2 py-1 rounded-lg bg-zinc-800/80 transition-colors"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Web Push Banner (Explicit User Gesture for iOS / Android) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border border-amber-500/30 p-3 rounded-2xl mb-3 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>تفعيل إشعارات الهاتف الفورية (Web Push)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  حتى لو التطبيق مغلق
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                اضغط لتفعيل إشعارات الهاتف لتصلك رسائل فورية باعتماد طلبات الإجازات والأذونات وتنبيهات الحضور.
              </p>

              {pushSuccessMsg && (
                <div className="bg-emerald-950/90 border border-emerald-700 p-2 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{pushSuccessMsg}</span>
                </div>
              )}
              {pushErrorMsg && (
                <div className="bg-rose-950/90 border border-rose-700 p-2 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{pushErrorMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={pushEnabling}
                onClick={handleEnablePush}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {pushEnabling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>جاري طلب الإذن...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5 text-black" />
                    <span>🔔 تفعيل إشعارات الهاتف الآن</span>
                  </>
                )}
              </button>
            </div>

            {/* Notifications Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/40">
              {notifications.length === 0 ? (
                <div className="text-center py-10 space-y-2 text-zinc-500">
                  <Bell className="w-8 h-8 mx-auto text-zinc-700" />
                  <p className="text-xs font-bold">لا توجد إشعارات حتى الآن</p>
                  <p className="text-[11px] text-zinc-600">ستظهر هنا أي طلبات جديدة، موافقات أو رفض، وتنبيهات الانصراف</p>
                </div>
              ) : (
                notifications.map(n => {
                  const isUnread = !n.read;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (isUnread) handleMarkNotificationsAsRead([n.id]);
                        setShowNotificationsModal(false);
                        if (n.type === 'auto_checkout') {
                          setActiveTab('check_in');
                        } else {
                          setActiveTab('leaves');
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer pt-3 ${
                        isUnread
                          ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
                          : 'bg-zinc-950/60 border-zinc-850 hover:bg-zinc-900/80 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          {n.type === 'request_created' && <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          {n.type === 'request_reviewed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          {n.type === 'auto_checkout' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          {n.type === 'system' && <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          <span className={`text-xs ${isUnread ? 'font-black text-amber-300' : 'font-bold text-zinc-200'}`}>
                            {n.title}
                          </span>
                        </div>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1 shadow-[0_0_8px_rgba(245,184,0,0.8)]"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed font-medium mb-1.5">
                        {n.body}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{new Date(n.createdAt).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', month: 'short', day: 'numeric' })}</span>
                        <span className="text-amber-500/80 font-bold">عرض التفاصيل ←</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowNotificationsModal(false)}
              className="w-full mt-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
