# Audio Engineering Proposal: Dumpling Munching Playback State & Offset Management

**Author:** Echo (Lead Audio Engineer)  
**Target Module:** Be the Fly Mode (`src/utils/audio.ts` & `src/components/BeTheFlyCanvas.tsx`)  
**Date:** August 10, 2026  
**Status:** PRD / Technical Proposal  

---

## 1. Executive Summary & Core Recommendation

In **'Be the Fly'** mode, players control the fly in first-person scale, landing on dumplings to munch them while dodging giant chopsticks. A key audio design question arises:

> *When landing on another dumpling or returning to the same dumpling, should the landed dumpling audio file resume playback from where it left off, or start from the beginning / pick a new random sample?*

### Echo's Recommendation: The Context-Aware "Transient Attack + Per-Dumpling State Memory" Hybrid

1. **Landing on ANOTHER Dumpling:** **ALWAYS Start from 0.0s / Pick a New Random Sample.** Landing on a fresh dumpling represents a new physical target. Carrying over an offset from a previous dumpling breaks spatial object identity and sounds disorienting.
2. **Returning to the SAME Dumpling:** **RESUME Offset with Transient Attack (if within 3.0s window).** If the fly briefly takes off to dodge a chopstick and re-lands on the *same dumpling* within 3 seconds, resume the sustained chew sequence from its saved timestamp offset, accompanied by a quick 50ms procedural landing bite. If away for >3 seconds, reset the sample timestamp.

---

## 2. Web Audio API Technical Deep-Dive

### 2.1 The `AudioBufferSourceNode` Lifecycle Constraint
In the Web Audio API, an `AudioBufferSourceNode` is **single-use (ephemeral)**. Once `.start()` is called and playback is stopped or ends, the node cannot be re-used or restarted.

To achieve "resume playback from offset", we cannot simply call `source.play()` or `source.resume()`. Instead:
1. When playback stops (fly takes off), calculate elapsed time:
   $$\text{elapsed} = (\text{ctx.currentTime} - \text{startTime}) \times \text{playbackRate}$$
   $$\text{newOffset} = (\text{savedOffset} + \text{elapsed}) \pmod{\text{buffer.duration}}$$
2. Store `newOffset`, `bufferIndex`, and `lastPlayedTime` in a `Map<number, DumplingAudioState>`.
3. When re-landing, create a **new** `AudioBufferSourceNode`, attach the buffer, and call `source.start(now, newOffset)`.

### 2.2 Micro-Fade & DC Offset Pop Prevention
Starting playback at an arbitrary non-zero offset (e.g. $t = 1.42\text{s}$) where the audio waveform amplitude is non-zero will cause an instantaneous signal step-function from $0.0 \to A$, resulting in a speaker **pop/click**.

*Technical Requirement:* Every offset start must include an automated 5ms–10ms linear/exponential gain ramp:
```typescript
const now = ctx.currentTime;
gainNode.gain.setValueAtTime(0.001, now);
gainNode.gain.linearRampToValueAtTime(targetVolume, now + 0.008); // 8ms micro-fade
source.start(now, offset);
```

---

## 3. Audio Feel & Game Mechanics Evaluation

| Scenario | Audio Strategy | Game Feel & Player Psychology | Engineering / Audio Quality |
| :--- | :--- | :--- | :--- |
| **Landing on ANOTHER Dumpling** | **New Random Sample / Offset 0.0s** | **Excellent:** Distinct audio feedback per dumpling; reinforces target change. | Clean transient attack; no offset calculation required. |
| **Landing on ANOTHER Dumpling** | **Resume Global Offset** | **Poor:** Feels like an audio bug; chews sound identical across separate objects. | Disjointed audio continuum. |
| **Returning to SAME Dumpling (<3s)** | **Resume Saved Offset + Bite Snap** | **Superior:** Seamless continuity of the feast session; dodging chopsticks feels like an interruption to an ongoing action. | Requires per-dumpling state map (`Map<number, DumplingAudioState>`) + micro-fade ramp. |
| **Returning to SAME Dumpling (<3s)** | **Restart from 0.0s Every Time** | **Satisfying initial bite, but repetitive:** Can sound like machine-gun triggering if player rapidly taps/hops on the dumpling. | Risk of audio buffer spam if not rate-limited. |
| **Returning to SAME Dumpling (>3s)** | **Reset Offset to 0.0s / New Sample** | **Realistic:** Fly left the area, returning feels like starting a fresh eating spot on the dumpling. | Prevents stale offsets from persisting indefinitely. |

