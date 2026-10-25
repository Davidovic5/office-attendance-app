import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  Search, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Plane, 
  Stethoscope, 
  Palmtree, 
  Clock3, 
  Briefcase, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../api';

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function MonthlyReportTab({ currentUser }) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'attendance_log' | 'leaves_log'

  // Load branches
  useEffect(() => {
    api.getBranches().then(res => {
      if (res.success) setBranches(res.branches || []);
    }).catch(console.error);
  }, []);

  // Fetch monthly report
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getMonthlyReport(selectedYear, selectedMonth, selectedBranchId);
      if (res.success) {
        setReportData(res.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth, selectedBranchId]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const { employeeSummaries = [], attendance = [], requests = [], monthLabel = '' } = reportData || {};

  const filteredSummaries = employeeSummaries.filter(item => 
    !searchQuery ||
    item.employee.name.includes(searchQuery) ||
    item.employee.jobTitle.includes(searchQuery) ||
    item.employee.branchName.includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-8 text-right font-['Cairo',sans-serif]">
      {/* Header and Controls */}
      <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-base font-black text-amber-400 flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>كشف وتقارير الحضور والإجازات الشهرية</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              متابعة مواعيد حضور وانصراف الموظفين وسجل الإجازات والأذونات على مدار الشهر
            </p>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-amber-400 px-2 whitespace-nowrap">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-300 transition-colors"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter and Print Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full p-2 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500"
            >
              <option value="all">🌐 جميع الفروع (إجمالي أندية وادي دجلة)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  فرع {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2 px-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة الكشف</span>
            </button>
            <button
              type="button"
              onClick={fetchReport}
              className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex p-1 bg-zinc-950 rounded-2xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('summary')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              viewMode === 'summary'
                ? 'bg-amber-500 text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            📊 كشف ملخص الموظفين ({filteredSummaries.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('attendance_log')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              viewMode === 'attendance_log'
                ? 'bg-amber-500 text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ⏱️ سجل الحضور اليومي ({attendance.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('leaves_log')}
            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
              viewMode === 'leaves_log'
                ? 'bg-amber-500 text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🌴 سجل الإجازات والأذونات ({requests.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو التايتل أو الفرع..."
          className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-bold"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center text-zinc-400">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <span className="text-xs font-bold">جاري تجميع كشف الشهر...</span>
        </div>
      )}

      {/* ================= 1. SUMMARY VIEW ================= */}
      {!loading && viewMode === 'summary' && (
        <div className="space-y-3">
          {filteredSummaries.length === 0 ? (
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center text-zinc-500">
              <Users className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs font-bold">لا توجد بيانات موظفين مسجلة لهذا الشهر.</p>
            </div>
          ) : (
            filteredSummaries.map(item => {
              const isExpanded = expandedEmployeeId === item.employee.id;

              return (
                <div 
                  key={item.employee.id} 
                  className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-md overflow-hidden transition-all"
                >
                  {/* Card Header (Employee Summary Row) */}
                  <div 
                    onClick={() => setExpandedEmployeeId(isExpanded ? null : item.employee.id)}
                    className="p-4 cursor-pointer hover:bg-zinc-850 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.employee.avatar} 
                        alt={item.employee.name} 
                        className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-500/40 shrink-0" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-zinc-100">{item.employee.name}</h3>
                          <span className="text-[10px] text-zinc-400">({item.employee.jobTitle})</span>
                        </div>
                        <span className="text-[11px] text-amber-400 block mt-0.5">
                          فرع {item.employee.branchName} • هاتف: {item.employee.phone}
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="flex items-center gap-2">
                      <div className="text-left bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                        <span className="text-[9px] text-zinc-400 block font-semibold">حضور الشهر</span>
                        <span className="text-xs font-black text-emerald-400">{item.presentDays} يوم</span>
                      </div>

                      <div className="text-left bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 hidden sm:block">
                        <span className="text-[9px] text-zinc-400 block font-semibold">إجمالي الساعات</span>
                        <span className="text-xs font-black text-amber-400">{item.totalHours} س</span>
                      </div>

                      <div className="text-left bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                        <span className="text-[9px] text-zinc-400 block font-semibold">إجازات وأذونات</span>
                        <span className="text-xs font-black text-amber-300">
                          {item.leavesCount} إجازة / {item.permissionsHours}س
                        </span>
                      </div>

                      <div className="text-zinc-400 p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 text-amber-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Calendar / Daily Matrix for this Employee */}
                  {isExpanded && (
                    <div className="bg-zinc-950 p-4 border-t border-zinc-800/80 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-300 pb-2 border-b border-zinc-800">
                        <span>تفاصيل أيام شهر {monthLabel} للموظف:</span>
                        <span className="text-amber-400 font-mono">
                          المجموع: {item.presentDays} يوم عمل ({item.totalHours} ساعة)
                        </span>
                      </div>

                      {/* Daily Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                        {item.dailyBreakdown.map(dayObj => {
                          let badgeBg = 'bg-zinc-900 text-zinc-500 border-zinc-800';
                          if (dayObj.status === 'present') badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-black';
                          else if (dayObj.status === 'leave') badgeBg = 'bg-amber-950/80 text-amber-300 border-amber-600/60 font-bold';
                          else if (dayObj.status === 'permission') badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold';
                          else if (dayObj.status === 'weekly_off') badgeBg = 'bg-zinc-900/90 text-zinc-400 border-zinc-800';
                          else if (dayObj.status === 'future') badgeBg = 'bg-zinc-950 text-zinc-600 border-zinc-850';

                          return (
                            <div 
                              key={dayObj.day}
                              className={`p-2 rounded-xl border text-center transition-all ${badgeBg}`}
                              title={dayObj.detail || dayObj.label}
                            >
                              <div className="text-[10px] opacity-75 font-mono">{dayObj.day} {MONTH_NAMES[selectedMonth - 1]}</div>
                              <div className="text-xs font-black truncate mt-0.5">{dayObj.label}</div>
                              {dayObj.detail && (
                                <div className="text-[9px] opacity-70 truncate mt-0.5 font-mono">{dayObj.detail}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= 2. DETAILED ATTENDANCE LOG ================= */}
      {!loading && viewMode === 'attendance_log' && (
        <div className="space-y-2">
          {attendance.length === 0 ? (
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center text-zinc-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs font-bold">لا توجد سجلات حضور مسجلة لهذا الشهر حتى الآن.</p>
            </div>
          ) : (
            attendance
              .filter(rec => 
                !searchQuery ||
                rec.employeeName.includes(searchQuery) ||
                rec.jobTitle.includes(searchQuery) ||
                rec.branchName.includes(searchQuery) ||
                rec.date.includes(searchQuery)
              )
              .map(rec => {
                const checkInDate = rec.checkInTime ? new Date(rec.checkInTime) : null;
                const checkOutDate = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
                const durationHrs = rec.durationMinutes ? (rec.durationMinutes / 60).toFixed(1) : (rec.checkOutTime ? '8.0' : 'جاري');

                return (
                  <div 
                    key={rec.id} 
                    className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 shadow-md flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={rec.avatar} 
                        alt={rec.employeeName} 
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shrink-0" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-zinc-100">{rec.employeeName}</span>
                          <span className="text-[10px] text-zinc-400">({rec.jobTitle})</span>
                        </div>
                        <span className="text-[11px] text-amber-400 block mt-0.5 font-mono">
                          📅 {rec.date} • فرع {rec.branchName}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className="text-zinc-200 font-bold">
                        حضور: {checkInDate ? checkInDate.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '--'}
                        {' ➔ '}
                        انصراف: {checkOutDate ? checkOutDate.toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : 'في العمل'}
                      </div>
                      <div className="text-[11px] text-emerald-400 mt-0.5">
                        إجمالي الوقت: {durationHrs} ساعة {rec.completed8Hours && '• مكتمل 8س ✅'}
                      </div>
                      {rec.earlyReason && (
                        <div className="text-[10px] text-amber-400 mt-0.5">
                          سبب الانصراف المبكر: {rec.earlyReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ================= 3. DETAILED LEAVES & PERMISSIONS LOG ================= */}
      {!loading && viewMode === 'leaves_log' && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center text-zinc-500">
              <FileText className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
              <p className="text-xs font-bold">لا توجد إجازات أو أذونات معتمدة لهذا الشهر.</p>
            </div>
          ) : (
            requests
              .filter(req => 
                !searchQuery ||
                req.employeeName.includes(searchQuery) ||
                req.jobTitle.includes(searchQuery) ||
                req.branchName.includes(searchQuery) ||
                (req.reason && req.reason.includes(searchQuery))
              )
              .map(req => {
                const isLeave = req.type === 'leave';

                return (
                  <div 
                    key={req.id} 
                    className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 shadow-md flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={req.avatar} 
                        alt={req.employeeName} 
                        className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shrink-0" 
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm text-zinc-100">{req.employeeName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            isLeave 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            {isLeave 
                              ? (req.leaveType === 'sick' ? 'إجازة مرضي 🏥' : (req.leaveType === 'travel' ? 'سفر / مأمورية ✈️' : (req.leaveType === 'annual' ? 'إجازة سنوية 🏖️' : 'إجازة'))) 
                              : 'إذن ساعتين 🕒'}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">
                          {req.jobTitle} • فرع {req.branchName}
                        </span>
                      </div>
                    </div>

                    <div className="text-left max-w-[50%]">
                      <span className="font-mono font-bold text-amber-400 block">
                        {isLeave 
                          ? `من ${req.startDate} إلى ${req.endDate}`
                          : `يوم ${req.date} (${req.startTime} - ${req.endTime})`}
                      </span>
                      <p className="text-[11px] text-zinc-300 mt-0.5 truncate" title={req.reason}>
                        السبب: {req.reason}
                      </p>
                      {req.reviewNote && (
                        <span className="text-[10px] text-emerald-400 block mt-0.5">
                          معتمد: {req.reviewNote}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
