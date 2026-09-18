import { PlayerLifetimeStats, statsManager } from './statsManager';

export interface Achievement {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  badgeIcon: string;
  category: 'combat' | 'skill' | 'survival' | 'rank';
  color: string;
  rewardXP: number;
  condition: (stats: PlayerLifetimeStats) => boolean;
  progressText: (stats: PlayerLifetimeStats) => string;
  progressPercent: (stats: PlayerLifetimeStats) => number;
}

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'first_blood',
    titleAr: 'الدم الأول 🩸',
    titleEn: 'First Blood',
    descriptionAr: 'احصل على أول قتلة لك في ساحة المعركة.',
    badgeIcon: '🩸',
    category: 'combat',
    color: 'from-rose-500 to-red-600',
    rewardXP: 100,
    condition: (stats) => stats.totalKills >= 1,
    progressText: (stats) => `${Math.min(stats.totalKills, 1)} / 1 قتل`,
    progressPercent: (stats) => (stats.totalKills >= 1 ? 100 : 0),
  },
  {
    id: 'sharpshooter',
    titleAr: 'قناص الرؤوس 🎯',
    titleEn: 'Sharpshooter',
    descriptionAr: 'احصل على 10 إصابات رأس بدقة عالية.',
    badgeIcon: '🎯',
    category: 'skill',
    color: 'from-amber-500 to-yellow-500',
    rewardXP: 250,
    condition: (stats) => stats.totalHeadshots >= 10,
    progressText: (stats) => `${Math.min(stats.totalHeadshots, 10)} / 10 إصابة رأس`,
    progressPercent: (stats) => Math.min(100, Math.floor((stats.totalHeadshots / 10) * 100)),
  },
  {
    id: 'survivor',
    titleAr: 'الناجي الأسطوري 🛡️',
    titleEn: 'Survivor',
    descriptionAr: 'حقّق الفوز في مباراة دون أن تموت إطلاقاً.',
    badgeIcon: '🛡️',
    category: 'survival',
    color: 'from-emerald-500 to-teal-600',
    rewardXP: 300,
    condition: (stats) =>
      stats.matchHistory.some((m) => m.isVictory && m.deaths === 0),
    progressText: (stats) =>
      stats.matchHistory.some((m) => m.isVictory && m.deaths === 0)
        ? 'مكتمل ✓'
        : '0 / 1 فوز دون موت',
    progressPercent: (stats) =>
      stats.matchHistory.some((m) => m.isVictory && m.deaths === 0) ? 100 : 0,
  },
  {
    id: 'godlike',
    titleAr: 'سلسلة مدمرة ⚡',
    titleEn: 'Unstoppable',
    descriptionAr: 'حقّق 5 قتلات متتالية دون موت في مباراة واحدة.',
    badgeIcon: '⚡',
    category: 'combat',
    color: 'from-purple-500 to-indigo-600',
    rewardXP: 350,
    condition: (stats) => stats.longestKillStreak >= 5,
    progressText: (stats) => `${Math.min(stats.longestKillStreak, 5)} / 5 قتلات متتالية`,
    progressPercent: (stats) => Math.min(100, Math.floor((stats.longestKillStreak / 5) * 100)),
  },
  {
    id: 'veteran',
    titleAr: 'مقاتل مخضرم 🎖️',
    titleEn: 'Veteran',
    descriptionAr: 'شارك في 10 مباريات كاملة.',
    badgeIcon: '🎖️',
    category: 'rank',
    color: 'from-blue-500 to-cyan-600',
    rewardXP: 200,
    condition: (stats) => stats.totalMatches >= 10,
    progressText: (stats) => `${Math.min(stats.totalMatches, 10)} / 10 مباريات`,
    progressPercent: (stats) => Math.min(100, Math.floor((stats.totalMatches / 10) * 100)),
  },
  {
    id: 'victory_royale',
    titleAr: 'بطل الساحة 🏆',
    titleEn: 'Victory Royale',
    descriptionAr: 'حقّق 5 انتصارات حاسمة في المباريات.',
    badgeIcon: '🏆',
    category: 'rank',
    color: 'from-yellow-400 to-amber-600',
    rewardXP: 400,
    condition: (stats) => stats.totalWins >= 5,
    progressText: (stats) => `${Math.min(stats.totalWins, 5)} / 5 انتصارات`,
    progressPercent: (stats) => Math.min(100, Math.floor((stats.totalWins / 5) * 100)),
  },
  {
    id: 'heavy_gunner',
    titleAr: 'مدفعي ثقيل 💥',
    titleEn: 'Heavy Gunner',
    descriptionAr: 'إلحاق 5,000 نقطة ضرر إجمالي في الساحة.',
    badgeIcon: '💥',
    category: 'combat',
    color: 'from-orange-500 to-red-600',
    rewardXP: 300,
    condition: (stats) => stats.totalDamageDealt >= 5000,
    progressText: (stats) =>
      `${Math.min(stats.totalDamageDealt, 5000)} / 5000 ضرر`,
    progressPercent: (stats) =>
      Math.min(100, Math.floor((stats.totalDamageDealt / 5000) * 100)),
  },
  {
    id: 'master_rank',
    titleAr: 'ضابط النخبة ⭐',
    titleEn: 'Master Officer',
    descriptionAr: 'وصل إلى 100 قتلة إجمالية ورفع الرتبة العسكرية.',
    badgeIcon: '⭐',
    category: 'rank',
    color: 'from-pink-500 to-rose-600',
    rewardXP: 500,
    condition: (stats) => stats.totalKills >= 100,
    progressText: (stats) => `${Math.min(stats.totalKills, 100)} / 100 قتلة`,
    progressPercent: (stats) => Math.min(100, Math.floor((stats.totalKills / 100) * 100)),
  },
];

export const achievementsManager = {
  getUnlockedAchievements(stats: PlayerLifetimeStats): Achievement[] {
    return ACHIEVEMENTS_LIST.filter((ach) => ach.condition(stats));
  },

  getAchievementStatus(stats: PlayerLifetimeStats) {
    const unlocked = this.getUnlockedAchievements(stats);
    return {
      unlockedCount: unlocked.length,
      totalCount: ACHIEVEMENTS_LIST.length,
      unlocked,
    };
  },
};