---

## 4. Architectural Blueprint & Proposed Implementation

### 4.1 Data Structure (`src/utils/audio.ts`)

```typescript
interface DumplingAudioState {
  bufferIndex: number;
  playbackOffset: number; // in seconds
  startTime: number;      // AudioContext currentTime when started
  lastActiveTime: number; // AudioContext currentTime when paused
  playbackRate: number;
}

// Map dumplingId -> audio state
private dumplingStates: Map<number, DumplingAudioState> = new Map();
```

### 4.2 Playback Control Method Signature

```typescript
playDumplingMunch(dumplingId: number) {
  if (this.isCutsceneMuted || !this.ctx || !this.sfxGain || !this.soundEnabled) return;

  const now = this.ctx.currentTime;
  const RESUME_TIMEOUT = 3.0; // seconds

  // 1. Play immediate procedural landing bite transient (50ms snap)
  this.playMunchBiteTransient();

  // 2. Retrieve existing state or initialize new
  let state = this.dumplingStates.get(dumplingId);
  
  if (state && (now - state.lastActiveTime) > RESUME_TIMEOUT) {
    // Timeout exceeded: reset state
    state = undefined;
  }

  let bufferIndex: number;
  let offset: number;

  if (state) {
    // Resume existing sample offset for this dumpling
    bufferIndex = state.bufferIndex;
    offset = state.playbackOffset;
  } else {
    // New dumpling or reset state: pick new random sample & start at 0
    bufferIndex = Math.floor(Math.random() * this.landedDumplingBuffers.length);
    offset = 0;
  }

  const buffer = this.landedDumplingBuffers[bufferIndex];
  const source = this.ctx.createBufferSource();
  source.buffer = buffer;

  const rate = 0.95 + Math.random() * 0.1;
  source.playbackRate.setValueAtTime(rate, now);

  // Micro-fade gain node to prevent click/pop on non-zero offsets
  const munchGain = this.ctx.createGain();
  munchGain.gain.setValueAtTime(0.001, now);
  munchGain.gain.linearRampToValueAtTime(1.0, now + 0.008);

  source.connect(munchGain);
  munchGain.connect(this.sfxGain);

  // Start at offset
  source.start(now, offset % buffer.duration);

  // Save active state
  this.dumplingStates.set(dumplingId, {
    bufferIndex,
    playbackOffset: offset,
    startTime: now,
    lastActiveTime: now,
    playbackRate: rate
  });
}
```

### 4.3 Stopping & Offset Accumulation

```typescript
stopDumplingMunch(dumplingId?: number) {
  if (!this.ctx) return;
  const now = this.ctx.currentTime;

  if (dumplingId !== undefined) {
    const state = this.dumplingStates.get(dumplingId);
    if (state) {
      const elapsed = (now - state.startTime) * state.playbackRate;
      state.playbackOffset = (state.playbackOffset + elapsed) % 10; // offset accumulator
      state.lastActiveTime = now;
    }
  }

  if (this.activeMunchSource) {
    try {
      this.activeMunchSource.stop();
      this.activeMunchSource.disconnect();
    } catch (e) {}
    this.activeMunchSource = null;
  }
}
```

---

## 5. Conclusion & Direct Answer for the User

**Answer to the User's Question:**
- **When landing on another dumpling:** Audio should **start from the beginning / pick a new random sample**, giving distinct physical identity to each dumpling.
- **When returning to the same dumpling:** Audio should **resume from where it left off (stored track offset)** if the break was brief (<3 seconds), paired with an immediate 50ms landing bite transient to maintain tactical feedback without audio repetitive stuttering.
