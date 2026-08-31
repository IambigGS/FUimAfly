# Audio Engineering Proposal: Main Menu Background Music ('Black Stinky')

**Author:** Echo (Lead Audio Engineer)  
**Target Module:** Main Menu Audio (`src/utils/audio.ts` & `src/App.tsx`)  
**Date:** August 31, 2026  
**Status:** Approved / Implemented  

---

## TL;DR
Yes! "Black Stinky" is now successfully integrated as the official main menu background music. It is routed through our Web Audio gain architecture with smooth cross-fading, automatic autoplay unlocking on first user interaction, and seamless ducking/stopping when transitioning to gameplay Zen Flute or Dojo modes.

---

## 1. Overview & Asset Placement

The track **"Black Stinky"** (`Black Stinky.mp3`, ~3.6MB) was sourced from the project's raw assets repository (`_raw_assetts/`) and integrated into the playable client build:
1. **Public Audio Runtime:** Staged at `public/sounds/black_stinky.mp3` for dynamic HTML5 Audio streaming.
2. **Team Hub Audio Showcase:** Staged at `src/team_hub/echo/2026-08-31-2320-black_stinky.mp3` so the team can audition the track directly from Echo's console tab.

---

## 2. Web Audio Architecture & Routing

To maintain pristine audio quality without consuming excessive mobile memory, streaming HTML5 Audio is bridged directly into our Web Audio API graph:

```
[ HTMLAudioElement ('sounds/black_stinky.mp3') ]
                      │
                      ▼
       [ MediaElementAudioSourceNode ]
                      │
                      ▼
             [ menuMusicGain ]  <-- 300ms–400ms linear crossfade ramps
                      │
                      ▼
               [ musicGain ]    <-- User-defined music volume in Settings
                      │
                      ▼
               [ masterGain ]   <-- Master volume & global mute toggle
                      │
                      ▼
            [ ctx.destination ]
```

### Key Technical Safeguards:
1. **Memory Efficiency:** Streaming HTML5 Audio prevents decoding ~80MB of uncompressed 32-bit float PCM into memory on mobile devices.
2. **Browser Autoplay Compliance:** Modern browsers block audio until user interaction. If `play()` is rejected initially, a one-time gesture listener (`pointerdown`, `click`, `keydown`, `touchstart`) unlocks and starts playback seamlessly on the player's first tap.
3. **Pop-Free Cross-fading:** When switching between Main Menu and Zen/Arcade gameplay, a 400ms fade-in ramp and 300ms fade-out ramp prevent DC offset audio clicks.
4. **Volume Hierarchy Integration:** Menu BGM respects both Master Volume, Music Volume, and Quick-Mute toggles from the UI header and Settings Modal.
