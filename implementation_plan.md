# Implementation Plan: Manic Endorphin Swarm Loop (No Cooldown!)

> [!NOTE]
> **TL;DR (The Crux of It)**
> * **NO Tap Cooldown (Pure Manic Tapping Allowed!)**: Players can tap/swipe as fast as 10+ times a second! We won't block or delay their taps.
> * **The Endorphin Ping-Pong Loop**:
>   1. **Dumpling Swatting**: Player taps crazy fast on dumplings.
>   2. **Head Swarm Distraction**: Suddenly, a massive swarm swoops up around Master Steve's head! Player looks up: *"Ah! They're all on his head!"*
>   3. **Master Head Swatting**: Player frantically clears the head swarm.
>   4. **Dumpling Reswarm**: While they clear the head, new flies instantly hover back over the dumplings!
> * **Result**: Non-stop, high-speed action that fires endorphins without ever feeling laggy or restrictive!

## User Review Required

Does this high-speed Ping-Pong Swarm flow hit the exact manic vibe you want?
If approved, I will implement this logic in `GameCanvas.tsx` for fast, seamless play! (No APK build will be run until you ask).

## Proposed Changes

---

### `src/types.ts`

Update the `Fly` interface to support dynamic target zones.

#### [MODIFY] GameCanvas.tsx / types.ts
- Add `targetZone?: 'dumpling' | 'master_head'` to the `Fly` interface.

---

### `src/components/GameCanvas.tsx`

Implement the dynamic ping-pong swarm cycle.

#### [MODIFY] GameCanvas.tsx
- **Dynamic Swarm Cycle**: When flies around the food/dumpling area are cleared quickly, automatically divert spawned flies into a `master_head` swarm zone.
- **Head Swarm Clearing**: As the player manic-taps the head swarm, trigger new fly arrivals back over the dumplings.
- **Instant Tap Responsiveness**: Remove any input cooldown so every valid tap instantly registers a chopstick strike with maximum visual impact and clack sound feedback!

