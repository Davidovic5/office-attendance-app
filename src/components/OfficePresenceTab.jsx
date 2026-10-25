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
        return { label: 'إجازة أسبوعية', bg: 'bg-zinc-800 text-zinc-300 border-zinc-700', icon: Palmtree };
      case 'sick':
        return { label: 'إجازة مرضي', bg: 'bg-rose-950/70 text-rose-300 border-rose-800/60', icon: Stethoscope };
      case 'travel':
        return { label: 'سفر / مأمورية', bg: 'bg-amber-950/70 text-amber-300 border-amber-800/60', icon: Plane };
      case 'annual':
        return { label: 'إجازة سنوية', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: CalendarOff };
      default:
        return { label: 'إجازة رسمية', bg: 'bg-zinc-800 text-zinc-300 border-zinc-700', icon: CalendarOff };
    }
  };

  return (
    <div className="space-y-4 pb-8 text-right">
      {/* Branch Selector Header */}
      <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>عرض المتواجدين حسب الفرع:</span>
          </div>
          <button
            type="button"
            onClick={fetchStatus}
            className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>تحديث</span>
          </button>
        </div>

        {/* Branch Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 text-xs font-black rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-zinc-100">🌐 جميع الفروع (إجمالي أندية وادي دجلة)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                  📍 نادي وادي دجلة - فرع {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Branch Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none pt-1 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setSelectedBranchId('all')}
            className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all border ${
              selectedBranchId === 'all'
                ? 'bg-amber-500 text-black border-amber-500 font-black'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            الكل
          </button>
          {branches.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all border ${
                selectedBranchId === b.id
                  ? 'bg-amber-500 text-black border-amber-500 font-black'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
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
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600 shadow-md ring-1 ring-emerald-500/50'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-emerald-600/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-zinc-400">في الفرع الآن</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{summary.inOfficeCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_leave' ? 'all' : 'on_leave')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_leave'
              ? 'bg-amber-950/90 text-amber-300 border-amber-600 shadow-md ring-1 ring-amber-500/50'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-zinc-400">في إجازة</span>
            <CalendarOff className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{summary.onLeaveCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'on_permission' ? 'all' : 'on_permission')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'on_permission'
              ? 'bg-amber-950/90 text-amber-300 border-amber-500 shadow-md ring-1 ring-amber-400/50'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-zinc-400">إذن ساعتين</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{summary.onPermissionCount}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter(selectedFilter === 'absent' ? 'all' : 'absent')}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'absent'
              ? 'bg-rose-950/90 text-rose-300 border-rose-600 shadow-md ring-1 ring-rose-500/50'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-rose-600/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-zinc-400">لم يحضروا بعد</span>
            <UserX className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400">{summary.absentCount}</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={`بحث بالاسم في ${currentBranchObj ? 'فرع ' + currentBranchObj.name : 'جميع الفروع'}...`}
          className="w-full pr-9 pl-3 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-bold"
        />
      </div>

      {/* 1. In Branch Now */}
      {(selectedFilter === 'all' || selectedFilter === 'in_office') && inOffice.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>حاضرون بالنادي الآن ({inOffice.length})</span>
          </div>

          <div className="grid gap-2">
            {inOffice
              .filter(item => 
                !searchQuery || 
                item.employee.name.includes(searchQuery) || 
                item.employee.jobTitle.includes(searchQuery)
              )
              .map(item => (
                <div key={item.employee.id} className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-800 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-zinc-100">{item.employee.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                          متواجد
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-400 font-bold block mt-0.5">
                        {item.employee.jobTitle} • {item.employee.branchName}
                      </span>
                    </div>
                  </div>

                  <div className="text-left text-xs">
                    <span className="font-bold text-zinc-200 block font-mono">
                      {new Date(item.checkInTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-zinc-500">
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
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 px-1 pt-1">
            <CalendarOff className="w-3.5 h-3.5 text-amber-400" />
            <span>في إجازة اليوم ({summary.onLeaveCount})</span>
          </div>

          {Object.entries(onLeave).map(([typeKey, list]) => {
            if (!list || list.length === 0) return null;
            const badge = getLeaveBadge(typeKey);
            const Icon = badge.icon;

            return (
              <div key={typeKey} className="space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1 pr-1">
                  <Icon className="w-3 h-3 text-amber-400" />
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
                      <div key={item.employee.id} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-md flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={item.employee.avatar} 
                            alt={item.employee.name} 
                            className="w-10 h-10 rounded-xl object-cover border border-zinc-700 opacity-80"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-zinc-200">{item.employee.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 mt-0.5 block">
                              {item.employee.jobTitle} • {item.employee.branchName}
                            </span>
                          </div>
                        </div>

                        <div className="text-left text-xs max-w-[40%]">
                          <p className="text-[10px] font-medium text-zinc-400 truncate" title={item.leave.reason}>
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
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 px-1 pt-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
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
                <div key={item.employee.id} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={item.employee.avatar} 
                      alt={item.employee.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-amber-500/40"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-zinc-200">{item.employee.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          إذن ساعتين
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">
                        {item.employee.jobTitle} • {item.employee.branchName}
                      </span>
                    </div>
                  </div>

                  <div className="text-left text-xs">
                    <span className="font-mono font-bold text-amber-400 block">
                      {item.permission.startTime} - {item.permission.endTime}
                    </span>
                    <span className="text-[10px] text-zinc-500">{item.permission.reason}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 4. Absent / Not checked in */}
      {(selectedFilter === 'all' || selectedFilter === 'absent') && absent.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-400 px-1 pt-1">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>لم يسجلوا حضورهم اليوم ({absent.length})</span>
          </div>

          <div className="grid gap-1.5">
            {absent
              .filter(emp => 
                !searchQuery || 
                emp.name.includes(searchQuery) || 
                emp.jobTitle.includes(searchQuery)
              )
              .map(emp => (
                <div key={emp.id} className="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 shadow-xs flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={emp.avatar} 
                      alt={emp.name} 
                      className="w-9 h-9 rounded-xl object-cover border border-zinc-700 grayscale"
                    />
                    <div>
                      <span className="font-bold text-xs text-zinc-300 block">{emp.name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {emp.jobTitle} • {emp.branchName}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-lg">
                    غائب / لم يسجل
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.totalEmployees === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center text-zinc-400">
          <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-xs font-bold">لا يوجد موظفون مسجلون في هذا الفرع حتى الآن.</p>
        </div>
      )}
    </div>
  );
}
