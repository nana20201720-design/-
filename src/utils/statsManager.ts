/**
 * Mini Battle Arena - Lifetime Statistics Manager & Rank System
 */

import { missionsManager } from './missionsManager';
import { cloudSyncManager } from './cloudSyncManager';

export interface MatchHistoryItem {
  id: string;
  timestamp: number;
  mode: string;
  kills: number;
  deaths: number;
  headshots: number;
  maxStreak: number;
  isVictory: boolean;
  score: number;
}

export interface PlayerLifetimeStats {
  totalKills: number;
  totalHeadshots: number;
  totalWins: number;
  totalMatches: number;
  totalDeaths: number;
  longestKillStreak: number;
  totalDamageDealt: number;
  highestSurvivalWave: number;
  matchHistory: MatchHistoryItem[];
  coins: number;
}

export interface RankInfo {
  titleAr: string;
  titleEn: string;
  badge: string; // Emoji / Icon symbol
  color: string;
  minKills: number;
  nextRankKills: number;
  progressPercent: number;
}

export interface XPInfo {
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

const DEFAULT_STATS: PlayerLifetimeStats = {
  totalKills: 0,
  totalHeadshots: 0,
  totalWins: 0,
  totalMatches: 0,
  totalDeaths: 0,
  longestKillStreak: 0,
  totalDamageDealt: 0,
  highestSurvivalWave: 1,
  matchHistory: [],
  coins: 100, // 100 starting welcome coins!
};

const STORAGE_KEY = 'mini_battle_lifetime_stats_v1';

export const statsManager = {
  getStats(): PlayerLifetimeStats {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_STATS;
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_STATS,
        ...parsed,
        matchHistory: parsed.matchHistory || [],
        coins: parsed.coins !== undefined ? parsed.coins : 100,
      };
    } catch {
      return DEFAULT_STATS;
    }
  },

  saveStats(stats: PlayerLifetimeStats): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save lifetime stats:', e);
    }
  },

  recordMatch(match: {
    mode: string;
    kills: number;
    deaths: number;
    headshots: number;
    maxStreak: number;
    damage: number;
    isVictory: boolean;
    score: number;
    wave?: number;
  }): PlayerLifetimeStats {
    const current = this.getStats();
    const currentCoins = current.coins !== undefined ? current.coins : 100;
    const earnedCoins = 50 + (match.isVictory ? 100 : 0) + (match.kills * 15) + (match.headshots * 10);

    const updated: PlayerLifetimeStats = {
      totalKills: current.totalKills + match.kills,
      totalHeadshots: current.totalHeadshots + match.headshots,
      totalWins: current.totalWins + (match.isVictory ? 1 : 0),
      totalMatches: current.totalMatches + 1,
      totalDeaths: current.totalDeaths + match.deaths,
      longestKillStreak: Math.max(current.longestKillStreak, match.maxStreak),
      totalDamageDealt: current.totalDamageDealt + match.damage,
      highestSurvivalWave: Math.max(current.highestSurvivalWave, match.wave || 1),
      matchHistory: [
        {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          mode: match.mode,
          kills: match.kills,
          deaths: match.deaths,
          headshots: match.headshots,
          maxStreak: match.maxStreak,
          isVictory: match.isVictory,
          score: match.score,
        },
        ...(current.matchHistory || []),
      ].slice(0, 15), // Keep last 15 matches
      coins: currentCoins + earnedCoins,
    };

    this.saveStats(updated);

    // Update Daily Missions Progress automatically
    missionsManager.updateMissionsProgress({
      kills: match.kills,
      headshots: match.headshots,
      maxStreak: match.maxStreak,
      damage: match.damage,
      isVictory: match.isVictory,
    });

    // Auto sync to cloud if user is logged in
    cloudSyncManager.syncToCloud();

    return updated;
  },

  resetStats(): PlayerLifetimeStats {
    this.saveStats(DEFAULT_STATS);
    return DEFAULT_STATS;
  },

  getRank(totalKills: number): RankInfo {
    const ranks = [
      { titleAr: 'مجند جديد', titleEn: 'Recruit', badge: '🎖️', color: '#9ca3af', minKills: 0 },
      { titleAr: 'عريف تكتيكي', titleEn: 'Corporal', badge: '🎗️', color: '#4ade80', minKills: 15 },
      { titleAr: 'رقيب صاعقة', titleEn: 'Sergeant', badge: '🥉', color: '#38bdf8', minKills: 45 },
      { titleAr: 'ملازم قتالي', titleEn: 'Lieutenant', badge: '🥈', color: '#a855f7', minKills: 90 },
      { titleAr: 'نقيب الفرقة', titleEn: 'Captain', badge: '🥇', color: '#facc15', minKills: 160 },
      { titleAr: 'رائد عمليات', titleEn: 'Major', badge: '⭐', color: '#f97316', minKills: 260 },
      { titleAr: 'عقيد ميليشيا', titleEn: 'Colonel', badge: '🌟', color: '#ef4444', minKills: 400 },
      { titleAr: 'عميد أسطوري', titleEn: 'Brigadier', badge: '👑', color: '#ec4899', minKills: 600 },
      { titleAr: 'لواء الساحة', titleEn: 'General', badge: '⚔️', color: '#06b6d4', minKills: 900 },
      { titleAr: 'مارشال القتال الأسطوري', titleEn: 'Field Marshal', badge: '🔥', color: '#eab308', minKills: 1300 },
    ];

    let currentRankIndex = 0;
    for (let i = 0; i < ranks.length; i++) {
      if (totalKills >= ranks[i].minKills) {
        currentRankIndex = i;
      } else {
        break;
      }
    }

    const currentRank = ranks[currentRankIndex];
    const nextRank = ranks[currentRankIndex + 1];

    if (!nextRank) {
      return {
        ...currentRank,
        nextRankKills: currentRank.minKills,
        progressPercent: 100,
      };
    }

    const range = nextRank.minKills - currentRank.minKills;
    const progress = totalKills - currentRank.minKills;
    const percent = Math.min(100, Math.max(0, Math.floor((progress / range) * 100)));

    return {
      ...currentRank,
      nextRankKills: nextRank.minKills,
      progressPercent: percent,
    };
  },

  getXPInfo(stats: PlayerLifetimeStats): XPInfo {
    // Calculate total XP earned from gameplay actions
    const totalXP = Math.floor(
      stats.totalKills * 100 +
      stats.totalHeadshots * 50 +
      stats.totalWins * 300 +
      stats.totalMatches * 40 +
      stats.totalDamageDealt * 0.1
    );

    // Progressive XP formula for levels: Base 500 XP per level + 250 scaling per level
    let level = 1;
    let accumulatedXP = 0;

    const getXPForLevel = (lvl: number) => 400 + (lvl - 1) * 200;

    while (true) {
      const needed = getXPForLevel(level);
      if (totalXP >= accumulatedXP + needed) {
        accumulatedXP += needed;
        level++;
      } else {
        break;
      }
    }

    const xpForThisLevel = getXPForLevel(level);
    const xpInCurrentLevel = totalXP - accumulatedXP;
    const progressPercent = Math.min(100, Math.floor((xpInCurrentLevel / xpForThisLevel) * 100));

    return {
      level,
      totalXP,
      currentLevelXP: accumulatedXP,
      nextLevelXP: accumulatedXP + xpForThisLevel,
      xpInCurrentLevel,
      xpNeededForNextLevel: xpForThisLevel - xpInCurrentLevel,
      progressPercent,
    };
  },
};
