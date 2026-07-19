import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Volume2, VolumeX, Eye, EyeOff, Trash2, X, Sparkles, HelpCircle } from 'lucide-react';
import { ChopstickConfig } from '../types';

export const CHOPSTICK_STYLES: ChopstickConfig[] = [
  {
    id: 'bamboo',
    name: 'Classic Bamboo',
    color1: '#dfc293',
    color2: '#413524',
    length: 310,
    gripWidth: 8,
    hasSparkles: false,
    description: 'Traditional split bamboo wood. Lightweight with standard hitbox.',
  },
  {
    id: 'crimson',
    name: 'Lacquered Crimson',
    color1: '#c21e2e',
    color2: '#e5ad35', // Gold accent bands
    length: 320,
    gripWidth: 9,
    hasSparkles: false,
    description: 'Polished royal red wood with imperial gold banding. Slightly longer reach.',
  },
  {
    id: 'dragon',
    name: 'Golden Dragon',
    color1: '#f1bd30',
    color2: '#ffffff', // Radiant tip
    length: 330,
    gripWidth: 10,
    hasSparkles: true,
    sparkleColor: 'rgba(253, 224, 71, 0.8)',
    description: 'Forged in gold-plated steel. Emits faint, glittering light particles.',
  },
  {
    id: 'carbon',
    name: 'Carbon Stealth',
    color1: '#262626',
    color2: '#ef4444', // Red stealth line
    length: 295,
    gripWidth: 7,
    hasSparkles: false,
    description: 'Modern light-weight carbon fiber weave. Extremely fast and sleek.',
  },
];

