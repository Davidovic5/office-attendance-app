import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('office_auth_user');
      localStorage.removeItem('office_cached_titles');
      localStorage.removeItem('office_cached_branches');
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-['Cairo',sans-serif] selection:bg-amber-500 selection:text-black">
          {/* Ambient Glow */}
          <div className="w-20 h-24 mb-4 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
            <img
              src="/logo.png?v=4.0"
              alt="Wadi Degla"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(245,184,0,0.4)] relative z-10"
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-400 text-xs font-bold mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>نظام الحضور الذكي - أندية وادي دجلة</span>
          </div>

          <h1 className="text-lg font-black text-white mb-2">
            حدث خطأ غير متوقع في العرض
          </h1>
          <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
            حدث انقطاع مؤقت أثناء تحميل الواجهة. لا تقلق، بياناتك وحسابك في أمان تام. يمكنك إعادة تحميل التطبيق للمتابعة.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs text-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تشغيل التطبيق</span>
            </button>

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              <span>تسجيل الدخول من جديد</span>
            </button>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="mt-6 text-left max-w-md w-full text-[10px] bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-zinc-400 overflow-auto max-h-40">
              <summary className="cursor-pointer text-amber-400 font-bold mb-1">تفاصيل الخطأ الفني</summary>
              <pre className="font-mono whitespace-pre-wrap">{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
