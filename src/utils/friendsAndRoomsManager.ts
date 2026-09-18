import {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  serverTimestamp,
} from '../lib/firebase';
import { PlayerLifetimeStats } from './statsManager';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface RoomInvite {
  id: string;
  fromUid: string;
  fromName: string;
  fromCamoColor?: string;
  toUid: string;
  roomCode: string;
  mode?: string;
  mapName?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface UserFriendProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  status: 'online' | 'in_game' | 'offline';
  lastSeen?: number;
  stats?: PlayerLifetimeStats;
  currentRoomCode?: string;
  camoColor?: string;
}

export interface RoomPlayer {
  uid: string;
  displayName: string;
  camoColor: string;
  team: 'red' | 'blue' | 'ffa';
  isHost: boolean;
  isReady: boolean;
  kills?: number;
  deaths?: number;
}

export interface CustomRoom {
  roomCode: string;
  hostUid: string;
  hostName: string;
  mode: '1v1' | '2v2' | '3v3' | 'deathmatch';
  mapName: string;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
  players: RoomPlayer[];
  createdAt: number;
  region?: string;
}

export const friendsAndRoomsManager = {
  // --- ONLINE STATUS ---
  async updateOnlineStatus(status: 'online' | 'in_game' | 'offline', currentRoomCode: string = '') {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          status,
          currentRoomCode,
          lastSeen: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Failed to update online status:', e);
    }
  },

  // --- FRIENDS MANAGEMENT ---
  async searchUsers(searchQuery: string): Promise<UserFriendProfile[]> {
    if (!auth.currentUser || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const results: UserFriendProfile[] = [];

      snap.forEach((d) => {
        if (d.id === auth.currentUser?.uid) return;
        const data = d.data();
        const name = (data.displayName || data.customization?.playerName || 'مقاتل').toLowerCase();
        const email = (data.email || '').toLowerCase();

        if (name.includes(q) || email.includes(q) || d.id.toLowerCase().includes(q)) {
          results.push({
            uid: d.id,
            displayName: data.displayName || data.customization?.playerName || 'مقاتل',
            email: data.email,
            status: data.status || 'offline',
            lastSeen: data.lastSeen || 0,
            stats: data.stats,
            currentRoomCode: data.currentRoomCode || '',
            camoColor: data.customization?.camoColor || '#15803d',
          });
        }
      });

      return results;
    } catch (e) {
      console.error('Failed to search users:', e);
      return [];
    }
  },

  async addFriend(friendUid: string): Promise<boolean> {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;

    try {
      const myRef = doc(db, 'users', uid);
      const friendRef = doc(db, 'users', friendUid);

      await setDoc(myRef, { friends: arrayUnion(friendUid) }, { merge: true });
      await setDoc(friendRef, { friends: arrayUnion(uid) }, { merge: true });
      return true;
    } catch (e) {
      console.error('Failed to add friend:', e);
      return false;
    }
  },

  async removeFriend(friendUid: string): Promise<boolean> {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;

    try {
      const myRef = doc(db, 'users', uid);
      const friendRef = doc(db, 'users', friendUid);

      await updateDoc(myRef, { friends: arrayRemove(friendUid) });
      await updateDoc(friendRef, { friends: arrayRemove(uid) });
      return true;
    } catch (e) {
      console.error('Failed to remove friend:', e);
      return false;
    }
  },

  listenToMyFriends(callback: (friends: UserFriendProfile[]) => void) {
    if (!auth.currentUser) return () => {};
    const uid = auth.currentUser.uid;

    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, async (docSnap) => {
      if (!docSnap.exists()) {
        callback([]);
        return;
      }
      const data = docSnap.data();
      const friendUids: string[] = data.friends || [];

      if (friendUids.length === 0) {
        callback([]);
        return;
      }

      try {
        const friendProfiles: UserFriendProfile[] = [];
        for (const fUid of friendUids) {
          const fDoc = await getDoc(doc(db, 'users', fUid));
          if (fDoc.exists()) {
            const fData = fDoc.data();
            friendProfiles.push({
              uid: fUid,
              displayName: fData.displayName || fData.customization?.playerName || 'مقاتل',
              email: fData.email,
              status: fData.status || 'offline',
              lastSeen: fData.lastSeen || 0,
              stats: fData.stats,
              currentRoomCode: fData.currentRoomCode || '',
              camoColor: fData.customization?.camoColor || '#15803d',
            });
          }
        }
        callback(friendProfiles);
      } catch (e) {
        console.error('Failed listening to friends:', e);
      }
    });
  },

  // --- CUSTOM ROOMS SYSTEM ---
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ROOM-${result}`;
  },

  async createRoom(
    mode: '1v1' | '2v2' | '3v3' | 'deathmatch',
    mapName: string = 'Dust Arena',
    playerName: string = 'المضيف',
    camoColor: string = '#15803d',
    region: string = 'الشرق الأوسط (MENA ⚡)'
  ): Promise<CustomRoom | null> {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    const roomCode = this.generateRoomCode();

    let maxPlayers = 2;
    if (mode === '2v2') maxPlayers = 4;
    else if (mode === '3v3' || mode === 'deathmatch') maxPlayers = 6;

    const initialPlayer: RoomPlayer = {
      uid,
      displayName: playerName,
      camoColor,
      team: mode === 'deathmatch' ? 'ffa' : 'red',
      isHost: true,
      isReady: true,
    };

    const newRoom: CustomRoom = {
      roomCode,
      hostUid: uid,
      hostName: playerName,
      mode,
      mapName,
      maxPlayers,
      status: 'lobby',
      players: [initialPlayer],
      createdAt: Date.now(),
      region,
    };

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await setDoc(roomRef, newRoom);
      await this.updateOnlineStatus('in_game', roomCode);
      return newRoom;
    } catch (e) {
      console.error('Failed to create room:', e);
      return null;
    }
  },

  async joinRoom(
    roomCode: string,
    playerName: string,
    camoColor: string = '#15803d'
  ): Promise<{ success: boolean; message: string; room?: CustomRoom }> {
    if (!auth.currentUser) {
      return { success: false, message: 'يرجى تسجيل الدخول أولاً للانضمام للغرفة.' };
    }
    const uid = auth.currentUser.uid;
    const formattedCode = roomCode.toUpperCase().trim();

    try {
      const roomRef = doc(db, 'rooms', formattedCode);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        return { success: false, message: 'رمز الغرفة غير صحيح أو الغرفة غير موجودة.' };
      }

      const room = snap.data() as CustomRoom;

      if (room.players.length >= room.maxPlayers) {
        return { success: false, message: 'الغرفة ممتلئة بالكامل!' };
      }

      // Check if already in room
      const existingPlayer = room.players.find((p) => p.uid === uid);
      if (existingPlayer) {
        await this.updateOnlineStatus('in_game', formattedCode);
        return { success: true, message: 'تم إعادة الانضمام للغرفة!', room };
      }

      // Determine team balance for team modes
      let assignedTeam: 'red' | 'blue' | 'ffa' = 'ffa';
      if (room.mode !== 'deathmatch') {
        const redCount = room.players.filter((p) => p.team === 'red').length;
        const blueCount = room.players.filter((p) => p.team === 'blue').length;
        assignedTeam = redCount <= blueCount ? 'red' : 'blue';
      }

      const newPlayer: RoomPlayer = {
        uid,
        displayName: playerName,
        camoColor,
        team: assignedTeam,
        isHost: false,
        isReady: false,
      };

      const updatedPlayers = [...room.players, newPlayer];
      await updateDoc(roomRef, { players: updatedPlayers });
      await this.updateOnlineStatus('in_game', formattedCode);

      return { success: true, message: 'تم الانضمام للغرفة بنجاح!', room: { ...room, players: updatedPlayers } };
    } catch (e) {
      console.error('Failed to join room:', e);
      return { success: false, message: 'تعذر الاتصال بالغرفة.' };
    }
  },

  async leaveRoom(roomCode: string): Promise<boolean> {
    if (!auth.currentUser) return false;
    const uid = auth.currentUser.uid;

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return true;

      const room = snap.data() as CustomRoom;
      const remainingPlayers = room.players.filter((p) => p.uid !== uid);

      if (remainingPlayers.length === 0) {
        // Delete room if empty
        await deleteDoc(roomRef);
      } else {
        // Reassign host if host left
        let newHostUid = room.hostUid;
        let newHostName = room.hostName;

        if (room.hostUid === uid) {
          remainingPlayers[0].isHost = true;
          newHostUid = remainingPlayers[0].uid;
          newHostName = remainingPlayers[0].displayName;
        }

        await updateDoc(roomRef, {
          players: remainingPlayers,
          hostUid: newHostUid,
          hostName: newHostName,
        });
      }

      await this.updateOnlineStatus('online', '');
      return true;
    } catch (e) {
      console.error('Failed to leave room:', e);
      return false;
    }
  },

  async switchPlayerTeam(roomCode: string, playerUid: string, newTeam: 'red' | 'blue'): Promise<boolean> {
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return false;

      const room = snap.data() as CustomRoom;
      const updatedPlayers = room.players.map((p) => (p.uid === playerUid ? { ...p, team: newTeam } : p));

      await updateDoc(roomRef, { players: updatedPlayers });
      return true;
    } catch (e) {
      console.error('Failed to switch team:', e);
      return false;
    }
  },

  async startRoomMatch(roomCode: string): Promise<boolean> {
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, { status: 'playing' });

      // Notify friends that a match has started
      if (auth.currentUser) {
        const fromUid = auth.currentUser.uid;
        const fromName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'صديقك المقاتل';

        try {
          const userSnap = await getDoc(doc(db, 'users', fromUid));
          if (userSnap.exists()) {
            const friendUids: string[] = userSnap.data().friends || [];
            for (const fUid of friendUids) {
              const inviteId = `match_${fromUid}_${fUid}_${Date.now()}`;
              await setDoc(doc(db, 'invitations', inviteId), {
                id: inviteId,
                type: 'match_start',
                fromUid,
                fromName,
                toUid: fUid,
                roomCode,
                mode: '1v1',
                mapName: 'Dust Arena',
                createdAt: Date.now(),
                status: 'pending',
              });
            }
          }
        } catch (e) {
          console.warn('Could not send match start notifications:', e);
        }
      }

      return true;
    } catch (e) {
      console.error('Failed to start room match:', e);
      return false;
    }
  },

  listenToRoom(roomCode: string, callback: (room: CustomRoom | null) => void) {
    const roomRef = doc(db, 'rooms', roomCode);
    return onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as CustomRoom);
      } else {
        callback(null);
      }
    });
  },

  async getPublicRooms(): Promise<CustomRoom[]> {
    const path = 'rooms';
    try {
      const roomsRef = collection(db, path);
      const snap = await getDocs(roomsRef);
      const rooms: CustomRoom[] = [];
      snap.forEach((d) => {
        const data = d.data() as CustomRoom;
        if (data.status === 'lobby' || data.status === 'playing') {
          rooms.push(data);
        }
      });
      return rooms.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
    }
  },

  getShareableLobbyUrl(roomCode: string): string {
    const publicBase = 'https://ais-pre-5bjlprp7tccw5lc6h5wcnd-209807462470.europe-west2.run.app';
    return `${publicBase}?room=${encodeURIComponent(roomCode)}`;
  },

  // --- QUICK INVITES SYSTEM ---
  async sendRoomInvite(
    toUid: string,
    roomCode: string,
    mode: string = '1v1',
    mapName: string = 'Dust Arena'
  ): Promise<{ success: boolean; message: string }> {
    if (!auth.currentUser) {
      return { success: false, message: 'يرجى تسجيل الدخول أولاً لإرسال الدعوة.' };
    }
    const fromUid = auth.currentUser.uid;
    const fromName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'صديقك المقاتل';

    const inviteId = `${fromUid}_${toUid}_${Date.now()}`;
    const inviteDocRef = doc(db, 'invitations', inviteId);

    const inviteData: RoomInvite = {
      id: inviteId,
      fromUid,
      fromName,
      fromCamoColor: '#15803d',
      toUid,
      roomCode,
      mode,
      mapName,
      createdAt: Date.now(),
      status: 'pending',
    };

    try {
      await setDoc(inviteDocRef, inviteData);
      return { success: true, message: 'تم إرسال الدعوة السريعة بنجاح! ⚡' };
    } catch (e) {
      console.error('Failed to send room invite:', e);
      return { success: false, message: 'تعذر إرسال الدعوة، حاول مرة أخرى.' };
    }
  },

  listenToMyInvitations(callback: (invites: RoomInvite[]) => void) {
    if (!auth.currentUser) return () => {};
    const uid = auth.currentUser.uid;

    const invitesRef = collection(db, 'invitations');
    const q = query(invitesRef, where('toUid', '==', uid), where('status', '==', 'pending'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: RoomInvite[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as RoomInvite);
        });
        // Sort newest first
        list.sort((a, b) => b.createdAt - a.createdAt);
        callback(list);
      },
      (error) => {
        console.error('Error listening to invitations:', error);
      }
    );
  },

  async acceptInvite(inviteId: string): Promise<boolean> {
    try {
      const inviteRef = doc(db, 'invitations', inviteId);
      await updateDoc(inviteRef, { status: 'accepted' });
      return true;
    } catch (e) {
      console.error('Failed to accept invite:', e);
      return false;
    }
  },

  async declineInvite(inviteId: string): Promise<boolean> {
    try {
      const inviteRef = doc(db, 'invitations', inviteId);
      await updateDoc(inviteRef, { status: 'declined' });
      return true;
    } catch (e) {
      console.error('Failed to decline invite:', e);
      return false;
    }
  },
};
