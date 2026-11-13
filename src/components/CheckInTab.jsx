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
  Hourglass,
  RefreshCw
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
  
  // Real Phone GPS State (No Simulation)
  const [userCoords, setUserCoords] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState({
    distanceMeters: null,
    isWithinOffice: false,
    checkedAt: null
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Early Checkout Modal state
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [earlyReason, setEarlyReason] = useState('');

  const shiftHours = officeSettings?.shiftHours || 8;
  const shiftSeconds = shiftHours * 3600;

  // Real GPS reader using phone hardware
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('المتصفح أو الهاتف لا يدعم تحديد الموقع الجغرافي (GPS).'));
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        err => {
          let msg = 'تعذر الوصول إلى موقع الـ GPS للهاتف.';
          if (err.code === 1) {
            msg = 'تم رفض إذن تحديد الموقع. يرجى تفعيل خدمة الـ GPS في الهاتف والسماح للمتصفح بالوصول لموقعك لتسجيل الحضور.';
          } else if (err.code === 2) {
            msg = 'إشارة الـ GPS غير متوفرة حالياً، يرجى تشغيل الموقع والتأكد من وضوح الإشارة.';
          } else if (err.code === 3) {
            msg = 'انتهت مهلة قراءة إشارة الـ GPS. يرجى إعادة المحاولة.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  // Refresh live distance
  const refreshLocation = async (silent = false) => {
    setGpsLoading(true);
    if (!silent) setErrorMsg('');

    try {
      const coords = await getCurrentLocation();
      setUserCoords(coords);

      const res = await api.verifyDistance(coords.lat, coords.lng, branch.id);
      if (res.success) {
        setDistanceInfo({
          distanceMeters: res.distanceMeters,
          isWithinOffice: res.isWithinOffice,
          checkedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        });
      }
      return coords;
    } catch (err) {
      if (!silent) setErrorMsg(err.message);
      return null;
    } finally {
      setGpsLoading(false);
    }
  };

  // Auto-ping live location on initial mount quietly
  useEffect(() => {
    refreshLocation(true);
  }, [branch.id]);

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

  // Perform Live Check In (Always clickable: checks real GPS, verifies distance, blocks if outside)
  const handleCheckIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Read fresh real GPS from phone hardware
      let coords = null;
      try {
        coords = await getCurrentLocation();
        setUserCoords(coords);
      } catch (gpsErr) {
        setErrorMsg(gpsErr.message);
        setLoading(false);
        return;
      }

      // 2. Verify live distance against branch coordinates
      const distRes = await api.verifyDistance(coords.lat, coords.lng, branch.id);
      if (distRes.success) {
        setDistanceInfo({
          distanceMeters: distRes.distanceMeters,
          isWithinOffice: distRes.isWithinOffice,
          checkedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        });

        // 3. Block if outside the 150m radius and clearly tell the employee their distance!
        if (!distRes.isWithinOffice) {
          setErrorMsg(
            `عذراً، لا يمكنك تسجيل الحضور لأنك بعيد عن مقر نادي وادي دجلة - فرع (${branch.name}) بمسافة ${distRes.distanceMeters} متر! (النطاق المسموح به ${branch.radiusMeters} متر فقط). يرجى التواجد داخل النادي والضغط مجدداً.`
          );
          setLoading(false);
          return;
        }
      }

      // 4. Send check-in request with verified real coordinates
      const res = await api.checkIn(currentUser.id, coords.lat, coords.lng);
      if (res.success) {
        setSuccessMsg(res.message || `تم تسجيل حضورك بنجاح في فرع ${branch.name}`);
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
      let lat = userCoords?.lat || branch.latitude;
      let lng = userCoords?.lng || branch.longitude;

      try {
        const liveCoords = await getCurrentLocation();
        lat = liveCoords.lat;
        lng = liveCoords.lng;
        setUserCoords(liveCoords);
      } catch (e) {
        console.warn('Checkout GPS fallback:', e.message);
      }

      const res = await api.checkOut(
        currentUser.id,
        lat,
        lng,
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
        <div className="bg-rose-950/80 border border-rose-700 p-4 rounded-2xl flex items-start gap-2.5 text-rose-200 text-xs shadow-lg animate-fade-in leading-relaxed">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 p-4 rounded-2xl flex items-start gap-2.5 text-emerald-200 text-xs shadow-lg animate-fade-in leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-black">{successMsg}</div>
        </div>
      )}

      {/* GPS Location & Branch Card (Clean Production View - Real Phone GPS) */}
      <div className="bg-zinc-900 rounded-3xl p-4 shadow-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 text-zinc-100 font-black text-xs min-w-0">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">نطاق فرعك الجغرافي (GPS)</span>
          </div>

          {distanceInfo.distanceMeters !== null ? (
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-black flex items-center gap-1.5 shrink-0 ${
              distanceInfo.isWithinOffice 
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60' 
                : 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${distanceInfo.isWithinOffice ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`}></span>
              {distanceInfo.isWithinOffice ? 'داخل نطاق النادي' : 'خارج نطاق النادي'}
            </span>
          ) : (
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
              {gpsLoading ? 'جاري القياس...' : 'اضغط للتحديد'}
            </span>
          )}
        </div>

        <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 text-xs text-zinc-300 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-bold">فرعك المعتمد:</span>
            <span className="font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" />
              <span>فرع {branch.name}</span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400 font-bold">المسافة الحالية عن المقر:</span>
            <span className={`font-mono font-black text-sm ${
              distanceInfo.distanceMeters === null 
                ? 'text-zinc-400' 
                : distanceInfo.isWithinOffice 
                  ? 'text-emerald-400' 
                  : 'text-rose-400'
            }`}>
              {distanceInfo.distanceMeters !== null 
                ? `${distanceInfo.distanceMeters} متر` 
                : (gpsLoading ? 'جاري القياس...' : 'اضغط تسجيل الحضور للقياس')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">النطاق المسموح به:</span>
            <span className="font-semibold text-zinc-200">{branch.radiusMeters} متر</span>
          </div>
        </div>

        {/* Quick Location Refresh Bar */}
        <div className="pt-2.5 mt-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">
            {distanceInfo.checkedAt ? `آخر فحص: ${distanceInfo.checkedAt}` : 'يتم الفحص تلقائياً عبر GPS الهاتف'}
          </span>
          <button
            type="button"
            onClick={() => refreshLocation(false)}
            disabled={gpsLoading}
            className="py-1 px-2.5 rounded-lg font-bold bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'جاري الفحص...' : 'فحص الموقع الآن'}</span>
          </button>
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
              اضغط الزر للتحقق من موقعك الحالي وتسجيل حضورك في <b>فرع {branch.name}</b> وبدء احتساب وردية الـ {shiftHours} ساعات.
            </p>

            {/* Check-In Button: ALWAYS CLICKABLE (Calculates real GPS on click, checks range, blocks if outside) */}
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/25 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-black shrink-0" />
              <span className="truncate">{loading ? 'جاري التحقق من موقعك وتسجيل الحضور...' : `تسجيل الحضور في فرع ${branch.name}`}</span>
            </button>
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
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-amber-400 bg-zinc-950 hover:bg-zinc-800 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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