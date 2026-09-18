import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Crosshair, RotateCcw, ArrowRightLeft, Bomb, ArrowDownToLine, Flame, Zap, SlidersHorizontal } from 'lucide-react';
import { GameEngine } from '../game/gameEngine';
import { soundManager } from '../audio/soundManager';

interface TouchControlsProps {
  engine: GameEngine | null;
  onPause: () => void;
  grenadesCount: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  engine,
  onPause,
  grenadesCount,
}) => {
  const leftZoneRef = useRef<HTMLDivElement>(null);
  const rightZoneRef = useRef<HTMLDivElement>(null);

  // Left Joystick visual state
  const [leftActive, setLeftActive] = useState(false);
  const [leftOrigin, setLeftOrigin] = useState({ x: 0, y: 0 });
  const [leftThumb, setLeftThumb] = useState({ x: 0, y: 0 });

  // Right Joystick visual state
  const [rightActive, setRightActive] = useState(false);
  const [rightOrigin, setRightOrigin] = useState({ x: 0, y: 0 });
  const [rightThumb, setRightThumb] = useState({ x: 0, y: 0 });

  // Auto-Fire / Manual-Fire toggle state (default: Auto-Fire enabled)
  const [autoFire, setAutoFire] = useState(true);
  const [shootPressed, setShootPressed] = useState(false);

  // Scope Zoom Level state (1 = 1x, 2 = 2x, 3 = 3x)
  const [scopeLevel, setScopeLevel] = useState<1 | 2 | 3>(engine?.scopeLevel || 1);

  // Tactile button states
  const [meleePressed, setMeleePressed] = useState(false);

  const maxRadius = 55;

  const handleToggleScope = () => {
    if (engine) {
      const nextLevel = engine.cycleScopeLevel();
      setScopeLevel(nextLevel as 1 | 2 | 3);
      try {
        soundManager.playButtonClick();
      } catch { /* ignore */ }
    }
  };

  // Left joystick touch handling (Move & Jetpack)
  const handleLeftStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!leftZoneRef.current) return;
    const rect = leftZoneRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const ox = clientX - rect.left;
    const oy = clientY - rect.top;

    setLeftActive(true);
    setLeftOrigin({ x: ox, y: oy });
    setLeftThumb({ x: 0, y: 0 });
    engine?.setMoveInput(0, 0);
  }, [engine]);

  const handleLeftMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!leftActive || !leftZoneRef.current) return;
    const rect = leftZoneRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    let dx = currentX - leftOrigin.x;
    let dy = currentY - leftOrigin.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setLeftThumb({ x: dx, y: dy });

    const normX = dx / maxRadius;
    const normY = dy / maxRadius;
    engine?.setMoveInput(normX, normY);
    // Mini Militia signature: pushing joystick up or diagonally automatically fires the Jetpack!
    engine?.setJetpack(normY < -0.15);
  }, [leftActive, leftOrigin, engine]);

  const handleLeftEnd = useCallback(() => {
    setLeftActive(false);
    setLeftThumb({ x: 0, y: 0 });
    engine?.setMoveInput(0, 0);
    engine?.setJetpack(false);
  }, [engine]);

  // Right joystick touch handling (Aiming +/- Shooting based on autoFire mode)
  const handleRightStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!rightZoneRef.current) return;
    const rect = rightZoneRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const ox = clientX - rect.left;
    const oy = clientY - rect.top;

    setRightActive(true);
    setRightOrigin({ x: ox, y: oy });
    setRightThumb({ x: 0, y: 0 });
  }, []);

  const handleRightMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!rightActive || !rightZoneRef.current) return;
    const rect = rightZoneRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    let dx = currentX - rightOrigin.x;
    let dy = currentY - rightOrigin.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setRightThumb({ x: dx, y: dy });

    if (dist > 10) {
      const normX = dx / maxRadius;
      const normY = dy / maxRadius;
      // If autoFire is true: shoot automatically while aiming!
      // If autoFire is false: aim direction ONLY without firing!
      engine?.setAimInput(normX, normY, autoFire);
    }
  }, [rightActive, rightOrigin, autoFire, engine]);

  const handleRightEnd = useCallback(() => {
    setRightActive(false);
    setRightThumb({ x: 0, y: 0 });
    if (autoFire && !shootPressed) {
      engine?.setShoot(false);
    }
  }, [autoFire, shootPressed, engine]);

  // Dedicated Shoot Button Handlers (Manual Shooting)
  const handleShootStart = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setShootPressed(true);
    engine?.setShoot(true);
  };

  const handleShootEnd = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setShootPressed(false);
    engine?.setShoot(false);
  };

  // Keyboard and Mouse desktop fallback support
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateMovementFromKeys = () => {
      let mx = 0;
      let my = 0;

      if (activeKeys.has('a') || activeKeys.has('arrowleft')) mx -= 1;
      if (activeKeys.has('d') || activeKeys.has('arrowright')) mx += 1;
      if (activeKeys.has('w') || activeKeys.has('arrowup') || activeKeys.has(' ')) my -= 1;
      if (activeKeys.has('s') || activeKeys.has('arrowdown')) my += 1;

      const isJetpacking = my < 0 || activeKeys.has('shift');
      engine?.setMoveInput(mx, my);
      engine?.setJetpack(isJetpacking);
      if (my < 0 || activeKeys.has(' ')) {
        engine?.setJump(true);
      } else {
        engine?.setJump(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys.add(key);

      if (['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'shift'].includes(key)) {
        updateMovementFromKeys();
      }

      if (e.repeat) return;
      if (key === 'r') engine?.reloadPlayer();
      if (key === 'q') engine?.switchPlayerWeapon();
      if (key === 'f' || key === 'v') engine?.meleePlayer();
      if (key === 'g' || key === 'e') engine?.throwPlayerGrenade();
      if (key === 'z' || key === 'x' || key === 'c' || key === 'backspace') engine?.dropPlayerWeapon();
      if (key === 'p' || key === 'escape') onPause();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys.delete(key);
      updateMovementFromKeys();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!engine) return;
      const target = e.target as HTMLElement;
      if (target && target.closest('button, [role="button"], input, a')) {
        return;
      }
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const mx = e.clientX - rect.left - centerX;
      const my = e.clientY - rect.top - centerY;
      const dist = Math.hypot(mx, my);
      if (dist > 25) {
        engine.setAimInput(mx / dist, my / dist, false);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('button, [role="button"], input, a')) {
        return;
      }
      if (e.button === 0) engine?.setShoot(true);
      if (e.button === 2) {
        e.preventDefault();
        engine?.setJetpack(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) engine?.setShoot(false);
      if (e.button === 2) {
        e.preventDefault();
        engine?.setJetpack(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [engine, onPause]);

  return (
    <div id="touch-controls-container" className="absolute inset-0 pointer-events-none select-none z-30">
      {/* TOP LEFT SCOPE ZOOM & AUTO-FIRE MODE TOGGLE BUTTONS */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-auto z-50">
        {/* SCOPE ZOOM BUTTON (1X / 2X / 3X) - EXACT MATCH WITH SCREENSHOT */}
        <button
          onClick={handleToggleScope}
          className="w-10 h-10 rounded-full border-2 border-white/90 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center text-white font-black text-xs shadow-2xl active:scale-90 cursor-pointer hover:bg-neutral-800 transition-all"
          title="تغيير المنظور / زوم الكاميرا (1X / 2X / 3X)"
        >
          {scopeLevel}x
        </button>

        {/* AUTO-FIRE / MANUAL FIRE TOGGLE BUTTON */}
        <button
          onClick={() => {
            setAutoFire((prev) => !prev);
            try { soundManager.playButtonClick(); } catch {}
          }}
          className={`px-3 py-1.5 rounded-full border-2 text-xs font-black flex items-center gap-1.5 shadow-2xl active:scale-95 cursor-pointer transition-all ${
            autoFire
              ? 'bg-amber-500/90 border-amber-300 text-neutral-950 hover:bg-amber-400'
              : 'bg-rose-950/90 border-rose-400 text-rose-200 hover:bg-rose-900'
          }`}
          title="تبديل وضع إطلاق النار (تلقائي مع الأيم أو يدوي)"
        >
          {autoFire ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>ضرب تلقائي</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5 text-rose-400 fill-current" />
              <span>ضرب يدوي</span>
            </>
          )}
        </button>
      </div>

      {/* LEFT TOUCH ZONE: MOVEMENT & JETPACK VIRTUAL JOYSTICK */}
      <div
        id="zone-movement"
        ref={leftZoneRef}
        className="absolute left-0 bottom-0 w-[45vw] h-[55vh] pointer-events-auto touch-none"
        onTouchStart={handleLeftStart}
        onTouchMove={handleLeftMove}
        onTouchEnd={handleLeftEnd}
        onTouchCancel={handleLeftEnd}
        onMouseDown={handleLeftStart}
        onMouseMove={handleLeftMove}
        onMouseUp={handleLeftEnd}
      >
        {/* Joystick Visual Indicator */}
        <div
          className="absolute transition-opacity duration-200 pointer-events-none"
          style={{
            left: leftActive ? `${leftOrigin.x}px` : '100px',
            top: leftActive ? `${leftOrigin.y}px` : 'calc(55vh - 110px)',
            transform: 'translate(-50%, -50%)',
            opacity: leftActive ? 0.95 : 0.6,
          }}
        >
          {/* Base Ring */}
          <div className="w-28 h-28 rounded-full border-3 border-white/80 bg-white/10 backdrop-blur-xs flex items-center justify-center shadow-lg">
            <div className="w-16 h-16 rounded-full border border-white/40" />
            <div
              className="absolute w-14 h-14 rounded-full bg-white/30 border-2 border-white shadow-md flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `translate(${leftThumb.x}px, ${leftThumb.y}px)`,
              }}
            >
              <div className="w-6 h-6 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      </div>

      {/* GRENADE BUTTON - EXACT POSITION FROM SCREENSHOT (BOTTOM-LEFT ADJACENT TO MOVEMENT JOYSTICK) */}
      <div className="absolute left-40 bottom-6 pointer-events-auto z-40">
        <button
          id="btn-grenade"
          disabled={grenadesCount <= 0}
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-3 border-white/90 shadow-2xl backdrop-blur-xs transition-transform active:scale-90 relative cursor-pointer ${
            grenadesCount > 0
              ? 'bg-black/50 text-white hover:bg-black/70'
              : 'bg-black/20 text-neutral-400 opacity-40 cursor-not-allowed'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            engine?.throwPlayerGrenade();
          }}
          title="رمي قنبلة (E / G)"
        >
          <Bomb className="w-6 h-6 text-white" />
          {grenadesCount > 0 && (
            <span className="text-[10px] font-black text-white leading-none mt-0.5">
              {grenadesCount}
            </span>
          )}
        </button>
      </div>

      {/* RIGHT TOUCH ZONE: AIM VIRTUAL JOYSTICK */}
      <div
        id="zone-aim"
        ref={rightZoneRef}
        className="absolute right-0 bottom-0 w-[45vw] h-[55vh] pointer-events-auto touch-none"
        onTouchStart={handleRightStart}
        onTouchMove={handleRightMove}
        onTouchEnd={handleRightEnd}
        onTouchCancel={handleRightEnd}
        onMouseDown={handleRightStart}
        onMouseMove={handleRightMove}
        onMouseUp={handleRightEnd}
      >
        {/* Joystick Visual Indicator */}
        <div
          className="absolute transition-opacity duration-200 pointer-events-none"
          style={{
            left: rightActive ? `${rightOrigin.x}px` : 'calc(45vw - 110px)',
            top: rightActive ? `${rightOrigin.y}px` : 'calc(55vh - 110px)',
            transform: 'translate(-50%, -50%)',
            opacity: rightActive ? 0.95 : 0.6,
          }}
        >
          {/* Base Ring */}
          <div className="w-28 h-28 rounded-full border-3 border-white/80 bg-white/10 backdrop-blur-xs flex items-center justify-center shadow-lg">
            <div className="w-16 h-16 rounded-full border border-white/40" />
            <div
              className="absolute w-14 h-14 rounded-full bg-red-500/30 border-2 border-white shadow-md flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `translate(${rightThumb.x}px, ${rightThumb.y}px)`,
              }}
            >
              <Crosshair className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* MELEE PUNCH BUTTON - EXACT POSITION FROM SCREENSHOT (BOTTOM-RIGHT ADJACENT TO AIM JOYSTICK) */}
      <div className="absolute right-40 bottom-6 pointer-events-auto z-40">
        <button
          id="btn-melee"
          className={`w-14 h-14 rounded-full flex items-center justify-center border-3 border-white/90 shadow-2xl backdrop-blur-xs transition-transform active:scale-90 cursor-pointer ${
            meleePressed ? 'bg-amber-600/80 scale-95' : 'bg-black/50 hover:bg-black/70'
          }`}
          onTouchStart={(e) => {
            e.stopPropagation();
            setMeleePressed(true);
            engine?.meleePlayer();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            setMeleePressed(false);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setMeleePressed(true);
            engine?.meleePlayer();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            setMeleePressed(false);
          }}
          title="ضربة قريبة 👊 (F / V)"
        >
          <span className="text-2xl select-none">👊</span>
        </button>
      </div>

      {/* DEDICATED SHOOT / FIRE BUTTON (زر الضرب المنفصل للطلق اليدوي أو الإضافي) */}
      <div className="absolute right-8 bottom-40 pointer-events-auto z-40">
        <button
          id="btn-shoot-manual"
          className={`w-16 h-16 rounded-full border-3 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md transition-transform active:scale-90 cursor-pointer ${
            shootPressed
              ? 'bg-rose-600 border-white scale-95 shadow-rose-600/50'
              : autoFire
              ? 'bg-red-600/60 border-red-300 text-white hover:bg-red-600/80'
              : 'bg-rose-600 border-amber-300 text-white animate-pulse hover:bg-rose-500'
          }`}
          onTouchStart={handleShootStart}
          onTouchEnd={handleShootEnd}
          onTouchCancel={handleShootEnd}
          onMouseDown={handleShootStart}
          onMouseUp={handleShootEnd}
          title="زر إطلاق النار المنفصل 🔫"
        >
          <Flame className="w-7 h-7 text-white fill-current" />
          <span className="text-[9px] font-black text-white uppercase tracking-tighter">
            إطلاق
          </span>
        </button>
      </div>

      {/* UTILITY FLOATING BUTTONS (RELOAD & DROP WEAPON) */}
      <div className="absolute right-28 bottom-40 flex items-center gap-3 pointer-events-auto z-40">
        {/* RELOAD BUTTON */}
        <button
          id="btn-reload"
          className="w-12 h-12 rounded-full bg-black/50 border-2 border-white/90 text-white flex items-center justify-center shadow-xl backdrop-blur-xs active:scale-90 hover:bg-black/70 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            engine?.reloadPlayer();
          }}
          title="تلقيم السلاح (R)"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* DROP WEAPON BUTTON */}
        <button
          id="btn-drop-weapon"
          className="w-12 h-12 rounded-full bg-black/50 border-2 border-amber-400/90 text-amber-300 flex items-center justify-center shadow-xl backdrop-blur-xs active:scale-90 hover:bg-black/70 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            engine?.dropPlayerWeapon();
          }}
          title="رمي السلاح (Z / X)"
        >
          <ArrowDownToLine className="w-5 h-5 text-amber-300" />
        </button>
      </div>
    </div>
  );
};
