import { db, collection, getDocs } from '../lib/firebase';
import { PlayerLifetimeStats, statsManager } from './statsManager';
import { PlayerCustomization } from '../types';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarColor: string;
  totalScore: number;
  totalKills: number;
  totalWins: number;
  totalMatches: number;
  rankTitle: string;
  rankBadge: string;
  isCurrentUser?: boolean;
}

// Fallback arena champions to fill top 10 if fewer than 10 players exist in Firestore
const DEFAULT_TOP_BOTS: LeaderboardEntry[] = [
  {
    uid: 'dev-1',
    displayName: 'المطور: محمد أحمد السيد 👑',
    avatarColor: '#f59e0b',
    totalScore: 50000,
    totalKills: 999,
    totalWins: 150,
    totalMatches: 150,
    rankTitle: 'مؤسس اللعبة وكبير المطورين 🛠️',
    rankBadge: '🛡️',
  },
  {
    uid: 'bot-1',
    displayName: 'أبو_داحم_99',
    avatarColor: '#10b981',
    totalScore: 18450,
    totalKills: 142,
    totalWins: 28,
    totalMatches: 35,
    rankTitle: 'لواء الساحة',
    rankBadge: '⚔️',
  },
  {
    uid: 'bot-2',
    displayName: 'الجنرال_فيصل',
    avatarColor: '#ef4444',
    totalScore: 14200,
    totalKills: 110,
    totalWins: 22,
    totalMatches: 30,
    rankTitle: 'عميد أسطوري',
    rankBadge: '👑',
  },
  {
    uid: 'bot-3',
    displayName: 'شبح_الميليشيا',
    avatarColor: '#f59e0b',
    totalScore: 11800,
    totalKills: 89,
    totalWins: 18,
    totalMatches: 26,
    rankTitle: 'عقيد ميليشيا',
    rankBadge: '🌟',
  },
  {
    uid: 'bot-4',
    displayName: 'الكوماندوز_المصري',
    avatarColor: '#8b5cf6',
    totalScore: 9400,
    totalKills: 72,
    totalWins: 14,
    totalMatches: 22,
    rankTitle: 'رائد عمليات',
    rankBadge: '⭐',
  },
  {
    uid: 'bot-5',
    displayName: 'قناص_الرياض',
    avatarColor: '#06b6d4',
    totalScore: 7800,
    totalKills: 58,
    totalWins: 11,
    totalMatches: 19,
    rankTitle: 'نقيب الفرقة',
    rankBadge: '🥇',
  },
  {
    uid: 'bot-6',
    displayName: 'رعد_الشمال_x',
    avatarColor: '#ec4899',
    totalScore: 6250,
    totalKills: 46,
    totalWins: 8,
    totalMatches: 15,
    rankTitle: 'ملازم قتالي',
    rankBadge: '🥈',
  },
  {
    uid: 'bot-7',
    displayName: 'صقر_الرافدين',
    avatarColor: '#eab308',
    totalScore: 4900,
    totalKills: 35,
    totalWins: 6,
    totalMatches: 12,
    rankTitle: 'رقيب صاعقة',
    rankBadge: '🥉',
  },
  {
    uid: 'bot-8',
    displayName: 'سيف_الهواشم',
    avatarColor: '#64748b',
    totalScore: 3800,
    totalKills: 28,
    totalWins: 4,
    totalMatches: 10,
    rankTitle: 'عريف تكتيكي',
    rankBadge: '🎗️',
  },
  {
    uid: 'bot-9',
    displayName: 'المحارب_الليبي',
    avatarColor: '#3b82f6',
    totalScore: 2900,
    totalKills: 20,
    totalWins: 3,
    totalMatches: 8,
    rankTitle: 'مجند جديد',
    rankBadge: '🎖️',
  },
  {
    uid: 'bot-10',
    displayName: 'سلطان_الجنوب',
    avatarColor: '#14b8a6',
    totalScore: 2100,
    totalKills: 15,
    totalWins: 2,
    totalMatches: 6,
    rankTitle: 'مجند جديد',
    rankBadge: '🎖️',
  },
];

export const leaderboardManager = {
  async getTop10Players(
    currentUserId?: string | null,
    sortBy: 'totalScore' | 'totalKills' | 'totalWins' = 'totalScore'
  ): Promise<{ players: LeaderboardEntry[]; currentUserRank: number | null }> {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);

      const realPlayers: LeaderboardEntry[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const stats: PlayerLifetimeStats = data.stats || {
          totalKills: 0,
          totalHeadshots: 0,
          totalWins: 0,
          totalMatches: 0,
          totalDeaths: 0,
          longestKillStreak: 0,
          totalDamageDealt: 0,
          highestSurvivalWave: 1,
          matchHistory: [],
        };

        const customization: PlayerCustomization = data.customization || {};
        const calculatedScore =
          data.totalScore ||
          Math.floor(
            stats.totalKills * 100 +
              stats.totalHeadshots * 50 +
              stats.totalWins * 300 +
              stats.totalMatches * 40 +
              stats.totalDamageDealt * 0.1
          );

        const rank = statsManager.getRank(stats.totalKills || 0);

        realPlayers.push({
          uid: docSnap.id,
          displayName:
            data.displayName ||
            customization.playerName ||
            `مقاتل #${docSnap.id.substring(0, 5)}`,
          avatarColor: customization.camoColor || '#15803d',
          totalScore: calculatedScore,
          totalKills: stats.totalKills || 0,
          totalWins: stats.totalWins || 0,
          totalMatches: stats.totalMatches || 0,
          rankTitle: rank.titleAr,
          rankBadge: rank.badge,
          isCurrentUser: currentUserId === docSnap.id,
        });
      });

      // Combine real players with bots if real players < 10
      let combined = [...realPlayers];
      if (combined.length < 10) {
        const existingUids = new Set(combined.map((p) => p.uid));
        for (const bot of DEFAULT_TOP_BOTS) {
          if (!existingUids.has(bot.uid)) {
            combined.push({
              ...bot,
              isCurrentUser: currentUserId === bot.uid,
            });
          }
        }
      }

      // Sort by the chosen metric
      combined.sort((a, b) => {
        if (sortBy === 'totalKills') return b.totalKills - a.totalKills;
        if (sortBy === 'totalWins') return b.totalWins - a.totalWins;
        return b.totalScore - a.totalScore;
      });

      // Find current user rank
      let currentUserRank: number | null = null;
      if (currentUserId) {
        const index = combined.findIndex((p) => p.uid === currentUserId);
        if (index !== -1) {
          currentUserRank = index + 1;
        }
      }

      // Slice top 10
      const top10 = combined.slice(0, 10);

      return {
        players: top10,
        currentUserRank,
      };
    } catch (e) {
      console.error('Failed to fetch leaderboard from Firestore:', e);
      // Return fallback bots sorted
      const fallback = [...DEFAULT_TOP_BOTS].sort((a, b) => {
        if (sortBy === 'totalKills') return b.totalKills - a.totalKills;
        if (sortBy === 'totalWins') return b.totalWins - a.totalWins;
        return b.totalScore - a.totalScore;
      });

      return {
        players: fallback.slice(0, 10),
        currentUserRank: null,
      };
    }
  },
};
