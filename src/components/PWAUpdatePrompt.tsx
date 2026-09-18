import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, Download, RefreshCw, X } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered successfully:', r);
      
      // Auto check for updates every 10 minutes
      if (r) {
        setInterval(() => {
          r.update().catch(err => console.error('Error updating SW:', err));
        }, 10 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW Registration Error:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  const handleUpdate = () => {
    // When updating, we update the service worker which automatically reloads
    // the page. This preserves localStorage and Firestore sessions, meaning
    // all user coins and progress are 100% saved!
    updateServiceWorker(true);
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:max-w-md z-50 animate-bounce-short">
      <div className="relative overflow-hidden bg-neutral-900 border-2 border-amber-500 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-5 select-none text-right">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600" />
        
        {/* Glow Element */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 justify-end mb-1">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-pulse" /> تحديث جديد
              </span>
              <h4 className="text-sm font-black text-neutral-100">
                تحديث ميني باتل أرينا متاح! 🚀
              </h4>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mb-3 mt-1.5">
              قام المطور <strong className="text-amber-400 font-extrabold">محمد أحمد السيد</strong> بإطلاق إصدار جديد يحتوي على إضافات مميزة وموازنة للقتال.
            </p>

            <p className="text-[10px] text-emerald-400 font-medium mb-4 flex items-center gap-1 justify-end">
              <span>✓ سيتم حفظ كل رصيد عملاتك وتقدمك بالكامل</span>
              <span className="text-xs">🛡️</span>
            </p>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setNeedRefresh(false)}
                className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                تخطي الآن
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 text-xs font-black rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.2)] flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                تحديث اللعبة الآن ⚙️
              </button>
            </div>
          </div>

          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-2xl shadow-inner select-none">
            🪙
          </div>
        </div>
      </div>
    </div>
  );
};
