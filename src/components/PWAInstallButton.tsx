import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const [showManualGuide, setShowManualGuide] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowManualGuide(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-neutral-950 shadow-2xl hover:bg-amber-500 transition animate-bounce"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        كيف أضيف اللعبة للشاشة؟
      </button>

      {showManualGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowManualGuide(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-6 shadow-2xl border-2 border-amber-500" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white text-right">طريقة إضافة اللعبة لشاشتك</h3>
            <p className="mt-4 text-sm text-neutral-300 text-right leading-relaxed">
              1. اضغط على <strong>الثلاث نقاط</strong> في متصفح كروم.<br />
              2. ابحث عن خيار <strong>"إضافة إلى الشاشة الرئيسية"</strong> (Add to Home screen).<br />
              3. اضغط إضافة. ستظهر اللعبة كأيقونة مستقلة وبشاشة كاملة!
            </p>
            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-6 w-full rounded-xl bg-neutral-800 py-3 text-sm font-bold text-white hover:bg-neutral-700"
            >
              فهمت!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
