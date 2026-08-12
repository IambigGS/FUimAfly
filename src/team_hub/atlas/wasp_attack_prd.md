# Wasp Attack Mini-Game PRD & Architecture

## 1. Overview
The "Wasp Attack" mini-game triggers when the player catches a rare wasp during the main chopstick fly-catching game. The game shifts to a completely new perspective (e.g., pseudo-3D or first-person) where wasps fly *towards* the player.

## 2. Architectural Goals
- **Separation of Concerns:** Avoid bloating `App.tsx` and the primary `GameCanvas.tsx`.
- **Consistent 60 FPS:** Ensure smooth performance on low-end mobile WebViews (Capacitor).
- **Seamless Transitions:** Hide the loading/swapping of assets with a clean visual transition.

## 3. Implementation Strategy

### A. State Management & Routing
Introduce a `GameMode` state enum (e.g., `NORMAL`, `TRANSITION`, `WASP_ATTACK`). 
Instead of placing all logic in `App.tsx`, use a new orchestrator component (`<GameDirector />`) that conditionally renders either `<FlyCatchCanvas />` or `<WaspAttackCanvas />` based on the active mode.

### B. Rendering Architecture (`WaspAttackCanvas.tsx`)
- **Independent Canvas:** Create a dedicated canvas component for this mode. It runs its own `requestAnimationFrame` loop.
- **React-Free Render Loop:** React should *only* handle mounting/unmounting the canvas and high-level score updates. The 60 FPS loop must mutate raw JS objects (refs) and draw directly to the canvas context, completely bypassing React state updates.
- **Pseudo-3D Scaling:** To simulate wasps flying towards the camera without WebGL, use standard 2D canvas scaling (`ctx.scale`). Wasps spawn at a small scale near the center and move outwards while scaling up.

### C. Performance & Memory 
- **Object Pooling:** Pre-allocate a pool of ~20-30 Wasp objects when the mini-game mounts. Recycle these objects as they fly past the screen or get hit, eliminating Garbage Collection (GC) pauses during gameplay.
- **Asset Preloading:** Preload the wasp sprites and attack audio in the background during the main game, so they are ready instantly.

### D. The Transition
1. Main game catches the wasp -> State changes to `TRANSITION`.
2. The main loop freezes. We overlay a CSS-accelerated transition (e.g., a zoom-in blur or a quick color flash).
3. Under the overlay, `<FlyCatchCanvas />` unmounts and `<WaspAttackCanvas />` mounts.
4. The overlay fades out, and the Wasp Attack loop begins. This guarantees we never run two heavy `requestAnimationFrame` loops simultaneously.
