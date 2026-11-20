import React from 'react';
import { AlertTriangle, RefreshCw, LogOut, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
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
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = '/';
  };

  handleCopy = () => {
    try {
      const errText = `${this.state.error?.toString() || 'Unknown Error'}\n${this.state.errorInfo?.componentStack || ''}`;
      navigator.clipboard.writeText(errText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {}
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

          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs text-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تشغيل التطبيق</span>
            </button>

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              <span>تسجيل الدخول من جديد (مسح التخزين)</span>
            </button>
          </div>

          {this.state.error && (
            <div className="mt-5 text-left max-w-sm w-full bg-zinc-900/90 p-3.5 rounded-2xl border border-rose-500/40 text-rose-300 text-xs shadow-xl">
              <div className="flex items-center justify-between mb-1.5 border-b border-zinc-800 pb-1">
                <span className="font-bold text-amber-400">تفاصيل الخطأ الفني:</span>
                <button
                  type="button"
                  onClick={this.handleCopy}
                  className="text-[10px] bg-zinc-800 text-zinc-300 hover:text-white px-2 py-0.5 rounded-md flex items-center gap-1 border border-zinc-700"
                >
                  {this.state.copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{this.state.copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>
              <pre className="font-mono text-[10px] break-words whitespace-pre-wrap text-rose-200">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
