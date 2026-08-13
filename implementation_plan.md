# Implementation Plan - Be the Fly Touchscreen Auto-Feasting & Incremental APK v1.5 Build

Enable automatic feasting on touchscreen devices when releasing/taking finger off a dumpling in "Be the Fly" POV mode, delegate testing and build tasks to subagents (Scott & Atlas), push changes to GitHub, and package an incremental `FUimAfly_v1.5.apk`.

## User Review Required

> [!IMPORTANT]
> **Incremental Versioning:** Existing APKs (`v1.0` through `v1.4`) will be preserved untouched in `APKs/`. The new build will be output to `APKs/FUimAfly_v1.5.apk` with `versionName = "1.5"` and `versionCode = 2` in `android/app/build.gradle`.

> [!NOTE]
> **Subagent Delegation:** In accordance with team protocol and user instructions, Scott (QA) will assist in validating the interaction, and Atlas (Build Master) will execute the Capacitor Android build.

## Proposed Changes

### Be the Fly Component

#### [MODIFY] [BeTheFlyCanvas.tsx](file:///c:/bgs/all%20myAssets/0myApps-All/steve_arena/FUimAfly/src/components/BeTheFlyCanvas.tsx)

- Add touchscreen detection (`isTouchDeviceRef`) and expand touch tracking to support direct cursor tracking alongside virtual joystick.
- Update `handleTouchEnd`: When a touch ends (finger lifted off screen), if the fly is landed over a dumpling (`closestDumplingIndex !== -1`), automatically set `isFeastingRef.current = true` to start eating.
- Update render/physics loop: Ensure touch users automatically munch when hovering/landed over a dumpling, and cleanly stop munching when moving away.

---

### Android Build Configuration

#### [MODIFY] [build.gradle](file:///c:/bgs/all%20myAssets/0myApps-All/steve_arena/FUimAfly/android/app/build.gradle)

- Increment `versionCode` to `2` and `versionName` to `"1.5"`.

---

### Team Subagent Delegation

- **Scott (QA Tester):** Review and verify touchscreen gesture handling and Be the Fly canvas feasting state.
- **Atlas (Build Master):** Run Vite build (`npm run build`), sync Capacitor (`npx cap sync android`), compile APK (`gradlew assembleDebug`), and export `APKs/FUimAfly_v1.5.apk`.

## Verification Plan

### Automated Tests & Build Commands
- `npm run lint` / `npx tsc --noEmit` to verify type safety.
- `npm run build` to compile production web assets.
- `npx cap sync android` to sync web build to native Android project.
- `cd android; .\gradlew.bat assembleDebug` to compile Android APK.

### Manual Verification
- Verify `APKs/FUimAfly_v1.5.apk` is created without altering `FUimAfly_v1.4.apk`.
- Test Be the Fly mode touch interaction flow on screen.
