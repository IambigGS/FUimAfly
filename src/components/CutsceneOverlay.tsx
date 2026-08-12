import React from 'react';
import { createPortal } from 'react-dom';

interface CutsceneOverlayProps {
  src: string;
  onEnded: () => void;
  onSkip: () => void;
  soundEnabled: boolean;
}

export const CutsceneOverlay: React.FC<CutsceneOverlayProps> = ({
  src,
  onEnded,
  onSkip,
  soundEnabled,
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] bg-black flex items-center justify-center overflow-hidden pointer-events-auto select-none"
      style={{ isolation: 'isolate', touchAction: 'none' }}
      onClick={onSkip}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          autoPlay
          playsInline
          muted={!soundEnabled}
          className="w-full h-full object-contain bg-black pointer-events-none"
          src={src}
          onEnded={onEnded}
          onError={(e) => {
            console.error('Cutscene video failed to load or play:', src, e);
            onSkip();
          }}
        />
        <div className="absolute bottom-6 right-6 bg-black/90 text-white font-mono text-xs px-4 py-2 rounded-full border border-white/40 shadow-md animate-pulse">
          Tap anywhere to skip ⏩
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CutsceneOverlay;
