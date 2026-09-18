import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onQuit,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div id="pause-modal" className="absolute inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-150">
        <h2 className="text-2xl font-black text-white mb-1">اللعبة متوقفة مؤقتاً</h2>
        <p className="text-xs text-neutral-400 mb-6">Mini Battle Arena</p>

        <div className="w-full flex flex-col gap-3">
          {/* Resume Button */}
          <button
            id="btn-resume-game"
            onClick={onResume}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <Play className="w-4 h-4 fill-neutral-950" />
            <span>استئناف المعركة</span>
          </button>

          {/* Restart Button */}
          <button
            id="btn-restart-game"
            onClick={onRestart}
            className="w-full py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-750 active:scale-95"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>إعادة تشغيل الجولة</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="w-full py-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700 text-neutral-300 font-medium text-xs flex items-center justify-center gap-2"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'الصوت مكتوم (انقر للتفعيل)' : 'الصوت مفعل'}</span>
          </button>

          {/* Quit to Menu */}
          <button
            id="btn-quit-to-menu"
            onClick={onQuit}
            className="w-full py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-900 active:scale-95 mt-2"
          >
            <Home className="w-4 h-4" />
            <span>العودة للقائمة الرئيسية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
