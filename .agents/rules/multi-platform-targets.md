# Project Architecture & Multi-Platform Target Specification

## 1. Core Targets
This single codebase targets 3 primary environments:
1. **Web (Desktop & Mobile Browser):** Standard Vite build deployed to static web hosting.
2. **Native Android (Capacitor):** Wrapped native APK output in `/android` and `/APKs`.
3. **Telegram Mini App (TMA):** Mobile & PC Telegram iframe wrapper (`window.Telegram.WebApp`).

## 2. Dev-Mode Viewport Simulator (Localhost Only)
- When running in development mode on `localhost`, render a discrete floating "Dev Viewport Switcher" button in the corner of the screen.
- Clicking this button toggles the game view between:
  - **Full Desktop Mode:** Native full-window 100vw x 100vh canvas.
  - **Telegram PC Mode:** Constrains the canvas container to a simulated narrow popup (exactly 370px wide x 574px tall inner playable canvas) centered on screen with a background preview.
- This overlay should automatically hide itself when deployed to production or wrapped inside Capacitor/Telegram.

## 3. Input Handling Rules
- **Unified Pointer Architecture:** Maintain the single-pointer system where Touch events (`onTouchStart`/`Move`/`End`) map directly to `mouseRef` coordinates alongside Mouse events (`onMouseMove`/`Down`/`Up`).
- **No Virtual Controllers Required:** Do not introduce separate virtual D-pads or joysticks unless explicitly requested. Mouse and direct touch must remain functionally equivalent.

## 4. Telegram & Localhost Fallback Rules
- Always maintain optional chaining (`window.Telegram?.WebApp`) for Telegram SDK calls.
- `tg.ready()`, `tg.expand()`, and `tg.requestFullscreen()` must remain wrapped in defensive checks so `localhost` runs seamlessly in standalone web mode without throwing errors.

## 5. Viewport & Canvas Scaling Rules
- **Relative Coordinates:** Do not enforce a fixed 16:9 letterbox. Canvas must resize dynamically via `handleResize` (`window.innerWidth` / `innerHeight` or `--tg-viewport-height`).
- In-game objects (matcha tea cup, dumpling plate, flies, chopsticks) must always position themselves relative to width/height percentages to adapt to Telegram PC's narrow popup (exactly 370px wide x 574px tall) as cleanly as full desktop resolution (1920x1080).
- Keep gesture prevention rules (`touch-action: none`, `user-select: none`, `overscroll-behavior: none`) active to preserve the native app feel on mobile.

## 6. Testing Protocols
- When testing locally using the Browser Subagent, use the Dev Viewport Switcher to verify that layout and object positioning remain playable in both **Telegram PC mode (370x574)** and **Full Desktop mode**.
