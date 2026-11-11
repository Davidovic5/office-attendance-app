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
  Building2,
  Sparkles,
  Send,
  Hourglass
} from 'lucide-react';
import { api } from '../api';

export function CheckInTab({ currentUser, officeSettings, onAttendanceUpdated }) {
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [completedRecord, setCompletedRecord] = useState(null);
  const [todayEarlyRequest, setTodayEarlyRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [earlySubmitting, setEarlySubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // High-level authority: Executive Director, Area Manager, Memberships Manager
  const isExecutiveOrManager = [
    'memberships_executive_director',
    'memberships_area_manager',
    'memberships_manager'
  ].includes(currentUser.titleCode);

  // Employee's branch
  const branch = currentUser.branchDetails || {
    id: 'branch_october2',
    name: 'اكتوبر ٢',
    latitude: 29.9652734,
    longitude: 30.9634410,
    radiusMeters: 150
  };
  
  // GPS State
  const [gpsMode, setGpsMode] = useState('simulated_in');
  const [userCoords, setUserCoords] = useState({
    lat: branch.latitude,
    lng: branch.longitude
  });
  const [distanceInfo, setDistanceInfo] = useState({
    distanceMeters: 0,
    isWithinOffice: true
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Early Checkout Modal state
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');

  const shiftHours = officeSettings?.shiftHours || 8;
  const shiftSeconds = shiftHours * 3600;

  // Fetch today's attendance & early checkout requests
  const fetchAttendance = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await api.getTodayAttendance();
      if (data.success) {
        const myActive = data.records.find(
          r => r.employeeId === currentUser.id && !r.checkOutTime
        );
        setCurrentAttendance(myActive || null);

        const myCompleted = data.records
          .filter(r => r.employeeId === currentUser.id && r.checkOutTime)
          .sort((a, b) => new Date(b.checkOutTime) - new Date(a.checkOutTime))[0];
        setCompletedRecord(myCompleted || null);

        if (myActive) {
          const checkInTime = new Date(myActive.checkInTime).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((now - checkInTime) / 1000)));
        }
      }

      // Fetch early checkout requests for current user today
      const reqRes = await api.getRequests({ employeeId: currentUser.id, type: 'early_checkout' });
      if (reqRes.success && reqRes.requests) {
        const todayReq = reqRes.requests.find(
          r => r.date === todayStr || (r.requestedAt && r.requestedAt.startsWith(todayStr))
        );
        setTodayEarlyRequest(todayReq || null);
      }
    } catch (err) {
      console.error('fetchAttendance error:', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentUser]);

  // Reactive poll if pending early checkout request exists
  useEffect(() => {
    if (todayEarlyRequest && todayEarlyRequest.status === 'pending') {
      const pollTimer = setInterval(() => {
        fetchAttendance();
      }, 5000);
      return () => clearInterval(pollTimer);
    }
  }, [todayEarlyRequest]);

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

  // Calculate distance against current employee's branch
  useEffect(() => {
    if (userCoords.lat && userCoords.lng) {
      api.verifyDistance(userCoords.lat, userCoords.lng, branch.id)
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
  }, [userCoords, branch]);

  // GPS Simulation or Real GPS Handler
  const handleGpsModeChange = (mode) => {
    setGpsMode(mode);
    setErrorMsg('');
    if (mode === 'simulated_in') {
      setUserCoords({
        lat: branch.latitude + 0.0001,
        lng: branch.longitude + 0.0001
      });
    } else if (mode === 'simulated_out') {
      setUserCoords({
        lat: branch.latitude + 0.0050, // ~500 meters away
        lng: branch.longitude + 0.0050
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
        fetchAttendance();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الحضور');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Perform Direct Check Out (for regular checkout or executive override)
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
        fetchAttendance();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء تسجيل الانصراف');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  // Submit Emergency Early Checkout Request (for subordinate titles)
  const handleEarlyCheckoutRequest = async () => {
    if (!earlyReason.trim()) {
      setErrorMsg('يرجى كتابة سبب الانصراف الطارئ بالتفصيل.');
      return;
    }

    setEarlySubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.createRequest({
        employeeId: currentUser.id,
        type: 'early_checkout',
        date: todayStr,
        reason: earlyReason.trim()
      });

      if (res.success) {
        setSuccessMsg('تم إرسال طلب الانصراف الطارئ بنجاح لمدير العضويات (Memberships Manager). سيتم تسجيل انصرافك تلقائياً عند اعتماده.');
        setShowEarlyModal(false);
        setEarlyReason('');
        await fetchAttendance();
      } else {
        setErrorMsg(res.error || 'فشل إرسال طلب الانصراف الطارئ');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setEarlySubmitting(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, shiftSeconds - elapsedSeconds);
  const progressPercent = Math.min(100, (elapsedSeconds / shiftSeconds) * 100);
  const canCheckOutRegular = elapsedSeconds >= shiftSeconds;

  const isEarlyPending = todayEarlyRequest && todayEarlyRequest.status === 'pending';
  const isEarlyApproved = todayEarlyRequest && todayEarlyRequest.status === 'approved';
  const isEarlyRejected = todayEarlyRequest && todayEarlyRequest.status === 'rejected';

  return (
    <div className="space-y-4 pb-8 text-right">
      {/* Notifications */}
      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-700/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-300 text-xs shadow-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-700/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-emerald-300 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-black leading-relaxed">{successMsg}</div>
        </div>
      )}

      {/* GPS Location & Branch Card */}
      <div className="bg-zinc-900 rounded-3xl p-4 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-100 font-black text-xs">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>نطاق فرعك الجغرافي (GPS)</span>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 ${
            distanceInfo.isWithinOffice 
              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' 
              : 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${distanceInfo.isWithinOffice ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
            {distanceInfo.isWithinOffice ? 'داخل نطاق النادي' : 'خارج نطاق النادي'}
          </span>
        </div>

        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 mb-3 text-xs text-zinc-300 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-bold">فرعك المعتمد:</span>
            <span className="font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" />
              <span>فرع {branch.name}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-bold">المسافة الحالية عن المقر:</span>
            <span className={`font-mono font-black text-sm ${distanceInfo.isWithinOffice ? 'text-emerald-400' : 'text-rose-400'}`}>
              {distanceInfo.distanceMeters} متر
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">النطاق المسموح به:</span>
            <span className="font-semibold text-zinc-200">{branch.radiusMeters} متر</span>
          </div>
        </div>

        {/* GPS Simulation / Real Toggle */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="text-[11px] text-zinc-400 font-bold mb-2">محاكاة الموقع لاختبار النظام:</div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleGpsModeChange('simulated_in')}
              className={`text-[11px] py-1.5 px-2 rounded-xl font-bold border transition-all ${
                gpsMode === 'simulated_in'
                  ? 'bg-amber-500 text-black border-amber-500 shadow-xs font-black'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              📍 داخل النادي
            </button>
            <button
              type="button"
              onClick={() => handleGpsModeChange('simulated_out')}
              className={`text-[11px] py-1.5 px-2 rounded-xl font-bold border transition-all ${
                gpsMode === 'simulated_out'
                  ? 'bg-rose-900/90 text-rose-200 border-rose-700 shadow-xs font-black'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              🚶 خارج النادي
            </button>
            <button
              type="button"
              onClick={() => handleGpsModeChange('real')}
              disabled={gpsLoading}
              className={`text-[11px] py-1.5 px-2 rounded-xl font-bold border transition-all ${
                gpsMode === 'real'
                  ? 'bg-amber-500 text-black border-amber-500 shadow-xs font-black'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {gpsLoading ? 'جاري...' : '📡 GPS الفعلي'}
            </button>
          </div>
        </div>
      </div>

      {/* Completed Checkout Today Banner */}
      {!currentAttendance && completedRecord && (
        <div className="bg-emerald-950/70 border border-emerald-600/70 p-4 rounded-3xl text-right space-y-2 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              تم تسجيل انصرافك لهذا اليوم بنجاح
            </span>
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-900/50 px-2 py-0.5 rounded-lg border border-emerald-700/50">
              {new Date(completedRecord.checkOutTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="text-xs text-zinc-300 bg-zinc-950/80 p-2.5 rounded-2xl border border-zinc-800 flex justify-between items-center">
            <span className="text-zinc-400 font-bold">إجمالي ساعات العمل المسجلة:</span>
            <span className="font-mono font-black text-amber-400">
              {Math.floor(completedRecord.durationMinutes / 60)} س و {completedRecord.durationMinutes % 60} د
            </span>
          </div>
          {completedRecord.checkOutNotes && (
            <div className="text-[11px] text-zinc-300 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80">
              <span className="font-bold text-amber-400">بيان الانصراف: </span>
              {completedRecord.checkOutNotes}
            </div>
          )}
        </div>
      )}

      {/* Main Attendance Card */}
      <div className="bg-zinc-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-500/30 text-center relative overflow-hidden">
        {!currentAttendance ? (
          <div>
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-zinc-950 flex items-center justify-center text-amber-400 border border-amber-500/30 shadow-inner">
              <LogIn className="w-8 h-8 ml-0.5" />
            </div>
            <h2 className="text-lg font-black text-amber-300 mb-1">تسجيل الحضور اليومي</h2>
            <p className="text-xs text-zinc-400 mb-5 max-w-xs mx-auto leading-relaxed">
              اضغط الزر لتسجيل حضورك في <b>فرع {branch.name}</b> وبدء احتساب وردية الـ {shiftHours} ساعات.
            </p>

            {/* Check-In Button */}
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={loading || !distanceInfo.isWithinOffice}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2.5 ${
                distanceInfo.isWithinOffice
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/25 active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
              }`}
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>{loading ? 'جاري التحقق...' : `تسجيل الحضور الآن في فرع ${branch.name}`}</span>
            </button>

            {!distanceInfo.isWithinOffice && (
              <p className="text-xs text-rose-400 mt-2.5 font-bold flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>يجب التواجد داخل نطاق نادي وادي دجلة - فرع ({branch.name})</span>
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-3.5 py-1.5 rounded-full text-xs font-black mb-3 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>تمام كدا انت دلوقتي في العمل</span>
            </div>

            <h2 className="text-xl font-black text-zinc-100 mb-0.5">وردية العمل جارية</h2>
            <p className="text-xs text-zinc-400 mb-5">
              مسجل في <b>فرع {branch.name}</b> الساعة {new Date(currentAttendance.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </p>

            {/* Circular Timer Ring */}
            <div className="relative w-44 h-44 mx-auto mb-5 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="88" cy="88" r="76" stroke="#27272a" strokeWidth="10" fill="transparent" />
                <circle
                  cx="88"
                  cy="88"
                  r="76"
                  stroke={canCheckOutRegular ? '#10b981' : '#f59e0b'}
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 76}
                  strokeDashoffset={2 * Math.PI * 76 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-zinc-400 mb-0.5">الوقت المنقضي</span>
                <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-[10px] font-bold text-zinc-400 mt-0.5">
                  {Math.round(progressPercent)}% من الـ {shiftHours} ساعات
                </span>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 mb-4 text-xs flex items-center justify-between text-zinc-300">
              <div className="flex items-center gap-1.5 text-zinc-400 font-bold">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>المتبقي لانتهاء الـ {shiftHours} ساعات:</span>
              </div>
              <span className={`font-mono font-black text-sm ${canCheckOutRegular ? 'text-emerald-400' : 'text-amber-400'}`}>
                {canCheckOutRegular ? 'اكتملت ساعات العمل 🎉' : formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Pending Early Checkout Notice Card */}
            {isEarlyPending && (
              <div className="bg-amber-950/80 border border-amber-500/60 p-4 rounded-2xl text-right mb-4 animate-pulse space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                    <Hourglass className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>طلب انصراف طارئ قيد المراجعة</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    بانتظار موافقة مدير العضويات
                  </span>
                </div>
                <div className="text-xs text-zinc-300 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 font-bold">السبب المرفوع: </span>
                  <span className="text-zinc-200 font-semibold">{todayEarlyRequest.reason}</span>
                </div>
                <p className="text-[11px] text-amber-300 font-bold">
                  ⚡ سيتم تسجيل انصرافك وإنهاء ورديتك تلقائياً فور موافقة مدير العضويات (Memberships Manager).
                </p>
              </div>
            )}

            {/* Rejected Early Checkout Notice Card */}
            {isEarlyRejected && (
              <div className="bg-rose-950/80 border border-rose-700/80 p-3.5 rounded-2xl text-right mb-4 space-y-1">
                <div className="flex items-center gap-2 text-rose-300 font-black text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>تم رفض طلب الانصراف الطارئ</span>
                </div>
                <p className="text-xs text-rose-200">
                  ملاحظة الإدارة: {todayEarlyRequest.reviewNote || 'يرجى استكمال ساعات الوردية كاملة'}
                </p>
              </div>
            )}

            {/* Check-Out Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCheckOut(false)}
                disabled={loading || !canCheckOutRegular}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                  canCheckOutRegular
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-[0.98]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
                }`}
              >
                {canCheckOutRegular ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4 text-zinc-500" />}
                <span>
                  {canCheckOutRegular 
                    ? 'تسجيل الانصراف (Check Out)' 
                    : `الانصراف مقفل (متبقي ${formatTime(remainingSeconds)})`}
                </span>
              </button>

              {/* Early Checkout Trigger Button */}
              {!canCheckOutRegular && !isEarlyPending && (
                <button
                  type="button"
                  onClick={() => setShowEarlyModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-amber-400 bg-zinc-950 hover:bg-zinc-800 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>
                    {isExecutiveOrManager 
                      ? 'تسجيل انصراف مبكر مباشر (صلاحية إدارية)' 
                      : 'طلب انصراف طارئ (يتطلب موافقة مدير العضويات Memberships Manager)'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Early Checkout Modal */}
      {showEarlyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-amber-500/30 text-right animate-scale-up text-zinc-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-black text-amber-400 mb-1">
              {isExecutiveOrManager 
                ? 'تسجيل انصراف مبكر (صلاحية إدارية)' 
                : 'تقديم طلب انصراف مبكر طارئ'}
            </h3>
            
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              {isExecutiveOrManager 
                ? `بصفتك (${currentUser.jobTitle})، يحق لك إنهاء ورديتك مبكراً مع كتابة سبب الانصراف.`
                : 'وفقاً للائحة أندية وادي دجلة، يتطلب الانصراف قبل إتمام الـ 8 ساعات تقديم طلب طارئ وموافقة مدير العضويات (Memberships Manager).'}
            </p>

            {!isExecutiveOrManager && (
              <div className="bg-amber-950/60 border border-amber-500/40 p-2.5 rounded-xl text-[11px] text-amber-300 font-bold mb-3 leading-relaxed">
                ⚠️ تنبيه: لن يتم تسجيل الانصراف فوراً، بل سيصل إشعار لمدير العضويات لاعتماده. فور الموافقة سيتم إنهاء الوردية تلقائياً.
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">سبب الانصراف الطارئ:</label>
              <textarea
                value={earlyReason}
                onChange={e => setEarlyReason(e.target.value)}
                placeholder="اكتب سبب الانصراف بالتفصيل..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEarlyModal(false);
                  setEarlyReason('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
              >
                إلغاء
              </button>

              {isExecutiveOrManager ? (
                <button
                  type="button"
                  disabled={!earlyReason.trim() || loading}
                  onClick={() => handleCheckOut(true, earlyReason)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'جاري التأكيد...' : 'تأكيد الانصراف الفوري'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!earlyReason.trim() || earlySubmitting}
                  onClick={handleEarlyCheckoutRequest}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{earlySubmitting ? 'جاري الإرسال...' : 'إرسال لمدير العضويات'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}