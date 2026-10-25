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
  KeyRound
} from 'lucide-react';
import { api } from '../api';

export function RolesPermissionsTab({ onTitlesUpdated }) {
  const [titles, setTitles] = useState([]);
  const [selectedTitleCode, setSelectedTitleCode] = useState('manager');
  const [permissionsState, setPermissionsState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // New Title Modal
  const [showNewTitleModal, setShowNewTitleModal] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleCode, setNewTitleCode] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');

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
      label: 'رؤية المتواجدين في المكتب وحالة الفريق',
      description: 'الاطلاع على تبويب (مين حاضر، مين إجازة مرضية، أسبوعية، سفر...)',
      category: 'الرؤية والمتابعة'
    },
    {
      key: 'view_reports',
      label: 'الاطلاع على تقارير وسجلات الحضور الشاملة',
      description: 'رؤية كشوفات حضور الموظفين بالكامل وساعات التأخير والالتزام',
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
      key: 'manage_office_settings',
      label: 'تعديل إعدادات المكتب وموقع الـ GPS',
      description: 'تغيير إحداثيات مقر المكتب ونصف القطر المسموح به وساعات الوردية',
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
        const current = res.titles.find(t => t.code === selectedTitleCode) || res.titles[0];
        if (current) {
          setSelectedTitleCode(current.code);
          setPermissionsState({ ...current.permissions });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTitles();
  }, []);

  const handleSelectTitle = (titleCode) => {
    setSelectedTitleCode(titleCode);
    const title = titles.find(t => t.code === titleCode);
    if (title) {
      setPermissionsState({ ...title.permissions });
      setSaveSuccess('');
      setSaveError('');
    }
  };

  const handleTogglePermission = (key) => {
    setPermissionsState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSavePermissions = async () => {
    setLoading(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await api.updateTitlePermissions(selectedTitleCode, permissionsState);
      if (res.success) {
        setSaveSuccess(res.message);
        fetchTitles();
        if (onTitlesUpdated) onTitlesUpdated();
      } else {
        setSaveError(res.error || 'حدث خطأ أثناء حفظ الصلاحيات');
      }
    } catch (err) {
      setSaveError(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const activeTitle = titles.find(t => t.code === selectedTitleCode);

  // Group permissions by category
  const categories = ['الحضور والعمل', 'الرؤية والمتابعة', 'الإجازات والأذونات', 'الإدارة والإعدادات'];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-800">التحكم في صلاحيات المسميات الوظيفية (RBAC)</h2>
        <p className="text-xs text-slate-500">
          حدد كل مسمى وظيفي (تايتل) وما يُسمح له برؤيته والوصول إليه في البرنامج بدقة.
        </p>
      </div>

      {/* Success / Error Messages */}
      {saveSuccess && (
        <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3.5 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="bg-rose-50 border-r-4 border-rose-500 p-3.5 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Title Selector Pills */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">اختر المسمى الوظيفي للتعديل عليه:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {titles.map(title => (
            <button
              key={title.code}
              onClick={() => handleSelectTitle(title.code)}
              className={`p-3 rounded-2xl text-right border transition-all ${
                selectedTitleCode === title.code
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/30'
                  : 'bg-white text-slate-800 border-slate-200/80 hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-xs">{title.name}</span>
                {selectedTitleCode === title.code ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <span className={`text-[10px] line-clamp-1 ${selectedTitleCode === title.code ? 'text-blue-100' : 'text-slate-400'}`}>
                {title.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix Box */}
      {activeTitle && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-sm text-slate-800">
                  صلاحيات مسمى: <span className="text-blue-600">"{activeTitle.name}"</span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{activeTitle.description}</p>
            </div>

            <button
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
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">
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
                              ? 'bg-blue-50/50 border-blue-200 text-slate-800'
                              : 'bg-slate-50 border-slate-200/70 text-slate-500 opacity-75'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">{def.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                                isEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {isEnabled ? 'مفعل' : 'معطل'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {def.description}
                            </p>
                          </div>

                          {/* iOS-style toggle */}
                          <div
                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                              isEnabled ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform absolute top-0.5 ${
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
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSavePermissions}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'جاري الحفظ...' : 'حفظ صلاحيات هذا المسمى'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
