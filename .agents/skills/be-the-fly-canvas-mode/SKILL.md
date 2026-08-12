---
name: be-the-fly-canvas-mode
description: >-
  Guide for developing, tuning, and maintaining the first-person 'Be the Fly' POV game mode canvas component.
---

# 'Be the Fly' POV Canvas Mode Guide

This skill details the architectural components, visual shaders, mouse controls, and audio state rules for the "Be the Fly" POV mode in `BeTheFlyCanvas.tsx`.

## Key Systems & Implementation Rules

### 1. POV Visual Filters & Vignette Shaders
- **Compound Eye Grid Lens:** Rendered via CSS `radial-gradient` and repeating hexagonal mesh overlay to simulate insect compound eye vision.
- **Stamina & Progress Gauge:** Floating top HUD header displaying live `⚡ STAMINA` meter and percentage progress of dumplings consumed.

### 2. Steering & Evasion Controls
- **Direct Cursor Tracking:** Fly smooth-interpolates towards `mouseTargetRef` (`x`, `y`) with velocity decay for realistic insect inertia.
- **Feasting Control:** Holding `Spacebar` or clicking `FEAST` initiates feeding when within `minDist = 0.20` of a dumpling center.

### 3. Sub-Screen Audio Muting & State Rules
- Fly buzzing (`buzzAudioRef`) MUST only be active while `gameState === 'playing'`.
- When modal sub-screens (e.g., Onboarding overlay) are open, ambient fly buzzing MUST be silenced.
- Munching audio takes precedence while landed on a dumpling; fly buzz is silenced during active feasting.
