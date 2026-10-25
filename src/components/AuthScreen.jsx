import React, { useState } from 'react';
import { 
  Building2, 
  LogIn, 
  UserPlus, 
  Camera, 
  Phone, 
  Lock, 
  User, 
  Briefcase, 
  Calendar, 
  MapPin,
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import { api } from '../api';

const DAYS_OF_WEEK = [
  { id: 'friday', name: 'الجمعة' },
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' }
];

export function AuthScreen({ titles, branches, officeSettings, onAuthSuccess, employees }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Register Form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('1234');
  const [regTitleCode, setRegTitleCode] = useState('specialist');
  const [regJobTitle, setRegJobTitle] = useState('Specialist');
  const [regBranchId, setRegBranchId] = useState('branch_sheraton');
  const [regWeeklyOff, setRegWeeklyOff] = useState(['friday', 'saturday']);
  const [regAvatar, setRegAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  // Preset Avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
  ];

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 4 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRegAvatar(event.target.result);
      setAvatarPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleWeeklyOffDay = (dayId) => {
    if (regWeeklyOff.includes(dayId)) {
      setRegWeeklyOff(regWeeklyOff.filter(d => d !== dayId));
    } else {
      setRegWeeklyOff([...regWeeklyOff, dayId]);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPhone.trim()) {
      setErrorMsg('يرجى كتابة رقم الهاتف.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login(loginPhone.trim(), loginPin.trim());
      if (res.success) {
        localStorage.setItem('office_auth_user', JSON.stringify(res.employee));
        onAuthSuccess(res.employee);
      } else {
        setErrorMsg(res.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (emp) => {
    setLoginPhone(emp.phone);
    setLoginPin(emp.pin || '1234');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) {
      setErrorMsg('الاسم بالكامل ورقم الهاتف مطلوبان.');
      return;
    }

    if (regWeeklyOff.length === 0) {
      setErrorMsg('يرجى اختيار يوم واحد على الأقل كإجازة أسبوعية.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const selectedTitle = titles.find(t => t.code === regTitleCode);
      const res = await api.register({
        name: regName.trim(),
        phone: regPhone.trim(),
        pin: regPin.trim() || '1234',
        titleCode: regTitleCode,
        jobTitle: regJobTitle.trim() || (selectedTitle ? selectedTitle.englishTitle : 'Specialist'),
        branchId: regBranchId,
        weeklyOffDays: regWeeklyOff,
        avatar: regAvatar || avatarPreview || presetAvatars[0]
      });

      if (res.success) {
        setSuccessMsg(res.message);
        localStorage.setItem('office_auth_user', JSON.stringify(res.employee));
        setTimeout(() => {
          onAuthSuccess(res.employee);
        }, 800);
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const branchList = branches && branches.length > 0 ? branches : [];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-4 selection:bg-amber-500 selection:text-black font-['Cairo',sans-serif]">
      {/* Decorative Brand Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative z-10 animate-scale-up text-zinc-100">
        {/* Wadi Degla Shield Logo & Brand Header */}
        <div className="text-center mb-5">
          <div className="w-20 h-24 mx-auto mb-2 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Wadi Degla Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,184,0,0.25)]" 
            />
          </div>
          <h1 className="text-lg font-black text-amber-400 tracking-wide">أندية وادي دجلة</h1>
          <p className="text-[11px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">
            WADI DEGLA CLUBS • نظام الحضور والغياب
          </p>
        </div>

        {/* Tab Switcher (Login vs Register) */}
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl mb-5 border border-zinc-800/80">
          <button
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
          <button
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل موظف جديد</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 p-3 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold mb-4 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold mb-4 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>رقم الهاتف:</span>
              </label>
              <input
                type="tel"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                dir="ltr"
                required
                className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>رمز المرور (PIN):</span>
              </label>
              <input
                type="password"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value)}
                placeholder="الافتراضي: 1234"
                dir="ltr"
                className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{loading ? 'جاري التحقق...' : 'دخول إلى البرنامج'}</span>
            </button>

            {/* Quick Demo Accounts */}
            {employees && employees.length > 0 && (
              <div className="pt-3 border-t border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-500 block mb-2 text-center">
                  أو اختر حساباً تجريبياً للدخول السريع:
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {employees.slice(0, 6).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleQuickLogin(emp)}
                      className="p-1.5 rounded-xl border border-zinc-800 hover:border-amber-500/50 bg-zinc-950/60 hover:bg-zinc-800 text-right text-xs transition-colors flex items-center gap-2"
                    >
                      <img src={emp.avatar} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border border-zinc-700" />
                      <div className="overflow-hidden">
                        <div className="font-bold text-[10px] truncate text-zinc-200">{emp.name}</div>
                        <div className="text-[9px] text-amber-400 truncate">{emp.jobTitle} • {emp.branchName}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          /* ================= REGISTER FORM ================= */
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-right">
            {/* 1. Photo Upload */}
            <div className="text-center mb-1">
              <div className="relative inline-block">
                <div className="w-16 h-16 rounded-full mx-auto overflow-hidden border-2 border-amber-500 shadow-md bg-zinc-950 flex items-center justify-center">
                  {avatarPreview || regAvatar ? (
                    <img src={avatarPreview || regAvatar} alt="معاينة" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-zinc-600" />
                  )}
                </div>

                <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-md cursor-pointer transition-transform active:scale-90">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preset Avatars */}
              <div className="flex justify-center gap-1.5 mt-1.5">
                {presetAvatars.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRegAvatar(url);
                      setAvatarPreview(url);
                    }}
                    className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                      (regAvatar === url || avatarPreview === url) ? 'ring-2 ring-amber-500 scale-110' : 'opacity-60 border-zinc-700'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Full Name & Phone */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">الاسم بالكامل:</label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="محمد أحمد"
                  required
                  className="w-full p-2 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">رقم الهاتف:</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  required
                  className="w-full p-2 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* 3. Branch Selection */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>اختر فرع وادي دجلة التابع له:</span>
              </label>
              <select
                value={regBranchId}
                onChange={e => setRegBranchId(e.target.value)}
                className="w-full p-2 text-xs font-black rounded-xl bg-zinc-950 border border-amber-500/50 text-amber-400 focus:outline-none focus:border-amber-400"
              >
                {branchList.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                    📍 نادي وادي دجلة - فرع {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Position & Job Hierarchy */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-amber-400" />
                <span>المسمى الوظيفي (الهرم الإداري):</span>
              </label>
              <select
                value={regTitleCode}
                onChange={e => {
                  setRegTitleCode(e.target.value);
                  const t = titles.find(item => item.code === e.target.value);
                  if (t) setRegJobTitle(t.englishTitle || t.name);
                }}
                className="w-full p-2 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {titles.map(t => (
                  <option key={t.code} value={t.code} className="bg-zinc-900 text-zinc-100">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Weekly Off Days */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>أيام الإجازة الأسبوعية:</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                {DAYS_OF_WEEK.map(day => {
                  const isChecked = regWeeklyOff.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeeklyOffDay(day.id)}
                      className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-bold transition-all border ${
                        isChecked
                          ? 'bg-amber-500 text-black border-amber-500 shadow-xs'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {day.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus className="w-4 h-4 text-black" />
              <span>{loading ? 'جاري تسجيل الحساب...' : 'إتمام التسجيل والدخول'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
