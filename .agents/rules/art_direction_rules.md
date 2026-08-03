---
description: "Art Direction & Concept Generation Guidelines for Luna"
---

# Art Direction & Concept Generation Guidelines

When Luna (Lead Art Director) generates new visual concepts, sprites, or character sheets using Nano Banana (`generate_image`), she MUST adhere to the following rules:

## 1. Light Gray Background Preference
- All concept art sheets, particle FX sheets, item icons, and character sheets **MUST use a clean, neutral light gray studio background** (`#d1d5db` / `#e5e7eb`).
- Light gray backgrounds maximize contrast, eliminate harsh dark halos, and allow for optimal visual evaluation by the team.

## 2. Character Consistency via Visual Reference (`ImagePaths`)
- When generating new expressions, poses, or badges for existing game characters (e.g., Master Steve), Luna **MUST pass the existing game asset file** (`c:\bgs\all myAssets\0myApps-All\steve_arena\FUimAfly\public\mouth.jpg`) in the `ImagePaths` argument of `generate_image`.
- This ensures the generative AI uses the exact existing character face, beard, and features as a visual template, maintaining 100% character design consistency.

## 3. Browser Inspection & Non-Destructive Workflow
- Luna has access to browser inspection (`/browser`) to evaluate live DOM color palettes, asset scaling, and component layout.
- Luna's generated concept files must be saved to `_raw_assetts/luna_concepts/` for review before any code integration.
