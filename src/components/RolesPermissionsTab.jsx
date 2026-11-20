import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  Check, 
  X, 
  Plus, 
  Save, 
  Users, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Unlock,
  KeyRound,
  Smartphone,
  Calendar,
  Clock,
  Search,
  Building2,
  Edit2,
  RotateCcw
} from 'lucide-react';
import { api } from '../api';
import { getUserAllowedBranches, DEFAULT_SECTORS } from '../utils/userScope';
import { formatArabicDateWithDay } from '../utils/dateHelpers';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F5B800'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

const DAYS_OF_WEEK = [
  { id: 'saturday', name: 'السبت' },
  { id: 'sunday', name: 'الأحد' },
  { id: 'monday', name: 'الإثنين' },
  { id: 'tuesday', name: 'الثلاثاء' },
  { id: 'wednesday', name: 'الأربعاء' },
  { id: 'thursday', name: 'الخميس' },
  { id: 'friday', name: 'الجمعة' }
];

const HIERARCHY_ORDER = {
  super_admin: 0,
  memberships_executive_director: 1,
  memberships_area_manager: 2,
  memberships_manager: 3,
  memberships_deputy_manager: 4,
  memberships_section_head: 5,
  memberships_senior_specialist: 6,
  memberships_specialist: 7
};

