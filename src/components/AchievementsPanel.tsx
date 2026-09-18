import React, { useState } from 'react';
import {
  achievementsManager,
  ACHIEVEMENTS_LIST,
  Achievement,
} from '../utils/achievementsManager';
import { PlayerLifetimeStats } from '../utils/statsManager';
import { Trophy, Award, Lock, CheckCircle2, Star, Flame, Shield, Target } from 'lucide-react';

interface AchievementsPanelProps {
  stats: PlayerLifetimeStats;
}

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ stats }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'combat' | 'rank'>('all');

  const { unlockedCount, totalCount } = achievementsManager.getAchievementStatus(stats);

  const filteredList = ACHIEVEMENTS_LIST.filter((ach) => {
    const isUnlocked = ach.condition(stats);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'combat') return ach.category === 'combat' || ach.category === 'skill';
    if (filter === 'rank') return ach.category === 'rank' || ach.category === 'survival';
    return true;
  });

  return (
    <div className="w-full bg-neutral-900/95 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 text-neutral-950 rounded-2xl font-black shadow-lg">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">لوحة الإنجازات والأوسمة 🏆</h3>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-mono font-bold">
                {unlockedCount} / {totalCount} مكتمل
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              حقّق الإنجازات القتالية وافتح أوسمة النخبة لعرضها في ملفك الشخصي!
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-2xl p-1">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'unlocked', label: 'المكتملة 🎯' },
            { id: 'combat', label: 'قتالية ⚔️' },
            { id: 'rank', label: 'رتب وإحصائيات 🎖️' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === t.id
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Overview Ribbon */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-2">
        <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-400" />
          <span>أوسمة حسابك المفتوحة (Badges Showcase):</span>
        </span>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isUnlocked = ach.condition(stats);
            return (
              <div
                key={ach.id}
                title={`${ach.titleAr}: ${ach.descriptionAr}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                  isUnlocked
                    ? `bg-gradient-to-r ${ach.color} text-white border-transparent shadow-lg scale-105`
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-600 grayscale opacity-40'
                }`}
              >
                <span className="text-sm">{ach.badgeIcon}</span>
                <span>{ach.titleAr}</span>
                {isUnlocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />
                ) : (
                  <Lock className="w-3 h-3 text-neutral-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {filteredList.map((ach) => {
          const isUnlocked = ach.condition(stats);
          const percent = ach.progressPercent(stats);

          return (
            <div
              key={ach.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                isUnlocked
                  ? 'bg-neutral-950 border-amber-500/40 shadow-lg'
                  : 'bg-neutral-950/50 border-neutral-800/80 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border ${
                      isUnlocked
                        ? `bg-gradient-to-tr ${ach.color} border-white/20 text-white`
                        : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                    }`}
                  >
                    {isUnlocked ? ach.badgeIcon : <Lock className="w-5 h-5 text-neutral-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{ach.titleAr}</h4>
                      {isUnlocked && (
                        <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[9px] font-bold">
                          مكتمل ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">
                      {ach.descriptionAr}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-black">
                    +{ach.rewardXP} XP
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mb-1 font-bold">
                  <span>التقدم:</span>
                  <span>{ach.progressText(stats)}</span>
                </div>
                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isUnlocked ? 'bg-amber-400' : 'bg-neutral-700'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
