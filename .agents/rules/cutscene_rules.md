# Cutscene & Video Playback Directives

1. **Cutscene State Isolation & Pausing Rule**:
   - Whenever any cutscene is playing (Game Intro `Intro_Scene_p123.mp4`, Ninja Fly Takeover `Ninja_Fly_TakeOver_01.mp4`, or any future cutscenes), **all core gameplay loops MUST be 100% paused**.
   - No flies may update position, move, or flap wings during cutscenes.
   - All spatial fly buzzers and ambient gameplay audio loops must be silenced during cutscene playback.
   - Timers (level timers, frenzy timers, spawn timers) must not tick down while a cutscene is active.

2. **Resume Condition**:
   - Gameplay loops and audio resume ONLY after the cutscene finishes naturally (`onEnded`) or the player manually skips (`onClick`).

3. **Asset Organization**:
   - All cutscene video assets reside under `public/assets/videos/`.
   - Video elements must use `getAssetUrl('assets/videos/...')` for reliable cross-platform URL resolution.
