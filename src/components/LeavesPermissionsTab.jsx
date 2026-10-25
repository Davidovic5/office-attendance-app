import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Send, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Paperclip, 
  UserCheck, 
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import { api } from '../api';

export function LeavesPermissionsTab({ currentUser, onStatusChanged }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'new_request'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const [requestType, setRequestType] = useState('leave'); // 'leave' | 'permission'
  const [leaveType, setLeaveType] = useState('sick'); // 'sick' | 'travel' | 'annual' | 'casual' | 'weekly_off'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // Permission specific state
  const [permissionType, setPermissionType] = useState('morning'); // 'morning' | 'evening' | 'midday'
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');

  // Can current user approve?
  const canApprove = currentUser.permissions && currentUser.permissions.approve_leaves_permissions;

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('يرجى كتابة سبب الطلب بشكل واضح.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        employeeId: currentUser.id,
        type: requestType,
        reason: reason.trim(),
        attachmentName: attachmentName || null
      };

      if (requestType === 'leave') {
        payload.leaveType = leaveType;
        payload.startDate = startDate;
        payload.endDate = endDate;
      } else {
        payload.permissionType = permissionType;
        payload.permissionHours = 2; // ثابت ساعتين كما طلب
        payload.date = startDate;
        payload.startTime = startTime;
        payload.endTime = endTime;
      }

      const res = await api.createRequest(payload);
      if (res.success) {
        setSuccessMsg(res.message);
        setReason('');
        setAttachmentName('');
        setActiveSubTab('list');
        fetchRequests();
        if (onStatusChanged) onStatusChanged();
      } else {
        setErrorMsg(res.error || 'حدث خطأ في تقديم الطلب');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, status, defaultNote) => {
    setActionLoading(requestId);
    try {
      const res = await api.reviewRequest(
        requestId,
        currentUser.id,
        status,
        defaultNote || (status === 'approved' ? 'معتمد' : 'مرفوض')
      );
      if (res.success) {
        fetchRequests();
        if (onStatusChanged) onStatusChanged();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 pb-8 text-right">
      {/* Top Banner and Navigation Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-amber-400">الإجازات وأذونات الساعتين</h2>
          <p className="text-xs text-zinc-400">تقديم الطلبات ومتابعتها واعتمادها من الإدارة</p>
        </div>

        {/* Balance Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-xs font-bold text-amber-400">
            رصيدك: {currentUser.leaveBalance ?? 21} يوم
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl text-xs font-bold text-zinc-300">
            أذوناتك: {currentUser.permissionsBalanceHours ?? 6} س
          </div>
        </div>
      </div>

      {/* Subtab Toggle Buttons */}
      <div className="flex p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('list')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeSubTab === 'list'
              ? 'bg-amber-500 text-black shadow-xs font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          سجل الطلبات والموافقات ({requests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('new_request')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeSubTab === 'new_request'
              ? 'bg-amber-500 text-black shadow-xs font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          + تقديم طلب جديد
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-700/80 p-3.5 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-700/80 p-3.5 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Request List Subtab */}
      {activeSubTab === 'list' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center text-zinc-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30 text-amber-400" />
              <p className="text-xs font-bold">لا توجد طلبات مسجلة حتى الآن</p>
            </div>
          ) : (
            requests.map(req => {
              const isLeave = req.type === 'leave';
              const isApproved = req.status === 'approved';
              const isPending = req.status === 'pending';
              const isRejected = req.status === 'rejected';

              return (
                <div 
                  key={req.id} 
                  className={`bg-zinc-900 rounded-3xl p-4 border shadow-md transition-all ${
                    isPending ? 'border-amber-500/40' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={req.employeeAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                        alt={req.employeeName} 
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/40"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-zinc-100">{req.employeeName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            isLeave 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {isLeave ? 'طلب إجازة' : 'إذن ساعتين'}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">{req.employeeJobTitle}</span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black flex items-center gap-1 ${
                      isApproved 
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' 
                        : isPending 
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50 animate-pulse' 
                          : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                    }`}>
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {isPending && <Clock className="w-3 h-3 text-amber-400" />}
                      {isRejected && <XCircle className="w-3 h-3 text-rose-400" />}
                      {isApproved ? 'معتمد' : isPending ? 'قيد المراجعة' : 'مرفوض'}
                    </span>
                  </div>

                  {/* Details Box */}
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5 mb-2.5">
                    {isLeave ? (
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="font-semibold">نوع الإجازة والتاريخ:</span>
                        <span className="font-bold text-amber-400">
                          {req.leaveType === 'sick' && '🏥 إجازة مرضي'}
                          {req.leaveType === 'travel' && '✈️ سفر / مأمورية'}
                          {req.leaveType === 'weekly_off' && '🌴 عطلة أسبوعية'}
                          {req.leaveType === 'annual' && '🏖️ إجازة سنوية'}
                          {req.leaveType === 'casual' && '⚡ إجازة عارضة'}
                          {' • '} من {req.startDate} إلى {req.endDate}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-zinc-400">
                        <span className="font-semibold">موعد الإذن:</span>
                        <span className="font-bold text-amber-400">
                          🕒 ساعتين ({req.startTime} إلى {req.endTime}) - {req.date}
                        </span>
                      </div>
                    )}

                    <div className="pt-1 text-zinc-200 leading-relaxed font-medium">
                      <span className="text-zinc-500 font-bold">السبب: </span>
                      {req.reason}
                    </div>

                    {req.attachmentName && (
                      <div className="pt-1 text-[11px] text-amber-400 font-bold flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>مرفق: {req.attachmentName}</span>
                      </div>
                    )}
                  </div>

                  {/* Review Notes */}
                  {req.reviewNote && (
                    <div className="text-[11px] text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 mb-2">
                      <span className="font-bold text-amber-400">ملاحظة الإدارة: </span> {req.reviewNote}
                    </div>
                  )}

                  {/* Manager Approval Actions */}
                  {canApprove && isPending && (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                      <span className="text-[11px] font-bold text-zinc-400 ml-auto">إجراء المدير:</span>
                      <button
                        type="button"
                        onClick={() => handleReview(req.id, 'approved', 'تمت الموافقة والاعتماد')}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-black" />
                        <span>اعتماد وموافقة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(req.id, 'rejected', 'عذراً، يتعذر في هذا الوقت')}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                        <span>رفض</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Submit New Request Subtab */}
      {activeSubTab === 'new_request' && (
        <form onSubmit={handleSubmitRequest} className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 shadow-xl space-y-4">
          {/* Choose Request Type */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">حدد نوع الطلب:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('leave')}
                className={`py-3 px-4 rounded-2xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${
                  requestType === 'leave'
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>طلب إجازة (بأنواعها)</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('permission')}
                className={`py-3 px-4 rounded-2xl font-black text-xs border transition-all flex items-center justify-center gap-2 ${
                  requestType === 'permission'
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>طلب إذن ساعتين</span>
              </button>
            </div>
          </div>

          {/* If Leave Request */}
          {requestType === 'leave' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع الإجازة:</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="sick" className="bg-zinc-900 text-zinc-100">إجازة مرضي (Sick Leave)</option>
                  <option value="travel" className="bg-zinc-900 text-zinc-100">إجازة سفر / مأمورية عمل (Business Trip)</option>
                  <option value="annual" className="bg-zinc-900 text-zinc-100">إجازة سنوية / اعتيادية (Annual Leave)</option>
                  <option value="weekly_off" className="bg-zinc-900 text-zinc-100">إجازة أسبوعية / بديلة (Weekly Rest)</option>
                  <option value="casual" className="bg-zinc-900 text-zinc-100">إجازة عارضة (Casual Leave)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">تاريخ البداية:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">تاريخ النهاية:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>
            </>
          ) : (
            /* If 2-Hour Permission */
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع إذن الساعتين:</label>
                <select
                  value={permissionType}
                  onChange={e => setPermissionType(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="morning" className="bg-zinc-900 text-zinc-100">إذن تأخير صباحي (تأخير ساعتين في أول اليوم)</option>
                  <option value="evening" className="bg-zinc-900 text-zinc-100">إذن انصراف مبكر (انصراف قبل انتهاء الـ 8 ساعات بساعتين)</option>
                  <option value="midday" className="bg-zinc-900 text-zinc-100">إذن طارئ خلال اليوم (ساعتين لقضاء مصلحة)</option>
                </select>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-amber-300">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">
                  {permissionType === 'evening' 
                    ? 'عند اعتماد هذا الإذن، سيتمكن الموظف من عمل Check Out بعد إتمام 6 ساعات عمل فقط بدلاً من 8 ساعات.'
                    : 'إذن الساعتين معتمد بحد أقصى ساعتين ويتم خصمه من رصيد أذونات الموظف الشهري.'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">اليوم:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">من الساعة:</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">إلى الساعة:</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>
            </>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">سبب الطلب والتفاصيل:</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="اكتب سبب طلب الإجازة أو الإذن بالتفصيل..."
              rows={3}
              className="w-full p-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none font-medium"
            />
          </div>

          {/* Attachment Simulation */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">إرفاق تقرير طبي أو مستند (اختياري):</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={attachmentName}
                onChange={e => setAttachmentName(e.target.value)}
                placeholder="اسم الملف مثلاً: medical_report.pdf أو mission_ticket.png"
                className="flex-1 p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setAttachmentName('تقرير_طبي_' + new Date().toISOString().split('T')[0] + '.pdf')}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-amber-400 transition-colors border border-zinc-700"
              >
                📎 تجربة إرفاق
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 ml-1 text-black" />
            <span>{loading ? 'جاري إرسال الطلب...' : 'إرسال الطلب للاعتماد'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
