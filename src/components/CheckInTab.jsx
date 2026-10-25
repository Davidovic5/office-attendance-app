import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  LogIn, 
  LogOut, 
  Timer, 
  Compass, 
  ShieldCheck, 
  FileText,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../api';

export function CheckInTab({ currentUser, officeSettings, onAttendanceUpdated }) {
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // GPS State
  const [gpsMode, setGpsMode] = useState('simulated_in'); // 'simulated_in', 'simulated_out', 'real'
  const [userCoords, setUserCoords] = useState({
    lat: officeSettings.latitude,
    lng: officeSettings.longitude
  });
  const [distanceInfo, setDistanceInfo] = useState({
    distanceMeters: 0,
    isWithinOffice: true
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Early Checkout Modal state
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');

  // 8 Hours in seconds
  const shiftHours = officeSettings.shiftHours || 8;
  const shiftSeconds = shiftHours * 3600;

  // Fetch today's attendance for current user
  const fetchAttendance = async () => {
    try {
      const data = await api.getTodayAttendance();
      if (data.success) {
        const myRecord = data.records.find(
          r => r.employeeId === currentUser.id && !r.checkOutTime
        );
        setCurrentAttendance(myRecord || null);

        if (myRecord) {
          const checkInTime = new Date(myRecord.checkInTime).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((now - checkInTime) / 1000)));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentUser]);

  // Live timer tick every second if checked in
  useEffect(() => {
    let interval = null;
    if (currentAttendance) {
      interval = setInterval(() => {
        const checkInTime = new Date(currentAttendance.checkInTime).getTime();
        const now = Date.now();
        const secs = Math.max(0, Math.floor((now - checkInTime) / 1000));
        setElapsedSeconds(secs);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [currentAttendance]);

  // Calculate distance whenever userCoords or officeSettings change
  useEffect(() => {
    if (userCoords.lat && userCoords.lng) {
      api.verifyDistance(userCoords.lat, userCoords.lng)
        .then(res => {
          if (res.success) {
            setDistanceInfo({
              distanceMeters: res.distanceMeters,
              isWithinOffice: res.isWithinOffice
            });
          }
        })
        .catch(console.error);
    }
  }, [userCoords, officeSettings]);

  // GPS Simulation or Real GPS Handler
  const handleGpsModeChange = (mode) => {
    setGpsMode(mode);
    setErrorMsg('');
    if (mode === 'simulated_in') {
      setUserCoords({
        lat: officeSettings.latitude + 0.0001, // ~11 meters away
        lng: officeSettings.longitude + 0.0001
      });
    } else if (mode === 'simulated_out') {
      setUserCoords({
        lat: officeSettings.latitude + 0.0045, // ~500 meters away
        lng: officeSettings.longitude + 0.0045
      });
    } else if (mode === 'real') {
      setGpsLoading(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            setUserCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            setGpsLoading(false);
          },
          err => {
            setErrorMsg('تعذر الوصول إلى موقع الـ GPS الفعلي للهاتف: ' + err.message);
            setGpsLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setErrorMsg('المتصفح لا يدعم تحديد الموقع الجغرافي.');
        setGpsLoading(false);
      }
    }
  };

  // Perform Check In
  const handleCheckIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.checkIn(currentUser.id, userCoords.lat, userCoords.lng);
      if (res.success) {
        setSuccessMsg(res.message);
        setCurrentAttendance(res.record);
        if (onAttendanceUpdated) onAttendanceUpdated();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الحضور');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Perform Check Out
  const handleCheckOut = async (forceOverride = false, reason = '') => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.checkOut(
        currentUser.id,
        userCoords.lat,
        userCoords.lng,
        forceOverride,
        reason
      );
      if (res.success) {
        setSuccessMsg(res.message);
        setCurrentAttendance(null);
        setShowEarlyModal(false);
        setEarlyReason('');
        if (onAttendanceUpdated) onAttendanceUpdated();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الانصراف');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, shiftSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / shiftSeconds) * 100);
  const canCheckOutRegular = elapsedSeconds >= shiftSeconds;

  return (
    <div className="space-y-5 pb-8">
      {/* Notifications */}
      {errorMsg && (
        <div className="bg-rose-50 border-r-4 border-rose-500 p-4 rounded-xl flex items-start gap-3 text-rose-800 text-sm shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3 text-emerald-900 text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* GPS Location & Geofencing Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>نطاق الحضور الجغرافي (GPS)</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
            distanceInfo.isWithinOffice 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-rose-100 text-rose-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${distanceInfo.isWithinOffice ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
            {distanceInfo.isWithinOffice ? 'داخل نطاق المكتب' : 'خارج نطاق المكتب'}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-3 text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">المقر:</span>
            <span className="font-semibold text-slate-700">{officeSettings.officeName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">المسافة الحالية عن المكتب:</span>
            <span className={`font-bold text-sm ${distanceInfo.isWithinOffice ? 'text-emerald-600' : 'text-rose-600'}`}>
              {distanceInfo.distanceMeters} متر
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">الحد الأقصى المسموح:</span>
            <span className="font-semibold text-slate-700">{officeSettings.radiusMeters} متر</span>
          </div>
        </div>

        {/* GPS Mode Selector for Testing & Reality */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium mb-2">محاكاة الموقع لاختبار النظام:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleGpsModeChange('simulated_in')}
              className={`text-xs py-2 px-2.5 rounded-xl font-bold border transition-all ${
                gpsMode === 'simulated_in'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              📍 داخل المكتب (~15م)
            </button>
            <button
              onClick={() => handleGpsModeChange('simulated_out')}
              className={`text-xs py-2 px-2.5 rounded-xl font-bold border transition-all ${
                gpsMode === 'simulated_out'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🚶 خارج المكتب (~500م)
            </button>
            <button
              onClick={() => handleGpsModeChange('real')}
              disabled={gpsLoading}
              className={`text-xs py-2 px-2.5 rounded-xl font-bold border transition-all ${
                gpsMode === 'real'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {gpsLoading ? 'جاري التحديد...' : '📡 GPS الفعلي'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Attendance Status & Actions */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 text-center relative overflow-hidden">
        {/* Status Header */}
        {!currentAttendance ? (
          <div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
              <LogIn className="w-10 h-10 ml-0.5" />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-1">تسجيل الحضور اليومي</h2>
            <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
              اضغط الزر لتسجيل حضورك وبدء احتساب وردية الـ {shiftHours} ساعات بمجرد وصولك لمقر المكتب.
            </p>

            {/* Check-In Button */}
            <button
              onClick={handleCheckIn}
              disabled={loading || !distanceInfo.isWithinOffice}
              className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-3 ${
                distanceInfo.isWithinOffice
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>{loading ? 'جاري التحقق والتسجيل...' : 'تسجيل الحضور الآن (Check In)'}</span>
            </button>

            {!distanceInfo.isWithinOffice && (
              <p className="text-xs text-rose-500 mt-3 font-semibold flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>يجب التواجد داخل مقر المكتب لتتمكن من تسجيل الحضور</span>
              </p>
            )}
          </div>
        ) : (
          /* When Checked In */
          <div>
            {/* Success Banner */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold mb-4 animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>تمام كدا انت دلوقتي في العمل</span>
            </div>

            <h2 className="text-2xl font-black text-slate-800 mb-1">وردية العمل جارية</h2>
            <p className="text-xs text-slate-500 mb-6">
              تم تسجيل حضورك الساعة {new Date(currentAttendance.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* 8-Hour Circular Progress & Live Timer */}
            <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  stroke={canCheckOutRegular ? '#10b981' : '#3b82f6'}
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 84}
                  strokeDashoffset={2 * Math.PI * 84 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              {/* Inside Timer Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-slate-400 mb-1">الوقت المنقضي</span>
                <span className="text-2xl font-black font-mono text-slate-800 tracking-tight">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-[11px] font-bold text-blue-600 mt-1">
                  {Math.round(progressPercent)}% من الـ {shiftHours} ساعات
                </span>
              </div>
            </div>

            {/* Countdown to 8 hours */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-6 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Timer className="w-4 h-4 text-slate-400" />
                <span>المتبقي لإتمام {shiftHours} ساعات:</span>
              </div>
              <span className={`font-mono font-bold text-sm ${canCheckOutRegular ? 'text-emerald-600' : 'text-slate-800'}`}>
                {canCheckOutRegular ? 'اكتملت الـ 8 ساعات 🎉' : formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Check-Out Button (Locked until 8 hours) */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleCheckOut(false)}
                disabled={loading || !canCheckOutRegular}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-3 ${
                  canCheckOutRegular
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-500/25 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {canCheckOutRegular ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 text-slate-400" />}
                <span>
                  {canCheckOutRegular 
                    ? 'تسجيل الانصراف (Check Out)' 
                    : `الانصراف مقفل (متبقي ${formatTime(remainingSeconds)})`}
                </span>
              </button>

              {/* Early Checkout Override Option */}
              {!canCheckOutRegular && (
                <button
                  type="button"
                  onClick={() => setShowEarlyModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>طلب انصراف طارئ / إذن استثنائي قبل الـ 8 ساعات</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Early Checkout Modal */}
      {showEarlyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-2">طلب انصراف مبكر / طارئ</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              وفقاً لقواعد المكتب، يلزم إتمام 8 ساعات عمل. لتسجيل الانصراف المبكر، يرجى كتابة السبب لاعتماده في سجل الحضور.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">سبب الانصراف المبكر:</label>
              <textarea
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                placeholder="مثال: ظرف صحي طارئ، إذن مسبق معتمد، مأمورية خارجية..."
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEarlyModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!earlyReason.trim() || loading}
                onClick={() => handleCheckOut(true, earlyReason)}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {loading ? 'جاري التأكيد...' : 'تأكيد الانصراف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
