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
  BookOpen,
  Volume2,
  VolumeX,
  Target,
  Clock,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

import { DojoBackground } from './components/DojoBackground';
import { GameCanvas } from './components/GameCanvas';
import { HowToPlay } from './components/HowToPlay';
import { SettingsModal, CHOPSTICK_STYLES } from './components/SettingsModal';
import { audio } from './utils/audio';
import { GameMode, GameStats, FlyType } from './types';

export default function App() {
  // Navigation & Screens
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('arcade');

  // Popups & Overlays
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings & Volumes
  const [masterVol, setMasterVol] = useState(0.5);
  const [musicVol, setMusicVol] = useState(0.3);
  const [sfxVol, setSfxVol] = useState(0.6);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [selectedChopstickId, setSelectedChopstickId] = useState('bamboo');
  const [showHelper, setShowHelper] = useState(true);

  // Active Live Statistics
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    fliesCaught: 0,
    totalAttempts: 0,
    accuracy: 100,
    combo: 0,
    maxCombo: 0,
    gameTimeRemaining: 60,
    fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0 },
  });

  // Historical High Scores (Loaded from localStorage)
  const [arcadeHighScore, setArcadeHighScore] = useState(0);
  const [trainingHighScore, setTrainingHighScore] = useState(0); // high score of dumpling feast
  const [lifetimeCaught, setLifetimeCaught] = useState(0);
  const [lifetimeMaxCombo, setLifetimeMaxCombo] = useState(0);

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

  // Defensive Telegram Mini App Initialization
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        if (typeof tg.requestFullscreen === 'function') {
          try {
            tg.requestFullscreen();
          } catch (e) {
            console.warn('requestFullscreen on Telegram load:', e);
          }
        }
        if (tg.setHeaderColor) tg.setHeaderColor('#1a1a1a');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
        console.log('Telegram Mini App initialized cleanly on platform:', tg.platform);
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
      fliesTypeCount: { housefly: 0, bluebottle: 0, fruitfly: 0, golden: 0, ninja: 0 },
      level: 1,
      dumplingsLeft: 5,
      dumplingsEatenThisLevel: 0,
      sipNeeded: false,
    });
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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-brand-linen flex flex-col font-sans select-none border-8 md:border-[20px] border-brand-charcoal">
      {/* Woodblock Frame Art Accents */}
      {/* 1. Dojo Ambiance Canvas Background */}
      <DojoBackground showBlossoms={true} windSpeed={gameState === 'playing' ? 1.4 : 0.8} />

      {/* Vertical Brand Watermark */}
      <div className="hidden xl:block absolute left-10 top-1/2 -translate-y-1/2 select-none pointer-events-none text-brand-charcoal/[0.04] font-serif font-black tracking-widest text-8xl uppercase [writing-mode:vertical-rl] [text-orientation:mixed] z-0">
        CHOPSTICK MASTER
      </div>

      {/* Red Calligraphy Seal Stamp */}
      <div className="absolute top-6 left-6 z-20 w-12 h-12 border-2 border-brand-red border-dashed rounded-none flex items-center justify-center font-serif font-extrabold text-brand-red rotate-[-12deg] select-none pointer-events-none shadow-xs">
        <span className="text-xl">禅</span>
      </div>

      {/* 2. Audio Ambiance toggle for easy quick-access */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
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
      </div>

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
            className="flex-1 flex flex-col items-center justify-start md:justify-center pt-8 pb-12 px-4 md:p-8 z-10 select-none overflow-y-auto"
          >
            {/* Title Calligraphy Frame */}
            <div className="text-center max-w-xl mb-6 md:mb-10 z-10">
              <span className="text-xs uppercase tracking-widest text-brand-red font-mono font-bold block mb-1">
                🥢 Zen Training Dojo 🥢
              </span>
              <h1 className="text-4xl md:text-5xl font-serif font-black text-brand-charcoal tracking-tight leading-none">
                Chopstick Fly Catcher
              </h1>
              <p className="text-xs md:text-sm text-brand-charcoal/80 mt-2 max-w-md mx-auto italic font-serif">
                "Concentration is the path to speed. Control your chopsticks, control your destiny."
              </p>
              <div className="w-32 h-1 bg-brand-charcoal mx-auto mt-4"></div>
            </div>

            {/* Main Menu Grid */}
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch z-10">
              {/* Left Column: Mode Selection */}
              <div className="lg:col-span-7 bg-brand-ivory border-3 border-brand-charcoal rounded-none p-5 md:p-6 flex flex-col justify-between shadow-[6px_6px_0px_0px_#1A1A1A]">
                <div className="space-y-4">
                  <h2 className="font-serif font-black text-xl text-brand-charcoal flex items-center gap-2">
                    <Target className="w-5 h-5 text-brand-red" /> The Master's Feast
                  </h2>

                  <div className="space-y-3">
                    {/* Unified Main Game Button */}
                    <button
                      onClick={() => handleStartGame('training')}
                      id="play-feast-btn"
                      className="w-full text-left p-5 rounded-none border-3 border-brand-charcoal bg-white hover:bg-brand-linen hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer group flex items-start justify-between"
                    >
                      <div className="space-y-1.5 pr-4">
                        <span className="font-serif font-black text-lg text-brand-charcoal group-hover:text-brand-red flex items-center gap-2 transition-colors">
                          Enter Dumpling Feast 🥟🍵
                        </span>
                        <p className="text-xs text-brand-charcoal/80 leading-relaxed font-sans">
                          Feed the Master freshly-steamed dumplings and sip Matcha tea! Keep pesky flies off the food and drink using your chopsticks.
                        </p>
                      </div>
                      <div className="h-full flex items-center">
                        <span className="p-3 border-2 border-brand-charcoal rounded-none bg-brand-red text-white group-hover:bg-brand-charcoal transition-colors">
                          <Play className="w-5 h-5 fill-current" />
                        </span>
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
            {/* Mobile Minimal HUD overlay */}
            <div className="md:hidden absolute top-4 left-4 right-16 z-30 flex justify-between items-start pointer-events-none">
              <div className="flex gap-2">
                <div className="bg-white/90 backdrop-blur-sm border-2 border-brand-charcoal px-3 py-1 shadow-[2px_2px_0px_0px_#1A1A1A] pointer-events-auto">
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
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Return to Dojo Menu? Your active score will be lost.')) {
                    setGameState('menu');
                    audio.clearAllBuzzers();
                  }
                }}
                className="pointer-events-auto px-3 py-1 bg-white/90 hover:bg-brand-linen border-2 border-brand-charcoal font-serif font-black shadow-[2px_2px_0px_0px_#1A1A1A] text-sm text-brand-charcoal"
              >
                Exit
              </button>
            </div>

            {/* Left HUD Stats Panel (Hidden on Mobile) */}
            <div className="hidden md:flex w-80 bg-brand-ivory border-r-3 border-brand-charcoal p-5 flex-col justify-between z-20 shadow-none">
              {/* Top Section */}
              <div className="space-y-4">
                {/* Header back & Pause buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-brand-red font-mono font-bold uppercase tracking-widest">
                      DOJO ARENA
                    </span>
                    <h3 className="font-serif font-black text-lg text-brand-charcoal">
                      The Master's Feast 🥟🥤
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('Return to Dojo Menu? Your active score will be lost.')) {
                        setGameState('menu');
                        audio.clearAllBuzzers();
                      }
                    }}
                    id="back-to-menu-btn"
                    className="px-3 py-1.5 text-xs bg-white hover:bg-brand-linen border-2 border-brand-charcoal rounded-none text-brand-charcoal font-serif font-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0"
                  >
                    Exit Dojo
                  </button>
                </div>

                {/* Main Stats Display */}
                <div className="space-y-3 pt-3 border-t-2 border-brand-charcoal">
                  {/* Level & Dumplings Counter */}
                  <div className="p-3 bg-white border-2 border-brand-charcoal rounded-none">
                    <div className="flex justify-between items-center text-xs text-brand-charcoal font-black font-serif mb-1">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-brand-red" /> Level {stats.level || 1}
                      </span>
                      <span className="font-mono text-brand-charcoal font-bold">{stats.dumplingsLeft || 0} Dumplings Left</span>
                    </div>
                  </div>

                  {/* Soda Sip Required Warning Banner */}
                  {stats.sipNeeded && (
                    <div className="p-3 bg-amber-100 border-2 border-amber-800 rounded-none animate-pulse flex items-center justify-between text-amber-900 font-serif font-black text-xs">
                      <span className="flex items-center gap-1.5">
                        🥤 Master is thirsty!
                      </span>
                      <span className="underline decoration-amber-800">Drag Soda to Mouth</span>
                    </div>
                  )}

                  {/* SCORE */}
                  <div className="bg-white border-2 border-brand-charcoal p-3 rounded-none text-center relative overflow-hidden">
                    <span className="text-[10px] text-brand-charcoal/60 block font-mono font-bold">
                      ACCUMULATED SCORE
                    </span>
                    <span className="font-serif font-black text-3xl text-brand-charcoal">
                      {stats.score}
                    </span>

                    {/* Active Streak Combo multiplier highlight */}
                    {stats.combo > 0 && (
                      <div className="mt-1 flex justify-center">
                        <span className="px-2 py-0.5 border border-brand-charcoal bg-brand-red text-white text-xs font-mono font-bold rounded-none animate-bounce">
                          {stats.combo} Combo (x{Math.min(5, Math.ceil(stats.combo / 4))} pts)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Accuracy & Counts */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white border-2 border-brand-charcoal p-2 rounded-none text-center">
                      <span className="text-[9px] text-brand-charcoal/60 block font-mono font-bold">
                        ACCURACY
                      </span>
                      <span className="font-black text-brand-charcoal font-mono">
                        {stats.accuracy}%
                      </span>
                    </div>

                    <div className="bg-white border-2 border-brand-charcoal p-2 rounded-none text-center">
                      <span className="text-[9px] text-brand-charcoal/60 block font-mono font-bold">
                        SAFELY RELEASED 🌸
                      </span>
                      <span className="font-black text-brand-charcoal font-mono">
                        {stats.fliesCaught}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Caught Species Breakdown */}
                <div className="pt-3 border-t-2 border-brand-charcoal space-y-2">
                  <h4 className="text-[10px] text-brand-charcoal/70 font-mono font-bold uppercase tracking-widest">
                    Safe Release Log 🌸
                  </h4>
                  <div className="space-y-1.5 text-xs font-serif">
                    <div className="flex justify-between items-center text-brand-charcoal font-medium">
                      <span>🪰 Houseflies:</span>
                      <span className="font-mono font-bold">{stats.fliesTypeCount.housefly}</span>
                    </div>
                    <div className="flex justify-between items-center text-brand-charcoal font-medium">
                      <span>🔵 Bluebottles:</span>
                      <span className="font-mono font-bold">{stats.fliesTypeCount.bluebottle}</span>
                    </div>
                    <div className="flex justify-between items-center text-brand-charcoal font-medium">
                      <span>🟠 Fruitflies:</span>
                      <span className="font-mono font-bold">{stats.fliesTypeCount.fruitfly}</span>
                    </div>
                    <div className="flex justify-between items-center text-brand-red font-bold">
                      <span>✨ Golden Empress:</span>
                      <span className="font-mono font-bold">{stats.fliesTypeCount.golden}</span>
                    </div>
                    <div className="flex justify-between items-center text-purple-600 font-bold">
                      <span>🥋 Ninja Sensei:</span>
                      <span className="font-mono font-bold">{stats.fliesTypeCount.ninja}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Controls */}
              <div className="space-y-2 pt-4 border-t-2 border-brand-charcoal">
                <div className="flex justify-between items-center text-xs text-brand-charcoal font-bold font-serif">
                  <span>Difficulty: <strong className="capitalize underline decoration-brand-red">{difficulty}</strong></span>
                  <span>Helper: <strong className="capitalize underline decoration-brand-red">{showHelper ? 'on' : 'off'}</strong></span>
                </div>

                <div className="bg-brand-linen border-2 border-brand-charcoal p-2.5 rounded-none text-[10px] text-brand-charcoal/90 leading-relaxed italic text-center font-serif">
                  "Pinch the chopsticks to capture a fly, then carry it to the garden window at the top to release it safely!"
                </div>
              </div>
            </div>

            {/* Main Interactive High FPS Game Canvas Stage */}
            <div className="flex-1 relative bg-transparent overflow-hidden shadow-inner">
              <GameCanvas
                isPlaying={gameState === 'playing'}
                gameMode={gameMode}
                difficulty={difficulty}
                chopstickStyleId={selectedChopstickId}
                showHelper={showHelper}
                soundEnabled={soundEnabled}
                onGameEnd={handleGameEnd}
                onStatsUpdate={setStats}
              />
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
      </AnimatePresence>

      {/* 4. MODALS & POPUPS */}
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
      </AnimatePresence>
    </div>
  );
}
