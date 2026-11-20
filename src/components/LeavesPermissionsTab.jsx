import React, { useState, useEffect, useRef } from 'react';
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
  ThumbsUp, 
  ThumbsDown, 
  Info, 
  Building2, 
  FileUp, 
  X, 
  Eye, 
  Sparkles,
  Plane
} from 'lucide-react';
import { api } from '../api';
import { getUserAllowedBranches } from '../utils/userScope';
import { getDayInfoFromDateStr, DAY_ID_TO_ARABIC } from '../utils/dateHelpers';

export function LeavesPermissionsTab({ currentUser, onStatusChanged }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'new_request'
  const [requests, setRequests] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state: ONLY 2 request types (leave | permission)
  const [requestType, setRequestType] = useState('leave'); // 'leave' | 'permission'
  const [leaveType, setLeaveType] = useState('annual'); // 'annual' | 'sick' | 'casual' | 'work_mission' | 'weekly_rest_compensation' | 'holiday_compensation'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Real Attachment for Sick Leave only
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentData, setAttachmentData] = useState(null);
  const [attachmentSize, setAttachmentSize] = useState(null);
  const fileInputRef = useRef(null);

  // Work mission fields
  const [missionBranchId, setMissionBranchId] = useState('');
  const [missionDate, setMissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Rest & Holiday compensation fields
  const [compensationOffDate, setCompensationOffDate] = useState(new Date().toISOString().split('T')[0]);
  const [compensationWorkedDate, setCompensationWorkedDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidayName, setHolidayName] = useState('');

  // Permission specific state
  const [permissionType, setPermissionType] = useState('morning'); // 'morning' (تأخير صباحي) | 'evening' (انصراف مبكر)
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');

  // Preview Attachment Modal
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Authority levels
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin || currentUser?.phone === '01010046078');
  const isExecutive = currentUser?.titleCode === 'memberships_executive_director';
  const isAreaMgr = currentUser?.titleCode === 'memberships_area_manager';
  const isBranchMgr = currentUser?.titleCode === 'memberships_manager';

  // Employee weekly off days calculation
  const userOffDays = currentUser?.weeklyOffDays || ['friday', 'saturday'];
  const userOffDaysNames = userOffDays.map(id => DAY_ID_TO_ARABIC[id] || id).join(' و ');
  const startDayInfo = getDayInfoFromDateStr(startDate, userOffDays);
  const endDayInfo = getDayInfoFromDateStr(endDate, userOffDays);

  // Only manager and higher ranks can approve requests
  const canApprove = isSuperAdmin || isExecutive || isAreaMgr || isBranchMgr;

  useEffect(() => {
    api.getBranches().then(res => {
      if (res.success && res.branches) {
        setBranches(res.branches);
        const available = res.branches.filter(b => b.id !== currentUser.branchId);
        if (available.length > 0) {
          setMissionBranchId(available[0].id);
        } else if (res.branches.length > 0) {
          setMissionBranchId(res.branches[0].id);
        }
      }
    }).catch(console.error);
  }, [currentUser.branchId]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let params = {};

      if (isSuperAdmin || isExecutive) {
        // Can view all branches
      } else if (isAreaMgr) {
        const allowed = getUserAllowedBranches(currentUser, branches);
        if (allowed.length > 0) {
          params.branchId = allowed.map(b => b.id).join(',');
        }
      } else if (isBranchMgr) {
        // Memberships manager manages their branch requests
        params.branchId = currentUser.branchId;
      } else {
        // Subordinate employees ONLY see their own requests!
        params.employeeId = currentUser.id;
      }

      const res = await api.getRequests(params);
      if (res.success) {
        let list = res.requests || [];
        // If branch manager, show their branch subordinates or their own
        if (isBranchMgr && !isSuperAdmin && !isExecutive) {
          list = list.filter(r => r.employeeId === currentUser.id || r.branchId === currentUser.branchId);
        }
        setRequests(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [branches, currentUser]);

  // Handle file picker for sick leave
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الملف كبير جداً، الحد الأقصى المسموح به هو 5 ميجابايت.');
      return;
    }

    setAttachmentName(file.name);
    setAttachmentSize((file.size / 1024).toFixed(0) + ' KB');

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentData(reader.result);
    };
    reader.onerror = () => {
      setErrorMsg('حدث خطأ أثناء قراءة الملف، يرجى المحاولة مرة أخرى.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearAttachment = () => {
    setAttachmentName('');
    setAttachmentData(null);
    setAttachmentSize(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('يرجى كتابة سبب وتفاصيل الطلب بشكل واضح.');
      return;
    }

    if (requestType === 'leave' && leaveType === 'work_mission') {
      if (!missionBranchId) {
        setErrorMsg('يرجى تحديد الفرع المتوجه إليه في مأمورية العمل.');
        return;
      }
      if (missionBranchId === currentUser.branchId) {
        setErrorMsg('لا يمكن تقديم مأمورية عمل على نفس الفرع المسجل به حالياً. المأمورية تكون لفرع آخر فقط.');
        return;
      }
    }

    if (requestType === 'leave' && leaveType === 'holiday_compensation' && !holidayName.trim()) {
      setErrorMsg('يرجى كتابة اسم العيد أو المناسبة الرسمية التي تم العمل بها.');
      return;
    }

    // Validation: Block taking regular leave on designated weekly off days (exempting work_mission, weekly_rest_compensation, holiday_compensation)
    if (requestType === 'leave' && ['annual', 'sick', 'casual'].includes(leaveType)) {
      if (startDate > endDate) {
        setErrorMsg('تاريخ بداية الإجازة لا يمكن أن يكون بعد تاريخ النهاية.');
        return;
      }

      if (startDate === endDate) {
        if (startDayInfo && startDayInfo.isOff) {
          setErrorMsg(`عذراً، يوم (${startDayInfo.dayName}) يوافق يوم إجازتك الأسبوعية بالفعل، ولا يتطلب تقديم طلب إجازة.`);
          return;
        }
      } else {
        if (startDayInfo && startDayInfo.isOff) {
          setErrorMsg(`عذراً، تاريخ بداية الإجازة يوافق يوم إجازتك الأسبوعية (${startDayInfo.dayName}). يرجى تحديد بداية الإجازة من يوم عمل فعلي.`);
          return;
        }
        if (endDayInfo && endDayInfo.isOff) {
          setErrorMsg(`عذراً، تاريخ نهاية الإجازة يوافق يوم إجازتك الأسبوعية (${endDayInfo.dayName}). يرجى تحديد نهاية الإجازة بيوم عمل فعلي.`);
          return;
        }
      }
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        employeeId: currentUser.id,
        type: requestType,
        reason: reason.trim(),
        branchId: currentUser.branchId
      };

      if (requestType === 'leave') {
        payload.leaveType = leaveType;
        if (leaveType === 'sick') {
          payload.startDate = startDate;
          payload.endDate = endDate;
          payload.attachmentName = attachmentName || null;
          payload.attachmentData = attachmentData || null;
        } else if (leaveType === 'work_mission') {
          const mBranch = branches.find(b => b.id === missionBranchId) || branches[0];
          payload.missionBranchId = mBranch?.id;
          payload.missionBranchName = mBranch?.name || 'فرع مأمورية';
          payload.missionDate = missionDate;
          payload.startDate = missionDate;
          payload.endDate = missionDate;
          payload.date = missionDate;
        } else if (leaveType === 'weekly_rest_compensation') {
          payload.compensationOffDate = compensationOffDate;
          payload.compensationWorkedDate = compensationWorkedDate;
          payload.startDate = compensationOffDate;
          payload.endDate = compensationOffDate;
          payload.date = compensationOffDate;
        } else if (leaveType === 'holiday_compensation') {
          payload.compensationOffDate = compensationOffDate;
          payload.compensationWorkedDate = compensationWorkedDate;
          payload.holidayName = holidayName.trim();
          payload.startDate = compensationOffDate;
          payload.endDate = compensationOffDate;
          payload.date = compensationOffDate;
        } else {
          // annual, casual
          payload.startDate = startDate;
          payload.endDate = endDate;
        }
      } else if (requestType === 'permission') {
        payload.permissionType = permissionType;
        payload.permissionHours = 2; // ثابت ساعتين
        payload.date = startDate;
        payload.startTime = startTime;
        payload.endTime = endTime;
      }

      const res = await api.createRequest(payload);
      if (res.success) {
        setSuccessMsg(res.message || 'تم تقديم الطلب بنجاح وإرساله للاعتماد.');
        setReason('');
        handleClearAttachment();
        setActiveSubTab('list');
        fetchRequests();
        if (onStatusChanged) onStatusChanged();
      } else {
        setErrorMsg(res.error || 'حدث خطأ في تقديم الطلب.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, status, defaultNote) => {
    setActionLoading(requestId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.reviewRequest(
        requestId,
        currentUser.id,
        status,
        defaultNote
      );
      if (res.success) {
        setSuccessMsg(status === 'approved' ? 'تم اعتماد الطلب بنجاح ✅' : 'تم رفض الطلب ❌');
        fetchRequests();
        if (onStatusChanged) onStatusChanged();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء معالجة الطلب');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4 pb-8 text-right font-['Cairo',sans-serif]">
      {/* Employee Personal Balance Overview Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-3.5 rounded-3xl border border-amber-500/30 shadow-lg flex items-center justify-between gap-3 text-right">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-zinc-400 font-bold block truncate">رصيدك المتاح حالياً</span>
            <span className="text-xs font-black text-white truncate block">
              {currentUser.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-zinc-950 px-3 py-1.5 rounded-2xl border border-amber-500/20 text-center">
            <span className="text-[9px] text-zinc-400 font-bold block">رصيد الإجازات</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              {currentUser.leaveBalance !== undefined ? currentUser.leaveBalance : 30} يوم
            </span>
          </div>

          <div className="bg-zinc-950 px-3 py-1.5 rounded-2xl border border-amber-500/20 text-center">
            <span className="text-[9px] text-zinc-400 font-bold block">رصيد الأذونات</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              {currentUser.permissionsBalanceHours !== undefined ? currentUser.permissionsBalanceHours : 2} س/شهر
            </span>
          </div>
        </div>
      </div>

      {/* Top Segmented Subtab Switcher */}
      <div className="bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-lg flex gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('list')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeSubTab === 'list'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {canApprove ? 'طلبات الإجازات والأذونات' : 'سجل طلباتي'}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('new_request')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeSubTab === 'new_request'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
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
              const isPermission = req.type === 'permission';
              const isApproved = req.status === 'approved';
              const isPending = req.status === 'pending';
              const isRejected = req.status === 'rejected';

              // Manager can review subordinate requests
              const canUserReviewThis = canApprove && (req.employeeId !== currentUser.id);

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
                        <span className="text-[11px] text-zinc-400">
                          {req.employeeJobTitle} • فرع {req.employeeBranch || 'غير محدد'}
                        </span>
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
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-zinc-400">
                          <span className="font-semibold">نوع الإجازة:</span>
                          <span className="font-bold text-amber-400">
                            {req.leaveType === 'annual' && '🏖️ إجازة سنوية'}
                            {req.leaveType === 'sick' && '🏥 إجازة مرضي'}
                            {req.leaveType === 'casual' && '⚡ إجازة عارضة'}
                            {req.leaveType === 'work_mission' && '🎯 مأمورية عمل'}
                            {req.leaveType === 'weekly_rest_compensation' && '🔄 بدل راحة أسبوعية'}
                            {req.leaveType === 'holiday_compensation' && '🎉 بدل إجازة عيد'}
                            {req.leaveType === 'travel' && '✈️ سفر'}
                            {req.leaveType === 'weekly_off' && '🌴 عطلة أسبوعية'}
                          </span>
                        </div>

                        {req.leaveType === 'work_mission' ? (
                          <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                            🏢 مأمورية عمل بفرع: <span className="underline">{req.missionBranchName || req.missionBranchId}</span> • يوم: {req.missionDate || req.date}
                          </div>
                        ) : req.leaveType === 'weekly_rest_compensation' ? (
                          <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                            📅 يوم البدل المطلوب: {req.compensationOffDate || req.date} (بدل عمل يوم الراحة: {req.compensationWorkedDate})
                          </div>
                        ) : req.leaveType === 'holiday_compensation' ? (
                          <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                            🎉 مناسبة: {req.holidayName} • يوم البدل المطلوب: {req.compensationOffDate || req.date} (بدل عمل يوم العيد: {req.compensationWorkedDate})
                          </div>
                        ) : (
                          <div className="flex justify-between items-center text-zinc-400">
                            <span className="font-semibold">فترة الإجازة:</span>
                            <span className="font-bold text-amber-400">
                              من {req.startDate} إلى {req.endDate}
                            </span>
                          </div>
                        )}
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

                    {/* Attachment Link */}
                    {req.attachmentName && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment({ name: req.attachmentName, data: req.attachmentData })}
                          className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-xl transition-all flex items-center gap-1.5"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>عرض المستند الطبي المرفق: {req.attachmentName}</span>
                          <Eye className="w-3.5 h-3.5 text-amber-300 mr-1" />
                        </button>
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
                  {isPending && canUserReviewThis && (
                    <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-400 ml-auto">قرار الاعتماد:</span>
                      <button
                        type="button"
                        onClick={() => handleReview(req.id, 'approved', 'تمت الموافقة والاعتماد')}
                        disabled={actionLoading === req.id}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-black" />
                        <span>اعتماد وموافقة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(req.id, 'rejected', 'عذراً، يتعذر في هذا الوقت')}
                        disabled={actionLoading === req.id}
                        className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold flex items-center gap-1"
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
          {/* Choose Request Type: ONLY 2 buttons */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">حدد نوع الطلب:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('leave')}
                className={`py-3 px-2 rounded-2xl font-black text-xs border transition-all flex flex-col items-center justify-center gap-1.5 ${
                  requestType === 'leave'
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>طلب إجازة</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestType('permission')}
                className={`py-3 px-2 rounded-2xl font-black text-xs border transition-all flex flex-col items-center justify-center gap-1.5 ${
                  requestType === 'permission'
                    ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>إذن ساعتين</span>
              </button>
            </div>
          </div>

          {/* If Leave Request */}
          {requestType === 'leave' && (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع الإجازة:</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="annual" className="bg-zinc-900 text-zinc-100">إجازة سنوية (Annual Leave)</option>
                  <option value="sick" className="bg-zinc-900 text-zinc-100">إجازة مرضي (Sick Leave)</option>
                  <option value="casual" className="bg-zinc-900 text-zinc-100">إجازة عارضة (Casual Leave)</option>
                  <option value="work_mission" className="bg-zinc-900 text-zinc-100">مأمورية عمل (Work Mission)</option>
                  <option value="weekly_rest_compensation" className="bg-zinc-900 text-zinc-100">بدل راحة أسبوعية (Weekly Rest Compensation)</option>
                  <option value="holiday_compensation" className="bg-zinc-900 text-zinc-100">بدل إجازة عيد (Holiday Compensation)</option>
                </select>
              </div>

              {/* Standard dates for Annual, Sick, Casual */}
              {['annual', 'sick', 'casual'].includes(leaveType) && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">تاريخ البداية:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className={`w-full p-2.5 text-xs rounded-xl bg-zinc-950 border focus:outline-none font-bold ${
                          startDayInfo?.isOff
                            ? 'border-rose-500 text-rose-300 focus:border-rose-400'
                            : 'border-zinc-800 text-zinc-100 focus:border-amber-500'
                        }`}
                      />
                      {startDayInfo && (
                        <span className={`text-[10px] block mt-1 font-bold ${startDayInfo.isOff ? 'text-rose-400' : 'text-amber-400'}`}>
                          {startDayInfo.dayName} {startDayInfo.isOff && '(يوم راحتك الأسبوعية ⚠️)'}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">تاريخ النهاية:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className={`w-full p-2.5 text-xs rounded-xl bg-zinc-950 border focus:outline-none font-bold ${
                          endDayInfo?.isOff
                            ? 'border-rose-500 text-rose-300 focus:border-rose-400'
                            : 'border-zinc-800 text-zinc-100 focus:border-amber-500'
                        }`}
                      />
                      {endDayInfo && (
                        <span className={`text-[10px] block mt-1 font-bold ${endDayInfo.isOff ? 'text-rose-400' : 'text-amber-400'}`}>
                          {endDayInfo.dayName} {endDayInfo.isOff && '(يوم راحتك الأسبوعية ⚠️)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {((startDayInfo && startDayInfo.isOff) || (endDayInfo && endDayInfo.isOff)) && (
                    <div className="bg-rose-950/70 border border-rose-700/80 p-2.5 rounded-xl text-rose-300 text-[11px] font-bold leading-relaxed">
                      ⚠️ تنبيه: لا يُسمح بطلب إجازة في أيام راحتك الأسبوعية ({userOffDaysNames}). يرجى تحديد التواريخ في أيام عملك الرسمية.
                    </div>
                  )}
                </div>
              )}

              {/* Work Mission Configuration */}
              {leaveType === 'work_mission' && (
                <div className="space-y-3 p-3.5 bg-zinc-950/80 rounded-2xl border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>تفاصيل مأمورية العمل لتفعيل الحضور بالفرع المختار:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">الفرع المتوجه إليه في المأمورية:</label>
                      <select
                        value={missionBranchId}
                        onChange={e => setMissionBranchId(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                      >
                        {branches.filter(b => b.id !== currentUser.branchId).length === 0 ? (
                          <option value="">لا توجد فروع أخرى متاحة</option>
                        ) : (
                          branches
                            .filter(b => b.id !== currentUser.branchId)
                            .map(b => (
                              <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                                فرع {b.name}
                              </option>
                            ))
                        )}
                      </select>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        * تم استبعاد فرعك الحالي تلقائياً لأن مأمورية العمل مخصصة للتنقل لفروع أخرى.
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">تاريخ يوم المأمورية:</label>
                      <input
                        type="date"
                        value={missionDate}
                        onChange={e => setMissionDate(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    * عند اعتماد مأمورية العمل، سيسمح البرنامج للموظف في تاريخ المأمورية بتسجيل الحضور والانصراف بالـ GPS داخل نطاق الفرع الذي تم اختياره.
                  </p>
                </div>
              )}

              {/* Weekly Rest Compensation Configuration */}
              {leaveType === 'weekly_rest_compensation' && (
                <div className="space-y-3 p-3.5 bg-zinc-950/80 rounded-2xl border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>تفاصيل بدل الراحة الأسبوعية:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">تاريخ يوم البدل المطلوب (إجازة):</label>
                      <input
                        type="date"
                        value={compensationOffDate}
                        onChange={e => setCompensationOffDate(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">تاريخ يوم الراحة الأسبوعية الذي تم العمل به:</label>
                      <input
                        type="date"
                        value={compensationWorkedDate}
                        onChange={e => setCompensationWorkedDate(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Holiday Compensation Configuration */}
              {leaveType === 'holiday_compensation' && (
                <div className="space-y-3 p-3.5 bg-zinc-950/80 rounded-2xl border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>تفاصيل بدل إجازة العيد أو المناسبة:</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">اسم العيد أو المناسبة الرسمية:</label>
                    <input
                      type="text"
                      value={holidayName}
                      onChange={e => setHolidayName(e.target.value)}
                      placeholder="مثال: عيد الفطر المبارك، عيد الأضحى، عيد 6 أكتوبر..."
                      className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">تاريخ يوم البدل المطلوب (إجازة):</label>
                      <input
                        type="date"
                        value={compensationOffDate}
                        onChange={e => setCompensationOffDate(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">تاريخ يوم العيد الذي تم العمل به:</label>
                      <input
                        type="date"
                        value={compensationWorkedDate}
                        onChange={e => setCompensationWorkedDate(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Functional Attachment Section: ONLY FOR SICK LEAVE */}
              {leaveType === 'sick' && (
                <div className="p-3 bg-zinc-950 rounded-2xl border border-amber-500/30 space-y-2">
                  <label className="block text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-amber-400" />
                    <span>إرفاق تقرير طبي أو روشتة معتمدة (خاص بالإجازة المرضي):</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {attachmentName ? (
                    <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-zinc-100 truncate">{attachmentName}</span>
                        {attachmentSize && (
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">({attachmentSize})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment({ name: attachmentName, data: attachmentData })}
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-500/20"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAttachment}
                          className="p-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-lg text-xs"
                          title="حذف المرفق"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>اضغط لاختيار ورفع التقرير الطبي (صور أو PDF)</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* If 2-Hour Permission */}
          {requestType === 'permission' && (
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
              placeholder="اكتب سبب وتفاصيل الطلب بوضوح..."
              rows={3}
              className="w-full p-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 resize-none font-medium"
            />
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col text-right shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black text-zinc-100 truncate">{previewAttachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 flex items-center justify-center">
              {previewAttachment.data && previewAttachment.data.startsWith('data:image') ? (
                <img
                  src={previewAttachment.data}
                  alt={previewAttachment.name}
                  className="max-h-[65vh] rounded-2xl object-contain border border-zinc-800 shadow-md"
                />
              ) : previewAttachment.data ? (
                <iframe
                  src={previewAttachment.data}
                  title={previewAttachment.name}
                  className="w-full h-[60vh] rounded-2xl border border-zinc-800"
                />
              ) : (
                <div className="text-zinc-500 text-xs py-8 font-bold">
                  اسم المستند المرفق: {previewAttachment.name}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
