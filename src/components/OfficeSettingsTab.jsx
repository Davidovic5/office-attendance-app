import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Crosshair, 
  Sliders, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  HelpCircle
} from 'lucide-react';
import { api } from '../api';

export function OfficeSettingsTab({ officeSettings, onSettingsUpdated }) {
  const [formData, setFormData] = useState({ ...officeSettings });
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setFormData({ ...officeSettings });
  }, [officeSettings]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }
    setGpsLoading(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFormData(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6))
        }));
        setGpsLoading(false);
        setSuccessMsg('تم جلب إحداثيات موقعك الحالي بنجاح. اضغط "حفظ الإعدادات" لاعتمادها.');
      },
      err => {
        setErrorMsg('فشل جلب الموقع: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.updateSettings({
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radiusMeters: parseInt(formData.radiusMeters, 10),
        shiftHours: parseInt(formData.shiftHours, 10)
      });

      if (res.success) {
        setSuccessMsg('تم حفظ وتحديث إعدادات المكتب ونطاق الحضور بنجاح.');
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
        <h2 className="text-base font-black text-slate-800">إعدادات المكتب ونطاق الـ GPS</h2>
        <p className="text-xs text-slate-500">
          تحديد الموقع الجغرافي الدقيق لمقر العمل والمسافة المسموح بها لتسجيل الحضور.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3.5 rounded-xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border-r-4 border-rose-500 p-3.5 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Office Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم مقر العمل / الفرع:</label>
          <input
            type="text"
            value={formData.officeName || ''}
            onChange={e => setFormData({ ...formData, officeName: e.target.value })}
            placeholder="مثال: المكتب الرئيسي - المقر العام"
            className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            required
          />
        </div>

        {/* GPS Coordinates */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>إحداثيات المقر الجغرافية</span>
            </span>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gpsLoading}
              className="text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{gpsLoading ? 'جاري التحديد...' : 'استخدام موقعي الحالي الآن'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                خط العرض <span className="font-mono text-slate-400 font-normal">(Lat)</span>:
              </label>
              <input
                type="number"
                step="any"
                dir="ltr"
                value={formData.latitude || ''}
                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full p-2.5 text-xs font-mono font-bold text-left rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                value={formData.longitude || ''}
                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full p-2.5 text-xs font-mono font-bold text-left rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Radius Slider */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">نطاق الحضور المسموح به:</span>
            <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
              {formData.radiusMeters} متر
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={formData.radiusMeters || 100}
            onChange={e => setFormData({ ...formData, radiusMeters: parseInt(e.target.value, 10) })}
            className="w-full accent-blue-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>20 متر (دقيق)</span>
            <span>100 متر (موصى به)</span>
            <span>500 متر (واسع)</span>
          </div>
        </div>

        {/* Shift Duration Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>ساعات الوردية:</span>
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={formData.shiftHours || 8}
              onChange={e => setFormData({ ...formData, shiftHours: parseInt(e.target.value, 10) })}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">سماح الحضور (بالدقائق):</label>
            <input
              type="number"
              min="0"
              max="60"
              value={formData.graceMinutes || 15}
              onChange={e => setFormData({ ...formData, graceMinutes: parseInt(e.target.value, 10) })}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'جاري حفظ الإعدادات...' : 'حفظ الإعدادات ونطاق الحضور'}</span>
        </button>
      </form>
    </div>
  );
}
