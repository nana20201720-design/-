import React, { useState, useEffect } from 'react';
import { Target, Zap, CheckCircle2, Clock, Gift, Sparkles } from 'lucide-react';
import { missionsManager, DailyMissionsState, Mission } from '../utils/missionsManager';
import { soundManager } from '../audio/soundManager';
import { statsManager } from '../utils/statsManager';
import { cloudSyncManager } from '../utils/cloudSyncManager';

interface DailyMissionsProps {
  onRewardClaimed?: (xpEarned: number) => void;
}

export const DailyMissions: React.FC<DailyMissionsProps> = ({ onRewardClaimed }) => {
  const [missionsState, setMissionsState] = useState<DailyMissionsState>(() =>
    missionsManager.getMissions()
  );
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate countdown to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = (mission: Mission) => {
    if (!mission.isCompleted || mission.isClaimed) return;

    soundManager.playVictory();
    const { state, xpEarned } = missionsManager.claimReward(mission.id);
    
    // Earn coins too
    const coinsEarned = mission.rewardCoins || Math.floor(xpEarned * 0.3);
    const currentStats = statsManager.getStats();
    currentStats.coins = (currentStats.coins !== undefined ? currentStats.coins : 100) + coinsEarned;
    statsManager.saveStats(currentStats);
    
    // Sync update to cloud
    cloudSyncManager.syncToCloud();

    setMissionsState(state);

    if (onRewardClaimed) {
      onRewardClaimed(xpEarned);
    }
  };

  const completedCount = missionsState.missions.filter((m) => m.isCompleted).length;

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-neutral-950 to-neutral-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
            <Target className="w-6 h-6 fill-amber-400/20 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">المهام اليومية (Daily Missions)</h3>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                {completedCount} / {missionsState.missions.length} مكتملة
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              أكمل المهام اليومية واحصل على نقاط خبرة مضاعفة (Bonus XP) لتسريع رتبتك!
            </p>
          </div>
        </div>

        {/* Refresh Countdown */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-400 font-mono">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>تتجدد بعد: <strong className="text-amber-400">{timeLeft}</strong></span>
        </div>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {missionsState.missions.map((mission) => {
          const progressPercent = Math.min(
            100,
            Math.floor((mission.currentCount / mission.targetCount) * 100)
          );

          return (
            <div
              key={mission.id}
              className={`rounded-2xl p-4 border flex flex-col justify-between transition-all relative overflow-hidden ${
                mission.isClaimed
                  ? 'bg-neutral-950/40 border-neutral-800/60 opacity-75'
                  : mission.isCompleted
                  ? 'bg-gradient-to-br from-amber-950/50 via-neutral-950 to-neutral-950 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-neutral-950/80 border-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mission.badgeEmoji}</span>
                    <div>
                      <h4 className="text-sm font-black text-white">{mission.titleAr}</h4>
                      <span className="text-[10px] text-neutral-400 font-mono">{mission.titleEn}</span>
                    </div>
                  </div>

                  {/* XP & Coin Reward Badges */}
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-black font-mono flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-amber-300" />
                      +{mission.rewardXP} XP
                    </span>
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-xl text-[10px] font-black font-mono flex items-center gap-1">
                      <span>🪙</span>
                      +{mission.rewardCoins || Math.floor(mission.rewardXP * 0.3)} عملة
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 mb-3">{mission.descriptionAr}</p>
              </div>

              {/* Progress Bar & Claim */}
              <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>التقدم: {mission.currentCount} / {mission.targetCount}</span>
                  <span className="text-amber-400 font-bold">{progressPercent}%</span>
                </div>

                <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      mission.isCompleted
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Claim Button */}
                <button
                  onClick={() => handleClaim(mission)}
                  disabled={!mission.isCompleted || mission.isClaimed}
                  className={`mt-2 w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                    mission.isClaimed
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                      : mission.isCompleted
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 shadow-lg shadow-emerald-500/20 animate-bounce'
                      : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40 cursor-not-allowed'
                  }`}
                >
                  {mission.isClaimed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>تم استلام المكافآت ✓</span>
                    </>
                  ) : mission.isCompleted ? (
                    <>
                      <Sparkles className="w-4 h-4 text-neutral-950" />
                      <span>استلام (+{mission.rewardXP} XP / +{mission.rewardCoins || Math.floor(mission.rewardXP * 0.3)} 🪙) 🎁</span>
                    </>
                  ) : (
                    <span>جاري التقدم... ({mission.currentCount}/{mission.targetCount})</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
