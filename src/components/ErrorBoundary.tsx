import React, { Component, ErrorInfo, ReactNode } from 'react';
import { isQuotaError } from '../lib/firebase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isQuota = isQuotaError(this.state.error);
      
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 text-white p-6 text-center z-[9999] font-sans" dir="rtl">
          <div className="max-w-md w-full bg-neutral-900 border-2 border-amber-500 rounded-3xl p-8 shadow-2xl">
            <div className="text-5xl mb-6">⚠️</div>
            <h1 className="text-2xl font-black mb-4">
              {isQuota ? 'تم تجاوز حد الاستخدام اليومي' : 'حدث خطأ غير متوقع'}
            </h1>
            
            <p className="text-neutral-400 mb-8 leading-relaxed">
              {isQuota 
                ? 'لقد تجاوزت اللعبة الحد المسموح به من الطلبات لهذا اليوم (Firestore Quota). سيتم تصفير هذا الحد تلقائياً غداً. يمكنك الاستمرار في اللعب ولكن لن يتم حفظ التقدم أونلاين حالياً.'
                : 'واجهت اللعبة مشكلة تقنية مفاجئة. جرب إعادة تحميل الصفحة للمحاولة مرة أخرى.'}
            </p>

            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 px-6 py-4 rounded-2xl font-black transition-all transform active:scale-95 shadow-lg shadow-amber-600/20"
                onClick={() => window.location.reload()}
              >
                إعادة تحميل اللعبة 🔄
              </button>
              
              {isQuota && (
                <button
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-6 py-3 rounded-2xl font-bold transition-all"
                  onClick={() => this.setState({ hasError: false, error: null })}
                >
                  تجاهل ومواصلة اللعب أوفلاين 🎮
                </button>
              )}
            </div>
            
            {this.state.error && (
              <div className="mt-8 pt-4 border-t border-neutral-800">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Error details</p>
                <p className="text-[10px] font-mono text-rose-500/70 break-all bg-black/30 p-2 rounded">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
