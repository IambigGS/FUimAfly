# PRD: "Be the Fly" Game Mode (Art Direction & UX Proposal)
**Author:** Luna (Lead Art Director & UI/UX Designer)
**Project:** FUimAfly

## 1. Visual Scaling & World Building
To successfully sell the fantasy of playing as a tiny housefly, the scale of the world must be dramatically altered. 
- **The Dumpling:** Should appear as a massive, glistening mountain of food with highly detailed normal maps to emphasize its texture and steam rising off it (particle effects).
- **The Environment:** The table surface becomes a vast plateau. Background elements like teacups or soy sauce bottles should be monolithic structures.
- **Master Steve:** Master Steve is now an imposing, titanic figure in the background. We should use atmospheric perspective on him. His eyes should track the camera (the fly), creating a constant sense of unease.

## 2. Perspective Shift & Camera
- **POV:** First-person or a very tight over-the-shoulder third-person camera trailing just behind the fly's translucent wings.
- **FOV (Field of View):** Widened significantly (around 100-110 degrees) to simulate the compound eyes of a fly, creating a sense of breakneck speed and peripheral awareness.
- **Lens Effects (Mobile Optimized):** Instead of heavy post-processing, we will use a cheap screen-space speed lines shader at the edges of the screen to simulate speed. 
- **Simulated Depth of Field:** To maintain 60 FPS on mobile WebViews, we will avoid real-time macro DoF. Instead, we will rely on baked fog/haze for the background and use low-poly background assets with pre-blurred textures to simulate out-of-focus macro photography without the rendering cost.

## 3. Chopstick Strike Animations (Fly POV)
- **The Threat:** From the fly's perspective, the chopsticks are giant, splintered wooden logs crashing down from the heavens.
- **Telegraphing:** Because looking up constantly is disorienting, we need a rapid, high-contrast dynamic shadow that grows on the surface below the player, giving them a split-second (0.5s - 0.8s) to react.
- **Near Misses:** If the chopsticks hit the table right next to the fly, trigger a heavy screen shake, a loud "whoosh/crack" audio cue, and a visual wind-distortion shockwave that slightly pushes the player.
- **Game Over:** If struck, the screen shouldn't just fade to black. It should simulate a sudden "squash" effect—a cracked glass overlay or an abrupt cut to a red-tinted blackout.

## 4. UI / UX Design
- **Minimalist HUD:** We must avoid cluttering the first-person view. The UI should float seamlessly on the periphery.
- **Stamina / Dash Meter:** Represented as a pair of glowing, stylized neon wings near the bottom center of the screen. As stamina depletes, the glow dims and the wings tatter.
- **Danger Indicators:** If a chopstick strike is coming from an off-screen angle, directional red threat arrows (with a pulsing opacity) should appear on the edges of the screen to guide the player's evasion.
- **Score/Greed Meter:** A circular progress bar tracking how much of the dumpling has been consumed, glowing brighter as the player takes more risks by staying stationary on the food.

## 5. Controls
- **Movement:** Virtual joystick / continuous touch-drag on the left side of the screen to smoothly steer in 3D space, similar to a flight simulator but highly responsive and arcade-like.
- **Evasive Dash (Stamina Cost):** A dedicated tap/click button on the right side of the screen to perform a sudden, jerky darting motion—a classic fly maneuver to dodge strikes.
- **Land & Feast:** Holding a specific UI button on the right side makes the fly dive to the nearest surface to eat. The longer you hold it, the more points you rack up, but you are completely vulnerable.
- **Vertical Evasion:** A dedicated on-screen "Ascend/Eject" button located near the primary interaction thumb on the right side (e.g., just above the Dash button). This eliminates any overlap or conflict with the continuous touch-drag steering on the left side, allowing for immediate vertical evasion when a strike shadow appears.
