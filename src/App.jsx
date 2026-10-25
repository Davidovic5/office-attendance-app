import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  FileText, 
  Shield, 
  Settings, 
  Building2, 
  UserCircle2, 
  ChevronDown, 
  MapPin, 
  Download,
  Share2,
  Smartphone,
  CheckCircle2,
  X
} from 'lucide-react';
import { api } from './api';
import { CheckInTab } from './components/CheckInTab';
import { OfficePresenceTab } from './components/OfficePresenceTab';
import { LeavesPermissionsTab } from './components/LeavesPermissionsTab';
import { RolesPermissionsTab } from './components/RolesPermissionsTab';
import { OfficeSettingsTab } from './components/OfficeSettingsTab';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [officeSettings, setOfficeSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('check_in'); // 'check_in', 'presence', 'leaves', 'roles', 'settings'
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Load initial system data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [settingsRes, employeesRes] = await Promise.all([
        api.getSettings(),
        api.getEmployees(),
      ]);

      if (settingsRes.success) {
        setOfficeSettings(settingsRes.settings);
      }

      if (employeesRes.success && employeesRes.employees.length > 0) {
        setEmployees(employeesRes.employees);
        if (!currentUser) {
          // Default to the first employee (Ahmed - Manager)
          setCurrentUser(employeesRes.employees[0]);
        } else {
          // Keep same user but refresh permissions
          const refreshed = employeesRes.employees.find(e => e.id === currentUser.id);
          if (refreshed) setCurrentUser(refreshed);
        }
      }
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  if (loading || !officeSettings || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h1 className="text-base font-black">نظام الحضور والغياب الذكي</h1>
        <p className="text-xs text-slate-400 mt-1">جاري تحميل التطبيق...</p>
      </div>
    );
  }

  // Determine permissions of active user
  const permissions = currentUser.permissions || {};
  const isManager = currentUser.titleCode === 'manager' || permissions.manage_titles_permissions;

  // Tabs configuration based on user permissions
  const tabs = [
    {
      id: 'check_in',
      label: 'تسجيل الحضور',
      icon: Clock,
      enabled: permissions.check_in_out !== false
    },
    {
      id: 'presence',
      label: 'المتواجدين',
      icon: Users,
      enabled: permissions.view_office_presence !== false
    },
    {
      id: 'leaves',
      label: 'الإجازات والأذونات',
      icon: FileText,
      enabled: permissions.request_leave !== false || permissions.request_permission !== false
    },
    {
      id: 'roles',
      label: 'الصلاحيات',
      icon: Shield,
      enabled: permissions.manage_titles_permissions || isManager
    },
    {
      id: 'settings',
      label: 'إعدادات المقر',
      icon: Settings,
      enabled: permissions.manage_office_settings || isManager
    }
  ].filter(t => t.enabled);

  // Content Renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'check_in':
        return (
          <CheckInTab 
            currentUser={currentUser} 
            officeSettings={officeSettings} 
            onAttendanceUpdated={loadInitialData}
          />
        );
      case 'presence':
        return <OfficePresenceTab />;
      case 'leaves':
        return (
          <LeavesPermissionsTab 
            currentUser={currentUser} 
            onStatusChanged={loadInitialData}
          />
        );
      case 'roles':
        return <RolesPermissionsTab onTitlesUpdated={loadInitialData} />;
      case 'settings':
        return (
          <OfficeSettingsTab 
            officeSettings={officeSettings} 
            onSettingsUpdated={loadInitialData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-['Cairo',sans-serif] selection:bg-blue-600 selection:text-white">
      {/* Native App Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Brand & Office Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">حضور وانصراف المكتب</h1>
              <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500" />
                <span className="truncate max-w-[130px] sm:max-w-[200px]">{officeSettings.officeName}</span>
              </span>
            </div>
          </div>

          {/* User Profile Button / Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowInstallModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="تثبيت التطبيق على الهاتف"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-2xl p-1.5 pr-2 pl-2.5 transition-all"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-xl object-cover border-2 border-blue-500 shadow-xs shrink-0"
              />
              <div className="text-right hidden xs:block">
                <span className="text-xs font-black text-slate-800 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-blue-600 font-bold block">{currentUser.jobTitle}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <main className="flex-1 w-full max-w-lg mx-auto p-3.5 sm:p-5 flex flex-col">
        {/* Today's Context Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-4 shadow-lg shadow-blue-500/15 mb-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-blue-100 font-bold block">مرحباً بك،</span>
            <h2 className="text-base font-black">{currentUser.name}</h2>
            <span className="text-[11px] text-blue-200 block mt-0.5">
              {currentUser.jobTitle} • رصيد إجازات: {currentUser.leaveBalance ?? 21} يوم
            </span>
          </div>

          <div className="text-left bg-white/10 backdrop-blur-xs px-3 py-2 rounded-2xl border border-white/15">
            <span className="text-[10px] text-blue-200 font-semibold block">اليوم</span>
            <span className="text-xs font-black whitespace-nowrap">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 pb-16">
          {renderTabContent()}
        </div>
      </main>

      {/* Native App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around items-center">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-1.5 px-2 rounded-2xl transition-all relative flex-1 ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className={`text-[10px] tracking-tight whitespace-nowrap ${isActive ? 'font-black' : 'font-bold'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute bottom-0.5"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Switcher Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-black text-slate-800">تبديل حساب المستخدم (لتجربة الصلاحيات)</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {employees.map(emp => {
                const isSelected = emp.id === currentUser.id;
                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setCurrentUser(emp);
                      setShowUserModal(false);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-500 shadow-xs' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={emp.avatar} 
                        alt={emp.name} 
                        className="w-10 h-10 rounded-xl object-cover border"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900">{emp.name}</div>
                        <span className="text-[11px] text-blue-600 font-semibold">{emp.jobTitle}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Install App on Phone Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800">تنزيل وتثبيت التطبيق على الهواتف</h3>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* Android Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <div className="font-black text-emerald-900 text-sm flex items-center gap-2">
                  <span>📱 لأجهزة الأندرويد (Android):</span>
                </div>
                <p className="text-emerald-800">
                  يمكن تنزيل ملف التطبيق المباشر (APK) أو تثبيته فورياً:
                </p>
                <a
                  href="/download/OfficeAttendance.apk"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف الأندرويد (OfficeAttendance.apk)</span>
                </a>
              </div>

              {/* iPhone Card */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-2">
                <div className="font-black text-blue-900 text-sm flex items-center gap-2">
                  <span>🍎 لأجهزة الآيفون (iPhone / iOS):</span>
                </div>
                <p className="text-blue-800">
                  نظام iOS من آبل يتيح تثبيت ملف الإعدادات المباشر (.mobileconfig) أو إضافته من Safari للشاشة الرئيسية:
                </p>
                <a
                  href="/download/OfficeAttendance.mobileconfig"
                  download
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف الآيفون (OfficeAttendance.mobileconfig)</span>
                </a>
                <div className="text-[11px] text-blue-700 bg-white/70 p-2.5 rounded-xl border border-blue-200/60 mt-2 space-y-1">
                  <div className="font-bold">أو التثبيت الفوري في 5 ثوانٍ:</div>
                  <div>1. افتح الرابط في متصفح <b>Safari</b> على الآيفون.</div>
                  <div>2. اضغط زر <b>المشاركة (Share)</b> بالأسفل.</div>
                  <div>3. اضغط <b>"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"</b>.</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
