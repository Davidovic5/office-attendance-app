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
  Phone, 
  Search,
  MapPin,
  Sparkles,
  Building2,
  ChevronDown
} from 'lucide-react';
import { api } from '../api';

export function OfficePresenceTab({ currentUser }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(
    currentUser?.branchId || 'branch_sheraton'
  );
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, in_office, on_leave, on_permission, absent
  const [searchQuery, setSearchQuery] = useState('');

  // Load branches
  useEffect(() => {
    api.getBranches().then(res => {
      if (res.success) {
        setBranches(res.branches);
      }
    }).catch(console.error);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getLiveStatus(null, selectedBranchId);
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
  }, [selectedBranchId]);

  const { summary, inOffice, onPermission, onLeave, absent } = liveData || {
    summary: { totalEmployees: 0, inOfficeCount: 0, onLeaveCount: 0, onPermissionCount: 0, absentCount: 0 },
    inOffice: [],
    onPermission: [],
    onLeave: { weekly_off: [], sick: [], travel: [], annual: [], other: [] },
    absent: []
  };

  const currentBranchObj = branches.find(b => b.id === selectedBranchId);

  const getLeaveBadge = (type) => {
    switch (type) {
      case 'weekly_off':
        return { label: 'إجازة أسبوعية', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Palmtree };
      case 'sick':
        return { label: 'إجازة مرضي', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Stethoscope };
      case 'travel':
        return { label: 'سفر / مأمورية', bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: Plane };
      case 'annual':
        return { label: 'إجازة اعتيادية', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: CalendarOff };
      default:
        return { label: 'إجازة رسمية', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: CalendarOff };
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Branch Selector Header */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>تصفية وعرض الفرع:</span>
          </div>
          <button
            onClick={fetchStatus}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>تحديث</span>
          </button>
        </div>

        {/* Branch Selector Dropdown & Pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-blue-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs font-black rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">🌐 جميع الفروع (إجمالي الشركة)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  📍 فرع {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Branch Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
              selectedBranchId === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedBranchId === b.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'in_office' ? 'all' : 'in_office')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'in_office'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${selectedFilter === 'in_office' ? 'text-emerald-100' : 'text-slate-500'}`}>
              في الفرع الآن
            </span>
            <UserCheck className={`w-3.5 h-3.5 ${selectedFilter === 'in_office' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="text-xl font-black">{summary.inOfficeCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_leave' ? 'all' : 'on_leave')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_leave'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${selectedFilter === 'on_leave' ? 'text-blue-100' : 'text-slate-500'}`}>
              في إجازة
            </span>
            <CalendarOff className={`w-3.5 h-3.5 ${selectedFilter === 'on_leave' ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <div className="text-xl font-black">{summary.onLeaveCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_permission' ? 'all' : 'on_permission')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_permission'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${selectedFilter === 'on_permission' ? 'text-amber-100' : 'text-slate-500'}`}>
              إذن ساعتين
            </span>
            <Clock className={`w-3.5 h-3.5 ${selectedFilter === 'on_permission' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="text-xl font-black">{summary.onPermissionCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'absent' ? 'all' : 'absent')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'absent'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${selectedFilter === 'absent' ? 'text-rose-100' : 'text-slate-500'}`}>
              لم يحضروا بعد
            </span>
            <UserX className={`w-3.5 h-3.5 ${selectedFilter === 'absent' ? 'text-white' : 'text-rose-600'}`} />
          </div>
          <div className="text-xl font-black">{summary.absentCount}</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={`بحث بالاسم في ${currentBranchObj ? 'فرع ' + currentBranchObj.name : 'جميع الفروع'}...`}
          className="w-full pr-8 pl-3 py-2 text-xs rounded-2xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 1. In Branch Now */}
      {(selectedFilter === 'all' || selectedFilter === 'in_office') && inOffice.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>حاضرون بالعمل الآن ({inOffice.length})</span>
          </div>

          <div className="grid gap-2">
            {inOffice
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{item.employee.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-100 text-emerald-700">
                          متواجد
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-bold block">
                        {item.employee.jobTitle} • {item.employee.branchName}
                      </span>
                    </div>
                  </div>

                  <div className="text-left text-xs">
                    <span className="font-bold text-slate-700 block">
                      حضر {new Date(item.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      المسافة: {item.attendance.distanceMeters || 12} م
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 2. On Leave Breakdown */}
      {(selectedFilter === 'all' || selectedFilter === 'on_leave') && summary.onLeaveCount > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 px-1 pt-1">
            <CalendarOff className="w-3.5 h-3.5 text-blue-600" />
            <span>في إجازة رسمية اليوم ({summary.onLeaveCount})</span>
          </div>

          {Object.entries(onLeave).map(([typeKey, list]) => {
            if (!list || list.length === 0) return null;
            const badge = getLeaveBadge(typeKey);
            const Icon = badge.icon;

            return (
              <div key={typeKey} className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1 pr-1">
                  <Icon className="w-3 h-3 text-slate-600" />
                  <span>{badge.label} ({list.length})</span>
                </div>

                <div className="grid gap-1.5">
                  {list
                    .filter(item => 
                      !searchQuery || 
                      item.employee.name.includes(searchQuery) || 
                      item.employee.jobTitle.includes(searchQuery)
                    )
                    .map(item => (
                      <div key={item.employee.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={item.employee.avatar} 
                            alt={item.employee.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 opacity-80"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-800">{item.employee.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {item.employee.jobTitle} • {item.employee.branchName}
                            </span>
                          </div>
                        </div>

                        <div className="text-left text-xs max-w-[40%]">
                          <p className="text-[10px] font-medium text-slate-600 truncate" title={item.leave.reason}>
                            {item.leave.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. On Permission */}
      {(selectedFilter === 'all' || selectedFilter === 'on_permission') && onPermission.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 px-1 pt-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>في إذن ساعتين معتمد ({onPermission.length})</span>
          </div>

          <div className="grid gap-1.5">
            {onPermission
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3 rounded-2xl border border-amber-200/70 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-10 h-10 rounded-xl object-cover border-2 border-amber-400"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{item.employee.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-amber-100 text-amber-800">
                          إذن ساعتين ({item.permission.startTime} - {item.permission.endTime})
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {item.employee.jobTitle} • {item.employee.branchName}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-amber-700 font-bold">
                    {item.permission.permissionType === 'morning' ? 'إذن تأخير' : 'انصراف مبكر'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Absent */}
      {(selectedFilter === 'all' || selectedFilter === 'absent') && absent.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-700 px-1 pt-1">
            <UserX className="w-3.5 h-3.5 text-rose-600" />
            <span>لم يسجلوا حضور بعد ({absent.length})</span>
          </div>

          <div className="grid gap-1.5">
            {absent
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between opacity-85">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-rose-300 grayscale"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">{item.employee.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-rose-100 text-rose-700">
                          غائب
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {item.employee.jobTitle} • {item.employee.branchName}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`tel:${item.employee.phone}`}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs flex items-center gap-1 font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال</span>
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
