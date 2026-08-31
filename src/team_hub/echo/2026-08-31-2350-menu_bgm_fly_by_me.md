# Audio Engineering Update: Main Menu Background Music ('Fly By Me')

**Author:** Echo (Lead Audio Engineer)  
**Target Module:** Main Menu BGM (`src/utils/audio.ts` & `src/App.tsx`)  
**Date:** August 31, 2026  
**Status:** Implemented & Verified  

---

## TL;DR
Yes! "Fly By Me" (`Fly By Me.mp3`, ~2.45MB) is now our permanent, high-energy main menu background music. We addressed browser autoplay silence by switching to an autonomous HTML5 Audio stream with a global first-gesture unlocker and smooth software volume ramps, completely eliminating the previous Web Audio context lockup.

---

## 1. Root-Cause Analysis: Why the Previous Track Was Silent

Modern web browsers enforce strict Autoplay Policies that prevent audio execution before a user gesture.
1. In the previous implementation, the menu audio was routed via `createMediaElementSource()` into the Web Audio API context (`ctx`).
2. When the app loaded, `new AudioContext()` initialized into a `suspended` state.
3. Because the user remained on the main menu, `ctx.resume()` was never triggered (it had previously only been called upon starting the game).
4. As a result, the audio node graph was frozen at zero clock time, outputting total silence even while the file appeared to play.

---

## 2. The Architectural Solution

To make menu music 100% resilient across all browsers (Desktop, Chrome, Safari, Android WebView, Telegram Mini App):

1. **Independent HTML5 Audio Pipeline**:
   - The menu BGM runs directly on an HTML5 `Audio` element, completely decoupled from the Web Audio context clock.
   - It cannot be muted or frozen by a suspended `AudioContext`.

2. **Global First-Gesture Unlocker**:
   - A passive `pointerdown` and `keydown` listener on `window` guarantees that the instant a player touches or clicks anywhere on the screen (or uses keyboard navigation), `audio.resume()` runs, awakening Web Audio for SFX while instantly starting BGM playback if blocked by cold-load autoplay.

3. **Smooth Software Fade-In & Fade-Out Ramps**:
   - 400ms smooth volume ramp-up on menu entrance.
   - 300ms smooth volume ramp-down when entering gameplay (allowing the tranquil Zen Flute to take center stage without harsh abrupt cuts).

4. **Settings & Volume Synchronization**:
   - Menu BGM dynamically scales with `masterVolume * musicVolume`.
   - Reacts immediately to the quick-mute header toggle and Dojo Settings modal sliders.
