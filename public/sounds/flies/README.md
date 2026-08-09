# Fly Audio Assets (Single Source of Truth)

This directory is the definitive source of truth for runtime fly and ninja sound effects.

## Folder Structure & Naming Conventions

### 1. Flying Sounds (`flying/`)
- Directory: `public/sounds/flies/flying/`
- Naming: `fly_sound_1.mp3`, `fly_sound_2.mp3`, `fly_sound_3.mp3`, ... `fly_sound_N.mp3`
- Current count: 9 files (`fly_sound_1.mp3` through `fly_sound_9.mp3`).
- **Adding new fly sounds**: Drop `fly_sound_10.mp3`, `fly_sound_11.mp3`, etc. directly into `flying/`. The audio engine auto-discovers sequentially numbered files.

### 2. Ninja Fly Cutscene / Intro Sounds (`ninja/`)
- Directory: `public/sounds/flies/ninja/`
- Naming: `ninja_1.mp3`, `ninja_2.mp3`, `ninja_3.mp3`, ... `ninja_N.mp3`
- Current count: 3 files (`ninja_1.mp3` [Level 1 / Default], `ninja_2.mp3` [Level 2], `ninja_3.mp3` [Level 3]).
- **Adding new ninja sounds**: Drop `ninja_4.mp3`, `ninja_5.mp3`, etc. into `ninja/`.

### 3. Landed - Drink (`landed_drink/`)
- Directory: `public/sounds/flies/landed_drink/`
- Naming: `landed_drink_1.mp3`, `landed_drink_2.mp3`...

### 4. Landed - Dumpling (`landed_dumpling/`)
- Directory: `public/sounds/flies/landed_dumpling/`
- Naming: `landed_dumpling_1.mp3`...

### 5. Captured (`captured/`)
- Directory: `public/sounds/flies/captured/`
- Naming: `captured_1.mp3`, `captured_2.mp3`...

---

## Archiving
Older or redundant root-level duplicates are safely stored in:
`_raw_assetts/archive/legacy_public_sounds/`
