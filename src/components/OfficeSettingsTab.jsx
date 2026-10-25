import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Crosshair, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Sliders
} from 'lucide-react';
import { api } from '../api';

export function OfficeSettingsTab({ onSettingsUpdated }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('branch_sheraton');
  const [branchForm, setBranchForm] = useState({
    name: '',
    city: '',
    latitude: 30.1025,
    longitude: 31.3780,
    radiusMeters: 100
  });

  const [companySettings, setCompanySettings] = useState({
    companyName: 'إدارة المكاتب والشركات',
    shiftHours: 8,
    graceMinutes: 15
  });

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await api.getSettings();
      if (res.success) {
        setBranches(res.branches || []);
        if (res.settings) {
          setCompanySettings(res.settings);
        }
        const b = (res.branches || []).find(item => item.id === selectedBranchId) || (res.branches || [])[0];
        if (b) {
          setSelectedBranchId(b.id);
          setBranchForm({ ...b });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBranchSelect = (id) => {
    setSelectedBranchId(id);
    const b = branches.find(item => item.id === id);
    if (b) {
      setBranchForm({ ...b });
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }
    setGpsLoading(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setBranchForm(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        }));
        setGpsLoading(false);
        setSuccessMsg(`تم جلب موقعك الحالي لفرع (${branchForm.name}) بنجاح. اضغط حفظ لاعتماده.`);
      },
      err => {
        setErrorMsg('فشل جلب الموقع: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.updateBranch(selectedBranchId, {
        ...branchForm,
        latitude: parseFloat(branchForm.latitude),
        longitude: parseFloat(branchForm.longitude),
        radiusMeters: parseInt(branchForm.radiusMeters, 10)
      });

      if (res.success) {
        setSuccessMsg(`تم حفظ وتحديث إحداثيات فرع (${res.branch.name}) بنجاح!`);
        loadData();
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        setErrorMsg(res.error || 'حدث خطأ في الحفظ');
      }
    } catch (err) {
      setErrorMsg(err.message || 'فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-base font-black text-slate-800">إدارة الفروع الثمانية ونطاق الـ GPS</h2>
        <p className="text-xs text-slate-500">
          تحديد الإحداثيات الجغرافية ونطاق الحضور الدقيق لكل فرع على حدة.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border-r-4 border-rose-500 p-3 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Branch Selector Pills */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر الفرع للتعديل على إحداثياته ونطاقه:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {branches.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleBranchSelect(b.id)}
              className={`p-2.5 rounded-2xl text-right border transition-all ${
                selectedBranchId === b.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-800 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="font-black text-xs">فرع {b.name}</div>
              <div className={`text-[10px] ${selectedBranchId === b.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {b.city} • {b.radiusMeters}م
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Branch Settings Form */}
      <form onSubmit={handleSaveBranch} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-sm text-slate-900">
              إعدادات فرع: <span className="text-blue-600 font-black">"{branchForm.name}"</span>
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-lg">
            {branchForm.city}
          </span>
        </div>

        {/* GPS Coordinates Box */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>إحداثيات المقر الجغرافية لهذا الفرع</span>
            </span>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gpsLoading}
              className="text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{gpsLoading ? 'جاري التحديد...' : 'تعيين موقعي الحالي لهذا الفرع'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                خط العرض <span className="font-mono text-slate-400 font-normal">(Lat)</span>:
              </label>
              <input
                type="number"
                step="any"
                dir="ltr"
                value={branchForm.latitude || ''}
                onChange={e => setBranchForm({ ...branchForm, latitude: e.target.value })}
                className="w-full p-2 text-xs font-mono font-bold text-left rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                خط الطول <span className="font-mono text-slate-400 font-normal">(Lng)</span>:
              </label>
              <input
                type="number"
                step="any"
                dir="ltr"
                value={branchForm.longitude || ''}
                onChange={e => setBranchForm({ ...branchForm, longitude: e.target.value })}
                className="w-full p-2 text-xs font-mono font-bold text-left rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">نطاق الحضور المسموح به لهذا الفرع:</span>
            <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">
              {branchForm.radiusMeters} متر
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={branchForm.radiusMeters || 100}
            onChange={e => setBranchForm({ ...branchForm, radiusMeters: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>20م</span>
            <span>100م (موصى به)</span>
            <span>500م</span>
          </div>
        </div>

        {/* Submit Save */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'جاري الحفظ...' : `حفظ إعدادات فرع ${branchForm.name}`}</span>
        </button>
      </form>
    </div>
  );
}
