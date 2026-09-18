import React from 'react';
import {
  Heart,
  Flame,
  Pause,
  Bomb,
  RotateCcw,
  Zap,
  ShieldAlert,
  Target,
  Crosshair,
  ArrowDownToLine,
  Plus,
} from 'lucide-react';
import { CharacterState, KillFeedItem, WeaponType } from '../types';
import { WEAPON_CONFIGS } from '../game/weapons';
import { WeaponSpriteSVG } from '../game/weaponSprites';

interface HUDProps {
  player: CharacterState | null;
  scopeLevel?: number;
  onToggleScope?: () => void;
  matchInfo: {
    timer: number;
    blueScore: number;
    redScore: number;
    playerKills: number;
    playerDeaths: number;
    wave: number;
    mode: string;
    activePlayerIndex?: number;
    players?: Array<{
      id: string;
      name: string;
      kills: number;
      deaths: number;
      health: number;
      maxHealth: number;
      fuel: number;
      camo?: string;
      isPlayer: boolean;
    }>;
  };
  killFeed: KillFeedItem[];
  onPause: () => void;
  onReload: () => void;
  onSwitchWeapon: () => void;
  onDropWeapon?: () => void;
  onSelectPlayer?: (index: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  scopeLevel = 1,
  onToggleScope,
  matchInfo,
  killFeed,
  onPause,
  onReload,
  onSwitchWeapon,
  onDropWeapon,
  onSelectPlayer,
}) => {
  const [announcerMsg, setAnnouncerMsg] = React.useState<{ text: string, color: string, id: number } | null>(null);

  React.useEffect(() => {
    if (!player) return;
    
    // Check if multiKillCount or killStreak changed significantly to trigger an announcement
    if (player.multiKillCount > 1) {
      let text = 'DOUBLE KILL!';
      let color = 'text-yellow-400';
      if (player.multiKillCount === 3) { text = 'TRIPLE KILL!'; color = 'text-orange-500'; }
      if (player.multiKillCount >= 4) { text = 'MONSTER KILL!'; color = 'text-red-500'; }
      setAnnouncerMsg({ text, color, id: Date.now() });
    } else if (player.killStreak === 5 || player.killStreak === 10 || (player.killStreak >= 15 && player.killStreak % 5 === 0)) {
       let text = 'RAMPAGE!';
       let color = 'text-purple-500';
       if (player.killStreak === 10) { text = 'UNSTOPPABLE!'; color = 'text-fuchsia-500'; }
       if (player.killStreak >= 15) { text = 'GODLIKE!'; color = 'text-rose-600'; }
       setAnnouncerMsg({ text, color, id: Date.now() });
    }
  }, [player?.multiKillCount, player?.killStreak]);

  React.useEffect(() => {
    if (announcerMsg) {
      const timer = setTimeout(() => setAnnouncerMsg(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [announcerMsg?.id]);

  if (!player) return null;

  const currWeapon = player.weapons[player.currentWeaponIndex] || 'pistol';
  const currCfg = WEAPON_CONFIGS[currWeapon];
  const currentAmmo = player.ammo[currWeapon] ?? 0;
  const reserveAmmo = player.reserveAmmo[currWeapon] ?? 0;

  const nextWeapon = player.weapons.length > 1
    ? player.weapons[(player.currentWeaponIndex + 1) % player.weapons.length]
    : null;

  // Format timer MM:SS
  const mins = Math.floor(matchInfo.timer / 60);
  const secs = matchInfo.timer % 60;
  const timerStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const renderWeaponIcon = (id: WeaponType, className?: string) => {
    return <WeaponSpriteSVG weapon={id} className={className || "w-8 h-6"} />;
  };

  const activeIndex = matchInfo.activePlayerIndex ?? 0;

  return (
    <div id="game-hud-layer" className="absolute inset-0 pointer-events-none p-3 select-none flex flex-col justify-between z-20">
      {/* SCOPE SNIPER BLACK VIGNETTE OVERLAY */}
      {scopeLevel > 1 && (
        <div
          id="scope-vignette-overlay"
          className="absolute inset-0 pointer-events-none transition-all duration-300 z-0"
          style={{
            background: `radial-gradient(circle, rgba(0,0,0,0) ${scopeLevel === 2 ? '42%' : '26%'}, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0.94) 86%)`,
          }}
        />
      )}
      {/* CENTER SCREEN ANNOUNCER */}
      {announcerMsg && (
        <div key={announcerMsg.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className={`text-5xl md:text-7xl font-black italic tracking-widest uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${announcerMsg.color} animate-bounce`} style={{
            WebkitTextStroke: '2px black',
            animation: 'zoomInOut 2.5s ease-in-out forwards'
          }}>
            {announcerMsg.text}
          </div>
          <style>{`
            @keyframes zoomInOut {
              0% { transform: scale(0.5); opacity: 0; }
              15% { transform: scale(1.2); opacity: 1; }
              30% { transform: scale(1); opacity: 1; }
              80% { transform: scale(1); opacity: 1; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* TOP BAR: Exact Mini Militia Classic Layout */}
      <div className="flex items-start justify-between w-full">
        {/* TOP LEFT: Zoom Scope Button + Classic Health/Fuel Trapezoid Gauge + Pause Circle */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Scope Zoom Circle */}
          <button
            onClick={onToggleScope}
            className="w-10 h-10 rounded-full border-2 border-neutral-400 bg-neutral-200 text-neutral-800 font-black text-[11px] shadow-lg cursor-pointer hover:bg-neutral-300 active:scale-90 transition-all flex flex-col items-center justify-center relative"
            title="تغيير المنظور (1X / 2X / 3X)"
          >
            <span className="text-[8px] text-neutral-500 font-sans tracking-tighter leading-none">SCOPE</span>
            <span className="text-[11px] font-black leading-none">{scopeLevel}x</span>
          </button>

          {/* Mini Militia Classic Health & Boost Bar Container (Metallic Gray skewed) */}
          <div className="bg-neutral-200 border-2 border-neutral-400 p-1.5 px-3.5 shadow-lg flex flex-col gap-1.5 min-w-[155px] max-w-[190px] transform -skew-x-12 rounded-xl relative">
            {/* Top Bar: Hot Pink/Magenta Health Bar with Heart Icon */}
            <div className="flex items-center gap-1.5 transform skew-x-12">
              <span className="text-xs shrink-0">❤️</span>
              <div className="flex-1 bg-neutral-400/40 rounded-full h-3 p-0.5 border border-neutral-400 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-150 bg-[#d946ef]"
                  style={{ width: `${Math.max(0, Math.min(100, player.health))}%` }}
                />
              </div>
            </div>

            {/* Bottom Bar: Electric Blue Boost / Jetpack Fuel with Wings/Jetpack Icon */}
            <div className="flex items-center gap-1.5 transform skew-x-12">
              <span className="text-xs shrink-0">⚡</span>
              <div className="flex-1 bg-neutral-400/40 rounded-full h-2 p-0.5 border border-neutral-400 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-75 bg-[#2563eb]"
                  style={{ width: `${Math.max(0, Math.min(100, player.fuel))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Circular Pause Button attached next to the trapezoid gauge */}
          <button
            id="btn-pause-game"
            onClick={onPause}
            className="w-8 h-8 rounded-full bg-neutral-200 border-2 border-neutral-400 text-neutral-800 flex items-center justify-center hover:bg-neutral-300 active:scale-90 shadow-md cursor-pointer transform -skew-x-12 -ml-2 z-10"
            title="إيقاف مؤقت"
          >
            <span className="text-[10px] font-black font-mono">⏸</span>
          </button>
        </div>

        {/* TOP CENTER: Stencil Kill Announcements & Match Timer */}
        <div className="flex flex-col items-center gap-1">
          {/* Active Red Stencil Kill Broadcast */}
          {killFeed.length > 0 && (
            <div className="text-red-600 font-black text-xs md:text-sm tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse">
              {killFeed[killFeed.length - 1].killerName} KILLED {killFeed[killFeed.length - 1].victimName} [{killFeed[killFeed.length - 1].weapon.toUpperCase()}]
            </div>
          )}

          {/* Timer & Players Switcher */}
          <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-white/40 rounded-full px-3 py-0.5 shadow-md pointer-events-auto">
            <span className="text-white font-mono font-black text-xs">⏱️ {timerStr}</span>
            {matchInfo.players && matchInfo.players.length > 1 && (
              <div className="flex items-center gap-1 ml-2">
                {matchInfo.players.map((p, idx) => {
                  const isCurrent = idx === activeIndex;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onSelectPlayer?.(idx)}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-500 text-white font-bold'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      P{idx + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TOP RIGHT: Mini Militia Classic Symmetrical Weapon HUD */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Weapon Metallic Frame (Symmetrical skew) */}
          <div
            onClick={onSwitchWeapon}
            className="bg-neutral-200 border-2 border-neutral-400 px-3.5 py-1.5 shadow-lg flex items-center gap-3 cursor-pointer transform skew-x-12 rounded-xl hover:scale-105 active:scale-95 transition-all"
            title="انقر لتبديل السلاح"
          >
            {/* Ammo status in black/white digital monospace font */}
            <div className="transform -skew-x-12 flex flex-col items-start font-mono text-neutral-900 leading-none">
              <div className="flex items-baseline gap-1">
                <span className="text-[13px] font-black tracking-tight">
                  {String(currentAmmo).padStart(3, '0')}
                </span>
                <span className="text-[9px] text-neutral-500 font-bold">
                  {String(reserveAmmo).padStart(3, '0')}
                </span>
              </div>
              <span className="text-[7px] font-black text-neutral-500 uppercase leading-none mt-1">
                {currWeapon.toUpperCase()}
              </span>
            </div>

            {/* Weapon silhouette sprite */}
            <div className="w-10 h-6 flex items-center justify-center transform -skew-x-12">
              {renderWeaponIcon(currWeapon, "w-9 h-5 text-neutral-800")}
            </div>
          </div>

          {/* Circular Quick Action Grenade / Reload Button attached directly next to it */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReload();
            }}
            className="w-8 h-8 rounded-full bg-neutral-200 border-2 border-neutral-400 text-neutral-800 flex items-center justify-center hover:bg-neutral-300 active:scale-90 shadow-md cursor-pointer transform skew-x-12 -ml-2 z-10"
            title="تلقيم السلاح"
          >
            <span className="text-[11px]">🔄</span>
          </button>
        </div>
      </div>

      {/* BOTTOM LEFT: WEAPON CARD & AMMO */}
      <div className="flex items-end gap-2.5 pointer-events-auto">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onReload();
          }}
          className="bg-neutral-900/90 backdrop-blur-md border-2 border-neutral-700 rounded-2xl p-2.5 shadow-xl flex items-center gap-3 cursor-pointer hover:border-amber-400/50 active:scale-98 transition-all"
        >
          {/* Weapon Icon */}
          <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
            {renderWeaponIcon(currWeapon)}
          </div>

          {/* Ammo & Status */}
          <div className="flex flex-col">
            <div className="text-xs font-bold text-neutral-200">
              {currCfg.nameAr}
            </div>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-black font-mono ${currentAmmo <= 3 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                {currentAmmo}
              </span>
              <span className="text-xs font-semibold text-neutral-400 font-mono">
                / {reserveAmmo}
              </span>
            </div>

            {/* Reloading Bar */}
            {player.isReloading && (
              <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${Math.max(0, 100 - (player.reloadTimer / player.reloadDuration) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Action Buttons: Reload and Drop */}
          <div className="flex flex-col gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReload();
              }}
              className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-600 flex items-center justify-center text-amber-400 hover:bg-neutral-700 active:scale-90 cursor-pointer"
              title="تلقيم"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            {onDropWeapon && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDropWeapon();
                }}
                className="w-7 h-7 rounded-lg bg-neutral-800/90 border border-amber-500/40 flex items-center justify-center text-amber-300 hover:bg-neutral-700 active:scale-90 cursor-pointer"
                title="رمي السلاح (Z / X)"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Weapon Quick Swap Slot */}
        {nextWeapon ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchWeapon();
            }}
            className="bg-neutral-900/80 backdrop-blur-md border border-neutral-700 rounded-xl p-2 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-90 hover:border-sky-400/50 cursor-pointer"
            title="تبديل السلاح"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-950 flex items-center justify-center">
              {renderWeaponIcon(nextWeapon)}
            </div>
            <span className="text-[8px] font-bold text-neutral-400">بديل</span>
          </button>
        ) : (
          <div
            className="bg-neutral-900/40 backdrop-blur-xs border border-dashed border-neutral-700/80 rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5"
            title="ابحث في الخريطة عن سلاح ثانوي"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-950/40 border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <span className="text-[7px] font-bold text-neutral-400 whitespace-nowrap">سلاح ٢ فارغ</span>
          </div>
        )}

        {/* Frag Grenades Indicator */}
        <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-700 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
          <Bomb className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white font-mono">{player.grenades}</span>
        </div>
      </div>
    </div>
  );
};
