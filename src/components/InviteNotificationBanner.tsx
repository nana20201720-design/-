import React, { useEffect, useState } from 'react';
import {
  friendsAndRoomsManager,
  RoomInvite,
} from '../utils/friendsAndRoomsManager';
import { FirebaseUser } from '../lib/firebase';
import { soundManager } from '../audio/soundManager';
import { Swords, Zap, X, BellRing, Gamepad2 } from 'lucide-react';

interface InviteNotificationBannerProps {
  currentUser: FirebaseUser | null;
  onAcceptJoinRoom: (roomCode: string) => void;
}

export const InviteNotificationBanner: React.FC<InviteNotificationBannerProps> = ({
  currentUser,
  onAcceptJoinRoom,
}) => {
  const [invites, setInvites] = useState<RoomInvite[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setInvites([]);
      return;
    }

    const unsubscribe = friendsAndRoomsManager.listenToMyInvitations((incoming) => {
      // Play sound if a new notification arrived
      if (incoming.length > 0 && incoming.length > invites.length) {
        try {
          soundManager.playButtonClick();
        } catch { /* ignore */ }
      }
      setInvites(incoming);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser || invites.length === 0) return null;

  const activeInvite = invites[0]; // Show the most recent invite / alert
  const isMatchStart = (activeInvite as any).type === 'match_start';

  const handleAccept = async () => {
    soundManager.playVictory();
    await friendsAndRoomsManager.acceptInvite(activeInvite.id);
    onAcceptJoinRoom(activeInvite.roomCode);
    setInvites((prev) => prev.filter((i) => i.id !== activeInvite.id));
  };

  const handleDecline = async () => {
    soundManager.playButtonClick();
    await friendsAndRoomsManager.declineInvite(activeInvite.id);
    setInvites((prev) => prev.filter((i) => i.id !== activeInvite.id));
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-md animate-bounce-short">
      <div
        className={`bg-gradient-to-r from-neutral-950 ${
          isMatchStart ? 'via-emerald-950/90 border-emerald-500' : 'via-amber-950/90 border-amber-500'
        } to-neutral-950 border-2 rounded-3xl p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3 relative overflow-hidden`}
      >
        {/* Glow effect */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 ${
            isMatchStart ? 'bg-emerald-500/10' : 'bg-amber-500/10'
          } rounded-full blur-2xl pointer-events-none`}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 bg-gradient-to-tr ${
                isMatchStart
                  ? 'from-emerald-500 to-teal-400 text-neutral-950'
                  : 'from-amber-500 to-yellow-400 text-neutral-950'
              } rounded-2xl shadow-lg animate-pulse shrink-0`}
            >
              {isMatchStart ? <Gamepad2 className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-current" />}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 ${
                    isMatchStart
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  } border rounded-full text-[10px] font-black uppercase flex items-center gap-1`}
                >
                  <BellRing className="w-3 h-3 animate-spin" />
                  {isMatchStart ? 'بدء مباراة من صديق! 🎮' : 'دعوة سريعة لمباراة! ⚡'}
                </span>
              </div>
              <h4 className="text-sm font-black text-white mt-1">
                {isMatchStart ? (
                  <>
                    بدأ صديقك <span className="text-emerald-400">{activeInvite.fromName}</span> المباراة الآن!
                  </>
                ) : (
                  <>
                    يدعوك <span className="text-amber-400">{activeInvite.fromName}</span> للانضمام!
                  </>
                )}
              </h4>
              <p className="text-[11px] text-neutral-300 font-mono mt-0.5">
                غرفة: <span className="text-white font-black">{activeInvite.roomCode}</span> • نمط {activeInvite.mode || '1v1'}
              </p>
            </div>
          </div>

          <button
            onClick={handleDecline}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-all"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAccept}
            className={`flex-1 py-2.5 bg-gradient-to-r ${
              isMatchStart
                ? 'from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-neutral-950'
                : 'from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-neutral-950'
            } font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95`}
          >
            {isMatchStart ? <Gamepad2 className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
            <span>{isMatchStart ? 'دخول المباراة فوراً 🎮' : 'انضمام فوراً للقتال ⚔️'}</span>
          </button>

          <button
            onClick={handleDecline}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold border border-neutral-700 rounded-2xl text-xs flex items-center justify-center gap-1 transition-all"
          >
            <span>إغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
