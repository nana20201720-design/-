/**
 * Mini Battle Arena - Main Application
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameMode, PlayerCustomization, GameSettings, KillFeedItem, CharacterState } from './types';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { MainMenu } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { SplashScreen } from './components/SplashScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { VersionUpdateModal } from './components/VersionUpdateModal';
import { soundManager } from './audio/soundManager';
import { statsManager } from './utils/statsManager';

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  playerName: 'القائد',
  camoColor: '#15803d',
  headgear: 'helmet',
  skinTone: '#fbb587',
  sunglasses: true,
  charAvatarIndex: 1,
};

const DEFAULT_SETTINGS: GameSettings = {
  language: 'ar',
  soundVolume: 0.8,
  musicVolume: 0.6,
  haptics: true,
  autoFire: true,
  aimAssist: true,
  joystickFixed: false,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // App State
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [inGame, setInGame] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMode, setActiveMode] = useState<GameMode>('deathmatch');
  const [gameOverStats, setGameOverStats] = useState<{
    isVictory: boolean;
    score: number;
    kills: number;
    deaths: number;
    wave?: number;
    mvpName?: string;
    mvpKills?: number;
  } | null>(null);

  // User Settings & Customization with local storage persistence
  const [customization, setCustomization] = useState<PlayerCustomization>(() => {
    try {
      const saved = localStorage.getItem('mini_battle_custom');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMIZATION;
    } catch {
      return DEFAULT_CUSTOMIZATION;
    }
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('mini_battle_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // HUD sync states
  const [playerState, setPlayerState] = useState<CharacterState | null>(null);
  const [matchInfo, setMatchInfo] = useState({
    timer: 180,
    blueScore: 0,
    redScore: 0,
    playerKills: 0,
    playerDeaths: 0,
    wave: 1,
    mode: 'deathmatch',
  });
  const [killFeed, setKillFeed] = useState<KillFeedItem[]>([]);
  const [scopeLevel, setScopeLevel] = useState(1);

  // Update customization
  const handleUpdateCustomization = (updated: PlayerCustomization) => {
    setCustomization(updated);
    try {
      localStorage.setItem('mini_battle_custom', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // Update settings
  const handleUpdateSettings = (updated: GameSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem('mini_battle_settings', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  // Start new game session
  const startGame = useCallback((mode: GameMode) => {
    if (!canvasRef.current) return;

    // محاولة طلب ملء الشاشة عند بدء اللعبة
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    setActiveMode(mode);
    setGameOverStats(null);
    setIsPaused(false);
    setKillFeed([]);

    // Stop existing engine
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }

    const canvas = canvasRef.current;
    const engine = new GameEngine(canvas, mode, customization, settings, {
      onKillFeed: (item) => {
        setKillFeed((prev) => [...prev.slice(-6), item]);
      },
      onGameOver: (isVictory, score, kills, deaths, headshots, maxStreak, damage, mvpName, mvpKills) => {
        const currentWave = engineRef.current?.getMatchInfo().wave || 1;
        statsManager.recordMatch({
          mode,
          kills,
          deaths,
          headshots,
          maxStreak,
          damage,
          isVictory,
          score,
          wave: currentWave,
        });

        setGameOverStats({
          isVictory,
          score,
          kills,
          deaths,
          wave: currentWave,
          mvpName,
          mvpKills,
        });
      },
      onWaveComplete: (wave) => {
        // Wave update event
      },
    });

    engineRef.current = engine;
    engine.resize(window.innerWidth, window.innerHeight);
    engine.start();

    // Populate initial state instantly for a lag-free UI draw on frame 1
    setPlayerState({ ...engine.player });
    setMatchInfo(engine.getMatchInfo());
    setScopeLevel(1);
    setInGame(true);
  }, [customization, settings]);

  // Restart current match
  const restartGame = useCallback(() => {
    startGame(activeMode);
  }, [startGame, activeMode]);

  // Quit to Main Menu
  const quitToMenu = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setInGame(false);
    setIsPaused(false);
    setGameOverStats(null);
  }, []);

  // Pause / Resume
  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      engineRef.current?.setPaused(next);
      return next;
    });
  }, []);

  // Sound Mute Toggle
  const toggleMute = useCallback(() => {
    const isMuted = settings.soundVolume === 0;
    const newVol = isMuted ? 0.8 : 0;
    handleUpdateSettings({ ...settings, soundVolume: newVol });
    soundManager.setVolume(newVol);
  }, [settings]);

  // Resize canvas when container or window changes
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current && canvasRef.current) {
        // استخدم visualViewport إذا كانت متاحة لتفادي مشاكل أشرطة الهاتف
        const width = window.visualViewport?.width || window.innerWidth;
        const height = window.visualViewport?.height || window.innerHeight;
        engineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    // استمع أيضاً لتغيرات visualViewport
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  // HUD sync polling (60ms interval is light and responsive)
  useEffect(() => {
    if (!inGame) return;

    const interval = setInterval(() => {
      if (engineRef.current) {
        setPlayerState({ ...engineRef.current.player });
        setMatchInfo(engineRef.current.getMatchInfo());
        setScopeLevel(engineRef.current.scopeLevel);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [inGame]);

  // Synchronously lock or unlock body touch scrolling depending on game/splash states
  useEffect(() => {
    if (inGame || isSplashActive) {
      document.body.classList.add('overflow-hidden', 'touch-none');
    } else {
      document.body.classList.remove('overflow-hidden', 'touch-none');
    }
    return () => {
      document.body.classList.remove('overflow-hidden', 'touch-none');
    };
  }, [inGame, isSplashActive]);

  return (
    <div
      id="mini-battle-arena-root"
      className={`relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans select-none ${inGame ? 'touch-none' : ''}`}
      dir={settings.language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* SPLASH SCREEN */}
      {isSplashActive && (
        <SplashScreen onComplete={() => setIsSplashActive(false)} />
      )}

      {/* HTML5 CANVAS GAMEPLAY VIEWPORT */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="absolute inset-0 w-full h-full block touch-none"
      />

      {/* MAIN MENU */}
      {!inGame && (
        <MainMenu
          onStartGame={startGame}
          customization={customization}
          onUpdateCustomization={handleUpdateCustomization}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* IN-GAME HUD */}
      {inGame && !gameOverStats && (
        <HUD
          player={playerState}
          scopeLevel={scopeLevel}
          onToggleScope={() => {
            if (engineRef.current) {
              const nextScope = engineRef.current.cycleScopeLevel();
              setScopeLevel(nextScope);
            }
          }}
          matchInfo={matchInfo}
          killFeed={killFeed}
          onPause={togglePause}
          onReload={() => engineRef.current?.reloadPlayer()}
          onSwitchWeapon={() => engineRef.current?.switchPlayerWeapon()}
          onDropWeapon={() => engineRef.current?.dropPlayerWeapon()}
          onSelectPlayer={(idx) => engineRef.current?.setActivePlayer(idx)}
        />
      )}

      {/* TOUCH CONTROLS OVERLAY */}
      {inGame && !isPaused && !gameOverStats && (
        <TouchControls
          engine={engineRef.current}
          onPause={togglePause}
          grenadesCount={playerState?.grenades ?? 0}
        />
      )}

      {/* PAUSE MODAL */}
      {inGame && isPaused && !gameOverStats && (
        <PauseModal
          onResume={togglePause}
          onRestart={restartGame}
          onQuit={quitToMenu}
          isMuted={settings.soundVolume === 0}
          onToggleMute={toggleMute}
        />
      )}

      {/* GAME OVER MODAL */}
      {inGame && gameOverStats && (
        <GameOverModal
          isVictory={gameOverStats.isVictory}
          score={gameOverStats.score}
          kills={gameOverStats.kills}
          deaths={gameOverStats.deaths}
          mode={activeMode}
          wave={gameOverStats.wave}
          mvpName={gameOverStats.mvpName}
          mvpKills={gameOverStats.mvpKills}
          onRestart={restartGame}
          onQuit={quitToMenu}
        />
      )}

      {/* PWA UPDATE NOTIFICATION PROMPT */}
      <PWAUpdatePrompt />

      {/* DYNAMIC SYSTEM VERSION UPDATE ALERT MODAL */}
      <VersionUpdateModal />
    </div>
  );
}
