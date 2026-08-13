# 🎨 Art Direction & UI/UX Spec: "Be the Fly" Mode
**Author:** Luna (Lead Art Director & UI/UX Designer)  
**Date:** 2026-08-13 16:20  
**Project:** FUimAfly  
**Status:** Approved for Team Hub Showcase  

---

## 🍵 1. Creative Direction: Studio Ghibli Zen Aesthetic

To capture the cozy yet high-stakes tension of playing as a tiny fly inside Master Steve's dining dojo, the visual style adopts a **hand-painted Studio Ghibli Zen aesthetic**.

- **Color Palette & Lighting:** Soft, warm, watercolor-inspired tones (`#FAF3E0` cream background, `#D4A373` warm bamboo, `#E07A5F` terracotta accents). Ambient sunlight filters through Shoji screen doors, casting soft paper shadows across tatami mats.
- **Environment Detail:** The dining table becomes an expansive wooden landscape. Soy sauce dishes resemble dark reflecting pools, and steam rising from freshly cooked food uses organic, soft particle puffs rather than harsh smoke vectors.
- **Master Steve:** Rendered with expressive Ghibli-style character linework—an imposing yet serene figure whose focused gaze and dramatic chopstick posture command respect and urgency.

---

## 👁️ 2. Insect Vision & Compound Eye Vignette

Playing from the housefly's point-of-view (POV) requires a signature visual filter that immerses the player without inducing motion sickness or obscuring gameplay.

- **Hexagonal Compound Eye Vignette:** A custom shader/overlay framing the outer screen border with semi-translucent hexagonal ommatidia patterns (`#1A1A1A` with 15–25% edge opacity). The center field of view remains crystal clear for precision flying.
- **Wide Field-of-View (105° FOV):** Enhances peripheral motion sensitivity, making incoming chopstick strikes feel fast and dynamic.
- **Speed Lines & Wind Distortions:** Dynamic, low-cost radial speed lines trigger during fast dashes (`Evasive Dash`) to heighten the sensation of rapid maneuverability.

---

## 🥟 3. The Dumpling Feast Visual Experience

The centerpiece of the game mode is the **Grand Dumpling Steamer Feast**.

- **Scale Perspective:** The dumpling is presented as a titanic, glistening mountain of steaming food sitting atop a hand-crafted bamboo basket.
- **Feasting Micro-Interactions:** When the fly lands and feasts, glowing golden crumb particles drift upward, and a dynamic circular "Greed & Satiety Meter" fills around the touch interaction target.
- **Steam & Texture:** Soft rim lighting showcases moisture and texture on the dumpling crust, making the target irresistibly appetizing.

---

## 🥢 4. Chopstick Strike Dynamics & Threat Indicators

- **Shadow Telegraphing:** A high-contrast, growing shadow expands under the fly 0.6 seconds prior to a chopstick impact, alerting the player even when looking straight ahead.
- **Chopstick Impact Shockwaves:** When chopsticks hit the surface, a radial ripple effect warps the surrounding scene, accompanied by dynamic screen shake proportional to proximity.
- **Threat Direction Arrows:** Pulsing red/amber directional indicators flash at screen edges when Master Steve prepares a strike from off-screen angles.

---

## 📱 5. Mobile & UI/UX Layout Integration

- **Ergonomic Dual-Thumb Controls:**
  - **Left Side:** Continuous 360° touch-drag virtual joystick for flight vector steering.
  - **Right Side:** Tiered action buttons:
    - **Evasive Dash** (Bottom Right, main thumb target).
    - **Land & Feast** (Middle Right).
    - **Ascend / Eject** (Top Right, dedicated vertical lift to instantly dodge ground chopstick strikes).
- **Responsive Layout:** Automatically scales across standard mobile aspect ratios (16:9, 19:9, 20:9) and desktop widescreen monitors without clipping HUD elements.
