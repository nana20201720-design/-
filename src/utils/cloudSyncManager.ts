import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
  FirebaseUser,
  isQuotaError,
  isOfflineError,
} from '../lib/firebase';
import { statsManager, PlayerLifetimeStats } from './statsManager';
import { missionsManager, DailyMissionsState } from './missionsManager';
import { PlayerCustomization } from '../types';

export interface CloudUserData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  stats: PlayerLifetimeStats;
  totalScore?: number;
  totalKills?: number;
  totalWins?: number;
  customization: PlayerCustomization;
  dailyMissions: DailyMissionsState;
  updatedAt: number;
}

export const cloudSyncManager = {
  currentUser: null as FirebaseUser | null,
  lastSyncTime: 0,

  init(onUserChanged?: (user: FirebaseUser | null) => void) {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadFromCloud(user.uid);
      }
      if (onUserChanged) {
        onUserChanged(user);
      }
    });
  },

  async loadFromCloud(uid: string): Promise<CloudUserData | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as CloudUserData;
        if (data.stats) {
          statsManager.saveStats(data.stats);
        }
        if (data.dailyMissions) {
          missionsManager.saveMissions(data.dailyMissions);
        }
        return data;
      } else {
        // Save initial local data to cloud for new user
        await this.syncToCloud(undefined, true);
      }
    } catch (e) {
      if (isQuotaError(e)) {
        console.warn('Firestore Quota Exceeded (Daily Limit). Data will be local-only until reset.');
      } else if (isOfflineError(e)) {
        console.warn('Device is offline. Running in local mode.');
      } else {
        console.error('Failed to load user data from cloud:', e);
      }
    }
    return null;
  },

  async syncToCloud(customization?: PlayerCustomization, force: boolean = false): Promise<boolean> {
    if (!auth.currentUser) return false;
    
    // Rate limit: sync at most once every 2 minutes unless forced
    const now = Date.now();
    if (!force && now - this.lastSyncTime < 2 * 60 * 1000) {
      return true; // Pretend it was successful
    }
    
    const uid = auth.currentUser.uid;

    try {
      const stats = statsManager.getStats();
      const dailyMissions = missionsManager.getMissions();
      const savedCustomization = customization || {
        playerName: auth.currentUser.displayName || 'مقاتل الأرينا',
        skinTone: '#fca5a5',
        camoColor: '#15803d',
        headgear: 'helmet',
        sunglasses: true,
      };

      const xpInfo = statsManager.getXPInfo(stats);

      const payload: CloudUserData = {
        uid,
        email: auth.currentUser.email || null,
        displayName: auth.currentUser.displayName || savedCustomization.playerName,
        stats,
        totalScore: xpInfo.totalXP,
        totalKills: stats.totalKills,
        totalWins: stats.totalWins,
        customization: savedCustomization,
        dailyMissions,
        updatedAt: Date.now(),
      };

      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, payload, { merge: true });
      this.lastSyncTime = now;
      return true;
    } catch (e) {
      if (isQuotaError(e)) {
        console.warn('Firestore Quota Exceeded (Daily Limit). Sync paused.');
      } else if (isOfflineError(e)) {
        console.warn('Device is offline. Sync paused until connection is restored.');
      } else {
        console.error('Failed to sync data to cloud:', e);
      }
      return false;
    }
  },
};
