---
description: "Core game mechanics and control schemes for Chopstick Fly Catcher"
---

# Chopstick Fly Catcher - Game Mechanics & Control Schemes

When modifying `GameCanvas.tsx` or any gameplay logic, agents MUST respect the following mechanics:

## 1. PC (Mouse) Mechanics
- **Chopsticks:** The chopsticks follow the user's cursor (`onMouseMove`).
- **Flies (Auto-Release):** When the user clicks to pinch a fly, it is captured and automatically released out the Garden Window with golden/pink sparkles and score points without requiring manual drag-and-drop to the top window.
- **Feeding:** The user clicks and drags dumplings or tea to the Master's mouth.

## 2. Mobile (Touch) Mechanics
- **Flies (Tap-to-Catch):** When the user taps a fly (either flying mid-air or landed on food), the chopsticks automatically catch the fly and transport it out the window.
- **Feeding:** The user taps and drags dumplings or tea to the Master's mouth. 

## 3. Arena Layout & Viewport Rules
- **Triangular Layout:** Committed as the default game layout across all devices.
- **Full-Width Canvas:** The Left HUD Stats panel has been removed during gameplay so the arena canvas takes up 100% of the viewport width. Score, time/guard, and exit button are presented as a minimal top overlay.
