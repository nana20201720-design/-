import React, { useState, useEffect } from 'react';
import {
  friendsAndRoomsManager,
  UserFriendProfile,
} from '../utils/friendsAndRoomsManager';
import { FirebaseUser } from '../lib/firebase';
import {
  Users,
  UserPlus,
  UserCheck,
  Search,
  Check,
  Sparkles,
  Swords,
  Trophy,
  Activity,
  UserX,
  LogIn,
  Zap,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';
import { statsManager } from '../utils/statsManager';

interface FriendsManagerProps {
  currentUser: FirebaseUser | null;
  onOpenAuth: () => void;
  onJoinRoomByCode?: (code: string) => void;
  currentRoomCode?: string;
}

export const FriendsManager: React.FC<FriendsManagerProps> = ({
  currentUser,
  onOpenAuth,
  onJoinRoomByCode,
  currentRoomCode,
}) => {
  const [friends, setFriends] = useState<UserFriendProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserFriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'my_friends' | 'search'>('my_friends');
  const [addedUids, setAddedUids] = useState<Record<string, boolean>>({});
  const [invitedUids, setInvitedUids] = useState<Record<string, boolean>>({});
  const [inviteStatusMsg, setInviteStatusMsg] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = friendsAndRoomsManager.listenToMyFriends((updatedFriends) => {
      setFriends(updatedFriends);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleQuickInvite = async (friend: UserFriendProfile) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    let roomCodeToSend = currentRoomCode;

    // If sender is not in a room, auto-create a 1v1 room
    if (!roomCodeToSend) {
      const myName = currentUser.displayName || currentUser.email?.split('@')[0] || 'المضيف';
      const newRoom = await friendsAndRoomsManager.createRoom(
        '1v1',
        'Dust Arena',
        myName,
        '#15803d',
        'الشرق الأوسط (MENA ⚡)'
      );
      if (newRoom) {
        roomCodeToSend = newRoom.roomCode;
        if (onJoinRoomByCode) {
          onJoinRoomByCode(roomCodeToSend);
        }
      }
    }

    if (roomCodeToSend) {
      const res = await friendsAndRoomsManager.sendRoomInvite(friend.uid, roomCodeToSend, '1v1');
      if (res.success) {
        setInvitedUids((prev) => ({ ...prev, [friend.uid]: true }));
        setInviteStatusMsg(`تم إرسال تنبيه الدعوة السريعة لـ ${friend.displayName} بنجاح! ⚡`);
        try {
          soundManager.playButtonClick();
        } catch { /* ignore */ }
        setTimeout(() => setInviteStatusMsg(''), 4000);
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await friendsAndRoomsManager.searchUsers(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddFriend = async (friendUid: string) => {
    const success = await friendsAndRoomsManager.addFriend(friendUid);
    if (success) {
      setAddedUids((prev) => ({ ...prev, [friendUid]: true }));
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    await friendsAndRoomsManager.removeFriend(friendUid);
  };

  if (!currentUser) {
    return (
      <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Users className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">قائمة الأصدقاء واللعب المشترك</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            قم بتسجيل الدخول بحسابك للبحث عن أصدقائك، إضافة أصدقاء جدد، ومعرفة من منهم أونلاين لمنافستهم في الغرف الخاصة!
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>تسجيل الدخول الآن</span>
        </button>
      </div>
    );
  }

  const onlineFriends = friends.filter((f) => f.status === 'online' || f.status === 'in_game');
  const offlineFriends = friends.filter((f) => f.status === 'offline');

  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-4">
      {/* Top Header & Tabs */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">الأصدقاء وتحديات الأونلاين</h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                {onlineFriends.length} متصل الآن 🟢
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              شاهد حالة أصدقائك وانضم لغرفهم الخاصة لمنافستهم 1 ضد 1 و 2 ضد 2!
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('my_friends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'my_friends'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>أصدقائي ({friends.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة صديق</span>
          </button>
        </div>
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-3.5" />
              <input
                type="text"
                placeholder="ابحث باسم المقاتل أو البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-2xl text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              {isSearching ? <span>جاري البحث...</span> : <span>بحث 🔍</span>}
            </button>
          </form>

          {/* Search Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center col-span-2 py-6">
                ابحث عن اسم صديقك أو بريده الإلكتروني لإضافته لقائمة الأصدقاء.
              </p>
            ) : (
              searchResults.map((user) => {
                const isAlreadyFriend = friends.some((f) => f.uid === user.uid);
                const isAddedNow = addedUids[user.uid];

                return (
                  <div
                    key={user.uid}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-neutral-950 text-sm shadow-md"
                        style={{ backgroundColor: user.camoColor || '#15803d' }}
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">{user.displayName}</h4>
                        <span className="text-[10px] text-neutral-400 block font-mono">
                          {statsManager.getRank(user.stats?.totalKills || 0).titleAr} • مستوى {statsManager.getXPInfo(user.stats || { totalKills: 0, totalHeadshots: 0, totalWins: 0, totalMatches: 0, totalDeaths: 0, longestKillStreak: 0, totalDamageDealt: 0, highestSurvivalWave: 1, matchHistory: [], coins: 100 }).level}
                        </span>
                      </div>
                    </div>

                    {isAlreadyFriend || isAddedNow ? (
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>صديق ✓</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(user.uid)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-xs flex items-center gap-1 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>إضافة</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MY FRIENDS LIST TAB */}
      {activeTab === 'my_friends' && (
        <div className="flex flex-col gap-3">
          {inviteStatusMsg && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-3 text-emerald-400 text-xs font-black flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>{inviteStatusMsg}</span>
              </div>
            </div>
          )}

          {friends.length === 0 ? (
            <div className="text-center py-8 bg-neutral-950/60 rounded-2xl border border-neutral-800/80 p-4">
              <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400 font-bold">لا يوجد أصدقاء في القائمة حتى الآن</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                اضغط على تبويب "إضافة صديق" وابحث عن اسم صديقك للتنافس معه!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {friends.map((friend) => {
                const isOnline = friend.status === 'online' || friend.status === 'in_game';
                const isInGame = friend.status === 'in_game';

                return (
                  <div
                    key={friend.uid}
                    className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-3 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-neutral-950 text-sm shadow-md"
                          style={{ backgroundColor: friend.camoColor || '#15803d' }}
                        >
                          {friend.displayName.charAt(0).toUpperCase()}
                        </div>
                        {/* Status Dot */}
                        <span
                          className={`w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-neutral-950 ${
                            isInGame
                              ? 'bg-amber-400 animate-pulse'
                              : isOnline
                              ? 'bg-emerald-500'
                              : 'bg-neutral-600'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">{friend.displayName}</h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isInGame
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : isOnline
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {isInGame ? 'في مباراة 🎮' : isOnline ? 'متصل 🟢' : 'غير متصل ⚪'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                          <span>{statsManager.getRank(friend.stats?.totalKills || 0).titleAr}</span>
                          <span>•</span>
                          <span>مستوى {statsManager.getXPInfo(friend.stats || { totalKills: 0, totalHeadshots: 0, totalWins: 0, totalMatches: 0, totalDeaths: 0, longestKillStreak: 0, totalDamageDealt: 0, highestSurvivalWave: 1, matchHistory: [], coins: 100 }).level}</span>
                          {friend.stats && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">{friend.stats.totalKills} قتل</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {isOnline && (
                        <button
                          onClick={() => handleQuickInvite(friend)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all shadow-md ${
                            invitedUids[friend.uid]
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 hover:from-amber-400 hover:to-yellow-300'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>{invitedUids[friend.uid] ? 'تمت الدعوة ✓' : 'دعوة سريعة ⚡'}</span>
                        </button>
                      )}

                      {friend.currentRoomCode && onJoinRoomByCode && (
                        <button
                          onClick={() => onJoinRoomByCode(friend.currentRoomCode!)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-[11px] flex items-center gap-1 shadow-md transition-all animate-bounce"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>دخول الغرفة ⚔️</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveFriend(friend.uid)}
                        title="حذف من الأصدقاء"
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
