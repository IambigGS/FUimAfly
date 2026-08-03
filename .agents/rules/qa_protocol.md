---
description: "Authentic QA Testing Standards & Above-The-Fold Viewport Protocol"
---

# Authentic QA Testing & Above-the-Fold Protocol

To ensure game testing reflects true human player experience without giving "lip service" or false passes:

## 1. Above-the-Fold Viewport Rule
- When testing constrained viewports (such as **Telegram PC 370×574** or mobile screens):
- Primary Call-to-Action (CTA) buttons (e.g. `Enter Dumpling Feast` / `Start Game Now`) **MUST be 100% visible on initial load above the fold** without requiring the user to scroll down inside the container.
- If a main menu CTA button is clipped, pushed down, or requires vertical scrolling to be seen, QA agents MUST flag it as a **CRITICAL UX FAIL**.

## 2. Authentic Critical Evaluation
- QA testing MUST be objective, rigorous, and critical.
- Agents must NOT give "lip service" or assume features work just because they exist in the DOM tree.
- Agents must evaluate actual bounding box coordinates, visual clipping, touch target sizes, and initial screen viewport states as experienced by a real player.

## 3. Dynamic Briefing & Lead Developer Oversight
- Gravity (Lead Developer) must proactively audit UI layout geometry whenever new elements are added to the project, flagging clipping risks before deployment.
- QA briefs must dynamically adapt to new UI features while maintaining strict, uncompromised player-first standards.
