import React, { useState, useEffect } from 'react';
import { Sparkles, Download, RefreshCw, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { versionManager, AppVersionInfo, CURRENT_APP_VERSION } from '../utils/versionManager';
import { soundManager } from '../audio/soundManager';

export const VersionUpdateModal: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      // Small delay on startup so it doesn't overlap with splash screen immediately
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      const latest = await versionManager.checkLatestVersion();
      if (latest && versionManager.isNewerVersion(latest.latestVersion)) {
        // Play notification or alert sound
        try {
          soundManager.playVictory();
        } catch {
          // Fallback if sounds aren't loaded yet
        }
        setUpdateInfo(latest);
        setIsOpen(true);
      }
    };
    checkVersion();
  }, []);

  if (!isOpen || !updateInfo) {
    return null;
  }

  const handleUpdateClick = () => {
    // Open the update link in a new tab
    window.open(updateInfo.updateUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden bg-neutral-900 border-2 border-amber-500 rounded-3xl shadow-[0_20px_50px_rgba(245,158,11,0.25)] p-6 select-none text-right">
        {/* Shiny Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 animate-pulse" />

        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl mb-3 shadow-inner shadow-amber-500/10 animate-bounce-short">
            ⚙️
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 justify-center">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" /> تم رصد تحديث جديد!
          </span>
          <h2 className="text-xl font-black text-white mt-3">
            تحديث ميني باتل أرينا متاح الآن
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            إصدار جديد ومحسن لتجربة معركة أفضل وأكثر استقراراً
          </p>
        </div>

        {/* Version Compare badging */}
        <div className="flex items-center justify-center gap-3 bg-neutral-950/50 border border-neutral-800 rounded-2xl py-3 px-4 mb-5">
          <div className="text-center flex-1">
            <span className="block text-[10px] text-neutral-500 font-bold mb-0.5">الإصدار الحالي</span>
            <span className="font-mono text-xs font-black text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {CURRENT_APP_VERSION}
            </span>
          </div>
          <div className="text-amber-500 text-lg animate-pulse">◀</div>
          <div className="text-center flex-1">
            <span className="block text-[10px] text-amber-500/80 font-bold mb-0.5">الإصدار الجديد</span>
            <span className="font-mono text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
              {updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* Update description changelog */}
        <div className="bg-neutral-950/40 border border-neutral-800/80 rounded-2xl p-4 mb-6">
          <h3 className="text-xs font-black text-neutral-300 mb-2 flex items-center gap-1 justify-end">
            <span>ملاحظات التحديث والمميزات</span>
            <span className="text-amber-400">📝</span>
          </h3>
          <p className="text-xs text-neutral-300 leading-relaxed text-right font-medium">
            {updateInfo.changelogAr}
          </p>
          <div className="mt-3 pt-3 border-t border-neutral-800/60 flex items-center gap-1.5 justify-end text-[10px] text-emerald-400 font-semibold">
            <span>سيتم مزامنة وحفظ عملاتك وتقدمك بالكامل تلقائياً ✓</span>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleUpdateClick}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-neutral-950 text-sm font-black rounded-xl shadow-[0_6px_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            تحديث وتنزيل النسخة الجديدة الآن 🚀
          </button>

          {!updateInfo.isMandatory && (
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 border border-neutral-800 hover:bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              مواصلة اللعب بالإصدار الحالي (تخطي)
            </button>
          )}

          {updateInfo.isMandatory && (
            <div className="flex items-center gap-1.5 justify-center text-[10px] text-rose-400 font-bold mt-2 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>هذا التحديث إجباري لضمان سلامة اللعب أونلاين والمزامنة</span>
            </div>
          )}
        </div>

        {/* Developer signature */}
        <div className="text-center mt-5 pt-3 border-t border-neutral-800/40">
          <span className="text-[10px] font-bold text-neutral-500">
            تطوير وإشراف المطور: <strong className="text-amber-500/80 font-extrabold">محمد أحمد السيد</strong> 🛡️
          </span>
        </div>
      </div>
    </div>
  );
};