interface SettingsModalProps {
  onClose: () => void;
  masterVol: number;
  setMasterVol: (v: number) => void;
  musicVol: number;
  setMusicVol: (v: number) => void;
  sfxVol: number;
  setSfxVol: (v: number) => void;
  difficulty: 'easy' | 'normal' | 'hard';
  setDifficulty: (d: 'easy' | 'normal' | 'hard') => void;
  selectedChopstickId: string;
  setSelectedChopstickId: (id: string) => void;
  showHelper: boolean;
  setShowHelper: (b: boolean) => void;
  onResetHighscores: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (b: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  masterVol,
  setMasterVol,
  musicVol,
  setMusicVol,
  sfxVol,
  setSfxVol,
  difficulty,
  setDifficulty,
  selectedChopstickId,
  setSelectedChopstickId,
  showHelper,
  setShowHelper,
  onResetHighscores,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    onResetHighscores();
    setConfirmReset(false);
    alert('High scores have been wiped clean like a blank canvas.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        id="settings-modal"
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-brand-ivory border-3 border-brand-charcoal rounded-none shadow-[8px_8px_0px_0px_#1A1A1A] p-6 md:p-8 text-brand-charcoal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-settings"
          className="absolute top-4 right-4 p-2 rounded-none border-2 border-brand-charcoal bg-white hover:bg-brand-linen text-brand-charcoal transition-colors duration-150 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <Settings className="w-8 h-8 text-brand-red mx-auto mb-1 animate-spin-slow" />
          <h2 className="text-2xl font-serif text-brand-charcoal font-black">Dojo Settings</h2>
          <div className="w-16 h-1 bg-brand-charcoal mx-auto mt-2"></div>
        </div>

        <div className="space-y-5 text-sm">
          {/* Difficulty Level */}
          <div className="space-y-2">
            <label className="font-serif font-black text-sm text-brand-charcoal block">
              Dojo Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`py-2 px-3 rounded-none font-serif text-xs font-black capitalize border-2 transition-all cursor-pointer ${
                    difficulty === diff
                      ? 'bg-brand-charcoal text-white border-brand-charcoal shadow-none'
                      : 'bg-white text-brand-charcoal border-brand-charcoal hover:bg-brand-linen'
                  }`}
                >
                  {diff === 'easy' ? 'Novice' : diff === 'normal' ? 'Adept' : 'Master'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-brand-charcoal/70 font-serif">
              {difficulty === 'easy' && 'Larger chopstick pinch hitbox, slower and calmer flies.'}
              {difficulty === 'normal' && 'Standard standard speed, realistic twitch fly behaviors.'}
              {difficulty === 'hard' && 'Micro-pinch target accuracy, hyperactive flies.'}
            </p>
          </div>

          {/* Sound Controls */}
          <div className="space-y-3 pt-2 border-t-2 border-brand-charcoal">
            <div className="flex justify-between items-center font-serif">
              <span className="font-black text-brand-charcoal">Acoustics & Sound</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="flex items-center gap-1 text-xs text-brand-red hover:text-brand-red/80 font-bold cursor-pointer"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" /> Enabled
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-brand-red" /> Silenced
                  </>
                )}
              </button>
            </div>

            {soundEnabled && (
              <div className="space-y-2.5 bg-white p-3 border-2 border-brand-charcoal rounded-none">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-brand-charcoal/80 font-serif font-bold">
                    <span>Master Volume</span>
                    <span>{Math.round(masterVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={masterVol}
                    onChange={(e) => setMasterVol(parseFloat(e.target.value))}
                    className="w-full accent-brand-red cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-brand-charcoal/80 font-serif font-bold">
                    <span>Flute Music (Zen ambiance)</span>
                    <span>{Math.round(musicVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVol}
                    onChange={(e) => setMusicVol(parseFloat(e.target.value))}
                    className="w-full accent-brand-red cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-brand-charcoal/80 font-serif font-bold">
                    <span>Effects (Buzz & Clack)</span>
                    <span>{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVol}
                    onChange={(e) => setSfxVol(parseFloat(e.target.value))}
                    className="w-full accent-brand-red cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Chopstick Skins */}
          <div className="space-y-2 pt-2 border-t-2 border-brand-charcoal">
            <label className="font-serif font-black text-sm text-brand-charcoal block">
              Chopstick Armory
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CHOPSTICK_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedChopstickId(style.id)}
                  className={`text-left p-2.5 rounded-none border-2 transition-all cursor-pointer flex flex-col justify-between h-24 relative ${
                    selectedChopstickId === style.id
                      ? 'bg-brand-linen border-brand-charcoal font-bold'
                      : 'bg-white border-brand-charcoal/30 hover:border-brand-charcoal'
                  }`}
                >
                  <div className="flex justify-between w-full items-start">
                    <span className="font-black text-xs font-serif text-brand-charcoal">
                      {style.name}
                    </span>
                    <div className="flex gap-0.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: style.color1 }}
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: style.color2 }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-brand-charcoal/70 leading-tight line-clamp-2 mt-1">
                    {style.description}
                  </p>
                  {style.hasSparkles && (
                    <Sparkles className="w-3 h-3 absolute bottom-2 right-2 text-brand-red animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Aim Assist Toggle */}
          <div className="flex justify-between items-center pt-2 border-t-2 border-brand-charcoal">
            <div className="pr-4">
              <span className="font-serif font-black text-brand-charcoal block">Aim Assist Crosshair</span>
              <span className="text-[11px] text-brand-charcoal/70">
                Shows a precise aiming guide indicator right at the chopstick tip.
              </span>
            </div>
            <button
              onClick={() => setShowHelper(!showHelper)}
              className={`p-2 rounded-none border-2 transition-all cursor-pointer ${
                showHelper
                  ? 'bg-brand-linen text-brand-charcoal border-brand-charcoal shadow-none'
                  : 'bg-white text-neutral-400 border-brand-charcoal/30 hover:text-brand-charcoal hover:border-brand-charcoal'
              }`}
            >
              {showHelper ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Reset Score */}
          <div className="pt-3 border-t-2 border-brand-charcoal flex justify-between items-center">
            <div>
              <span className="font-serif font-black text-brand-red block">Erase Records</span>
              <span className="text-[11px] text-brand-charcoal/70">
                Wipe clean all local records and high scores.
              </span>
            </div>

            {confirmReset ? (
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1 bg-brand-red text-white text-xs font-bold rounded-none hover:bg-brand-red/90 cursor-pointer border border-brand-charcoal"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 bg-white text-brand-charcoal text-xs font-bold rounded-none hover:bg-brand-linen cursor-pointer border border-brand-charcoal"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="p-2 border-2 border-brand-red text-brand-red hover:bg-brand-linen rounded-none cursor-pointer transition-colors"
                title="Reset Records"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
