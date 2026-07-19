import React from 'react';
import { motion } from 'motion/react';
import { HelpCircle, Crosshair, Zap, Award, Target, X } from 'lucide-react';
import { FlyType } from '../types';

interface HowToPlayProps {
  onClose: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  const flySpecs: { type: FlyType; name: string; desc: string; points: number; speed: string; color: string }[] = [
    {
      type: 'housefly',
      name: 'Common Housefly',
      desc: 'Standard speed and behavior. Excellent for practice.',
      points: 100,
      speed: 'Medium',
      color: 'bg-neutral-600 border-neutral-800',
    },
    {
      type: 'bluebottle',
      name: 'Bluebottle Titan',
      desc: 'Larger fly with a loud, deep buzz. Heavy but moves in sudden, wide loops.',
      points: 200,
      speed: 'Slow-Medium',
      color: 'bg-cyan-600 border-cyan-800',
    },
    {
      type: 'fruitfly',
      name: 'Fruitfly Dart',
      desc: 'Tiny, erratic, and highly twitchy. Hard to target but yields high accuracy score.',
      points: 350,
      speed: 'Fast & Erratic',
      color: 'bg-amber-600 border-amber-800',
    },
    {
      type: 'golden',
      name: 'Golden Empress',
      desc: 'Extremely rare. Sparkles in mid-air. Catching it activates an instant 2x Score Frenzy!',
      points: 1000,
      speed: 'Super Sonic',
      color: 'bg-yellow-400 border-yellow-600 animate-pulse',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        id="how-to-play-modal"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-brand-ivory border-3 border-brand-charcoal rounded-none shadow-[8px_8px_0px_0px_#1A1A1A] p-6 md:p-8 text-brand-charcoal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-how-to-play"
          className="absolute top-4 right-4 p-2 rounded-none border-2 border-brand-charcoal bg-white hover:bg-brand-linen text-brand-charcoal cursor-pointer transition-all duration-150"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-brand-red font-mono font-bold block mb-1">
            Training Scroll
          </span>
          <h2 className="text-3xl font-serif text-brand-charcoal font-black tracking-tight">
            The Art of the Chopstick
          </h2>
          <div className="w-24 h-1 bg-brand-charcoal mx-auto mt-3"></div>
        </div>

        {/* Body */}
        <div className="space-y-6">
          {/* Quick Start instructions */}
          <div className="bg-brand-linen border-2 border-brand-charcoal rounded-none p-4 space-y-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,0.15)]">
            <h3 className="font-serif font-black text-lg flex items-center gap-2 text-brand-charcoal">
              <Target className="w-5 h-5 text-brand-red" /> Core Technique
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-brand-charcoal/90 leading-relaxed font-serif font-medium">
              <li>
                <strong className="text-brand-charcoal">Aim with Precision:</strong> The active pinch zone is located at the <span className="underline decoration-brand-red decoration-2 font-bold font-sans">TIPS</span> of the chopsticks, highlighted by the glowing crosshair guide.
              </li>
              <li>
                <strong className="text-brand-charcoal">Pinch to Strike:</strong> Click or hold your mouse button (or tap and hold on mobile) to pinch the chopsticks together.
              </li>
              <li>
                <strong className="text-brand-charcoal">Capture with Care:</strong> Align your chopsticks tips, pinch and hold to capture the fly unharmed!
              </li>
              <li>
                <strong className="text-brand-charcoal">Release to Freedom:</strong> While holding your pinch, carry the fly up to the **Garden Window** at the top center to release it safely out to nature for points and combos! Letting go inside the room will safely release the fly back to the dojo.
              </li>
              <li>
                <strong className="text-brand-charcoal">Combo Multipliers:</strong> Releasing flies consecutively without missing or dropping them inside the room builds your **Combo**. Strike misses will reset your multiplier!
              </li>
            </ul>
          </div>

          {/* Fly Species Guide */}
          <div>
            <h3 className="font-serif font-black text-lg mb-3 flex items-center gap-2 text-brand-charcoal">
              <HelpCircle className="w-5 h-5 text-brand-red" /> The Fly Menagerie
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {flySpecs.map((spec) => (
                <div
                  key={spec.type}
                  className="flex items-start gap-3 p-3 bg-white border-2 border-brand-charcoal rounded-none hover:bg-brand-linen transition-colors duration-150"
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 border-2 ${spec.color} flex items-center justify-center text-white text-xs font-mono font-bold shadow-sm`}>
                    {spec.type === 'golden' ? '✨' : '🪰'}
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-serif font-black text-sm text-brand-charcoal">{spec.name}</h4>
                      <span className="text-xs font-mono font-black text-brand-red bg-brand-linen border border-brand-charcoal px-1.5 py-0.5 rounded-none">
                        +{spec.points}p
                      </span>
                    </div>
                    <p className="text-xs text-brand-charcoal/80 mt-1 leading-relaxed font-sans">{spec.desc}</p>
                    <span className="text-[10px] font-mono font-bold text-brand-charcoal/50 uppercase mt-1 inline-block">
                      Speed: {spec.speed}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Modes */}
          <div>
            <h3 className="font-serif font-black text-lg mb-3 flex items-center gap-2 text-brand-charcoal">
              <Award className="w-5 h-5 text-brand-red" /> Training Modalities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white p-3 border-2 border-brand-charcoal rounded-none">
                <span className="font-mono text-xs uppercase text-brand-red font-bold block mb-1">
                  Arcade Mode
                </span>
                <p className="text-xs text-brand-charcoal/85 leading-relaxed font-sans">
                  60 seconds on the clock. Catch flies to earn score. Golden fly catches award extra precious seconds and start a score multiplier frenzy!
                </p>
              </div>
              <div className="bg-white p-3 border-2 border-brand-charcoal rounded-none">
                <span className="font-mono text-xs uppercase text-emerald-700 font-bold block mb-1">
                  Zen Mode
                </span>
                <p className="text-xs text-brand-charcoal/85 leading-relaxed font-sans">
                  No timers, no penalties, no rush. Listen to the gentle wind flute melody and master the delicate chopstick pinch in full tranquility.
                </p>
              </div>
              <div className="bg-white p-3 border-2 border-brand-charcoal rounded-none">
                <span className="font-mono text-xs uppercase text-indigo-700 font-bold block mb-1">
                  Feast Guard
                </span>
                <p className="text-xs text-brand-charcoal/85 leading-relaxed font-sans">
                  Keep flies away from the Master's delicious dumplings! Flies will actively zero in on the food on screen. Snatch them before they devour it.
                </p>
              </div>
            </div>
          </div>

          {/* Quote/Motivation */}
          <div className="text-center pt-3 italic text-xs text-brand-charcoal/70 font-serif border-t-2 border-brand-charcoal/20">
            "He who can catch a fly with chopsticks can accomplish anything." — Master Miyagi
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            id="start-training-btn"
            className="px-6 py-2.5 bg-brand-red hover:bg-brand-red/90 text-white font-serif font-black rounded-none border-2 border-brand-charcoal shadow-[4px_4px_0px_0px_#1A1A1A] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer text-sm tracking-wide"
          >
            Enter the Dojo
          </button>
        </div>
      </motion.div>
    </div>
  );
};
