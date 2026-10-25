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
  const [selectedTitleCode, setSelectedTitleCode] = useState('deputy_manager');
  const [permissionsState, setPermissionsState] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

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
        const current = res.titles.find(t => t.code === selectedTitleCode) || res.titles[0];
        if (current) {
          setSelectedTitleCode(current.code);
          setPermissionsState(current.permissions || {});
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTitles();
  }, []);

  const handleSelectTitle = (code) => {
    setSelectedTitleCode(code);
    setSaveSuccess('');
    setSaveError('');
    const t = titles.find(item => item.code === code);
    if (t) {
      setPermissionsState(t.permissions || {});
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
    <div className="space-y-4 pb-8 text-right">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-amber-400">التحكم في صلاحيات المسميات الوظيفية (RBAC)</h2>
        <p className="text-xs text-zinc-400">
          حدد كل مسمى وظيفي (تايتل) وما يُسمح له برؤيته والوصول إليه في النظام بدقة.
        </p>
      </div>

      {/* Success / Error Messages */}
      {saveSuccess && (
        <div className="bg-emerald-950/70 border border-emerald-700/80 p-3.5 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="bg-rose-950/70 border border-rose-700/80 p-3.5 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Title Selector Pills */}
      <div>
        <label className="block text-xs font-bold text-zinc-300 mb-2">اختر المسمى الوظيفي للتعديل على صلاحياته:</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {titles.map(title => (
            <button
              key={title.code}
              type="button"
              onClick={() => handleSelectTitle(title.code)}
              className={`p-3 rounded-2xl text-right border transition-all ${
                selectedTitleCode === title.code
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
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
  );
}
