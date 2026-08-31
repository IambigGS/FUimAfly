/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Settings,
  Trophy,
  Award,
  Share2,
  HelpCircle,
  Home,
  Code,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  BookOpen,
  Clock,
  Target,
  Menu,
  Maximize2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { DojoBackground } from './components/DojoBackground';
import NinjaOverlayCanvas, { NinjaOverlayHandle } from './components/NinjaOverlayCanvas';
import NinjaSurpriseModal from './components/NinjaSurpriseModal';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import TeamHub from './components/TeamHub';
import { BeTheFlyCanvas } from './components/BeTheFlyCanvas';
import { HowToPlay } from './components/HowToPlay';
import { SettingsModal, CHOPSTICK_STYLES } from './components/SettingsModal';
import { audio } from './utils/audio';
import { GameMode, GameStats, FlyType, PlaytestLog } from './types';
import { APP_VERSION, LAST_UPDATE_TIMESTAMP, BUILD_INFO } from './version';

export default function App() {
  // Navigation & Screens
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover' | 'team_hub' | 'be_the_fly'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');
  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    let intervalId: number;
    if (gameState === 'menu') {
      setCurrentTime(new Date());
      intervalId = window.setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [gameState]);

  const [isBeTheFlyOverlayActive, setIsBeTheFlyOverlayActive] = useState(false);

  // Playtest Telemetry System (for Sid & Scott)
  const [isPlaytestMode, setIsPlaytestMode] = useState(false);
  const [playtestLog, setPlaytestLog] = useState<PlaytestLog | null>(null);
  const [showPlaytestModal, setShowPlaytestModal] = useState(false);

  // Popups & Overlays
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings & Volumes
  const [masterVol, setMasterVol] = useState(0.5);
  const [musicVol, setMusicVol] = useState(0.3);
  const [sfxVol, setSfxVol] = useState(0.6);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('chop_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('chop_sound', String(next));
    } catch {}
  };
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [selectedChopstickId, setSelectedChopstickId] = useState('bamboo');
  const [showHelper, setShowHelper] = useState(true);

  // Viewport Simulator Mode ('desktop' vs 'telegram_pc')
  const [viewportMode, setViewportMode] = useState<'desktop' | 'telegram_pc'>(() => {
    try {
      return (localStorage.getItem('dojo_viewport_mode') as 'desktop' | 'telegram_pc') || 'desktop';
    } catch {
      return 'desktop';
    }
  });

  // Triangular Layout (Luna's Layout) is committed as the default game layout
  const layoutMode = 'triangular';
  const [simulateTouch, setSimulateTouch] = useState<boolean>(false);

  const handleViewportModeChange = (mode: 'desktop' | 'telegram_pc') => {
    setViewportMode(mode);
    try {
      localStorage.setItem('dojo_viewport_mode', mode);
    } catch (e) {
      console.warn('Failed to save viewport mode preference:', e);
    }
  };

  // Target FPS State (30 vs 60 FPS)
  const [targetFps, setTargetFps] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dojo_target_fps');
      return saved ? parseInt(saved, 10) : 60;
    } catch {
      return 60;
    }
  });

  const handleTargetFpsChange = (fps: number) => {
    setTargetFps(fps);
    try {
      localStorage.setItem('dojo_target_fps', fps.toString());
    } catch (e) {
      console.warn('Failed to save target FPS preference:', e);
    }
  };

  // Active Live Statistics
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    fliesCaught: 0,
    totalAttempts: 0,
    accuracy: 100,
    combo: 0,
    maxCombo: 0,
    gameTimeRemaining: 60,
    fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0, wasp: 0 },
    level: 1,
    dumplingsLeft: 5,
    dumplingsEatenThisLevel: 0,
    sipNeeded: false,
  });

  // Historical High Scores (Loaded from localStorage)
  const [arcadeHighScore, setArcadeHighScore] = useState(0);
  const [trainingHighScore, setTrainingHighScore] = useState(0);
  const [rhythmHighScore, setRhythmHighScore] = useState(0);
  const [lifetimeCaught, setLifetimeCaught] = useState(0);
  const [lifetimeMaxCombo, setLifetimeMaxCombo] = useState(0);

  // Ninja Surprise State
  const ninjaOverlayRef = useRef<NinjaOverlayHandle>(null);
  const [showNinjaModal, setShowNinjaModal] = useState(false);
  const lastNinjaClick = useRef(0);

  const handleNinjaSurpriseClick = () => {
    const now = Date.now();
    if (now - lastNinjaClick.current < 300) return; // Debounce
    lastNinjaClick.current = now;
    
    audio.playNinjaButtonPress();
    setTimeout(() => {
      audio.playNinjaSmokeBomb();
      ninjaOverlayRef.current?.triggerSurprise();
    }, 200);
  };

  // Load Highscores on Mount
  useEffect(() => {
    try {
      const storedArcadeScore = localStorage.getItem('chop_arcade_score');
      if (storedArcadeScore) setArcadeHighScore(parseInt(storedArcadeScore, 10));

      const storedTrainingScore = localStorage.getItem('chop_training_score');
      if (storedTrainingScore) setTrainingHighScore(parseInt(storedTrainingScore, 10));

      const storedLifetime = localStorage.getItem('chop_lifetime_caught');
      if (storedLifetime) setLifetimeCaught(parseInt(storedLifetime, 10));

      const storedMaxCombo = localStorage.getItem('chop_max_combo');
      if (storedMaxCombo) setLifetimeMaxCombo(parseInt(storedMaxCombo, 10));
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
  }, []);

  // Defensive Telegram Mini App Initialization & Viewport Listener
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        
        // 1. Expand to max viewport height
        tg.expand();

        // 2. Request native Telegram Fullscreen (if supported by client)
        if (typeof tg.requestFullscreen === 'function') {
          try {
            tg.requestFullscreen();
          } catch (e) {
            console.warn('requestFullscreen on Telegram load:', e);
          }
        }

        // 3. Enable viewport change listener
        tg.onEvent('viewportChanged', () => {
          console.log(`Telegram viewportChanged: height=${tg.viewportHeight}, isExpanded=${tg.isExpanded}`);
          if (typeof (window as any).onResize === 'function') {
            (window as any).onResize();
          }
          window.dispatchEvent(new Event('resize'));
        });

        if (tg.setHeaderColor) tg.setHeaderColor('#1a1a1a');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');

        // 4. Diagnostic Console Logging
        console.log('--- Telegram WebApp SDK Status ---');
        console.log('Telegram WebApp Status: Initialized');
        console.log(`Platform Detected: ${tg.platform}`);
        console.log(`Viewport Height: ${tg.viewportHeight}`);
        console.log(`Is Expanded: ${tg.isExpanded}`);
      } else {
        console.log('--- Telegram WebApp SDK Status ---');
        console.log('Telegram WebApp Status: Standalone Browser Mode (No Telegram WebApp SDK context)');
      }
    } catch (e) {
      console.warn('Telegram WebApp initialization skipped:', e);
    }
  }, []);

  // Update Volumes in global procedural synthesizer
  useEffect(() => {
    audio.setSoundEnabled(soundEnabled);
    audio.setVolumes(masterVol, musicVol, sfxVol);
  }, [masterVol, musicVol, sfxVol, soundEnabled]);

  // Handle music play in Zen/Arcade modes
  useEffect(() => {
    if (gameState === 'playing' && soundEnabled) {
      audio.startZenFluteMelody();
    } else {
      audio.stopZenFluteMelody();
    }
    return () => {
      audio.stopZenFluteMelody();
    };
  }, [gameState, soundEnabled]);

  // Global Audio Unlock Listener on user's first click or tap
  useEffect(() => {
    const handleFirstInteraction = () => {
      audio.resume();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Handle background music on the main menu screen ('Fly By Me')
  useEffect(() => {
    if (gameState === 'menu' && soundEnabled) {
      audio.playMenuMusic();
    } else {
      audio.stopMenuMusic();
    }
    return () => {
      audio.stopMenuMusic();
    };
  }, [gameState, soundEnabled]);

  // Start the Game
  const handleStartGame = (mode: GameMode) => {
    audio.resume();
    
    // Request Telegram Mini App max screen expansion on user interaction
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.expand();
        if (typeof tg.requestFullscreen === 'function') {
          tg.requestFullscreen();
        }
      }
    } catch (e) {}

    setGameMode(mode);
    setIsPlaytestMode(false);
    setGameState('playing');
    // Reset stats
    setStats({
      score: 0,
      fliesCaught: 0,
      totalAttempts: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      gameTimeRemaining: 0,
      fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0, wasp: 0 },
      level: 1,
      dumplingsLeft: 5,
      dumplingsEatenThisLevel: 0,
      sipNeeded: false,
    });
  };

  const handleStartPlaytestSession = () => {
    setIsPlaytestMode(true);
    setGameMode('arcade');
    setGameState('playing');
    setStats({
      score: 0,
      fliesCaught: 0,
      totalAttempts: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      gameTimeRemaining: 180,
      fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0, wasp: 0 },
      level: 1,
      dumplingsLeft: 5,
      dumplingsEatenThisLevel: 0,
      sipNeeded: false,
    });
  };

  const handlePlaytestComplete = (log: PlaytestLog) => {
    setPlaytestLog(log);
    setShowPlaytestModal(true);
    setGameState('menu');
    setIsPlaytestMode(false);
  };

  // Exit/End the game session
  const handleGameEnd = (finalStats: GameStats) => {
    setGameState('gameover');
    setStats(finalStats);

    // Save/Update records
    try {
      if (gameMode === 'arcade') {
        if (finalStats.score > arcadeHighScore) {
          setArcadeHighScore(finalStats.score);
          localStorage.setItem('chop_arcade_score', finalStats.score.toString());
        }
      } else if (gameMode === 'training') {
        if (finalStats.score > trainingHighScore) {
          setTrainingHighScore(finalStats.score);
          localStorage.setItem('chop_training_score', finalStats.score.toString());
        }
      } else if (gameMode === 'rhythm') {
        if (finalStats.score > rhythmHighScore) {
          setRhythmHighScore(finalStats.score);
          localStorage.setItem('chop_rhythm_score', finalStats.score.toString());
        }
      }

      const newLifetime = lifetimeCaught + finalStats.fliesCaught;
      setLifetimeCaught(newLifetime);
      localStorage.setItem('chop_lifetime_caught', newLifetime.toString());

      if (finalStats.maxCombo > lifetimeMaxCombo) {
        setLifetimeMaxCombo(finalStats.maxCombo);
        localStorage.setItem('chop_max_combo', finalStats.maxCombo.toString());
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  const handleResetHighscores = () => {
    try {
      localStorage.removeItem('chop_arcade_score');
      localStorage.removeItem('chop_training_score');
      localStorage.removeItem('chop_lifetime_caught');
      localStorage.removeItem('chop_max_combo');
      setArcadeHighScore(0);
      setTrainingHighScore(0);
      setLifetimeCaught(0);
      setLifetimeMaxCombo(0);
    } catch (e) {
      console.error(e);
    }
  };

  // Obtain Rank String based on performance
  const evaluateRank = (score: number) => {
    if (score >= 8000) return { rank: 'Zen Chopstick Master', color: 'text-amber-600', desc: 'Flies bow to your infinite speed and gentle care.' };
    if (score >= 5000) return { rank: 'Compassionate Guardian', color: 'text-indigo-600', desc: 'A guardian of balance. Your safe transport of life is legendary.' };
    if (score >= 2500) return { rank: 'Grasshopper Adept', color: 'text-emerald-700', desc: 'Incredible speed. You gently guide all creatures to freedom.' };
    if (score >= 1000) return { rank: 'Dojo Disciple', color: 'text-neutral-700', desc: 'Promising results. Your chopsticks act as gentle gates to nature.' };
    return { rank: 'Chopstick Apprentice', color: 'text-neutral-500', desc: 'Focus your mind, young apprentice. The fly is quick, but the window is open.' };
  };

  const currentChopstick = CHOPSTICK_STYLES.find((s) => s.id === selectedChopstickId) || CHOPSTICK_STYLES[0];

  const appCoreContent = (
    <div className={`relative w-full h-full flex flex-col font-sans select-none bg-brand-linen ${viewportMode === 'desktop' ? 'border-8 md:border-[20px] border-brand-charcoal' : 'border-0'}`}>
      {/* Woodblock Frame Art Accents */}
      {/* 1. Dojo Ambiance Canvas Background */}
      <DojoBackground showBlossoms={true} windSpeed={gameState === 'playing' ? 1.4 : 0.8} targetFps={targetFps} />

      {/* Vertical Brand Watermark */}
      <div className={`${viewportMode === 'telegram_pc' ? 'hidden' : 'hidden xl:block'} absolute left-10 top-1/2 -translate-y-1/2 select-none pointer-events-none text-brand-charcoal/[0.04] font-serif font-black tracking-widest text-8xl uppercase [writing-mode:vertical-rl] [text-orientation:mixed] z-0`}>
        CHOPSTICK MASTER
      </div>

      {/* Red Calligraphy Seal Stamp (Positioned relative to header in Telegram PC mode) */}
      {viewportMode !== 'telegram_pc' && (
        <div className="absolute top-6 left-6 w-12 h-12 text-xl z-20 border-2 border-brand-red border-dashed rounded-none flex items-center justify-center font-serif font-extrabold text-brand-red rotate-[-12deg] select-none pointer-events-none shadow-xs">
          <span>禅</span>
        </div>
      )}

      {/* 2. Audio Ambiance toggle & Viewport Quick-toggle (Only shown in Full Desktop mode when in menu) */}
      {viewportMode === 'desktop' && gameState === 'menu' && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <button
            onClick={() => handleViewportModeChange('telegram_pc')}
            id="viewport-quick-toggle"
            className="p-2.5 rounded-none bg-brand-ivory hover:bg-brand-linen border-2 border-brand-charcoal text-brand-charcoal hover:shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 cursor-pointer shadow-none flex items-center gap-1 text-xs font-serif font-bold"
            title="Switch to Telegram PC Mode (370×574)"
          >
            <Smartphone className="w-4 h-4 text-brand-red" />
          </button>

          <button
            onClick={toggleSound}
            id="audio-quick-toggle"
            className="p-2.5 rounded-none bg-brand-ivory hover:bg-brand-linen border-2 border-brand-charcoal text-brand-charcoal hover:shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 cursor-pointer shadow-none"
            title={soundEnabled ? 'Silence Sounds' : 'Enable Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-brand-red" />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            id="settings-quick-toggle"
            className="p-2.5 rounded-none bg-brand-ivory hover:bg-brand-linen border-2 border-brand-charcoal text-brand-charcoal hover:shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 cursor-pointer shadow-none"
            title="Dojo Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleNinjaSurpriseClick}
            id="ninja-surprise-btn"
            className="p-2.5 rounded-none bg-purple-950 hover:bg-purple-900 border-2 border-brand-charcoal text-amber-300 hover:shadow-[3px_3px_0px_0px_#6B21A8] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 cursor-pointer flex items-center gap-1"
            title="🥷 Summon Ninja Surprise"
          >
            <span className="text-sm leading-none">🥷</span>
          </button>
        </div>
      )}

      <NinjaOverlayCanvas 
        ref={ninjaOverlayRef} 
        onSequenceComplete={() => setShowNinjaModal(true)} 
      />
      {showNinjaModal && (
        <NinjaSurpriseModal 
          onClose={() => setShowNinjaModal(false)}
          onAcceptChallenge={() => {
            setShowNinjaModal(false);
            setGameState('playing');
          }}
        />
      )}

      {/* 3. SCREEN PORTALS */}
      <AnimatePresence mode="wait">
        {/* === SCREEN A: MENU === */}
        {gameState === 'menu' && (
          <motion.div
            key="menu-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-h-0 flex flex-col h-full z-10 select-none overflow-hidden relative"
          >
            {/* Scrollable Upper Content Body */}
            <div className={`flex-1 min-h-0 w-full overflow-y-auto scroll-touch ${viewportMode === 'telegram_pc' ? 'pt-3 pb-6 px-3' : 'pt-8 pb-12 px-4 md:p-8'} flex flex-col items-center justify-start`}>
              {/* Title Calligraphy Frame */}
              <div className={`text-center max-w-xl ${viewportMode === 'telegram_pc' ? 'mb-2 pt-1' : 'mb-6 md:mb-10'} z-10 relative`}>
              {viewportMode === 'telegram_pc' && (
                <div className="absolute -top-1 left-0 w-7 h-7 text-xs border border-brand-red border-dashed flex items-center justify-center font-serif font-extrabold text-brand-red rotate-[-12deg] select-none pointer-events-none">
                  <span>禅</span>
                </div>
              )}
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-brand-red font-mono font-bold block mb-0.5">
                🥢 Zen Training Dojo 🥢
              </span>
              <h1 className={`${viewportMode === 'telegram_pc' ? 'text-xl' : 'text-4xl md:text-5xl'} font-serif font-black text-brand-charcoal tracking-tight leading-none`}>
                Chopstick Fly Catcher
              </h1>
              {/* Active Build & Last Updated Timestamp Indicator */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/90 border-2 border-amber-700 rounded-full text-amber-950 font-mono text-[10px] sm:text-xs font-bold tracking-tight shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <span>BUILD {APP_VERSION}: {BUILD_INFO.features}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 border-2 border-emerald-700 rounded-full text-emerald-950 font-mono text-[10px] sm:text-xs font-bold tracking-tight shadow-sm">
                  <span>🕒 UPDATED: {LAST_UPDATE_TIMESTAMP}</span>
                </div>
              </div>
              <p className={`${viewportMode === 'telegram_pc' ? 'text-[10px]' : 'text-[11px] md:text-sm'} text-brand-charcoal/80 mt-1.5 max-w-md mx-auto italic font-serif`}>
                "Concentration is the path to speed. Control your chopsticks, control your destiny."
              </p>
              <div className="mt-1.5 text-[10px] sm:text-xs font-mono font-bold text-brand-charcoal/70 bg-brand-ivory/60 px-3 py-0.5 border border-brand-charcoal/20 inline-block shadow-sm">
                Device Clock: {currentTime.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className={`w-16 h-0.5 bg-brand-charcoal mx-auto ${viewportMode === 'telegram_pc' ? 'mt-1.5' : 'mt-2.5'}`}></div>
            </div>

            {/* Main Menu Grid */}
            <div className={`w-full ${viewportMode === 'telegram_pc' ? 'max-w-xs flex flex-col gap-4' : 'max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6'} items-stretch z-10`}>
              {/* Left Column: Mode Selection */}
              <div className="lg:col-span-7 bg-brand-ivory border-3 border-brand-charcoal rounded-none p-4 md:p-6 flex flex-col justify-between shadow-[6px_6px_0px_0px_#1A1A1A]">
                <div className="space-y-4">
                  <h2 className="font-serif font-black text-xl text-brand-charcoal flex items-center gap-2">
                    <Target className="w-5 h-5 text-brand-red" /> The Master's Feast
                  </h2>

                  <div className="space-y-3">
                    {/* Unified Main Game Button */}
                    <button
                      onClick={() => handleStartGame('training')}
                      id="play-feast-btn"
                      className={`w-full text-left ${viewportMode === 'telegram_pc' ? 'p-3' : 'p-4 md:p-5'} rounded-none border-3 border-brand-charcoal bg-white hover:bg-brand-linen hover:shadow-[5px_5px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer group flex flex-col gap-2`}
                    >
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span className={`font-serif font-black ${viewportMode === 'telegram_pc' ? 'text-sm' : 'text-base md:text-lg'} text-brand-charcoal group-hover:text-brand-red flex items-center gap-1.5 transition-colors`}>
                          Enter Dumpling Feast 🥟🍵
                        </span>
                        <span className={`${viewportMode === 'telegram_pc' ? 'p-2' : 'p-2.5 md:p-3'} border-2 border-brand-charcoal rounded-none bg-brand-red text-white group-hover:bg-brand-charcoal transition-colors flex-shrink-0 flex items-center justify-center`}>
                          <Play className="w-4 h-4 fill-current" />
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-charcoal/80 leading-snug font-sans border-t border-brand-charcoal/15 pt-1.5">
                        A Zen Focus Exercise: Feed the Master dumplings and sip Matcha tea! Keep flies off food.
                      </p>
                      <div className="w-full py-2.5 bg-brand-red text-white border-2 border-brand-charcoal font-serif font-black text-xs md:text-sm text-center tracking-wider uppercase group-hover:bg-brand-charcoal transition-colors shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center justify-center gap-2">
                        <Play className="w-4 h-4 fill-current" /> Start Game Now
                      </div>
                    </button>

                    {/* Team Hub Button */}
                    <button
                      onClick={() => setGameState('team_hub')}
                      id="team-hub-btn"
                      className={`w-full text-left p-3 rounded-none border-3 border-brand-charcoal bg-white hover:bg-brand-ivory hover:shadow-[5px_5px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer group flex items-center justify-between gap-2`}
                    >
                      <span className="font-serif font-black text-brand-charcoal group-hover:text-brand-red flex items-center gap-2 transition-colors text-xs md:text-sm">
                        🧑‍💻 View Team Hub
                      </span>
                      <span className="p-1.5 border-2 border-brand-charcoal rounded-none bg-brand-charcoal text-white transition-colors flex-shrink-0 flex items-center justify-center">
                        <Target className="w-4 h-4 fill-current" />
                      </span>
                    </button>

                    {/* Be the Fly Mode Dev Button */}
                    <button
                      onClick={() => setGameState('be_the_fly')}
                      id="be-the-fly-btn"
                      className={`w-full text-left p-3 rounded-none border-3 border-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:shadow-[5px_5px_0px_0px_#065F46] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer group flex items-center justify-between gap-2`}
                    >
                      <span className="font-serif font-black text-emerald-950 group-hover:text-emerald-700 flex items-center gap-2 transition-colors text-xs md:text-sm uppercase tracking-wider">
                        🪰 Launch "Be the Fly" Mode
                      </span>
                      <span className="p-1.5 border-2 border-emerald-950 rounded-none bg-emerald-500 text-white font-mono font-bold text-xs animate-pulse">
                        NEW FLY POV 🪰
                      </span>
                    </button>
                  </div>

                  {/* Control Group 1: Viewport Target */}
                  <div className="bg-brand-linen border-2 border-brand-charcoal p-3 rounded-none space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-black text-xs text-brand-charcoal uppercase tracking-wider flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-brand-red" /> Viewport Target
                      </span>
                      <span className="text-[10px] font-mono bg-brand-ivory border border-brand-charcoal px-1.5 py-0.5 text-brand-charcoal font-bold">
                        {viewportMode === 'telegram_pc' ? '370 × 574 px' : 'Full Screen'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleViewportModeChange('desktop')}
                        id="viewport-desktop-btn"
                        className={`p-2 border-2 border-brand-charcoal text-xs font-serif font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          viewportMode === 'desktop'
                            ? 'bg-brand-red text-white shadow-[2px_2px_0px_0px_#1A1A1A]'
                            : 'bg-white text-brand-charcoal hover:bg-brand-ivory'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" /> Full Desktop
                      </button>

                      <button
                        onClick={() => handleViewportModeChange('telegram_pc')}
                        id="viewport-telegram-btn"
                        className={`p-2 border-2 border-brand-charcoal text-xs font-serif font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          viewportMode === 'telegram_pc'
                            ? 'bg-brand-red text-white shadow-[2px_2px_0px_0px_#1A1A1A]'
                            : 'bg-white text-brand-charcoal hover:bg-brand-ivory'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" /> Telegram PC
                      </button>
                    </div>

                    {/* Control Group 2: Framerate Target Sub-Option */}
                    <div className="pt-2 flex items-center justify-between border-t border-brand-charcoal/20">
                      <span className="font-serif font-black text-xs text-brand-charcoal uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-red" /> Framerate Target Sub-Option
                      </span>
                      <span className="text-[10px] font-mono bg-brand-ivory border border-brand-charcoal px-1.5 py-0.5 text-brand-charcoal font-bold">
                        {targetFps === 30 ? '33.3ms / frame' : targetFps === 144 ? '6.9ms / frame' : '16.6ms / frame'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[30, 60, 144].map((fps) => (
                        <button
                          key={fps}
                          onClick={() => handleTargetFpsChange(fps)}
                          id={`fps-target-${fps}-btn`}
                          className={`p-1.5 border-2 border-brand-charcoal text-xs font-serif font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            targetFps === fps
                              ? 'bg-brand-charcoal text-white shadow-[2px_2px_0px_0px_#1A1A1A]'
                              : 'bg-white text-brand-charcoal hover:bg-brand-ivory'
                          }`}
                        >
                          <span>{fps} FPS</span>
                          {fps === 30 && (
                            <span className={`text-[9px] font-mono font-black px-1 py-0.2 border ${
                              targetFps === 30
                                ? 'bg-amber-400 text-brand-charcoal border-amber-400'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              LOW
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input Mode Toggle (Simulate Touchscreen on PC) */}
                  <div className="bg-brand-ivory border-2 border-brand-charcoal p-3 rounded-none flex items-center justify-between">
                    <span className="font-serif font-black text-xs text-brand-charcoal flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-brand-red" /> Input Mode
                    </span>
                    <div className="flex border-2 border-brand-charcoal text-[10px] font-mono font-bold uppercase cursor-pointer select-none">
                      <div 
                        onClick={() => setSimulateTouch(false)}
                        className={`px-2 py-1 transition-colors ${!simulateTouch ? 'bg-brand-charcoal text-white' : 'bg-white text-brand-charcoal hover:bg-brand-linen'}`}
                      >
                        PC Mouse 🖱️
                      </div>
                      <div 
                        onClick={() => setSimulateTouch(true)}
                        className={`px-2 py-1 transition-colors border-l-2 border-brand-charcoal ${simulateTouch ? 'bg-brand-red text-white' : 'bg-white text-brand-charcoal hover:bg-brand-linen'}`}
                      >
                        Simulated Touch 📱
                      </div>
                    </div>
                  </div>

                  {/* Sid & Scott Telemetry Playtest Launcher */}
                  <button
                    onClick={handleStartPlaytestSession}
                    id="start-playtest-btn"
                    className="w-full p-3 bg-brand-charcoal hover:bg-brand-red text-white border-2 border-brand-charcoal font-serif font-black text-xs md:text-sm tracking-wider uppercase transition-all duration-150 shadow-[3px_3px_0px_0px_#C83232] cursor-pointer flex items-center justify-center gap-2 group"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                    <span>🧪 Start 3-Min Playtest Session (Sid & Scott Log)</span>
                  </button>

                  {/* Dev Mode: osu! Rhythm Mode Launcher Button */}
                  <button
                    onClick={() => handleStartGame('rhythm')}
                    id="start-rhythm-mode-dev-btn"
                    className="w-full p-3 bg-purple-700 hover:bg-purple-800 text-white border-2 border-brand-charcoal font-serif font-black text-xs md:text-sm tracking-wider uppercase transition-all duration-150 shadow-[3px_3px_0px_0px_#1A1A1A] cursor-pointer flex items-center justify-center gap-2 group mb-3"
                  >
                    <Target className="w-4 h-4 text-pink-300 group-hover:scale-110 transition-transform" />
                    <span>🎯 Launch osu! Rhythm Mode (Dev Mode)</span>
                  </button>

                  {/* Ninja Surprise Easter Egg (Luna's Design) */}
                  <button
                    onClick={handleNinjaSurpriseClick}
                    id="ninja-surprise-easter-egg-btn"
                    data-testid="ninja-surprise-btn"
                    className="w-full p-3.5 bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 hover:from-purple-900 hover:via-purple-800 hover:to-indigo-900 text-white border-3 border-brand-charcoal font-serif font-black text-xs md:text-sm tracking-wider uppercase transition-all duration-150 shadow-[4px_4px_0px_0px_#6B21A8] hover:shadow-[6px_6px_0px_0px_#9333EA] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-300 group-hover:rotate-180 transition-transform duration-500" />
                      <span>🥷 Unseal Shadow Kata</span>
                    </div>
                    <div className="w-8 h-8 text-xs border border-brand-red border-dashed flex items-center justify-center font-serif font-extrabold text-brand-red rotate-12 select-none pointer-events-none group-hover:scale-110 transition-transform">
                      忍
                    </div>
                  </button>


                  </div>
                </div>

                <div className="mt-4 pt-4 border-t-2 border-brand-charcoal flex justify-between items-center text-xs text-brand-charcoal font-bold font-serif">
                  <span>Difficulty: <strong className="capitalize underline decoration-brand-red decoration-2">{difficulty === 'easy' ? 'Novice' : difficulty === 'normal' ? 'Adept' : 'Master'}</strong></span>
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="flex items-center gap-1 hover:text-brand-red cursor-pointer underline decoration-brand-red decoration-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-brand-red" /> Read Scroll Guide
                  </button>
                </div>
              </div>

              {/* Right Column: Customization & Stats */}
              <div className="lg:col-span-5 flex flex-col gap-6 z-10">
                {/* Armory Quick Choose */}
                <div className="bg-brand-ivory border-3 border-brand-charcoal rounded-none p-5 shadow-[6px_6px_0px_0px_#1A1A1A] flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="font-serif font-black text-sm text-brand-charcoal uppercase tracking-wider border-b-2 border-brand-charcoal pb-1">
                      Active Armory
                    </h3>

                    {/* Active Chopstick Card */}
                    <div className="bg-white border-2 border-brand-charcoal p-3 rounded-none flex items-center gap-3">
                      <div className="w-12 h-12 rounded-none bg-brand-linen flex-shrink-0 flex items-center justify-center border-2 border-brand-charcoal">
                        {/* Fake chopsticks visual inside block */}
                        <div className="flex gap-1.5 rotate-45">
                          <div
                            className="w-1 h-10"
                            style={{ backgroundColor: currentChopstick.color1 }}
                          />
                          <div
                            className="w-1.5 h-10"
                            style={{ backgroundColor: currentChopstick.color1 }}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-serif font-black text-sm text-brand-charcoal">
                          {currentChopstick.name}
                        </h4>
                        <p className="text-[11px] text-brand-charcoal/80 leading-tight">
                          {currentChopstick.description}
                        </p>
                      </div>
                    </div>

                    {/* Grid list to change style instantly */}
                    <div className="grid grid-cols-2 gap-2">
                      {CHOPSTICK_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedChopstickId(style.id)}
                          className={`py-1.5 px-2 text-xs font-serif rounded-none border-2 text-center transition-all cursor-pointer ${
                            selectedChopstickId === style.id
                              ? 'bg-brand-charcoal text-white border-brand-charcoal font-bold shadow-none'
                              : 'bg-white text-brand-charcoal border-brand-charcoal hover:bg-brand-linen'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-brand-charcoal/60 italic text-center mt-3 font-serif">
                    Tip: Hitbox sizes dynamically scale based on selected difficulty settings.
                  </p>
                </div>

                {/* Cabinet / Highscores Dashboard */}
                <div className="bg-brand-charcoal border-3 border-brand-charcoal rounded-none p-5 shadow-[6px_6px_0px_0px_#1A1A1A] text-brand-linen flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="font-serif font-black text-xs uppercase tracking-widest text-brand-red flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-brand-red" /> Dojo Hall of Fame
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-black/35 p-2.5 rounded-none border-2 border-brand-red">
                        <span className="text-[10px] text-brand-red block font-mono font-bold tracking-wider">
                          ARCADE HIGHSCORE
                        </span>
                        <span className="font-serif font-black text-xl text-white">
                          {arcadeHighScore} <span className="text-xs font-normal text-brand-linen/70">pts</span>
                        </span>
                      </div>

                      <div className="bg-black/35 p-2.5 rounded-none border-2 border-brand-red">
                        <span className="text-[10px] text-brand-red block font-mono font-bold tracking-wider">
                          FEAST GUARD RECORD
                        </span>
                        <span className="font-serif font-black text-xl text-white">
                          {trainingHighScore} <span className="text-xs font-normal text-brand-linen/70">pts</span>
                        </span>
                      </div>

                      <div className="bg-black/35 p-2.5 rounded-none border-2 border-brand-red">
                        <span className="text-[10px] text-brand-red block font-mono font-bold tracking-wider">
                          LIFETIME RELEASED 🌸
                        </span>
                        <span className="font-serif font-black text-xl text-white">
                          {lifetimeCaught} <span className="text-xs font-normal text-brand-linen/70">released</span>
                        </span>
                      </div>

                      <div className="bg-black/35 p-2.5 rounded-none border-2 border-brand-red">
                        <span className="text-[10px] text-brand-red block font-mono font-bold tracking-wider">
                          MAX STREAK COMBO
                        </span>
                        <span className="font-serif font-black text-xl text-white">
                          {lifetimeMaxCombo} <span className="text-xs font-normal text-brand-linen/70">consec.</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <span className="text-[10px] text-white/40 font-mono">
                      Data stored locally
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Bottom Action Bar for Telegram & Mobile Viewports */}
            {viewportMode === 'telegram_pc' && (
              <div className="shrink-0 w-full bg-brand-ivory border-t-3 border-brand-charcoal p-3 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center">
                <button
                  onClick={() => handleStartGame('training')}
                  id="telegram-sticky-start-btn"
                  className="w-full py-3 px-4 bg-brand-red hover:bg-brand-charcoal text-white font-serif font-black text-sm uppercase tracking-wider border-2 border-brand-charcoal shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" /> Start Game Now 🥟
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* === SCREEN B: PLAYING ARENA === */}
        {gameState === 'playing' && (
          <motion.div
            key="playing-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-stretch justify-stretch z-10 select-none overflow-hidden relative"
          >
            {/* Minimal Overlay HUD for Gameplay */}
            <div className="flex absolute top-4 left-16 right-4 z-30 justify-between items-start pointer-events-none">
              <div className="flex gap-2">
                <div className="bg-white/90 backdrop-blur-sm border-2 border-brand-charcoal px-3 py-1 shadow-[2px_2px_0px_0px_#1A1A1A] pointer-events-auto flex items-center gap-1">
                  <span className="text-xs font-mono font-bold text-brand-charcoal/70 uppercase">Score:</span>
                  <span className="font-serif font-black text-xl text-brand-charcoal">{stats.score}</span>
                </div>
                {gameMode === 'arcade' && (
                  <div className="bg-brand-red/90 backdrop-blur-sm border-2 border-brand-charcoal px-3 py-1 shadow-[2px_2px_0px_0px_#1A1A1A] pointer-events-auto">
                    <span className="font-mono font-bold text-white text-lg">{stats.gameTimeRemaining}s</span>
                  </div>
                )}
                {gameMode === 'training' && (
                  <div className="bg-brand-ivory/90 backdrop-blur-sm border-2 border-brand-charcoal px-2 py-1 shadow-[2px_2px_0px_0px_#1A1A1A] pointer-events-auto flex items-center">
                    <ShieldAlert className="w-4 h-4 text-brand-red mr-1" /> 
                    <span className="font-mono font-bold text-brand-red">Guard</span>
                  </div>
                )}
                {gameMode === 'rhythm' && (
                  <div className="bg-purple-600/90 backdrop-blur-sm border-2 border-brand-charcoal px-3 py-1 shadow-[2px_2px_0px_0px_#1A1A1A] pointer-events-auto flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-pink-300 animate-pulse" />
                    <span className="font-mono font-bold text-white text-sm">osu! Combo: {stats.combo}x</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 pointer-events-auto">
                <div className="flex bg-white border-2 border-brand-charcoal">
                  {[30, 60, 144].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => handleTargetFpsChange(fps)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold border-r last:border-r-0 border-brand-charcoal cursor-pointer ${
                        targetFps === fps ? 'bg-brand-charcoal text-white' : 'hover:bg-brand-linen text-brand-charcoal'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (confirm('Return to Dojo Menu? Your active score will be lost.')) {
                      setGameState('menu');
                      audio.clearAllBuzzers();
                    }
                  }}
                  className="px-3 py-1 bg-white/90 hover:bg-brand-linen border-2 border-brand-charcoal font-serif font-black shadow-[2px_2px_0px_0px_#1A1A1A] text-sm text-brand-charcoal cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Main Interactive High FPS Game Canvas Stage */}
            <div className="flex-1 relative bg-transparent overflow-hidden shadow-inner">
              <GameCanvas
                ref={gameCanvasRef}
                isPlaying={gameState === 'playing'}
                isPaused={isBeTheFlyOverlayActive}
                gameMode={gameMode}
                difficulty={difficulty}
                chopstickStyleId={selectedChopstickId}
                showHelper={showHelper}
                soundEnabled={soundEnabled}
                layoutMode={layoutMode}
                simulateTouch={simulateTouch}
                targetFps={targetFps}
                isPlaytestMode={isPlaytestMode}
                onPlaytestComplete={handlePlaytestComplete}
                onGameEnd={handleGameEnd}
                onStatsUpdate={setStats}
                onTriggerBeTheFly={() => setIsBeTheFlyOverlayActive(true)}
              />
              {isBeTheFlyOverlayActive && (
                <div className="absolute inset-0 z-50">
                  <BeTheFlyCanvas
                    soundEnabled={soundEnabled}
                    targetFps={targetFps}
                    onExit={() => {
                      setIsBeTheFlyOverlayActive(false);
                      gameCanvasRef.current?.advanceLevelFromBonus(0, false);
                    }}
                    onComplete={(finalStats) => {
                      setIsBeTheFlyOverlayActive(false);
                      const bonus = finalStats.won ? 5000 + finalStats.score : finalStats.score;
                      gameCanvasRef.current?.advanceLevelFromBonus(bonus, !!finalStats.won);
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* === SCREEN C: GAMEOVER SUMMARY === */}
        {gameState === 'gameover' && (
          <motion.div
            key="gameover-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-start md:justify-center pt-8 pb-12 px-4 md:p-8 z-10 overflow-y-auto"
          >
            <div className="w-full max-w-md bg-brand-ivory border-3 border-brand-charcoal rounded-none shadow-[8px_8px_0px_0px_#1A1A1A] p-6 md:p-8 text-brand-charcoal z-10">
              {/* Badge Emblem Header */}
              <div className="text-center mb-6">
                <span className="text-xs uppercase tracking-widest text-brand-red font-mono font-bold block mb-1">
                  Training Concluded
                </span>
                <h2 className="text-3xl font-serif text-brand-charcoal font-black tracking-tight">
                  Dojo Scorecard
                </h2>
                <div className="w-20 h-1 bg-brand-charcoal mx-auto mt-3"></div>
              </div>

              {/* Core Results Block */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-brand-charcoal rounded-none p-4 text-center shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)]">
                  <span className="text-xs uppercase text-brand-charcoal/60 block font-mono font-bold">
                    FINAL SCORE
                  </span>
                  <span className="font-serif font-black text-4xl text-brand-red">
                    {stats.score}
                  </span>

                  {/* Highscore congratulation badge */}
                  {gameMode === 'arcade' && stats.score >= arcadeHighScore && stats.score > 0 && (
                    <div className="mt-2 flex justify-center items-center gap-1 text-brand-red text-xs font-serif font-black tracking-wider uppercase">
                      <Sparkles className="w-4 h-4 text-brand-red animate-spin-slow" /> NEW DOJO RECORD!
                    </div>
                  )}
                  {gameMode === 'training' && stats.score >= trainingHighScore && stats.score > 0 && (
                    <div className="mt-2 flex justify-center items-center gap-1 text-brand-red text-xs font-serif font-black tracking-wider uppercase">
                      <Sparkles className="w-4 h-4 text-brand-red animate-spin-slow" /> NEW FEAST DEFENSE RECORD!
                    </div>
                  )}
                </div>

                {/* Score breakdown list */}
                <div className="bg-white border-2 border-brand-charcoal rounded-none p-4 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center text-brand-charcoal font-serif font-bold">
                    <span>Safely Released:</span>
                    <span className="font-mono font-black text-brand-charcoal">
                      {stats.fliesCaught}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-brand-charcoal font-serif font-bold">
                    <span>Pinch Accuracy:</span>
                    <span className="font-mono font-black text-brand-charcoal">
                      {stats.accuracy}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-brand-charcoal font-serif font-bold">
                    <span>Max Streak Combo:</span>
                    <span className="font-mono font-black text-brand-charcoal">
                      {stats.maxCombo}
                    </span>
                  </div>

                  <div className="pt-2 border-t-2 border-brand-charcoal text-[11px] text-brand-charcoal/80 space-y-1">
                    <span className="font-mono uppercase block text-[9px] font-bold text-brand-charcoal/60">
                      Species Release Breakdown:
                    </span>
                    <div className="grid grid-cols-2 gap-y-1 text-brand-charcoal font-serif font-medium">
                      <span>Housefly: {stats.fliesTypeCount.housefly}</span>
                      <span>Bluebottle: {stats.fliesTypeCount.bluebottle}</span>
                      <span>Fruitfly: {stats.fliesTypeCount.fruitfly}</span>
                      <span className="text-brand-red font-black">Golden: {stats.fliesTypeCount.golden}</span>
                      <span className="text-purple-600 font-black">Ninja: {stats.fliesTypeCount.ninja}</span>
                    </div>
                  </div>
                </div>

                {/* Miyagi Master Judgement / Evaluation Rank */}
                <div className="bg-brand-linen border-2 border-brand-charcoal rounded-none p-3 text-center">
                  <span className="text-[10px] text-brand-charcoal/60 font-mono font-bold block mb-0.5 uppercase tracking-wider">
                    Master's Evaluation Rank
                  </span>
                  <h4 className={`font-serif font-black text-lg ${evaluateRank(stats.score).color.includes('amber') ? 'text-brand-red' : evaluateRank(stats.score).color}`}>
                    {evaluateRank(stats.score).rank}
                  </h4>
                  <p className="text-xs text-brand-charcoal/80 italic mt-1 font-serif leading-relaxed">
                    "{evaluateRank(stats.score).desc}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleStartGame(gameMode)}
                  id="restart-training-btn"
                  className="py-3 px-4 bg-brand-red hover:bg-brand-red/90 text-white font-serif font-black rounded-none border-2 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer text-sm flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>

                <button
                  onClick={() => setGameState('menu')}
                  id="gameover-back-menu-btn"
                  className="py-3 px-4 bg-white hover:bg-brand-linen text-brand-charcoal font-serif font-black rounded-none border-2 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer text-sm flex items-center justify-center"
                >
                  Dojo Menu
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* === SCREEN D: TEAM HUB === */}
        {gameState === 'team_hub' && (
          <TeamHub onClose={() => setGameState('menu')} />
        )}

        {/* === SCREEN E: BE THE FLY MODE === */}
        {gameState === 'be_the_fly' && (
          <BeTheFlyCanvas
            soundEnabled={soundEnabled}
            targetFps={targetFps}
            onExit={() => setGameState('menu')}
            onComplete={(finalStats) => {
              setStats({
                score: finalStats.score,
                fliesCaught: 0,
                totalAttempts: 0,
                accuracy: 100,
                combo: 0,
                maxCombo: 0,
                gameTimeRemaining: finalStats.timeSurvived,
                fliesTypeCount: { housefly: 1, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0, wasp: 0 },
                level: 1,
                dumplingsLeft: 5 - finalStats.dumplingsEaten,
                dumplingsEatenThisLevel: finalStats.dumplingsEaten,
                sipNeeded: false,
              });
              setGameState('gameover');
            }}
          />
        )}
      </AnimatePresence>

      {/* Persistent UI Overlays */}
      <AnimatePresence>
        {/* Tutorial / Help Dialog */}
        {showTutorial && <HowToPlay onClose={() => setShowTutorial(false)} />}

        {/* Configuration settings modal */}
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            masterVol={masterVol}
            setMasterVol={setMasterVol}
            musicVol={musicVol}
            setMusicVol={setMusicVol}
            sfxVol={sfxVol}
            setSfxVol={setSfxVol}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            selectedChopstickId={selectedChopstickId}
            setSelectedChopstickId={setSelectedChopstickId}
            showHelper={showHelper}
            setShowHelper={setShowHelper}
            onResetHighscores={handleResetHighscores}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
          />
        )}

        {/* Sid & Scott Playtest Completion Modal */}
        {showPlaytestModal && playtestLog && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-brand-ivory border-3 border-brand-charcoal p-6 shadow-[8px_8px_0px_0px_#1A1A1A] space-y-4"
            >
              <div className="text-center space-y-1">
                <span className="inline-block px-3 py-1 bg-brand-red text-white font-mono font-bold text-xs uppercase tracking-widest border border-brand-charcoal">
                  🧪 3-Min Playtest Concluded
                </span>
                <h2 className="text-2xl font-serif font-black text-brand-charcoal">
                  Playtest Telemetry Logged!
                </h2>
                <p className="text-xs text-brand-charcoal/80 font-serif italic">
                  We've gathered full metrics for Sid (Game Designer) & Scott to analyze!
                </p>
              </div>

              {/* Status Badge */}
              <div className="bg-emerald-100 border-2 border-emerald-800 text-emerald-900 p-3 flex items-center gap-2 text-xs font-bold font-mono">
                <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span>✅ Log saved to window.__LAST_PLAYTEST_LOG__ & localStorage!</span>
              </div>

              {/* Stats Summary Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-white border-2 border-brand-charcoal p-2.5">
                  <span className="text-[10px] text-brand-charcoal/60 uppercase block">Total Catches</span>
                  <span className="text-base font-black text-brand-red">{playtestLog.successfulCatches} flies</span>
                </div>
                <div className="bg-white border-2 border-brand-charcoal p-2.5">
                  <span className="text-[10px] text-brand-charcoal/60 uppercase block">Pinches / Misses</span>
                  <span className="text-base font-black text-brand-charcoal">{playtestLog.totalPinches} / {playtestLog.missedAttempts}</span>
                </div>
                <div className="bg-white border-2 border-brand-charcoal p-2.5">
                  <span className="text-[10px] text-brand-charcoal/60 uppercase block">Accuracy Rate</span>
                  <span className="text-base font-black text-emerald-700">{playtestLog.accuracyPercentage}%</span>
                </div>
                <div className="bg-white border-2 border-brand-charcoal p-2.5">
                  <span className="text-[10px] text-brand-charcoal/60 uppercase block">Max Combo Streak</span>
                  <span className="text-base font-black text-purple-700">{playtestLog.maxCombo}x</span>
                </div>
              </div>

              {/* Catches Breakdown */}
              <div className="bg-brand-linen border-2 border-brand-charcoal p-3 text-xs space-y-1 font-serif">
                <span className="font-black text-brand-charcoal block uppercase text-[10px] tracking-wider">Species Caught Breakdown:</span>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>🍎 Fruitfly: <strong>{playtestLog.catchesByType.fruitfly || 0}</strong></span>
                  <span>🏠 Housefly: <strong>{playtestLog.catchesByType.housefly || 0}</strong></span>
                  <span>🪰 Bluebottle: <strong>{playtestLog.catchesByType.bluebottle || 0}</strong></span>
                  <span>🥷 Ninja: <strong>{playtestLog.catchesByType.ninja || 0}</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playtestLog, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `playtest_telemetry_${Date.now()}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="w-full py-2.5 bg-brand-red hover:bg-brand-charcoal text-white font-serif font-black text-xs tracking-wider uppercase border-2 border-brand-charcoal shadow-[2px_2px_0px_0px_#1A1A1A] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  📥 Download Playtest JSON File
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(playtestLog, null, 2));
                    alert('Copied Telemetry JSON to clipboard!');
                  }}
                  className="w-full py-2 bg-white hover:bg-brand-linen text-brand-charcoal font-serif font-bold text-xs border-2 border-brand-charcoal transition-colors cursor-pointer"
                >
                  📋 Copy JSON to Clipboard
                </button>
                <button
                  onClick={() => setShowPlaytestModal(false)}
                  className="w-full py-2 bg-brand-charcoal text-brand-linen font-serif font-bold text-xs border-2 border-brand-charcoal transition-colors cursor-pointer"
                >
                  🎮 Return to Dojo Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (viewportMode === 'telegram_pc') {
    return (
      <div className="w-screen h-screen bg-neutral-900 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative font-sans select-none">
        {/* Background Ambiance */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-neutral-950" />

        {/* Simulated Telegram PC Frame Container (370px x 574px) */}
        <div className="relative w-[370px] h-[574px] bg-brand-linen border-4 border-brand-charcoal shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden rounded-md z-10">
          {/* Telegram PC Frame Header */}
          <div className="bg-brand-charcoal text-brand-linen px-3 py-1.5 flex items-center justify-between text-xs font-serif font-bold flex-shrink-0 z-50">
            <span className="flex items-center gap-1.5 text-[11px] font-mono tracking-tight text-white">
              <Smartphone className="w-3.5 h-3.5 text-brand-red" /> Telegram Mini App (370×574)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-brand-red" />}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-1 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Dojo Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleViewportModeChange('desktop')}
                className="text-[10px] font-mono bg-brand-red hover:bg-brand-red/80 text-white px-2 py-0.5 rounded-none flex items-center gap-1 transition-all cursor-pointer ml-1"
                title="Switch to Full Desktop Mode"
              >
                <Monitor className="w-3 h-3" /> Full Desktop
              </button>
            </div>
          </div>

          {/* Inner Playable Canvas Container */}
          <div className="relative flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col">
            {appCoreContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-brand-linen flex flex-col font-sans select-none">
      {appCoreContent}
    </div>
  );
}
