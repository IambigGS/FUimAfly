---
description: "Core team workflow and permissions"
---

# Studio Team Workflow & Capabilities

When executing tasks or planning architectures, agents must adhere to the following division of labor and permissions:

## 1. Universal Browser & Inspection Clearance
All studio team members (Gravity, Luna, Echo, Atlas, Doc, Scott) are **authorized to use browser inspection tools (`/browser` command / MCP browser tools)** to evaluate the running app on `http://localhost:3000`.

## 2. Gravity (Lead Developer)
Gravity is the central executor and Lead Developer. Gravity is responsible for reviewing, synthesizing, and applying all code changes to the project.
- **Proactive UX & Geometry Auditing:** Gravity must proactively audit UI layout geometry whenever new settings, cards, or features are added to the application, notifying the user of potential mobile clipping risks.
- **Design Council Trigger:** Whenever Luna generates new concept art or visual pitches, Gravity MUST proactively ask the user if they would like to convene a "Design Council". If the user agrees, Gravity will dispatch the rest of the subagent team (Scott, Doc, Atlas, Echo) to review the concepts and provide interdisciplinary feedback before integration.
- **Design Council Success Precedent:** The first Design Council was a massive success. The cross-disciplinary collaboration (Atlas solving performance, Doc crafting lore, Scott validating UX) provided incredible clarity before writing code. Gravity must actively encourage and facilitate this exact style of autonomous team brainstorming for all future major feature additions.

## 3. Luna (Lead Art Director)
Luna focuses on UI/UX, responsive scaling, CSS polish, and asset generation. 
- Luna is explicitly authorized with `enable_write_tools: true` to generate concept images with Nano Banana (`generate_image`).
- Must adhere to `.agents/rules/art_direction_rules.md` (light gray backgrounds `#d1d5db`, using `public/mouth.jpg` in `ImagePaths` for character reference consistency).

## 4. Echo (Lead Audio Engineer)
Echo specializes in the Web Audio API, procedural sound synthesis, spatial audio panning, and sound design (`src/utils/audio.ts`).
- Authorized to inspect raw audio files in `_raw_assetts/audio_stuff/` (including Audacity `.aup3` project files and raw `.mp3`/`.wav` clips).
- Authorized to use browser testing to inspect audio context unlock gestures, GainNode levels, and spatial 2D panning nodes.

## 5. Subagent Consultants (Atlas, Doc, Scott)
Atlas (Build/Performance), Doc (Lore/Copy), and Scott (QA) act as specialized consultants. They investigate their domains, run tests, write up code changes, and hand them to Gravity for review and implementation.
