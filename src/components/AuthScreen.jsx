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
  Check, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  UploadCloud,
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

export function AuthScreen({ titles, officeSettings, onAuthSuccess, employees }) {
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
  const [regTitleCode, setRegTitleCode] = useState('employee');
  const [regJobTitle, setRegJobTitle] = useState('موظف');
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

  // Handle Photo Upload from phone camera or gallery
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

  // Toggle Day in Weekly Off
  const toggleWeeklyOffDay = (dayId) => {
    if (regWeeklyOff.includes(dayId)) {
      setRegWeeklyOff(regWeeklyOff.filter(d => d !== dayId));
    } else {
      setRegWeeklyOff([...regWeeklyOff, dayId]);
    }
  };

  // Handle Login Submit
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

  // Quick Select an existing employee to login
  const handleQuickLogin = (emp) => {
    setLoginPhone(emp.phone);
    setLoginPin(emp.pin || '1234');
  };

  // Handle Register Submit
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
        jobTitle: regJobTitle.trim() || (selectedTitle ? selectedTitle.name : 'موظف'),
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-blue-600 selection:text-white font-['Cairo',sans-serif]">
      {/* Container */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto animate-scale-up">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900">نظام الحضور والغياب الذكي</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">{officeSettings?.officeName || 'المكتب الرئيسي'}</p>
        </div>

        {/* Tab Switcher (Login vs Register) */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
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
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>تسجيل موظف جديد</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-50 border-r-4 border-rose-500 p-3.5 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold mb-4 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3.5 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold mb-4 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>رقم الهاتف:</span>
              </label>
              <input
                type="tel"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                placeholder="مثال: 01011112222"
                dir="ltr"
                required
                className="w-full p-3 text-xs font-bold text-left rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>رمز المرور (PIN):</span>
              </label>
              <input
                type="password"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value)}
                placeholder="الرمز الافتراضي: 1234"
                dir="ltr"
                className="w-full p-3 text-xs font-bold text-left rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'جاري التحقق...' : 'دخول إلى البرنامج'}</span>
            </button>

            {/* Quick Demo Switcher List */}
            {employees && employees.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2 text-center">
                  أو اختر حساباً جاهزاً للدخول السريع والتجربة:
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {employees.slice(0, 6).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleQuickLogin(emp)}
                      className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-right text-xs transition-colors flex items-center gap-2"
                    >
                      <img src={emp.avatar} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-bold text-[11px] truncate text-slate-800">{emp.name}</div>
                        <div className="text-[9px] text-blue-600 truncate">{emp.jobTitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        ) : (
          /* ================= REGISTER FORM ================= */
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-right">
            {/* 1. Photo Upload */}
            <div className="text-center">
              <label className="block text-xs font-bold text-slate-700 mb-2">الصورة الشخصية:</label>
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full mx-auto overflow-hidden border-4 border-blue-500 shadow-md bg-slate-100 flex items-center justify-center">
                  {avatarPreview || regAvatar ? (
                    <img src={avatarPreview || regAvatar} alt="معاينة" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>

                <label className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer transition-transform active:scale-90">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Select Preset */}
              <div className="mt-2.5">
                <span className="text-[10px] text-slate-400 block mb-1">أو اختر صورة رمزية:</span>
                <div className="flex justify-center gap-1.5">
                  {presetAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRegAvatar(url);
                        setAvatarPreview(url);
                      }}
                      className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                        (regAvatar === url || avatarPreview === url) ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>الاسم بالكامل:</span>
              </label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="مثال: يوسف أحمد عبد المنعم"
                required
                className="w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 3. Phone & PIN */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف:</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  required
                  className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز المرور (PIN):</label>
                <input
                  type="password"
                  value={regPin}
                  onChange={e => setRegPin(e.target.value)}
                  placeholder="1234"
                  dir="ltr"
                  maxLength={6}
                  className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* 4. Position & Job Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>المسمى الوظيفي والـ Position:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={regTitleCode}
                  onChange={e => {
                    setRegTitleCode(e.target.value);
                    const t = titles.find(item => item.code === e.target.value);
                    if (t) setRegJobTitle(t.name);
                  }}
                  className="w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {titles.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={regJobTitle}
                  onChange={e => setRegJobTitle(e.target.value)}
                  placeholder="المسمى التفصيلي مثلاً: محاسب قانوني"
                  className="w-full p-2.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 5. Weekly Off Days Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>حدد أيام الإجازة الأسبوعية الخاصة بك:</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map(day => {
                  const isChecked = regWeeklyOff.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeeklyOffDay(day.id)}
                      className={`p-2 rounded-xl text-center text-xs font-bold transition-all border ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day.name}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                في هذه الأيام سيظهر تلقائياً في شاشة المكتب أنك في "إجازة أسبوعية".
              </span>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'جاري تسجيل الحساب...' : 'إتمام التسجيل والدخول'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
