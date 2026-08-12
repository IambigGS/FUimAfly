---
name: subagent-team-presentation-hub
description: >-
  Protocol and guidelines for managing subagent PRD submissions, Team Hub file ordering, and opening summary formatting.
---

# Subagent Team Presentation Hub Protocol

This skill dictates how specialist subagents (Luna, Echo, Atlas, Doc, Scott, Sid) publish proposals and how the Team Hub displays assets.

## Subagent PRD Creation Rules

### 1. Chronological Timestamp Prefix Naming
All subagent proposal files saved to `src/team_hub/<agent_name>/` MUST be prefixed with a date-time timestamp:
- **Format:** `YYYY-MM-DD-HHMM-description.md`
- **Example:** `2026-08-10-0225-munch_resume_proposal.md`
- **Rationale:** Guarantees that reverse-alphabetical sorting (`localeCompare` descending) in `TeamHub.tsx` displays the newest feedback at the very top.

### 2. High-Level Plain-English TL;DR Intro
All PRDs and proposals MUST start with a brief, plain-English summary (1-3 sentences) answering the core question directly before presenting deep technical details:
- **Example:** `"TL;DR: Yes, that is possible, but there are potential issues as listed below..."`
- **Rationale:** Enables rapid scanning for users who prefer concise summaries over dense technical specifications.

### 3. Media Asset Placement
- Place visual graphics (`.png`, `.jpg`, `.svg`) in `src/team_hub/<agent_name>/` for Luna's gallery.
- Place audio clips (`.mp3`, `.wav`) in `src/team_hub/<agent_name>/` for Echo's player.
