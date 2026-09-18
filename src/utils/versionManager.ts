import { db, doc, getDoc, setDoc, isOfflineError } from '../lib/firebase';

export interface AppVersionInfo {
  latestVersion: string;
  updateUrl: string;
  changelogAr: string;
  changelogEn: string;
  isMandatory: boolean;
}

// Current App Version
export const CURRENT_APP_VERSION = '1.1.0';

export const versionManager = {
  getCurrentVersion(): string {
    return CURRENT_APP_VERSION;
  },

  async checkLatestVersion(): Promise<AppVersionInfo | null> {
    try {
      const configRef = doc(db, 'system', 'config');
      const snap = await getDoc(configRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data && data.latestVersion) {
          return {
            latestVersion: data.latestVersion,
            updateUrl: data.updateUrl || window.location.href,
            changelogAr: data.changelogAr || 'إصلاحات عامة وتحسينات لسرعة اللعبة',
            changelogEn: data.changelogEn || 'General fixes and performance improvements',
            isMandatory: data.isMandatory !== undefined ? data.isMandatory : false,
          };
        }
      }
      
      // Default info if doc doesn't exist or fetch failed
      return {
        latestVersion: CURRENT_APP_VERSION,
        updateUrl: window.location.href,
        changelogAr: 'إصدار جديد ومطور لضمان ثبات اللعب!',
        changelogEn: 'A brand new version designed for better performance!',
        isMandatory: false,
      };
    } catch (err) {
      if (isOfflineError(err)) {
        console.warn('Device is offline. Skipping version check.');
      } else {
        console.error('Failed to fetch latest version from Firestore:', err);
      }
    }

    // Offline or failed fallback
    return null;
  },

  isNewerVersion(latest: string): boolean {
    const curParts = CURRENT_APP_VERSION.split('.').map(Number);
    const latParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(curParts.length, latParts.length); i++) {
      const cur = curParts[i] || 0;
      const lat = latParts[i] || 0;
      if (lat > cur) return true;
      if (cur > lat) return false;
    }
    return false;
  }
};
