# QA Testing Strategy PRD: "Be the Fly" Mode

## 1. Overview
This document outlines the testing strategy for the newly introduced "Be the Fly" game mode in **Chopstick Fly Catcher**, where the perspective shifts: the player controls the fly, evading the master's giant chopsticks and attempting to land on dumplings.

## 2. Technical QA Protocols (Developer Feedback)
**Target Environment:** `http://localhost:3000`

### A. Viewport & Platform Testing
1. **Full Desktop Mode (100vw x 100vh):**
   - Verify that the 320px left stats sidebar renders cleanly during gameplay and updates fly-specific survival stats.
   - Ensure the new inverted perspective (Master looking down, chopsticks striking towards the screen) renders correctly over the woodblock watermark and calligraphy frame.
2. **Telegram PC Mode (Simulated 370px × 574px) & Mobile Scales:**
   - **Critical Check (Above-The-Fold CTA Visibility):** Verify the "Enter Fly Mode" / "Start Evasion Now" button is **100% visible on initial load** without vertical scrolling. Any clipping is a **CRITICAL UX FAIL**.
   - **Critical Check (Spatial Playability & Overlap):** Check the spatial arrangement of the giant chopsticks, the Steamer Plate (now the objective), and the player (the fly).
     - *Asset Overlap:* Do the chopsticks obscure the player's view of the fly excessively before striking? 
     - *Touch Targets:* Ensure the joystick/touch controls for moving the fly don't overlap with the "Exit Dojo" or score HUD.
   - **Critical Check (UI Elements):** Ensure the desktop sidebar is hidden. Ensure the top overlay HUD (`score/time survived` top-left, `Exit` top-right) is active without overlapping.

### B. Core Mechanics & State Transitions
- **Main Menu -> Game Start:** Smooth transition from main menu to the "Be the Fly" mode `playing` state.
- **Canvas Interactions & Control Scheme (Evasion vs Steering):**
  - *Mobile UX Conflict Resolution:* Test the split-screen or multi-gesture input scheme to ensure continuous steering (touch-drag) and vertical evasion (quick swipe/tap) do not overlap or misfire.
  - *Test Case - Split-Screen:* Left half of screen handles drag-steering; right half handles evasion swipes. Does it feel intuitive? 
  - *Browser Conflicts:* Ensure vertical swipe gestures do not trigger native mobile browser actions like pull-to-refresh or scrolling.
  - *Desktop Evasion Controls:* Test WASD/Arrow keys for movement, and Spacebar/Shift for quick evasion bursts.
  - *Chopstick Strikes:* Test the hitboxes of the chopstick strikes. Are they fair? Is there a telegraphing shadow or indicator before they strike?
  - *Dumpling Landings:* Test the mechanics of landing on a dumpling (e.g., hovering over it for X seconds) to score points, while risking a chopstick strike.
- **Game Exit & Pause:** Verify `Exit Dojo` returns to main menu and saves high scores properly in `localStorage`.

## 3. End-User Player Experience Evaluation (UX / Game Feel)

1. **First Impressions & Clarity:** 
   - Is it immediately obvious that the player is now the fly? 
   - Is the goal (landing on dumplings while avoiding chopsticks) clear from the UI/tutorial?
2. **Visual Hierarchy & Obscuration:** 
   - Since the Master is now the enemy, does his giant face or chopsticks block the view of the dumplings? If the scaling ruins the visual hierarchy on small screens, flag immediately.
3. **Control Responsiveness & Juice:** 
   - Do the evasion controls feel nimble, snappy, and precise? Does the dodge mechanic feel rewarding?
   - Are the audio effects satisfying? (e.g., loud clack when chopsticks miss, buzzing sounds when flying, squash sound on game over).
4. **Pacing & Difficulty:** 
   - Do the chopstick strikes scale naturally in speed and frequency with difficulty settings (Novice / Adept / Master)? 
   - Is there a fair reaction window for the player to dodge?
5. **Replayability & Polish:** 
   - What would make the evasion loop 10x more addictive? (e.g., near-miss combo popups, screen shake when chopsticks slam, particle bursts when successfully eating a dumpling).
