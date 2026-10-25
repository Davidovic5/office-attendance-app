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
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Calendar
} from 'lucide-react';
import { api } from './api';
import { AuthScreen } from './components/AuthScreen';
import { CheckInTab } from './components/CheckInTab';
import { OfficePresenceTab } from './components/OfficePresenceTab';
import { LeavesPermissionsTab } from './components/LeavesPermissionsTab';
import { RolesPermissionsTab } from './components/RolesPermissionsTab';
import { OfficeSettingsTab } from './components/OfficeSettingsTab';
import { compressImage } from './utils/imageCompressor';

const DAYS_OF_WEEK = [
  { id: 'friday', name: 'الجمعة' },
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' }
];

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [titles, setTitles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [officeSettings, setOfficeSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('check_in');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  // Load initial system data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [settingsRes, employeesRes, titlesRes, branchesRes] = await Promise.all([
        api.getSettings(),
        api.getEmployees(),
        api.getTitles(),
        api.getBranches()
      ]);

      if (settingsRes.success) {
        setOfficeSettings(settingsRes.settings);
      }
      if (titlesRes.success) {
        setTitles(titlesRes.titles);
      }
      if (branchesRes.success) {
        setBranches(branchesRes.branches);
      }
      if (employeesRes.success && employeesRes.employees.length > 0) {
        setEmployees(employeesRes.employees);

        const saved = localStorage.getItem('office_auth_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const fresh = employeesRes.employees.find(e => e.id === parsed.id);
            if (fresh) {
              setCurrentUser(fresh);
              setProfileAvatar(fresh.avatar);
              setProfileOffDays(fresh.weeklyOffDays || ['friday', 'saturday']);
            } else {
              setCurrentUser(null);
            }
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
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

  if (loading || !officeSettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center font-['Cairo',sans-serif]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <img src="/logo.png" alt="Wadi Degla" className="w-14 h-18 object-contain mb-2" />
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
          loadInitialData();
        }}
      />
    );
  }

  const permissions = currentUser.permissions || {};
  const isManager = currentUser.titleCode === 'general_manager' || currentUser.titleCode === 'deputy_manager' || permissions.manage_titles_permissions;

  // Tabs configuration based on user permissions
  const tabs = [
    {
      id: 'check_in',
      label: 'تسجيل الحضور',
      icon: Clock,
      enabled: permissions.check_in_out !== false
    },
    {
      id: 'presence',
      label: 'المتواجدين',
      icon: Users,
      enabled: permissions.view_office_presence !== false
    },
    {
      id: 'leaves',
      label: 'الإجازات والأذونات',
      icon: FileText,
      enabled: permissions.request_leave !== false || permissions.request_permission !== false
    },
    {
      id: 'roles',
      label: 'الصلاحيات',
      icon: Shield,
      enabled: permissions.manage_titles_permissions || isManager
    },
    {
      id: 'settings',
      label: 'إعدادات الفروع',
      icon: Settings,
      enabled: permissions.manage_office_settings || isManager
    }
  ].filter(t => t.enabled);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'check_in':
        return (
          <CheckInTab 
            currentUser={currentUser} 
            officeSettings={officeSettings} 
            onAttendanceUpdated={loadInitialData}
          />
        );
      case 'presence':
        return <OfficePresenceTab currentUser={currentUser} />;
      case 'leaves':
        return (
          <LeavesPermissionsTab 
            currentUser={currentUser} 
            onStatusChanged={loadInitialData}
          />
        );
      case 'roles':
        return <RolesPermissionsTab onTitlesUpdated={loadInitialData} />;
      case 'settings':
        return (
          <OfficeSettingsTab 
            onSettingsUpdated={loadInitialData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Cairo',sans-serif] selection:bg-amber-500 selection:text-black">
      {/* Top Bar with Wadi Degla Shield Logo */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-2.5 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Branch Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-11 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Wadi Degla" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(245,184,0,0.3)]" 
              />
            </div>
            <div>
              <h1 className="text-xs font-black text-amber-400 leading-tight">أندية وادي دجلة</h1>
              <span className="text-[11px] text-zinc-300 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate max-w-[150px]">نادي وادي دجلة - فرع {currentUser.branchName || 'شيراتون'}</span>
              </span>
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-1.5">
            {/* Profile Settings Button */}
            <button
              onClick={openProfileSettings}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30 transition-colors flex items-center gap-1 text-xs font-bold"
              title="إعدادات الحساب والصورة وكلمة المرور"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">حسابي</span>
            </button>

            {/* Install App Button */}
            <button
              onClick={() => setShowInstallModal(true)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition-colors flex items-center gap-1 text-xs font-bold"
              title="تنزيل التطبيق على الهاتف"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">تحميل</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-300 transition-colors flex items-center gap-1 text-xs font-bold border border-zinc-700/60"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 flex flex-col">
        {/* Profile & Context Card in Wadi Degla Luxury Theme */}
        <div 
          onClick={openProfileSettings}
          className="cursor-pointer group bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-amber-500/30 hover:border-amber-500/60 text-white rounded-3xl p-4 shadow-xl mb-4 flex items-center justify-between relative overflow-hidden transition-all"
        >
          {/* Subtle gold accent glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0"
              />
              <div className="absolute -bottom-1 -left-1 bg-amber-500 text-black p-0.5 rounded-md shadow-xs">
                <Camera className="w-3 h-3" />
              </div>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 font-bold block">مرحباً بك،</span>
              <h2 className="text-base font-black text-amber-300 leading-tight group-hover:text-amber-400 transition-colors">
                {currentUser.name}
              </h2>
              <span className="text-[11px] text-zinc-300 block mt-0.5">
                <span className="text-amber-400 font-bold">{currentUser.jobTitle}</span> • فرع {currentUser.branchName}
              </span>
            </div>
          </div>

          <div className="text-left bg-zinc-950/80 px-3 py-2 rounded-2xl border border-zinc-800 shrink-0 relative z-10">
            <span className="text-[10px] text-zinc-400 font-semibold block">اليوم</span>
            <span className="text-xs font-black text-amber-400 whitespace-nowrap">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 pb-16">
          {renderTabContent()}
        </div>
      </main>

      {/* Fixed Bottom Navigation in Wadi Degla Dark Shield */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-md border-t border-amber-500/20 px-2 py-1.5 shadow-2xl">
        <div className="max-w-lg mx-auto flex justify-around items-center">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-1.5 px-2 rounded-2xl transition-all relative flex-1 ${
                  isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-[10px] tracking-tight whitespace-nowrap ${isActive ? 'font-black' : 'font-bold'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute bottom-0.5 shadow-sm shadow-amber-400"></span>
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
                  <span className="text-[11px] text-zinc-400">{currentUser.name} ({currentUser.jobTitle})</span>
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

            {/* 1. Change Profile Picture */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4 text-center">
              <label className="block text-xs font-bold text-zinc-300 mb-3">
                الصورة الشخصية الحالية:
              </label>

              <div className="flex items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-lg bg-zinc-900 shrink-0">
                  <img 
                    src={profileAvatar || currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                <div className="flex flex-col gap-1.5 items-start">
                  <label className="cursor-pointer inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all">
                    {avatarLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>📷 تغيير الصورة الشخصية</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleAvatarChange}
                      disabled={avatarLoading}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[10px] text-zinc-500 font-bold">
                    التقاط بكاميرا الموبايل أو اختيار من المعرض
                  </span>
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

            {/* 3. Change Password Section */}
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

      {/* ================= INSTALL APP MODAL ================= */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 max-h-[90vh] overflow-y-auto text-zinc-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="w-7 h-9 object-contain" />
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
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>📱 لأجهزة الأندرويد (Android):</span>
                </div>
                <p className="text-zinc-300">
                  تنزيل ملف التطبيق المباشر (APK) لتثبيته على أي هاتف أندرويد فوراً:
                </p>
                <a
                  href="/download/OfficeAttendance.apk"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4 text-black" />
                  <span>تنزيل تطبيق الأندرويد (WadiDeglaAttendance.apk)</span>
                </a>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-2">
                <div className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>🍎 لأجهزة الآيفون (iPhone / iOS):</span>
                </div>
                <p className="text-zinc-300">
                  ملف تثبيت الآيفون المباشر (MobileConfig) أو عبر Safari:
                </p>
                <a
                  href="/download/OfficeAttendance.mobileconfig"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4 text-black" />
                  <span>تنزيل ملف الآيفون (WadiDegla.mobileconfig)</span>
                </a>
                <div className="text-[11px] text-zinc-300 bg-zinc-900 p-3 rounded-xl border border-zinc-800 mt-2 space-y-1">
                  <div className="font-bold text-amber-400">أو الإضافة المباشرة في 5 ثوانٍ عبر Safari:</div>
                  <div>1. افتح الرابط في متصفح <b>Safari</b> على الآيفون.</div>
                  <div>2. اضغط زر <b>المشاركة (Share ⬆️)</b> بالأسفل.</div>
                  <div>3. اضغط <b>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</b>.</div>
                </div>
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
    </div>
  );
}
