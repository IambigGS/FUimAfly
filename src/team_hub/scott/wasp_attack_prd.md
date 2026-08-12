# Wasp Attack Mini-Game - QA Testing Protocol

## Overview
This document outlines the testing protocol for the new "Wasp Attack" mini-game mode, triggered when the Master catches a wasp during normal chopstick gameplay.

## 1. Trigger & Transition Testing
- **Trigger Condition:** Verify that wasps spawn at the correct probability and interval during normal play.
- **Hit Detection:** Verify that catching the wasp with chopsticks correctly triggers the transition, while normal flies continue to act normally.
- **Transition Animation/State:**
  - Verify that the game cleanly pauses the "Chopstick Mode" state (timers, score, fly movement, dumpling physics).
  - Verify a visually smooth perspective transition to the "Head-on Perspective".
  - Ensure no UI elements from the normal mode (e.g., Steamer Plate, Soda Cup) bleed into the new mini-game viewport unless intended.

## 2. Core Mechanics (Head-on Perspective)
- **Input Handling:**
  - Ensure input switches correctly from chopstick dragging/pinching to the new swatting/hitting mechanics.
  - Test responsiveness of hits on both desktop (mouse click/swipe) and mobile/Telegram (tap/swipe).
- **Wasp Behavior:**
  - Verify wasps spawn and scale correctly to simulate flying *towards* the screen.
  - Test hitboxes of the incoming wasps (are they too small/large as they scale?).

## 3. Exit & State Restoration
- **Win/Loss Conditions:** Test both winning (swatting enough wasps) and losing (getting stung).
- **Return to Normal Game:**
  - Verify that returning to the normal chopstick mode restores the exact previous state (score, time left, fly positions, soda thirst level).
  - Check for "state bleeding" (e.g., wasps from the mini-game appearing in the normal mode, or input mechanics remaining stuck in "swat" mode instead of "chopstick" mode).
  - Check for memory leaks, audio looping issues, or performance drops after multiple transitions back and forth.

## 4. Edge Cases & Viewport Quirks
- **Rapid Input:** Spam clicks during the transition to ensure it doesn't trigger multiple state changes, skip the mini-game entirely, or crash.
- **Viewport Scaling:** Test the new perspective on Desktop (100vw x 100vh) vs Telegram PC (370x574). Ensure incoming wasps aren't spawning outside the visible bounds on smaller screens.
- **Interrupts:** Test minimizing the browser, receiving a notification (mobile), or resizing the window during the mini-game to ensure the game pauses or handles the interrupt gracefully without breaking the state.
