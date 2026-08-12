# Wasp Attack Mini-Game - Audio PRD

## Overview
This document outlines the procedural sound design for the 'Wasp Attack' mini-game, transitioning from the zen-like fly-catching game to a fast-paced, head-on wasp defense sequence.

## 1. Musical Transition
- **Trigger**: The master catches a wasp.
- **Effect**: The tranquil background music (Zen flute, gentle chimes) abruptly stops with a harsh, descending pitch-bend or a dramatic struck gong.
- **Mini-Game BGM**: A sudden shift to high-tempo, tense percussion (e.g., taiko drums and fast-paced wooden clacks) to elevate the player's heart rate, representing the sudden influx of angry wasps. 

## 2. Wasp Sound Design (Procedural Audio)
- **Base Sound**: A deeper, more aggressive buzz compared to the standard flies. 
- **Oscillators**: Combine a sawtooth wave for the harsh buzz and a lower-frequency sine wave for body resonance.
- **Doppler Effect (Distance & Velocity)**: 
  - *Volume*: Starts quiet and rapidly increases as the wasp approaches the screen.
  - *Pitch*: High pitch when spawned in the distance, shifting downward as it passes or approaches the player, simulating the Doppler effect.
  - *Spatial Panning*: 2D stereo panning based on the wasp's horizontal position (left/right).

## 3. Interaction Sound Effects
- **Successful Hit (Wasp Defeated)**: A sharp, resonant wooden 'THWACK' (procedural percussive hit) combined with a high-pitched squashing squelch.
- **Miss (Wasp Attacks Player)**: A visceral, painful sting sound—perhaps a sharp, high-frequency zap combined with a low, distorted bass drop indicating damage or disorientation.
- **Player Damage/Stun**: Heartbeat thumps using low-frequency oscillators.

## 4. Audio Safety & Resource Management
- **Garbage Collection**: All wasp oscillators MUST be cleanly stopped and disconnected from the AudioContext immediately upon a hit, miss, or game pause.
- **Limiter**: A compressor node will be added to the master output to ensure the loud wasp sounds and sudden percussion do not clip or distort on mobile devices.
