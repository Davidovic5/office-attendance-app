import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  CalendarOff, 
  Clock, 
  Plane, 
  Stethoscope, 
  Palmtree, 
  HelpCircle, 
  Phone, 
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { api } from '../api';

export function OfficePresenceTab() {
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, in_office, on_leave, on_permission, absent
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getLiveStatus();
      if (res.success) {
        setLiveData(res.status);
      }
    } catch (err) {
      console.error("Error fetching live status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !liveData) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-500 font-bold">جاري تحميل حالة المكتب اللحظية...</p>
      </div>
    );
  }

  const { summary, inOffice, onPermission, onLeave, absent } = liveData || {
    summary: { totalEmployees: 0, inOfficeCount: 0, onLeaveCount: 0, onPermissionCount: 0, absentCount: 0 },
    inOffice: [],
    onPermission: [],
    onLeave: { weekly_off: [], sick: [], travel: [], annual: [], other: [] },
    absent: []
  };

  // Helper to get leave icon and badge
  const getLeaveBadge = (type) => {
    switch (type) {
      case 'weekly_off':
        return { label: 'إجازة أسبوعية', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Palmtree };
      case 'sick':
        return { label: 'إجازة مرضي', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Stethoscope };
      case 'travel':
        return { label: 'إجازة سفر / مأمورية', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Plane };
      case 'annual':
        return { label: 'إجازة سنوية / اعتيادية', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: CalendarOff };
      default:
        return { label: 'إجازة رسمية', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: CalendarOff };
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">حالة المكتب وتواجد الفريق</h2>
          <p className="text-xs text-slate-500">متابعة لحظية لمن بالعمل ومن في إجازة أو إذن</p>
        </div>
        <button
          onClick={fetchStatus}
          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>تحديث فوري</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'in_office' ? 'all' : 'in_office')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'in_office'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${selectedFilter === 'in_office' ? 'text-emerald-100' : 'text-slate-500'}`}>
              في المكتب الآن
            </span>
            <UserCheck className={`w-4 h-4 ${selectedFilter === 'in_office' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="text-2xl font-black">{summary.inOfficeCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_leave' ? 'all' : 'on_leave')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_leave'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${selectedFilter === 'on_leave' ? 'text-blue-100' : 'text-slate-500'}`}>
              في إجازة
            </span>
            <CalendarOff className={`w-4 h-4 ${selectedFilter === 'on_leave' ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <div className="text-2xl font-black">{summary.onLeaveCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_permission' ? 'all' : 'on_permission')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_permission'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${selectedFilter === 'on_permission' ? 'text-amber-100' : 'text-slate-500'}`}>
              إذن ساعتين
            </span>
            <Clock className={`w-4 h-4 ${selectedFilter === 'on_permission' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="text-2xl font-black">{summary.onPermissionCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'absent' ? 'all' : 'absent')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'absent'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold ${selectedFilter === 'absent' ? 'text-rose-100' : 'text-slate-500'}`}>
              غائب بدون إذن
            </span>
            <UserX className={`w-4 h-4 ${selectedFilter === 'absent' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className="text-2xl font-black">{summary.absentCount}</div>
        </div>
      </div>

      {/* Search & Active Filters Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الموظف أو المسمى الوظيفي..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              selectedFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({summary.totalEmployees})
          </button>
          <button
            onClick={() => setSelectedFilter('in_office')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              selectedFilter === 'in_office'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            المكتب ({summary.inOfficeCount})
          </button>
          <button
            onClick={() => setSelectedFilter('on_leave')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              selectedFilter === 'on_leave'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            الإجازات ({summary.onLeaveCount})
          </button>
          <button
            onClick={() => setSelectedFilter('on_permission')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              selectedFilter === 'on_permission'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            الأذونات ({summary.onPermissionCount})
          </button>
        </div>
      </div>

      {/* Sections Breakdown */}

      {/* 1. In Office Now */}
      {(selectedFilter === 'all' || selectedFilter === 'in_office') && inOffice.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-700 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>حاضرون في مقر المكتب الآن ({inOffice.length})</span>
          </div>

          <div className="grid gap-2">
            {inOffice
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-400"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{item.employee.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">
                          متواجد
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{item.employee.jobTitle}</span>
                    </div>
                  </div>

                  <div className="text-left text-xs space-y-0.5">
                    <div className="font-bold text-slate-700 flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>حضر {new Date(item.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      المسافة: {item.attendance.distanceMeters || 15} م
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. On Leave (Categorized by type: Weekly Off, Sick, Travel, Annual) */}
      {(selectedFilter === 'all' || selectedFilter === 'on_leave') && summary.onLeaveCount > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-blue-700 px-1 pt-2">
            <CalendarOff className="w-4 h-4 text-blue-600" />
            <span>في إجازة رسمية اليوم ({summary.onLeaveCount})</span>
          </div>

          {/* Iterate over categorized leaves */}
          {Object.entries(onLeave).map(([typeKey, list]) => {
            if (!list || list.length === 0) return null;
            const badge = getLeaveBadge(typeKey);
            const Icon = badge.icon;

            return (
              <div key={typeKey} className="space-y-2">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 pr-2">
                  <Icon className="w-3.5 h-3.5 text-slate-600" />
                  <span>{badge.label} ({list.length})</span>
                </div>

                <div className="grid gap-2">
                  {list
                    .filter(item => 
                      !searchQuery || 
                      item.employee.name.includes(searchQuery) || 
                      item.employee.jobTitle.includes(searchQuery)
                    )
                    .map(item => (
                      <div key={item.employee.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={item.employee.avatar} 
                            alt={item.employee.name} 
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 opacity-80"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">{item.employee.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">{item.employee.jobTitle}</span>
                          </div>
                        </div>

                        <div className="text-left max-w-[45%]">
                          <p className="text-[11px] font-medium text-slate-600 truncate text-left" title={item.leave.reason}>
                            {item.leave.reason}
                          </p>
                          {item.leave.attachmentName && (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              📎 {item.leave.attachmentName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. On 2-Hour Permission */}
      {(selectedFilter === 'all' || selectedFilter === 'on_permission') && onPermission.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 px-1 pt-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>في إذن ساعتين معتمد ({onPermission.length})</span>
          </div>

          <div className="grid gap-2">
            {onPermission
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3.5 rounded-2xl border border-amber-200/70 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{item.employee.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                          إذن ساعتين ({item.permission.startTime} - {item.permission.endTime})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{item.employee.jobTitle}</span>
                    </div>
                  </div>

                  <div className="text-left text-xs max-w-[40%]">
                    <p className="text-[11px] font-medium text-slate-600 truncate" title={item.permission.reason}>
                      {item.permission.reason}
                    </p>
                    <span className="text-[10px] text-amber-700 font-bold">
                      {item.permission.permissionType === 'morning' ? 'إذن تأخير صباحي' : 'إذن انصراف مبكر'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Absent */}
      {(selectedFilter === 'all' || selectedFilter === 'absent') && absent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-rose-700 px-1 pt-2">
            <UserX className="w-4 h-4 text-rose-600" />
            <span>غائبون لم يسجلوا حضور بعد ({absent.length})</span>
          </div>

          <div className="grid gap-2">
            {absent
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between opacity-85">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-11 h-11 rounded-2xl object-cover border border-rose-300 grayscale"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{item.employee.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
                          لم يسجل بعد
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{item.employee.jobTitle}</span>
                    </div>
                  </div>

                  <a
                    href={`tel:${item.employee.phone}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1 font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">اتصال</span>
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
