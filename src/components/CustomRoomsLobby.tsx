import React, { useState, useEffect } from 'react';
import {
  friendsAndRoomsManager,
  CustomRoom,
  RoomPlayer,
  UserFriendProfile,
} from '../utils/friendsAndRoomsManager';
import { FirebaseUser } from '../lib/firebase';
import {
  Swords,
  Users,
  Copy,
  Check,
  Play,
  LogOut,
  Shield,
  Zap,
  Flame,
  Globe,
  PlusCircle,
  LogIn,
  Share2,
  Server,
  RefreshCw,
  Sparkles,
  Link,
} from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface CustomRoomsLobbyProps {
  currentUser: FirebaseUser | null;
  onOpenAuth: () => void;
  onStartCustomGame: (room: CustomRoom, myTeam: 'red' | 'blue' | 'ffa') => void;
  initialRoomCode?: string;
}

export const CustomRoomsLobby: React.FC<CustomRoomsLobbyProps> = ({
  currentUser,
  onOpenAuth,
  onStartCustomGame,
  initialRoomCode,
}) => {
  const [activeRoom, setActiveRoom] = useState<CustomRoom | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || '');
  const [selectedMode, setSelectedMode] = useState<'1v1' | '2v2' | '3v3' | 'deathmatch'>('1v1');
  const [selectedMap, setSelectedMap] = useState('Dust Arena');
  const [selectedRegion, setSelectedRegion] = useState('الشرق الأوسط (MENA ⚡)');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  
  // Matchmaking States
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingTimer, setMatchmakingTimer] = useState(0);
  const [matchmakingStatusText, setMatchmakingStatusText] = useState('جاري فحص السيرفرات المتاحة...');

  // Public Servers / Active Rooms List
  const [publicRooms, setPublicRooms] = useState<CustomRoom[]>([]);
  const [isLoadingPublicRooms, setIsLoadingPublicRooms] = useState(false);
  const [friends, setFriends] = useState<UserFriendProfile[]>([]);
  const [invitedUids, setInvitedUids] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser) return;
    const unsub = friendsAndRoomsManager.listenToMyFriends((list) => {
      setFriends(list);
    });
    return () => unsub();
  }, [currentUser]);

  const handleSendInviteToFriend = async (friendUid: string) => {
    if (!activeRoom) return;
    const res = await friendsAndRoomsManager.sendRoomInvite(friendUid, activeRoom.roomCode, activeRoom.mode, activeRoom.mapName);
    if (res.success) {
      setInvitedUids((prev) => ({ ...prev, [friendUid]: true }));
      try {
        soundManager.playButtonClick();
      } catch { /* ignore */ }
    }
  };

  const mapsList = ['Dust Arena', 'Neon City', 'Jungle Outpost', 'Snow Fortress'];
  const serverRegions = [
    { name: 'الشرق الأوسط (MENA ⚡)', ping: '24ms', color: 'text-emerald-400' },
    { name: 'أوروبا الغربية (EU West 🇪🇺)', ping: '65ms', color: 'text-yellow-400' },
    { name: 'شرق أمريكا (US East 🇺🇸)', ping: '135ms', color: 'text-rose-400' },
  ];

  // Fetch public rooms on mount
  useEffect(() => {
    fetchPublicRooms();
  }, []);

  const fetchPublicRooms = async () => {
    setIsLoadingPublicRooms(true);
    try {
      const rooms = await friendsAndRoomsManager.getPublicRooms();
      setPublicRooms(rooms);
    } catch (e) {
      console.warn('Failed to fetch public rooms:', e);
    } finally {
      setIsLoadingPublicRooms(false);
    }
  };

  // Listen to active room changes in real-time
  useEffect(() => {
    if (!activeRoom) return;
    const unsubscribe = friendsAndRoomsManager.listenToRoom(activeRoom.roomCode, (updatedRoom) => {
      if (!updatedRoom) {
        setActiveRoom(null);
        setErrorMsg('تم إغلاق الغرفة بواسطة المضيف.');
        return;
      }
      setActiveRoom(updatedRoom);

      // Check if host started game!
      if (updatedRoom.status === 'playing') {
        soundManager.playVictory();
        const myPlayer = updatedRoom.players.find((p) => p.uid === currentUser?.uid);
        onStartCustomGame(updatedRoom, myPlayer?.team || 'red');
      }
    });

    return () => unsubscribe();
  }, [activeRoom?.roomCode, currentUser?.uid]);

  // Matchmaking Timer and Auto-Match Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isMatchmaking) {
      interval = setInterval(() => {
        setMatchmakingTimer((prev) => {
          const next = prev + 1;
          
          // Custom status text updates depending on time to look extremely realistic and engaging
          if (next === 2) {
            setMatchmakingStatusText(`البحث في إقليم ${selectedRegion}...`);
          } else if (next === 4) {
            setMatchmakingStatusText(`البحث عن نمط القتال: ${selectedMode.toUpperCase()}...`);
          } else if (next === 6) {
            setMatchmakingStatusText('جاري الاتصال بقاعدة البيانات السحابية...');
          } else if (next >= 8) {
            setMatchmakingStatusText('تأسيس ساحة جديدة لتصبح مضيف المعركة...');
          }
          
          return next;
        });
      }, 1000);
    } else {
      setMatchmakingTimer(0);
      setMatchmakingStatusText('جاري فحص السيرفرات المتاحة...');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMatchmaking, selectedRegion, selectedMode]);

  const handleStartMatchmaking = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setErrorMsg('');
    setIsMatchmaking(true);
    setMatchmakingTimer(0);
    setMatchmakingStatusText('جاري الاتصال بنظام المطابقة السحابي...');
    
    try {
      soundManager.playButtonClick();
    } catch { /* ignore */ }

    // Phase 1: Wait 3 seconds to search for available rooms to simulate real-time matchmaking ping
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      // Fetch latest active rooms
      const activeRoomsList = await friendsAndRoomsManager.getPublicRooms();
      
      // Filter rooms matching region and game mode that have space
      const matchedRoom = activeRoomsList.find((room) => {
        return (
          room.status === 'lobby' &&
          room.mode === selectedMode &&
          (room.region === selectedRegion || !room.region) &&
          room.players.length < room.maxPlayers
        );
      });

      if (matchedRoom) {
        setMatchmakingStatusText('تم العثور على ساحة معركة مناسبة! جاري الدخول...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const playerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مقاتل الأرينا';
        const result = await friendsAndRoomsManager.joinRoom(matchedRoom.roomCode, playerName);
        
        if (result.success && result.room) {
          setActiveRoom(result.room);
          setIsMatchmaking(false);
          try {
            soundManager.playVictory();
          } catch { /* ignore */ }
          return;
        }
      }

      // Phase 2: If no room is found, build/create a brand new room automatically!
      setMatchmakingStatusText('لم يتم العثور على ساحة مفتوحة، جاري إنشاء غرفتك الخاصة...');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const playerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مقاتل الأرينا';
      const newRoom = await friendsAndRoomsManager.createRoom(
        selectedMode,
        selectedMap,
        playerName,
        '#15803d',
        selectedRegion
      );

      if (newRoom) {
        setActiveRoom(newRoom);
        fetchPublicRooms();
        try {
          soundManager.playVictory();
        } catch { /* ignore */ }
      } else {
        setErrorMsg('فشل نظام المطابقة في تهيئة ساحة القتال، يرجى المحاولة يدوياً.');
      }
    } catch (err) {
      console.error('Matchmaking error:', err);
      setErrorMsg('حدث خطأ في شبكة التوصيل، يرجى المحاولة يدوياً.');
    } finally {
      setIsMatchmaking(false);
    }
  };

  const handleCancelMatchmaking = () => {
    setIsMatchmaking(false);
    try {
      soundManager.playButtonClick();
    } catch { /* ignore */ }
  };

  // Handle auto-join if initial room code passed
  useEffect(() => {
    if (initialRoomCode && currentUser) {
      handleJoinRoom(initialRoomCode);
    }
  }, [initialRoomCode, currentUser]);

  const handleCreateRoom = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setLoading(true);
    setErrorMsg('');

    const playerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مقاتل الأرينا';
    const newRoom = await friendsAndRoomsManager.createRoom(
      selectedMode,
      selectedMap,
      playerName,
      '#15803d',
      selectedRegion
    );

    if (newRoom) {
      setActiveRoom(newRoom);
      soundManager.playButtonClick();
      fetchPublicRooms();
    } else {
      setErrorMsg('تعذر إنشاء الغرفة. يرجى إعادة المحاولة.');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (codeToJoin?: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    const code = codeToJoin || roomCodeInput;
    if (!code.trim()) {
      setErrorMsg('يرجى كتابة رمز الغرفة أولاً.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const playerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'مقاتل الأرينا';
    const result = await friendsAndRoomsManager.joinRoom(code, playerName);

    if (result.success && result.room) {
      setActiveRoom(result.room);
      soundManager.playButtonClick();
    } else {
      setErrorMsg(result.message);
    }
    setLoading(false);
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    await friendsAndRoomsManager.leaveRoom(activeRoom.roomCode);
    setActiveRoom(null);
    fetchPublicRooms();
  };

  const handleSwitchTeam = async (newTeam: 'red' | 'blue') => {
    if (!activeRoom || !currentUser) return;
    await friendsAndRoomsManager.switchPlayerTeam(activeRoom.roomCode, currentUser.uid, newTeam);
  };

  const handleStartMatch = async () => {
    if (!activeRoom || !currentUser) return;
    if (activeRoom.hostUid !== currentUser.uid) return;
    await friendsAndRoomsManager.startRoomMatch(activeRoom.roomCode);
  };

  const handleCopyCode = async () => {
    if (!activeRoom) return;
    try {
      await navigator.clipboard.writeText(activeRoom.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      alert(`رمز الغرفة: ${activeRoom.roomCode}`);
    }
  };

  const handleShareLobbyLink = async () => {
    if (!activeRoom) return;
    const shareUrl = friendsAndRoomsManager.getShareableLobbyUrl(activeRoom.roomCode);
    const shareData = {
      title: 'Mini Battle Arena - انضم لمباراتي!',
      text: `انضم لي الآن في غرفة القتال ${activeRoom.mode.toUpperCase()} (رمز: ${activeRoom.roomCode})! 🎮⚔️`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* fallback to clipboard copy */
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      alert(`رابط الانضمام المباشر:\n${shareUrl}`);
    }
  };

  if (!currentUser) {
    return (
      <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Swords className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">الغرف الخاصة وتحديات الأونلاين</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            قم بتسجيل الدخول للحصول على سيرفرات أونلاين خاصة، إنشاء غرف 1v1 و 2v2، ومشاركة الرابط المباشر مع أصدقائك!
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>تسجيل الدخول الآن (Google & Email)</span>
        </button>
      </div>
    );
  }

  // ACTIVE ROOM LOBBY VIEW
  if (activeRoom) {
    const isHost = activeRoom.hostUid === currentUser.uid;
    const redTeam = activeRoom.players.filter((p) => p.team === 'red');
    const blueTeam = activeRoom.players.filter((p) => p.team === 'blue');

    return (
      <div className="w-full bg-neutral-900/95 border border-amber-500/40 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-5">
        {/* Lobby Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-amber-600 to-yellow-500 text-neutral-950 rounded-2xl font-black shadow-lg">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">غرفة المعركة الخاصة</h3>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-black font-mono">
                  {activeRoom.mode.toUpperCase()}
                </span>
                {activeRoom.region && (
                  <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded-full text-[10px] font-bold">
                    {activeRoom.region}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                الخريطة: <span className="text-white font-bold">{activeRoom.mapName}</span> • المضيف:{' '}
                <span className="text-amber-400 font-bold">{activeRoom.hostName}</span>
              </p>
            </div>
          </div>

          {/* Room Code & Copy & Share Link */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareLobbyLink}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition-all animate-pulse"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedShareLink ? 'تم نسخ الرابط! 🔗' : 'مشاركة الغرفة 🔗'}</span>
            </button>

            <div className="bg-neutral-950 border border-amber-500/40 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 font-bold">الرمز:</span>
              <span className="text-base font-black font-mono tracking-wider text-amber-400">
                {activeRoom.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg transition-all"
                title="نسخ الرمز"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleLeaveRoom}
              className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-2xl text-xs flex items-center gap-1 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>مغادرة</span>
            </button>
          </div>
        </div>

        {/* TEAM BALANCING LOBBY */}
        {activeRoom.mode === 'deathmatch' ? (
          /* FREE FOR ALL LIST */
          <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800">
            <h4 className="text-xs font-black text-amber-400 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              <span>الجميع ضد الجميع (FFA) - ({activeRoom.players.length} / {activeRoom.maxPlayers})</span>
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activeRoom.players.map((p) => (
                <div key={p.uid} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-white flex-1 truncate">{p.displayName}</span>
                  {p.isHost && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                      المضيف
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TEAMS: RED VS BLUE */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RED TEAM */}
            <div className="bg-gradient-to-b from-rose-950/40 to-neutral-950 border border-rose-500/40 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-rose-500/20 pb-2">
                <h4 className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 fill-rose-500/30" />
                  <span>الفريق الأحمـر (Red Team) ({redTeam.length})</span>
                </h4>
                <button
                  onClick={() => handleSwitchTeam('red')}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-[10px] font-bold transition-all"
                >
                  الانضمام هنا ↙️
                </button>
              </div>

              <div className="space-y-2">
                {redTeam.map((p) => (
                  <div key={p.uid} className="bg-neutral-900/90 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{p.displayName}</span>
                    {p.isHost && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                        المضيف 👑
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* BLUE TEAM */}
            <div className="bg-gradient-to-b from-sky-950/40 to-neutral-950 border border-sky-500/40 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-sky-500/20 pb-2">
                <h4 className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 fill-sky-500/30" />
                  <span>الفريق الأزرق (Blue Team) ({blueTeam.length})</span>
                </h4>
                <button
                  onClick={() => handleSwitchTeam('blue')}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-[10px] font-bold transition-all"
                >
                  الانضمام هنا ↙️
                </button>
              </div>

              <div className="space-y-2">
                {blueTeam.map((p) => (
                  <div key={p.uid} className="bg-neutral-900/90 border border-sky-500/20 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{p.displayName}</span>
                    {p.isHost && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                        المضيف 👑
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ONLINE FRIENDS QUICK INVITE PANEL */}
        {friends.length > 0 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3">
            <h4 className="text-xs font-black text-white mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>دعوة أصدقائك المتصلين لهذه الغرفة ⚡</span>
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {friends.map((friend) => {
                const isOnline = friend.status === 'online' || friend.status === 'in_game';
                const isAlreadyInRoom = activeRoom.players.some((p) => p.uid === friend.uid);
                const isInvited = invitedUids[friend.uid];

                return (
                  <div
                    key={friend.uid}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex items-center gap-2 shrink-0 text-xs"
                  >
                    <div className="relative">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-neutral-950 text-[10px]"
                        style={{ backgroundColor: friend.camoColor || '#15803d' }}
                      >
                        {friend.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border border-neutral-950 ${
                          isOnline ? 'bg-emerald-500' : 'bg-neutral-600'
                        }`}
                      />
                    </div>

                    <span className="font-bold text-white max-w-[90px] truncate">{friend.displayName}</span>

                    {isAlreadyInRoom ? (
                      <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-lg">
                        في الغرفة ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendInviteToFriend(friend.uid)}
                        disabled={isInvited}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${
                          isInvited
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-sm'
                        }`}
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        <span>{isInvited ? 'تمت الدعوة ✓' : 'دعوة ⚡'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2">
          {isHost ? (
            <button
              onClick={handleStartMatch}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 animate-bounce"
            >
              <Play className="w-5 h-5 fill-neutral-950" />
              <span>بدء المعركة الآن ⚔️ (START MATCH)</span>
            </button>
          ) : (
            <div className="text-center py-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-amber-400 font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>في انتظار المضيف لبدء المبارة...</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (isMatchmaking) {
    return (
      <div className="w-full bg-neutral-900/95 border border-amber-500/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center py-12 relative overflow-hidden select-none">
        {/* Radar pulsing effect */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-64 h-64 border-2 border-amber-500 rounded-full animate-ping" />
          <div className="w-48 h-48 border border-amber-500 rounded-full animate-pulse absolute" />
          <div className="w-32 h-32 border border-amber-500/60 rounded-full animate-ping absolute" />
        </div>

        <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 rounded-full flex items-center justify-center text-4xl mb-6 relative animate-bounce-short">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          ⚔️
        </div>

        <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 justify-center mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" /> البحث السريع النشط
        </span>

        <h3 className="text-xl font-black text-white">نظام المطابقة الذكي (Matchmaking)</h3>
        <p className="text-sm text-neutral-400 mt-1 max-w-xs leading-relaxed">
          نبحث لك عن مواجهة ملحمية تناسب إقليمك ونمط اللعب المفضل!
        </p>

        {/* Selected parameters */}
        <div className="flex gap-2 justify-center flex-wrap my-4">
          <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-xl text-[10px] font-bold">
            📍 {selectedRegion}
          </span>
          <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-amber-400 rounded-xl text-[10px] font-bold font-mono">
            🎮 {selectedMode.toUpperCase()}
          </span>
        </div>

        {/* Counter and current state */}
        <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl py-3.5 px-6 min-w-[240px] mb-6 shadow-inner">
          <div className="text-2xl font-black text-amber-400 font-mono tracking-wider mb-1 animate-pulse">
            0:0{matchmakingTimer}
          </div>
          <div className="text-xs text-neutral-300 font-medium">{matchmakingStatusText}</div>
        </div>

        <button
          onClick={handleCancelMatchmaking}
          className="px-6 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          إلغاء البحث والعودة
        </button>
      </div>
    );
  }

  // CREATE OR JOIN ROOM SELECTION VIEW + PUBLIC SERVERS BROWSER
  return (
    <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 shrink-0">
            <Swords className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">غرف قتال أونلاين والسيرفرات العامة</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              أنشئ غرفة خاصة مع أصدقائك، شارك رابط الانضمام المباشر، أو تصفّح السيرفرات المتاحة!
            </p>
          </div>
        </div>

        <button
          onClick={fetchPublicRooms}
          disabled={isLoadingPublicRooms}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all self-end md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPublicRooms ? 'animate-spin' : ''}`} />
          <span>تحديث السيرفرات</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-2xl p-3 text-center">
          {errorMsg}
        </div>
      )}

      {/* QUICK MATCHMAKING BANNER */}
      <div className="bg-gradient-to-r from-amber-600/15 via-amber-500/5 to-amber-600/15 border border-amber-500/30 rounded-2xl p-4 text-right relative overflow-hidden shadow-inner">
        <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex-1">
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 mb-1.5">
              <Sparkles className="w-3 h-3 animate-pulse text-amber-400" /> ميزة المطابقة التلقائية الذكية (Matchmaking)
            </span>
            <h4 className="text-sm font-black text-white">العب الآن بنظام المطابقة السريع</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed mt-1">
              اختر السيرفر ونمط اللعب بالأسفل، ثم اضغط هنا ليقوم السيرفر بالبحث التلقائي الفوري ودمجك مع لاعبين آخرين يبحثون عن نفس خياراتك بالوقت الفعلي دون الحاجة لدعوات يدوية!
            </p>
          </div>
          <button
            onClick={handleStartMatchmaking}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-neutral-950 font-black rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>البدء بالمطابقة التلقائية 🔍</span>
          </button>
        </div>
      </div>

      {/* CREATE / JOIN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CREATE ROOM COLUMN */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-amber-400 mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              <span>إنشاء غرفة جديدة (Create Room)</span>
            </h4>

            {/* Server Region Selector */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[11px] text-neutral-400 font-bold flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>اختر السيرفر الإقليمي:</span>
              </label>
              <div className="space-y-1">
                {serverRegions.map((reg) => (
                  <button
                    key={reg.name}
                    type="button"
                    onClick={() => setSelectedRegion(reg.name)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
                      selectedRegion === reg.name
                        ? 'bg-amber-500/20 text-white border-amber-500/60 font-black'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>{reg.name}</span>
                    <span className={`text-[10px] font-mono font-bold ${reg.color}`}>{reg.ping}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[11px] text-neutral-400 font-bold block">نمط المواجهة:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1v1', label: '1 ضد 1 (مبارزة)' },
                  { id: '2v2', label: '2 ضد 2 (فريقين)' },
                  { id: '3v3', label: '3 ضد 3 (ساحة كاملة)' },
                  { id: 'deathmatch', label: 'الجميع ضد الجميع' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMode(m.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border text-right transition-all ${
                      selectedMode === m.id
                        ? 'bg-amber-500 text-neutral-950 border-amber-500 font-black'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-neutral-400 font-bold block">اختر الخريطة:</label>
              <select
                value={selectedMap}
                onChange={(e) => setSelectedMap(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                {mapsList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Swords className="w-4 h-4" />
            <span>إنشاء الغرفة والانتظار ⚔️</span>
          </button>
        </div>

        {/* JOIN ROOM COLUMN */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-amber-400 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>الانضمام برمز الغرفة (Join Code)</span>
            </h4>

            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              أدخل الرمز المكون من 4 خانات (مثال: <span className="text-amber-400 font-mono font-bold">ROOM-4821</span>) للانضمام فوراً لغرفة صديقك!
            </p>

            <input
              type="text"
              placeholder="مثال: ROOM-A9K2"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3 text-sm text-center font-mono tracking-widest text-amber-400 placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-black uppercase"
            />
          </div>

          <button
            onClick={() => handleJoinRoom()}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>انضمام للغرفة الآن 🚀</span>
          </button>
        </div>
      </div>

      {/* PUBLIC ONLINE SERVERS BROWSER */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <h4 className="text-xs font-black text-amber-400 flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span>السيرفرات والغرف العامة النشطة حالياً ({publicRooms.length})</span>
          </h4>
          <span className="text-[10px] text-neutral-500">انضم لأي غرفة مفتوحة مباشرة!</span>
        </div>

        {publicRooms.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-xs font-bold">
            لا توجد غرف عامة مفتوحة حالياً. أنشئ غرفتك الأولى ليتصل بها الآخرون!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
            {publicRooms.map((room) => (
              <div
                key={room.roomCode}
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-xl p-3 flex items-center justify-between transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{room.hostName}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-mono font-bold">
                      {room.mode.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    <span>{room.mapName}</span> • <span>{room.region || 'الشرق الأوسط'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-400 font-mono">
                    {room.players.length}/{room.maxPlayers} 👥
                  </span>
                  <button
                    onClick={() => handleJoinRoom(room.roomCode)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-md transition-all"
                  >
                    <span>انضمام ⚔️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

