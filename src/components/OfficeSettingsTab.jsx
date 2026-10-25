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
    companyName: 'أندية وادي دجلة - Wadi Degla Clubs',
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
    <div className="space-y-4 pb-8 text-right">
      <div>
        <h2 className="text-base font-black text-amber-400">إدارة فروع وادي دجلة الثمانية ونطاق الـ GPS</h2>
        <p className="text-xs text-zinc-400">
          تحديد الإحداثيات الجغرافية ونطاق الحضور الدقيق لكل فرع على حدة.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-700/80 p-3 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-700/80 p-3 rounded-2xl flex items-center gap-2 text-rose-300 text-xs font-bold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Branch Selector Pills */}
      <div>
        <label className="block text-xs font-bold text-zinc-300 mb-1.5">اختر الفرع للتعديل على إحداثياته ونطاقه:</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {branches.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleBranchSelect(b.id)}
              className={`p-2.5 rounded-2xl text-right border transition-all ${
                selectedBranchId === b.id
                  ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="font-black text-xs">فرع {b.name}</div>
              <div className={`text-[10px] ${selectedBranchId === b.id ? 'text-zinc-900' : 'text-zinc-500'}`}>
                {b.city} • {b.radiusMeters}م
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Branch Settings Form */}
      <form onSubmit={handleSaveBranch} className="bg-zinc-900 rounded-3xl p-5 border border-zinc-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-sm text-zinc-100">
              إعدادات فرع: <span className="text-amber-400 font-black">"{branchForm.name}"</span>
            </h3>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
            {branchForm.city}
          </span>
        </div>

        {/* GPS Coordinates Box */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>إحداثيات المقر الجغرافية لهذا الفرع</span>
            </span>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gpsLoading}
              className="text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>{gpsLoading ? 'جاري التحديد...' : 'تعيين موقعي الحالي لهذا الفرع'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                خط العرض <span className="font-mono text-zinc-500 font-normal">(Lat)</span>:
              </label>
              <input
                type="number"
                step="any"
                dir="ltr"
                value={branchForm.latitude || ''}
                onChange={e => setBranchForm({ ...branchForm, latitude: e.target.value })}
                className="w-full p-2.5 text-xs font-mono font-bold text-left rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                خط الطول <span className="font-mono text-zinc-500 font-normal">(Lng)</span>:
              </label>
              <input
                type="number"
                step="any"
                dir="ltr"
                value={branchForm.longitude || ''}
                onChange={e => setBranchForm({ ...branchForm, longitude: e.target.value })}
                className="w-full p-2.5 text-xs font-mono font-bold text-left rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200">نطاق الحضور المسموح به لهذا الفرع:</span>
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
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
            className="w-full accent-amber-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
            <span>20م</span>
            <span>100م (الموصى به)</span>
            <span>500م</span>
          </div>
        </div>

        {/* Submit Save */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4 text-black" />
          <span>{loading ? 'جاري الحفظ...' : `حفظ إعدادات فرع ${branchForm.name}`}</span>
        </button>
      </form>
    </div>
  );
}
