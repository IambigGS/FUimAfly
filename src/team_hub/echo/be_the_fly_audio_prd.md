# PRD: 'Be the Fly' Mode - Procedural Audio Design

## Overview
In the 'Be the Fly' mode, players experience the world from the perspective of the fly. This fundamentally flips our audio spatialization. Instead of the fly moving around the player, the player IS the fly, and the massive chopsticks and the environment are moving relative to the player.

## 1. Spatial Audio Design (First-Person Fly Perspective)
- **Listener Node:** The Web Audio API `AudioListener` is now attached to the fly (the camera/player).
- **Environmental Scale:** The world needs to sound massive. Dumplings and bowls should have large, resonant acoustic properties.
- **Doppler Effect:** Since the player (fly) is moving rapidly, Doppler shift should be emphasized for stationary objects passing by and especially for the incoming giant chopsticks.

## 2. Fly Buzz Generation (Based on Movement)
- **Base Oscillator:** A sawtooth wave mixed with a triangle wave for the core buzz.
- **Movement Modulations:**
  - **Pitch Shift:** The base frequency (e.g., 180-220 Hz) modulates based on the fly's velocity. Accelerating increases pitch, slowing down decreases it.
  - **Amplitude Modulation (Wing Flaps):** A high-speed low-frequency oscillator (LFO) modulating volume to simulate wing beats. The intensity and speed of this LFO scale with acceleration.
  - **Strafing/Turning:** Slight detuning or stereo widening (panning changes) when making sharp turns to simulate unequal wing effort and air displacement.
- **Implementation:** All implemented procedurally via the Web Audio API. Safe garbage collection of oscillators on death/reset must be enforced to prevent mobile audio leaks.

## 3. Giant Chopsticks (Massive Whoosh & Impact)
- **Whoosh Generation:**
  - **Noise Source:** A filtered pink noise buffer.
  - **Bandpass Filter Sweep:** As the chopstick approaches, a bandpass filter sweeps from high to low frequencies, creating a terrifyingly massive "whoosh" sound.
  - **Spatialization:** PannerNode tracking the chopstick tips. 3D spatialization with a steep rolloff to make near-misses feel dangerous and uncomfortably close.
  - **Low-Frequency Rumble:** An underlying sine wave at ~40Hz that increases in volume as the chopsticks close in, giving them immense "weight" and scale.
- **Impact (Wood on Wood/Bowl/Dumpling):**
  - **Procedural Clack:** A very short burst of white noise with a sharp exponential decay envelope, combined with a pitched decaying sine wave (around 500-800Hz for wood resonance).
  - **Reverb:** Sent through a ConvolverNode to simulate the resonance of the room, emphasizing the miniature scale of the fly in a vast environment.
- **Volume Balancing:** The background Zen flute will automatically duck (sidechain compression effect) when the massive chopstick impacts occur to maintain a harmonious mix and prioritize gameplay cues.

## 4. Audio Safety & Lifecycle
- Strict management of `AudioContext` state.
- All dynamic oscillators for the fly buzz and chopstick whooshes must be explicitly stopped (`oscillator.stop()`) and disconnected (`node.disconnect()`) when returning to the main menu or pausing.
