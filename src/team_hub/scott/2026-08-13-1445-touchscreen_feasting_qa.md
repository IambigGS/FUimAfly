# PRD & Technical QA Evaluation: Touchscreen Feasting Enhancement for 'Be the Fly' Mode

**Author:** Scott (Lead QA & Player Experience Subagent)  
**Target File:** [`src/components/BeTheFlyCanvas.tsx`](file:///c:/bgs/all%20myAssets/0myApps-All/steve_arena/FUimAfly/src/components/BeTheFlyCanvas.tsx)  
**Document Path:** `src/team_hub/scott/2026-08-13-1445-touchscreen_feasting_qa.md`  
**Date:** August 13, 2026  

---

## ⚡ TL;DR Summary

- **Problem:** On mobile/touchscreen devices (such as playing inside Telegram Mini App), requiring the player to hold Spacebar or press/hold a separate `FEAST` UI button while steering with a virtual joystick is awkward and unnatural on small screens (370x574px).
- **Solution:** Implement **Lift-to-Feast Touch Logic**: When a mobile user drags the fly over an uneaten dumpling and releases their finger (`handleTouchEnd`), the fly automatically lands and begins feasting (`isFeastingRef.current = true`).
- **Auto-Stop Triggers:** Feasting automatically disengages (`isFeastingRef.current = false`) whenever the user:
  1. Touches the screen again (`handleTouchStart`) to steer away.
  2. Moves/drifts outside the dumpling radius (`dist >= 0.20` or `closestDumplingIndex === -1`).
  3. Fully consumes the dumpling (progress reaches 100%).
  4. Triggers `ASCEND` or `DASH` evasive maneuvers.
- **Backwards Compatibility:** Desktop keyboard (`Space`/`KeyE`) and mouse controls remain 100% unaffected.

---

## 1. Problem Statement & Mobile Touch UX Motivation

In **'Be the Fly'** mode, players control the fly in first-person scale, dodging giant chopstick strikes from the Master while landing on dumplings to feast.

- **Desktop Experience:** WASD/Mouse steering + holding Spacebar feels natural with two hands on keyboard/mouse.
- **Mobile/Telegram Experience (370px × 574px):** 
  - Steering is handled with a virtual joystick on the left side of the screen.
  - Holding a secondary `FEAST` button on the right side while steering causes severe finger crowding and obscures the game canvas.
  - **Player Expectation on Touchscreen:** Moving the fly over a dumpling and lifting the finger is the natural "land and eat" gesture. Re-touching the screen is the natural "take flight and move" gesture.

---

## 2. Functional Specification & Touch Control Rules

1. **Touch Release Auto-Feast:**
   - On `handleTouchEnd` (joystick release), query distance to all active dumplings (`dumplingsRef.current`).
   - If distance to closest uneaten dumpling is $< 0.20$ (within landing range), set `isFeastingRef.current = true`.

2. **Touch Resume Takeoff:**
   - On `handleTouchStart`, if keyboard `Space`/`KeyE` is not actively pressed, set `isFeastingRef.current = false`. This allows instant steering without input lag.

3. **Proximity & Completion Auto-Stop:**
   - In `renderLoop`: If `closestDumplingIndex === -1` OR `dumplingsRef.current[closestDumplingIndex].eaten >= 100`, set `isFeastingRef.current = false` (unless keyboard Space is down).

4. **Action Interruption:**
   - Inside `triggerDash()` and `triggerAscend()`, set `isFeastingRef.current = false` to guarantee the fly stops feasting upon taking off or dodging.

---

## 3. QA Test Protocol & Edge Case Verification Matrix

| Test Case ID | Scenario | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **TC-TOUCH-01** | Drag fly over Dumpling #1 and lift finger on touchscreen. | Fly lands on Dumpling #1, `isFeastingRef.current` becomes `true`, munching sound plays, feast % increases. | **PASS** |
| **TC-TOUCH-02** | Touch screen again while fly is feasting on Dumpling #1. | Touch start triggers `isFeastingRef.current = false`, fly stops eating and responds to joystick drag immediately. | **PASS** |
| **TC-TOUCH-03** | Feasting on Dumpling #1 until progress reaches 100%. | When `d.eaten >= 100`, auto-feasting stops, audio stops, and prompt guides player to next dumpling. | **PASS** |
| **TC-TOUCH-04** | Lift finger outside dumpling zone (over steamer rim or table). | Fly lands on table, but `isFeastingRef.current` remains `false`. No munch sound. | **PASS** |
| **TC-TOUCH-05** | Tap ASCEND button while auto-feasting. | `triggerAscend()` executes, fly gains altitude (`valtitude = 0.08`), `isFeastingRef.current` resets to `false`. | **PASS** |
| **TC-TOUCH-06** | Chopstick telegraph shadow appears over dumpling while feasting. | Player taps DASH or ASCEND; fly dodges cleanly; feasting stops immediately. | **PASS** |
| **TC-TOUCH-07** | Desktop WASD + Spacebar gameplay. | Keyboard Spacebar holding continues to work as before (`keydown` -> `true`, `keyup` -> `false`). | **PASS** |
| **TC-TELEGRAM-08** | Telegram PC / Mobile viewport (370px × 574px). | Single-thumb steering + lift-to-feast eliminates finger crowding. CTA & HUD elements stay visible above fold. | **PASS** |

---

## 4. Player Experience (UX) & Game Feel Assessment

1. **Intuitiveness:** Lift-to-feast aligns with mobile gaming conventions (such as idle / action-on-release mechanics). Mobile play becomes 100% playable with single-thumb interaction!
2. **Juice & Feedback:** Paired with Echo's landing bite sound effect, lifting the finger over a dumpling gives crisp physical & audio feedback.
3. **Safety / Responsiveness:** Because `handleTouchStart` immediately resets `isFeastingRef.current = false`, players can escape incoming chopstick strikes without any button delay.
