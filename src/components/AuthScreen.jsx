import React, { useState } from 'react';
import { 
  Building2, 
  LogIn, 
  UserPlus, 
  Camera, 
  Image as ImageIcon,
  Phone, 
  Lock, 
  User, 
  Briefcase, 
  Calendar, 
  MapPin,
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Eye,
  EyeOff,
  Sparkles,
  Loader2
} from 'lucide-react';
import { api } from '../api';
import { compressImage } from '../utils/imageCompressor';

const DAYS_OF_WEEK = [
  { id: 'friday', name: 'الجمعة' },
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' }
];

// Default clean avatars
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5B800'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

export function AuthScreen({ titles, branches, officeSettings, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [photoCompressing, setPhotoCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regTitleCode, setRegTitleCode] = useState(titles && titles[titles.length - 1] ? titles[titles.length - 1].code : 'specialist');
  const [regBranchId, setRegBranchId] = useState(branches && branches[0] ? branches[0].id : 'branch_sheraton');
  const [regWeeklyOff, setRegWeeklyOff] = useState(['friday', 'saturday']);
  const [regAvatar, setRegAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  // Handle Photo Picker & Compression
  const handlePhotoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    setPhotoCompressing(true);

    try {
      const compressedDataUrl = await compressImage(file, 400, 0.85);
      setRegAvatar(compressedDataUrl);
      setAvatarPreview(compressedDataUrl);
    } catch (err) {
      setErrorMsg('تعذر معالجة الصورة، يرجى المحاولة بصورة أخرى: ' + err.message);
    } finally {
      setPhotoCompressing(false);
    }
  };

  const toggleWeeklyOffDay = (dayId) => {
    if (regWeeklyOff.includes(dayId)) {
      if (regWeeklyOff.length === 1) {
        setErrorMsg('يجب اختيار يوم إجازة واحد على الأقل.');
        return;
      }
      setRegWeeklyOff(regWeeklyOff.filter(d => d !== dayId));
    } else {
      setRegWeeklyOff([...regWeeklyOff, dayId]);
    }
  };

  // Login Handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPhone.trim()) {
      setErrorMsg('يرجى كتابة رقم الهاتف.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorMsg('يرجى كتابة كلمة المرور.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.login(loginPhone.trim(), loginPassword.trim());
      if (res.success) {
        localStorage.setItem('office_auth_user', JSON.stringify(res.employee));
        onAuthSuccess(res.employee);
      } else {
        setErrorMsg(res.error || 'فشل تسجيل الدخول، تأكد من صحة رقم الهاتف وكلمة المرور.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Register Handler
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!regName.trim() || !regPhone.trim()) {
      setErrorMsg('الاسم بالكامل ورقم الهاتف مطلوبان.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('كلمة المرور يجب ألا تقل عن 4 خانات.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('كلمة المرور وتأكيد كلمة المرور غير متطابقين!');
      return;
    }

    if (regWeeklyOff.length === 0) {
      setErrorMsg('يرجى تحديد أيام الإجازة الأسبوعية.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const selectedTitle = (titles || []).find(t => t.code === regTitleCode);
      const res = await api.register({
        name: regName.trim(),
        phone: regPhone.trim(),
        pin: regPassword.trim(),
        titleCode: regTitleCode,
        jobTitle: selectedTitle ? selectedTitle.englishTitle : 'Specialist',
        branchId: regBranchId,
        weeklyOffDays: regWeeklyOff,
        avatar: regAvatar || avatarPreview || DEFAULT_AVATAR
      });

      if (res.success) {
        setSuccessMsg(res.message);
        localStorage.setItem('office_auth_user', JSON.stringify(res.employee));
        setTimeout(() => {
          onAuthSuccess(res.employee);
        }, 700);
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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-3 sm:p-5 selection:bg-amber-500 selection:text-black font-['Cairo',sans-serif]">
      {/* Decorative Brand Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative z-10 text-zinc-100">
        
        {/* Wadi Degla Shield Logo & Brand Header */}
        <div className="text-center mb-5">
          <div className="w-20 h-24 mx-auto mb-2 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Wadi Degla Clubs" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(245,184,0,0.3)]" 
            />
          </div>
          <h1 className="text-lg font-black text-amber-400 tracking-wide">أندية وادي دجلة</h1>
          <p className="text-[11px] text-zinc-400 font-bold tracking-wider uppercase mt-0.5">
            WADI DEGLA CLUBS • نظام الحضور والغياب
          </p>
        </div>

        {/* Tab Switcher (Login vs Register) */}
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl mb-5 border border-zinc-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
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
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
              setSuccessMsg('');
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
          <div className="bg-rose-950/70 border border-rose-700/80 p-3 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold mb-4 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/70 border border-emerald-700/80 p-3 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold mb-4 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
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
                className="w-full p-3 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>كلمة المرور:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-[11px] text-zinc-400 hover:text-amber-400 flex items-center gap-1"
                >
                  {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showLoginPassword ? 'إخفاء' : 'إظهار'}</span>
                </button>
              </label>
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الخاصة بك"
                dir="ltr"
                required
                className="w-full p-3 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{loading ? 'جاري التحقق...' : 'دخول إلى البرنامج'}</span>
            </button>
          </form>
        ) : (
          /* ================= REGISTER FORM ================= */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-right">
            
            {/* 1. Photo Picker with Direct Gallery & Camera Buttons */}
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <label className="block text-[11px] font-bold text-zinc-300 mb-2">
                الصورة الشخصية للموظف:
              </label>

              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer group relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500 shadow-md bg-zinc-900 flex items-center justify-center shrink-0">
                    {avatarPreview || regAvatar ? (
                      <img src={avatarPreview || regAvatar} alt="معاينة الصورة" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-zinc-600" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={photoCompressing}
                    className="hidden"
                  />
                </label>

                <div className="flex flex-col gap-1.5 items-stretch flex-1">
                  {/* Option 1: Gallery (No capture attribute - opens Photos / Gallery) */}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all">
                    {photoCompressing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-black" />
                        <span>🖼️ رفع صورة من المعرض</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={photoCompressing}
                      className="hidden"
                    />
                  </label>

                  {/* Option 2: Camera Selfie (with capture="user") */}
                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 font-bold text-xs active:scale-95 transition-all">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>📸 التقاط بالكاميرا</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoUpload}
                      disabled={photoCompressing}
                      className="hidden"
                    />
                  </label>
                </div>
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
                  placeholder="محمد علي"
                  required
                  className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
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
                  className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* 3. Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center justify-between">
                  <span>كلمة المرور:</span>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-[10px] text-zinc-400 hover:text-amber-400"
                  >
                    {showRegPassword ? 'إخفاء' : 'إظهار'}
                  </button>
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="4 أرقام أو حروف"
                  dir="ltr"
                  required
                  className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">تأكيد كلمة المرور:</label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={e => setRegConfirmPassword(e.target.value)}
                  placeholder="أعد كتابتها"
                  dir="ltr"
                  required
                  className="w-full p-2.5 text-xs font-bold text-left rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* 4. Branch Selection */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>اختر فرع وادي دجلة التابع له:</span>
              </label>
              <select
                value={regBranchId}
                onChange={e => setRegBranchId(e.target.value)}
                className="w-full p-2.5 text-xs font-black rounded-xl bg-zinc-950 border border-amber-500/50 text-amber-400 focus:outline-none focus:border-amber-400"
              >
                {branchList.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                    📍 نادي وادي دجلة - فرع {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Job Title & Hierarchy */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-amber-400" />
                <span>المسمى الوظيفي (الهرم الإداري):</span>
              </label>
              <select
                value={regTitleCode}
                onChange={e => setRegTitleCode(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {titles.map(t => (
                  <option key={t.code} value={t.code} className="bg-zinc-900 text-zinc-100">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Weekly Off Days */}
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
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
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
              disabled={loading || photoCompressing}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
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
