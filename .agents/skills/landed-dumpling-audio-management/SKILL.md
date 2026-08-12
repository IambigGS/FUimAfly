---
name: landed-dumpling-audio-management
description: >-
  Guide and procedures for managing dynamic multi-sample audio loading, non-overlapping playback,
  and seamless playback offset resumption in FUimAfly (e.g. landed dumpling munching audio).
---

# Landed Dumpling Audio Management

This skill covers the Web Audio API design patterns used in FUimAfly for dynamic sound loading, offset resumption, and click-free audio controls.

## Key Principles & Workflows

### 1. Dynamic Asset Probing (`discoverSoundsInFolder`)
When assets follow a numbered naming convention (e.g., `landed_dumpling_1.mp3`, `landed_dumpling_2.mp3`):
- Probe paths asynchronously up to `maxProbe = 50`.
- Maintain a consecutive miss tolerance counter (`maxConsecutiveMisses = 3`) to handle missing numbers seamlessly without failing early.
- Pre-decode audio into `AudioBuffer` array.

### 2. Smooth Offset Resumption Across Sessions
To allow sound tracks to continue playing from where they left off across landing or eating sessions:
- Track `munchOffset` (seconds), `munchStartTime` (Web Audio `currentTime`), and `munchBufferIndex`.
- When stopping/pausing audio, calculate elapsed time: `munchOffset += (currentTime - munchStartTime)`.
- Apply a **15ms linear GainNode fade-in / fade-out ramp** on start and stop to eliminate audio pops and clicks.
- Pass `munchOffset` to `source.start(now, munchOffset)`.

### 3. Track Advancement & Bounds Checking
- When a track reaches the end (`source.onended`), reset `munchOffset = 0` and advance `munchBufferIndex = (munchBufferIndex + 1) % buffers.length`.
- Ensure single active `AudioBufferSourceNode` instance tracking (`activeMunchSource`) to prevent overlapping eating sounds.
