---
description: "Core game mechanics and control schemes for Chopstick Fly Catcher"
---

# Chopstick Fly Catcher - Game Mechanics & Control Schemes

When modifying `GameCanvas.tsx` or any gameplay logic, agents MUST respect the following dual-control schemes. The game operates fundamentally differently depending on whether the player is using a Mouse (PC) or a Touchscreen (Mobile).

## 1. PC (Mouse) Mechanics
- **Chopsticks:** The chopsticks follow the user's cursor (`onMouseMove`).
- **Flies:** The user must manually pinch the fly (click) and physically drag it up to the Release Window (top of screen) to safely release it.
- **Feeding:** The user must click and drag dumplings or tea to the Master's mouth.

## 2. Mobile (Touch) Mechanics
- **Flies (Tap-to-Catch):** When the user taps a fly (either flying mid-air or landed on food), the chopsticks automatically catch the fly and transport it out the window. There is no manual dragging of flies to the window on touch devices.
- **Feeding:** The user taps and drags dumplings or tea to the Master's mouth. 

**Critical Implementation Note:** Do NOT attempt to unify the `onTouch` and `onMouse` event handlers into a single `onPointer` handler if it compromises this dual mechanic. The logic for catching flies is intentionally divergent between the two input methods.
