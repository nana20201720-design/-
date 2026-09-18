import React, { useState, useEffect } from 'react';
import {
  leaderboardManager,
  LeaderboardEntry,
} from '../utils/leaderboardManager';
import { auth } from '../lib/firebase';
import { Trophy, Crown, Flame, RefreshCw, Swords, Award, Star, Zap, User } from 'lucide-react';

export const GlobalLeaderboard: React.FC = () => {
  const [sortBy, setSortBy] = useState<'totalScore' | 'totalKills' | 'totalWins'>('totalScore');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const currentUid = auth.currentUser?.uid;

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { players: list, currentUserRank: rank } =
      await leaderboardManager.getTop10Players(currentUid, sortBy);
    setPlayers(list);
    setCurrentUserRank(rank);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, currentUid]);

  const top3 = players.slice(0, 3);
  const rest7 = players.slice(3, 10);

  return (
    <div className="w-full bg-neutral-900/95 border border-amber-500/30 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 text-neutral-950 rounded-2xl shadow-xl border border-yellow-300/40">
            <Crown className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white">لوحة المتصدرين العالمية (Global Leaderboard) 🏆</h3>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-mono font-bold">
                Top 10 🔥
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              ترتيب أساطير ومقاتلي الساحة بناءً على النقاط والقتلات المسجلة سحابياً في Firestore!
            </p>
          </div>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-2xl text-xs flex items-center gap-2 border border-neutral-700 transition-all self-end md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>تحديث المتصدرين</span>
        </button>
      </div>

      {/* Sort metric tabs */}
      <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-2xl p-1.5 overflow-x-auto">
        {[
          { id: 'totalScore', label: 'مجموع النقاط الإجمالية ⚡', icon: Zap },
          { id: 'totalKills', label: 'أعلى القتلات ⚔️', icon: Swords },
          { id: 'totalWins', label: 'أعلى الانتصارات 🏆', icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSortBy(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                sortBy === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black shadow-lg scale-102'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-neutral-400 gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs font-bold font-mono">جاري تحميل لوحة الصدارة من Firestore...</span>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {top3.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 pb-2">
              {/* Silver #2 */}
              <div className="order-2 sm:order-1 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-slate-400/40 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg relative">
                <span className="absolute -top-3 px-3 py-0.5 bg-slate-300 text-neutral-950 font-black text-[11px] rounded-full border border-white shadow-md">
                  المركز الثاني 🥈
                </span>
                <div
                  className="w-12 h-12 rounded-full mt-2 mb-2 border-2 border-slate-300 shadow-lg flex items-center justify-center text-white font-black text-lg"
                  style={{ backgroundColor: top3[1].avatarColor }}
                >
                  {top3[1].displayName.substring(0, 1)}
                </div>
                <h4 className="text-xs font-black text-white truncate max-w-full">
                  {top3[1].displayName}
                </h4>
                <div className="text-[10px] text-neutral-400 font-bold mt-0.5 flex items-center gap-1">
                  <span>{top3[1].rankBadge}</span>
                  <span>{top3[1].rankTitle}</span>
                </div>
                <div className="mt-2 text-sm font-black font-mono text-slate-300 bg-slate-900/60 px-3 py-1 rounded-xl border border-slate-700/50">
                  {sortBy === 'totalKills'
                    ? `${top3[1].totalKills} قتلة`
                    : sortBy === 'totalWins'
                    ? `${top3[1].totalWins} فوز`
                    : `${top3[1].totalScore.toLocaleString()} نقطة`}
                </div>
              </div>

              {/* Gold #1 */}
              <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-950/40 via-neutral-900 to-neutral-950 border-2 border-yellow-400/70 rounded-2xl p-4 flex flex-col items-center text-center shadow-2xl relative sm:-translate-y-2">
                <span className="absolute -top-3.5 px-3.5 py-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black text-xs rounded-full border border-white shadow-xl flex items-center gap-1 animate-bounce">
                  <Crown className="w-3.5 h-3.5" />
                  المركز الأول 🥇
                </span>
                <div
                  className="w-14 h-14 rounded-full mt-2 mb-2 border-2 border-yellow-400 shadow-xl flex items-center justify-center text-white font-black text-xl"
                  style={{ backgroundColor: top3[0].avatarColor }}
                >
                  {top3[0].displayName.substring(0, 1)}
                </div>
                <h4 className="text-sm font-black text-amber-300 truncate max-w-full">
                  {top3[0].displayName}
                </h4>
                <div className="text-[11px] text-amber-400 font-bold mt-0.5 flex items-center gap-1">
                  <span>{top3[0].rankBadge}</span>
                  <span>{top3[0].rankTitle}</span>
                </div>
                <div className="mt-2 text-base font-black font-mono text-yellow-400 bg-yellow-950/60 px-4 py-1 rounded-xl border border-yellow-500/40">
                  {sortBy === 'totalKills'
                    ? `${top3[0].totalKills} قتلة`
                    : sortBy === 'totalWins'
                    ? `${top3[0].totalWins} فوز`
                    : `${top3[0].totalScore.toLocaleString()} نقطة`}
                </div>
              </div>

              {/* Bronze #3 */}
              <div className="order-3 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-700/40 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg relative">
                <span className="absolute -top-3 px-3 py-0.5 bg-amber-700 text-white font-black text-[11px] rounded-full border border-amber-500 shadow-md">
                  المركز الثالث 🥉
                </span>
                <div
                  className="w-12 h-12 rounded-full mt-2 mb-2 border-2 border-amber-700 shadow-lg flex items-center justify-center text-white font-black text-lg"
                  style={{ backgroundColor: top3[2].avatarColor }}
                >
                  {top3[2].displayName.substring(0, 1)}
                </div>
                <h4 className="text-xs font-black text-white truncate max-w-full">
                  {top3[2].displayName}
                </h4>
                <div className="text-[10px] text-neutral-400 font-bold mt-0.5 flex items-center gap-1">
                  <span>{top3[2].rankBadge}</span>
                  <span>{top3[2].rankTitle}</span>
                </div>
                <div className="mt-2 text-sm font-black font-mono text-amber-500 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-800/50">
                  {sortBy === 'totalKills'
                    ? `${top3[2].totalKills} قتلة`
                    : sortBy === 'totalWins'
                    ? `${top3[2].totalWins} فوز`
                    : `${top3[2].totalScore.toLocaleString()} نقطة`}
                </div>
              </div>
            </div>
          )}

          {/* Table of Top 10 List */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 flex flex-col gap-2">
            <div className="text-xs font-black text-neutral-400 border-b border-neutral-800 pb-2 px-2 flex items-center justify-between font-mono">
              <span>الترتيب والمقاتل</span>
              <span>النقاط / القتلات / الانتصارات</span>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {players.map((player, index) => {
                const rankNum = index + 1;
                const isUser = player.isCurrentUser;

                return (
                  <div
                    key={player.uid}
                    className={`px-3 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isUser
                        ? 'bg-amber-500/20 border-amber-500/60 font-black shadow-md'
                        : index === 0
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-neutral-900/70 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black font-mono border ${
                          rankNum === 1
                            ? 'bg-yellow-400 text-neutral-950 border-yellow-200'
                            : rankNum === 2
                            ? 'bg-slate-300 text-neutral-950 border-white'
                            : rankNum === 3
                            ? 'bg-amber-700 text-white border-amber-500'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        }`}
                      >
                        #{rankNum}
                      </span>

                      <div
                        className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: player.avatarColor }}
                      >
                        {player.displayName.substring(0, 1)}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">
                            {player.displayName}
                          </span>
                          {isUser && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-neutral-950 rounded text-[9px] font-black">
                              أنت ✨
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 mt-0.5">
                          <span>{player.rankBadge}</span>
                          <span>{player.rankTitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-black font-mono text-amber-400">
                        {player.totalScore.toLocaleString()} نقطة
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono font-bold">
                        {player.totalKills} قتلة • {player.totalWins} فوز
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current user status footer */}
          {auth.currentUser && currentUserRank && (
            <div className="bg-gradient-to-r from-amber-500/20 via-neutral-900 to-amber-500/20 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-neutral-300">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>ترتيبك في السيرفر العالمي:</span>
                <span className="px-2.5 py-0.5 bg-amber-500 text-neutral-950 rounded-full font-black font-mono">
                  #{currentUserRank}
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                استمر في القتال وجمع الانتصارات لرفع ترتيبك! ⚔️
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
