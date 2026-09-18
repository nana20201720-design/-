import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with local persistence for offline support
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.warn("Firestore initialization with cache failed, falling back to basic:", error);
  dbInstance = getFirestore(app);
}

export const auth = getAuth(app);
export const db = dbInstance;

/**
 * Checks if a Firebase error is related to quota or rate limits.
 * @param error The error to check
 */
export const isQuotaError = (error: any): boolean => {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return (
    code === 'resource-exhausted' || 
    message.includes('Quota exceeded') || 
    message.includes('Rate exceeded') ||
    message.includes('quota')
  );
};

/**
 * Checks if a Firebase error is related to being offline or unavailable.
 * @param error The error to check
 */
export const isOfflineError = (error: any): boolean => {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return (
    code === 'unavailable' ||
    code === 'cancelled' ||
    message.includes('client is offline') ||
    message.includes('offline') ||
    message.includes('network') ||
    !navigator.onLine
  );
};

export {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  serverTimestamp,
};
export type { FirebaseUser };
