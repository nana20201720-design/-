/**
 * Daily Missions Manager & Progress Tracking
 */

export interface Mission {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  rewardXP: number;
  rewardCoins?: number;
  targetCount: number;
  currentCount: number;
  type: 'kills' | 'headshots' | 'wins' | 'streak' | 'matches' | 'damage';
  isCompleted: boolean;
  isClaimed: boolean;
  badgeEmoji: string;
}

export interface DailyMissionsState {
  lastUpdatedDate: string; // YYYY-MM-DD
  missions: Mission[];
  totalMissionsCompletedToday: number;
}

const MISSIONS_STORAGE_KEY = 'mini_battle_daily_missions_v1';

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MISSION_POOL: Omit<Mission, 'currentCount' | 'isCompleted' | 'isClaimed'>[] = [
  {
    id: 'm_headshots_3',
    titleAr: 'قناص الرؤوس',
    titleEn: 'Headshot Specialist',
    descriptionAr: 'احصل على 3 إصابات رأس قاتلة',
    rewardXP: 250,
    rewardCoins: 75,
    targetCount: 3,
    type: 'headshots',
    badgeEmoji: '🎯',
  },
  {
    id: 'm_kills_10',
    titleAr: 'سيد الساحة',
    titleEn: 'Arena Master',
    descriptionAr: 'اقضِ على 10 أعداء في المباريات',
    rewardXP: 300,
    rewardCoins: 100,
    targetCount: 10,
    type: 'kills',
    badgeEmoji: '⚔️',
  },
  {
    id: 'm_win_1',
    titleAr: 'انتصار حاسم',
    titleEn: 'First Victory',
    descriptionAr: 'حقّق الفوز في مباراة واحدة',
    rewardXP: 350,
    rewardCoins: 120,
    targetCount: 1,
    type: 'wins',
    badgeEmoji: '🏆',
  },
  {
    id: 'm_streak_3',
    titleAr: 'سلسلة قتلات غاضبة',
    titleEn: 'Unstoppable Streak',
    descriptionAr: 'حقق سلسلة 3 قتلات متتالية دون موت',
    rewardXP: 200,
    rewardCoins: 60,
    targetCount: 3,
    type: 'streak',
    badgeEmoji: '🔥',
  },
  {
    id: 'm_matches_3',
    titleAr: 'المقاتل الدؤوب',
    titleEn: 'Persistent Fighter',
    descriptionAr: 'العب 3 مباريات كاملة',
    rewardXP: 200,
    rewardCoins: 60,
    targetCount: 3,
    type: 'matches',
    badgeEmoji: '🎖️',
  },
  {
    id: 'm_damage_1000',
    titleAr: 'مدفعية ثقيلة',
    titleEn: 'Heavy Damage',
    descriptionAr: 'سبّب 1,000 نقطة ضرر للأعداء',
    rewardXP: 250,
    rewardCoins: 75,
    targetCount: 1000,
    type: 'damage',
    badgeEmoji: '💥',
  },
];

export const missionsManager = {
  getTodayDateString,

  getMissions(): DailyMissionsState {
    const today = getTodayDateString();
    try {
      const saved = localStorage.getItem(MISSIONS_STORAGE_KEY);
      if (saved) {
        const parsed: DailyMissionsState = JSON.parse(saved);
        if (parsed.lastUpdatedDate === today && parsed.missions && parsed.missions.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Generate new
    }

    // Generate 3 daily missions for today
    const freshMissions: Mission[] = MISSION_POOL.slice(0, 3).map((m) => ({
      ...m,
      currentCount: 0,
      isCompleted: false,
      isClaimed: false,
    }));

    const newState: DailyMissionsState = {
      lastUpdatedDate: today,
      missions: freshMissions,
      totalMissionsCompletedToday: 0,
    };

    this.saveMissions(newState);
    return newState;
  },

  saveMissions(state: DailyMissionsState): void {
    try {
      localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save daily missions:', e);
    }
  },

  updateMissionsProgress(match: {
    kills: number;
    headshots: number;
    maxStreak: number;
    damage: number;
    isVictory: boolean;
  }): { updatedState: DailyMissionsState; newlyCompletedMissions: Mission[] } {
    const current = this.getMissions();
    const newlyCompleted: Mission[] = [];

    const updatedMissions = current.missions.map((mission) => {
      if (mission.isCompleted) return mission;

      let add = 0;
      if (mission.type === 'kills') add = match.kills;
      else if (mission.type === 'headshots') add = match.headshots;
      else if (mission.type === 'wins') add = match.isVictory ? 1 : 0;
      else if (mission.type === 'matches') add = 1;
      else if (mission.type === 'damage') add = match.damage;
      else if (mission.type === 'streak') {
        if (match.maxStreak >= mission.targetCount) {
          add = mission.targetCount - mission.currentCount;
        }
      }

      const newCount = Math.min(mission.targetCount, mission.currentCount + add);
      const isNowCompleted = newCount >= mission.targetCount;

      if (isNowCompleted && !mission.isCompleted) {
        newlyCompleted.push({ ...mission, currentCount: newCount, isCompleted: true });
      }

      return {
        ...mission,
        currentCount: newCount,
        isCompleted: isNowCompleted,
      };
    });

    const updatedState: DailyMissionsState = {
      ...current,
      missions: updatedMissions,
      totalMissionsCompletedToday: updatedMissions.filter((m) => m.isCompleted).length,
    };

    this.saveMissions(updatedState);
    return { updatedState, newlyCompletedMissions: newlyCompleted };
  },

  claimReward(missionId: string): { state: DailyMissionsState; xpEarned: number } {
    const current = this.getMissions();
    let xpEarned = 0;

    const updatedMissions = current.missions.map((m) => {
      if (m.id === missionId && m.isCompleted && !m.isClaimed) {
        xpEarned = m.rewardXP;
        return { ...m, isClaimed: true };
      }
      return m;
    });

    const updatedState: DailyMissionsState = {
      ...current,
      missions: updatedMissions,
    };

    this.saveMissions(updatedState);
    return { state: updatedState, xpEarned };
  },
};