export function RolesPermissionsTab({ currentUser, onTitlesUpdated }) {
  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin || currentUser?.phone === '01010046078');
  const canManageTitles = Boolean(isSuperAdmin || currentUser?.permissions?.manage_titles_permissions);
  const canManageEmployees = Boolean(isSuperAdmin || currentUser?.permissions?.manage_employees);
  const canEditEmployeeDetails = Boolean(isSuperAdmin || currentUser?.permissions?.edit_employee_details || currentUser?.permissions?.manage_employees);

  const [activeSubTab, setActiveSubTab] = useState(canManageTitles ? 'roles' : 'employees');

  // Roles & Titles state
  const [titles, setTitles] = useState([]);
  const [selectedTitleCode, setSelectedTitleCode] = useState('memberships_specialist');
  const [permissionsState, setPermissionsState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // My administrative rank in the hierarchy
  const myRank = isSuperAdmin ? 0 : (HIERARCHY_ORDER[currentUser?.titleCode] || 99);

  // Editable titles: Only strictly subordinate titles (targetRank > myRank)! Super admin can edit all.
  const editableTitles = titles.filter(t => {
    if (isSuperAdmin) return true;
    const targetRank = t.order || HIERARCHY_ORDER[t.code] || 99;
    return targetRank > myRank;
  });

  // Switch tab if permissions change
  useEffect(() => {
    if (!canManageTitles && activeSubTab === 'roles' && canManageEmployees) {
      setActiveSubTab('employees');
    } else if (!canManageEmployees && activeSubTab === 'employees' && canManageTitles) {
      setActiveSubTab('roles');
    }
  }, [canManageTitles, canManageEmployees, activeSubTab]);

  // Employees & Devices management state
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [empActionLoading, setEmpActionLoading] = useState(false);
  const [empSuccessMsg, setEmpSuccessMsg] = useState('');
  const [empErrorMsg, setEmpErrorMsg] = useState('');

  // Editing Employee details & balance modal state
  const [editingEmp, setEditingEmp] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTitleCode, setEditTitleCode] = useState('memberships_specialist');
  const [editBranchId, setEditBranchId] = useState('branch_october2');
  const [editSectorId, setEditSectorId] = useState('');
  const [editWeeklyOff, setEditWeeklyOff] = useState(['friday', 'saturday']);
  const [editLeaveBalance, setEditLeaveBalance] = useState(30);
  const [editPermBalance, setEditPermBalance] = useState(2);

  // Dictionary of permission labels & descriptions
  const permissionDefs = [
    {
      key: 'check_in_out',
      label: 'تسجيل الحضور والانصراف (GPS)',
      description: 'السماح بتسجيل الحضور وبدء وردية الـ 8 ساعات وتأكيد الانصراف',
      category: 'الحضور والعمل'
    },
    {
      key: 'view_own_attendance',
      label: 'متابعة العداد وسجل الحضور الشخصي',
      description: 'رؤية ساعات العمل المتبقية والمنقضية وسجل الأيام السابقة',
      category: 'الحضور والعمل'
    },
    {
      key: 'override_early_checkout',
      label: 'صلاحية الانصراف المبكر الاستثنائي',
      description: 'السماح بعمل Check Out قبل إتمام الـ 8 ساعات للحالات الطارئة',
      category: 'الحضور والعمل'
    },
    {
      key: 'view_office_presence',
      label: 'رؤية المتواجدين في النادي وحالة الفريق',
      description: 'الاطلاع على تبويب (مين حاضر، مين إجازة مرضية، أسبوعية، سفر...)',
      category: 'الرؤية والمتابعة'
    },
    {
      key: 'view_reports',
      label: 'الاطلاع على تقارير وسجلات الحضور الشاملة',
      description: 'رؤية كشوفات حضور الموظفين بالكامل وساعات الالتزام',
      category: 'الرؤية والمتابعة'
    },
    {
      key: 'request_leave',
      label: 'تقديم طلبات الإجازات (مرضي، سفر، سنوي)',
      description: 'إمكانية إرسال طلبات الإجازة من حسابه إلى الإدارة',
      category: 'الإجازات والأذونات'
    },
    {
      key: 'request_permission',
      label: 'تقديم طلب إذن الساعتين',
      description: 'إمكانية طلب إذن صباحي أو مسائي ساعتين',
      category: 'الإجازات والأذونات'
    },
    {
      key: 'approve_leaves_permissions',
      label: 'اعتماد وموافقة على إجازات وأذونات الموظفين',
      description: 'منح صلاحية قبول أو رفض طلبات الإجازات والأذونات المقدمة',
      category: 'الإجازات والأذونات'
    },
    {
      key: 'manage_employees',
      label: 'إضافة وتعديل بيانات الموظفين',
      description: 'التحكم في قائمة الموظفين وتعيين مسمياتهم الوظيفية وتعديل بياناتهم',
      category: 'الإدارة والإعدادات'
    },
    {
      key: 'edit_employee_details',
      label: 'تعديل مسميات وفروع وأرصدة الموظفين',
      description: 'صلاحية تغيير المسمى الوظيفي والفرع وأيام الراحة ورصيد الإجازات لأي موظف',
      category: 'الإدارة والإعدادات'
    },
    {
      key: 'manage_office_settings',
      label: 'تعديل إعدادات الفروع ومواقع الـ GPS',
      description: 'تغيير إحداثيات فروع أندية وادي دجلة ونطاق القطر المسموح به',
      category: 'الإدارة والإعدادات'
    },
    {
      key: 'manage_titles_permissions',
      label: 'التحكم في صلاحيات المسميات (هذه الشاشة)',
      description: 'تعديل وتحديد ما يراه ويصل إليه كل مسمى وظيفي',
      category: 'الإدارة والإعدادات'
    }
  ];

  const fetchTitles = async () => {
    try {
      const res = await api.getTitles();
      if (res.success) {
        setTitles(res.titles);
        const allowed = res.titles.filter(t => {
          if (isSuperAdmin) return true;
          const targetRank = t.order || HIERARCHY_ORDER[t.code] || 99;
          return targetRank > myRank;
        });
        const selected = allowed.find(t => t.code === selectedTitleCode) || allowed[0];
        if (selected) {
          setSelectedTitleCode(selected.code);
          setPermissionsState({ ...(selected.permissions || {}) });
        }
      }
    } catch (err) {
      console.error(err);
      setSaveError('تعذر جلب المسميات الوظيفية من السيرفر.');
    }
  };

  const fetchEmployeesData = async () => {
    try {
      const [empRes, branchRes] = await Promise.all([
        api.getEmployees(),
        api.getBranches()
      ]);
      if (empRes.success && empRes.employees) {
        setEmployees(empRes.employees);
      }
      if (branchRes.success && branchRes.branches) {
        setBranches(branchRes.branches);
      }
    } catch (err) {
      console.error("fetchEmployeesData error:", err);
    }
  };

  useEffect(() => {
    fetchTitles();
    fetchEmployeesData();
  }, []);

  const handleSelectTitle = (code) => {
    setSelectedTitleCode(code);
    const titleObj = titles.find(t => t.code === code);
    if (titleObj) {
      setPermissionsState({ ...(titleObj.permissions || {}) });
    }
    setSaveSuccess('');
    setSaveError('');
  };

  const handleTogglePermission = (key) => {
    setPermissionsState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setSaveSuccess('');
  };

  const handleSavePermissions = async () => {
    const targetRank = activeTitle?.order || HIERARCHY_ORDER[selectedTitleCode] || 99;
    if (!isSuperAdmin && targetRank <= myRank) {
      setSaveError('غير مصرح: لا يمكنك تعديل صلاحيات مسمى وظيفي مساوٍ أو أعلى منك في الهرم الإداري.');
      return;
    }

    setLoading(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await api.updateTitlePermissions(selectedTitleCode, permissionsState);
      if (res.success && res.title) {
        setSaveSuccess(`تم حفظ وتطبيق صلاحيات (${res.title.name}) بنجاح.`);
        // Immediately update local titles array so state stays fresh!
        setTitles(prev => prev.map(t => t.code === selectedTitleCode ? res.title : t));
        setPermissionsState({ ...(res.title.permissions || {}) });
        if (onTitlesUpdated) onTitlesUpdated(res.title);
      } else {
        setSaveError(res.error || 'حدث خطأ أثناء حفظ الصلاحيات.');
      }
    } catch (err) {
      console.error(err);
      setSaveError(err.message || 'فشل الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  // Reset device binding for an employee
  const handleResetDevice = async (employee) => {
    if (!window.confirm(`هل أنت متأكد من فك ارتباط الجهاز لحساب الموظف (${employee.name})؟\n\nسيمكّنه هذا من تسجيل الدخول من هاتفه الجديد فوراً وتأمينه عليه.`)) {
      return;
    }

    setEmpActionLoading(true);
    setEmpSuccessMsg('');
    setEmpErrorMsg('');

    try {
      const res = await api.resetEmployeeDevice(employee.id);
      if (res.success) {
        setEmpSuccessMsg(`تم فك ارتباط الجهاز للموظف (${employee.name}) بنجاح. يمكنه الآن فتح حسابه على الهاتف الجديد.`);
        fetchEmployeesData();
      } else {
        setEmpErrorMsg(res.error || 'تعذر فك الارتباط.');
      }
    } catch (err) {
      setEmpErrorMsg(err.message || 'فشل الاتصال بالخادم.');
    } finally {
      setEmpActionLoading(false);
    }
  };

  // Open Edit Details modal
  const openEditModal = (emp) => {
    setEditingEmp(emp);
    setEditName(emp.name || '');
    setEditPhone(emp.phone || '');
    setEditTitleCode(emp.titleCode || 'memberships_specialist');
    setEditBranchId(emp.branchId || 'branch_october2');
    setEditSectorId(emp.sectorId || (DEFAULT_SECTORS && DEFAULT_SECTORS[0]?.id) || '');
    setEditWeeklyOff(emp.weeklyOffDays || ['friday', 'saturday']);
    setEditLeaveBalance(emp.leaveBalance !== undefined ? emp.leaveBalance : 30);
    setEditPermBalance(emp.permissionsBalanceHours !== undefined ? emp.permissionsBalanceHours : 2);
    setEmpSuccessMsg('');
    setEmpErrorMsg('');
  };

  // Save Full Employee Details
  const handleSaveEmployeeDetails = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;

    setEmpActionLoading(true);
    setEmpSuccessMsg('');
    setEmpErrorMsg('');

    try {
      const selectedSector = DEFAULT_SECTORS.find(s => s.id === editSectorId);
      const res = await api.updateEmployeeDetails(editingEmp.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        titleCode: editTitleCode,
        branchId: editBranchId,
        sectorId: editTitleCode === 'memberships_area_manager' ? editSectorId : '',
        sectorName: editTitleCode === 'memberships_area_manager' && selectedSector ? selectedSector.name : '',
        weeklyOffDays: editWeeklyOff,
        leaveBalance: Number(editLeaveBalance),
        permissionsBalanceHours: Number(editPermBalance)
      });
      if (res.success) {
        setEmpSuccessMsg(`تم تحديث بيانات الموظف (${editName}) بنجاح.`);
        setEditingEmp(null);
        fetchEmployeesData();
      } else {
        setEmpErrorMsg(res.error || 'تعذر تحديث بيانات الموظف.');
      }
    } catch (err) {
      setEmpErrorMsg(err.message || 'فشل الاتصال بالخادم.');
    } finally {
      setEmpActionLoading(false);
    }
  };

  // Filter employees according to user's scope
  const allowedBranches = getUserAllowedBranches(currentUser, branches);
  const allowedBranchIds = allowedBranches.map(b => b.id);
  const isExecutive = currentUser?.titleCode === 'memberships_executive_director';

  const visibleEmployees = employees.filter(emp => {
    // Hide Ghost Super Admin from everyone!
    if (emp.phone === '01010046078' || emp.isGhost || emp.isSuperAdmin) {
      return false;
    }
    // Branch scoping
    if (!isExecutive && !isSuperAdmin && !allowedBranchIds.includes(emp.branchId)) {
      return false;
    }
    // Branch filter dropdown
    if (selectedBranchFilter !== 'all' && emp.branchId !== selectedBranchFilter) {
      return false;
    }
    // Search query
    if (employeeSearch.trim()) {
      const q = employeeSearch.trim().toLowerCase();
      const nameMatch = emp.name && emp.name.toLowerCase().includes(q);
      const phoneMatch = emp.phone && emp.phone.includes(q);
      const titleMatch = emp.jobTitle && emp.jobTitle.toLowerCase().includes(q);
      return nameMatch || phoneMatch || titleMatch;
    }
    return true;
  });

  const activeTitle = titles.find(t => t.code === selectedTitleCode);
  const categories = Array.from(new Set(permissionDefs.map(p => p.category)));

  return (
    <div className="space-y-4 pb-8 text-right font-['Cairo',sans-serif]">
      {/* Top Segmented Subtab Switcher */}
      {(canManageTitles || canManageEmployees) && (
        <div className="bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-lg flex gap-1">
          {canManageTitles && (
            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeSubTab === 'roles'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>صلاحيات المسميات</span>
            </button>
          )}

          {canManageEmployees && (
            <button
              type="button"
              onClick={() => setActiveSubTab('employees')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeSubTab === 'employees'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>الأجهزة والأرصدة للموظفين</span>
            </button>
          )}
        </div>
      )}

      {/* ================= VIEW 1: EMPLOYEES, DEVICES & BALANCES ================= */}
      {activeSubTab === 'employees' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header & Description */}
          <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>إدارة ارتباط الأجهزة وأرصدة الإجازات للموظفين</span>
              </h2>
              <button
                type="button"
                onClick={fetchEmployeesData}
                className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl border border-amber-500/30 transition-colors"
              >
                تحديث
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              كل حساب موظف <b>مقفل على جهازه فقط</b> لمنع فتح الحساب من هاتفين. في حال قام الموظف بتغيير هاتفه، اضغط "فك ارتباط الجهاز" ليتمكن من ربط هاتفه الجديد. كما يمكنك تعديل رصيد الإجازات السنوية (الافتراضي 30 يوماً) وساعتين أذن شهرياً للموظفين الجدد.
            </p>

            {/* Notification messages */}
            {empSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{empSuccessMsg}</span>
              </div>
            )}
            {empErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{empErrorMsg}</span>
              </div>
            )}

            {/* Search and Branch Filter */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-800">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  placeholder="بحث باسم الموظف أو رقم هاتفه..."
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              {allowedBranches.length > 1 && (
                <div className="flex items-center gap-1.5 sm:w-56">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    value={selectedBranchFilter}
                    onChange={e => setSelectedBranchFilter(e.target.value)}
                    className="w-full p-2 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">كافة الفروع المتاحة</option>
                    {allowedBranches.map(b => (
                      <option key={b.id} value={b.id}>
                        فرع {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Employee Cards List */}
          <div className="space-y-2.5">
            {visibleEmployees.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs font-bold">لا يوجد موظفون مطابقون في نطاق صلاحياتك.</p>
              </div>
            ) : (
              visibleEmployees.map(emp => {
                const isBound = Boolean(emp.boundDeviceId);

                return (
                  <div
                    key={emp.id}
                    className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl shadow-md space-y-2.5 hover:border-zinc-700 transition-colors"
                  >
                    {/* Top Row: Avatar, Name, Job Title */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={emp.avatar || DEFAULT_AVATAR}
                          alt={emp.name}
                          className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shrink-0"
                          onError={e => { e.target.src = DEFAULT_AVATAR; }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-zinc-100 truncate">{emp.name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">({emp.phone})</span>
                          </div>
                          <div className="text-[10px] font-bold text-amber-400 truncate mt-0.5">
                            {emp.jobTitle} • فرع {emp.branchName || 'اكتوبر ٢'}
                          </div>
                        </div>
                      </div>

                      {/* Device Status Badge */}
                      <div className="shrink-0">
                        {isBound ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/70 border border-emerald-600/60 text-emerald-300">
                            <Lock className="w-3 h-3 text-emerald-400" />
                            <span>مقفل على جهاز</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950/70 border border-amber-600/60 text-amber-300">
                            <Unlock className="w-3 h-3 text-amber-400" />
                            <span>متاح للربط</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Device Details & Balances */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                      {/* Device Info */}
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/70 space-y-1">
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                          <span className="flex items-center gap-1 font-bold">
                            <Smartphone className="w-3 h-3 text-amber-400" />
                            <span>الجهاز المرتبط:</span>
                          </span>
                          {isBound && (
                            <button
                              type="button"
                              onClick={() => handleResetDevice(emp)}
                              disabled={empActionLoading}
                              className="text-[10px] font-black text-rose-400 hover:text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                              title="فك ارتباط الجهاز للسماح بنقل الحساب لهاتف جديد"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>فك الارتباط 🔓</span>
                            </button>
                          )}
                        </div>
                        <div className="text-zinc-200 font-bold text-[11px] truncate">
                          {isBound ? (
                            <span>{emp.deviceInfo || 'هاتف محمول معتمد'}</span>
                          ) : (
                            <span className="text-zinc-500">لا يوجد جهاز مرتبط حالياً (سيرتبط بأول جهاز يسجل منه)</span>
                          )}
                        </div>
                      </div>

                      {/* Balances Info */}
                      <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/70 space-y-1">
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                          <span className="flex items-center gap-1 font-bold">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span>الأرصدة والبيانات:</span>
                          </span>
                          {canEditEmployeeDetails && (
                            <button
                              type="button"
                              onClick={() => openEditModal(emp)}
                              className="text-[10px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                              title="تعديل المسمى الوظيفي والفرع وأيام الراحة والرصيد"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>تعديل البيانات ✏️</span>
                            </button>
                          )}
                        </div>
                        <div className="text-amber-300 font-black text-[11px] flex items-center gap-2">
                          <span>إجازات: <b>{emp.leaveBalance !== undefined ? emp.leaveBalance : 30} يوم</b></span>
                          <span>•</span>
                          <span>أذونات: <b>{emp.permissionsBalanceHours !== undefined ? emp.permissionsBalanceHours : 2} س/شهر</b></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Edit Details & Balances Modal */}
          {editingEmp && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-md bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-xs font-black text-zinc-100">تعديل بيانات المسمى والفرع والرصيد</h3>
                      <span className="text-[10px] text-amber-400 font-bold block">{editingEmp.name}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEmp(null)}
                    className="p-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEmployeeDetails} className="space-y-3">
                  {/* Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">الاسم بالكامل:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        required
                        className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">رقم الهاتف:</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        required
                        className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Position (المسمى الوظيفي) */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">المسمى الوظيفي (Position):</label>
                    <select
                      value={editTitleCode}
                      onChange={e => setEditTitleCode(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500"
                    >
                      {titles.map(t => (
                        <option key={t.code} value={t.code} className="bg-zinc-900 text-zinc-100">
                          {t.name || t.englishTitle}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch (الفرع) */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">فرع العمل الأساسي:</label>
                    <select
                      value={editBranchId}
                      onChange={e => setEditBranchId(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100">
                          فرع {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sector (القطاع) - Only if area manager */}
                  {editTitleCode === 'memberships_area_manager' && (
                    <div className="bg-amber-500/10 p-2.5 rounded-2xl border border-amber-500/30">
                      <label className="block text-[11px] font-black text-amber-300 mb-1">قطاع الإشراف والمتابعة:</label>
                      <select
                        value={editSectorId}
                        onChange={e => setEditSectorId(e.target.value)}
                        className="w-full p-2 text-xs font-bold rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500"
                      >
                        {DEFAULT_SECTORS.map(sec => (
                          <option key={sec.id} value={sec.id} className="bg-zinc-900 text-zinc-100">
                            {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Weekly Off Days */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1.5">أيام الإجازة الأسبوعية (الراحة):</label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS_OF_WEEK.map(day => {
                        const isSelected = editWeeklyOff.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (editWeeklyOff.length > 1) {
                                  setEditWeeklyOff(editWeeklyOff.filter(d => d !== day.id));
                                }
                              } else {
                                setEditWeeklyOff([...editWeeklyOff, day.id]);
                              }
                            }}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            {day.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 mb-1">رصيد الإجازات (أيام):</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={editLeaveBalance}
                        onChange={e => setEditLeaveBalance(e.target.value)}
                        required
                        className="w-full p-2 text-xs font-black rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-300 mb-1">رصيد الأذونات (ساعات):</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={editPermBalance}
                        onChange={e => setEditPermBalance(e.target.value)}
                        required
                        className="w-full p-2 text-xs font-black rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={empActionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{empActionLoading ? 'جاري الحفظ...' : 'حفظ البيانات المعتمدة'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEmp(null)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: ROLES & TITLES PERMISSIONS ================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header & Description */}
          <div className="bg-zinc-900 p-4 rounded-3xl border border-zinc-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>لوحة التحكم في صلاحيات الهرم الإداري (7 تايتلز)</span>
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              تحكم كامل في ما يمكن لكل مسمى وظيفي رؤيته والقيام به في النظام وفق الترتيب الهرمي المعتمد.
            </p>

            {/* Notification messages */}
            {saveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}
            {saveError && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

          {/* Titles Selector List */}
          <div className="bg-zinc-900 p-3.5 rounded-3xl border border-zinc-800 shadow-xl space-y-2">
            <span className="text-xs font-black text-zinc-300 block">
              اختر المسمى الوظيفي لضبط صلاحياته (المرؤوسين فقط وفق التسلسل الهرمي):
            </span>
            {editableTitles.length === 0 ? (
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-xs text-zinc-400 font-bold">
                🔒 لا توجد مسميات وظيفية تابعة لك في الهرم الإداري لتعديل صلاحياتها.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {editableTitles.map(title => (
                  <button
                    key={title.code}
                    type="button"
                    onClick={() => handleSelectTitle(title.code)}
                    className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      selectedTitleCode === title.code
                        ? 'bg-amber-500 text-black border-amber-500 shadow-md font-black'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-black text-xs">{title.name}</span>
                      {selectedTitleCode === title.code ? (
                        <Check className="w-3.5 h-3.5 text-black" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </div>
                    <span className={`text-[10px] line-clamp-1 ${selectedTitleCode === title.code ? 'text-zinc-900' : 'text-zinc-500'}`}>
                      {title.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permissions Matrix Box */}
          {activeTitle && (
            <div className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <h3 className="font-black text-sm text-zinc-100">
                      صلاحيات مسمى: <span className="text-amber-400">"{activeTitle.name}"</span>
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{activeTitle.description}</p>
                </div>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>

              {/* Grouped Permission Items */}
              <div className="space-y-4">
                {categories.map(category => {
                  const items = permissionDefs.filter(p => p.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category} className="space-y-2">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                        {category}
                      </span>

                      <div className="grid gap-2">
                        {items.map(def => {
                          const isEnabled = Boolean(permissionsState[def.key]);

                          return (
                            <div
                              key={def.key}
                              onClick={() => handleTogglePermission(def.key)}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isEnabled
                                  ? 'bg-zinc-950 border-amber-500/40 text-zinc-100'
                                  : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-500 opacity-60'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-200">{def.label}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                                    isEnabled ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'
                                  }`}>
                                    {isEnabled ? 'مفعل' : 'معطل'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  {def.description}
                                </p>
                              </div>

                              {/* Toggle switch */}
                              <div
                                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                                  isEnabled ? 'bg-amber-500' : 'bg-zinc-800'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full bg-zinc-950 shadow-sm transition-transform absolute top-0.5 ${
                                    isEnabled ? 'left-0.5' : 'right-0.5'
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Action */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ صلاحيات هذا المسمى'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
