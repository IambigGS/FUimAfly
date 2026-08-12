# Subagent Team Collaboration Protocol

This rule governs how the lead agent coordinates and orchestrates multi-agent tasks involving our specialist team members (Luna, Echo, Atlas, Doc, Scott, etc.).

## Workflow Rules

When engaging multiple subagents for a task, you MUST follow this iterative protocol:

1. **Initial Engagement & PRD Generation**:
   Assign each subagent their specific domain task. Instruct them that their primary output should be a Product Requirements Document (PRD) or detailed proposal file, rather than immediately writing code.
   - **Crucial Formatting Rules for Agents**:
     - ALL proposal/PRD filenames MUST be prefixed with a timestamp in `YYYY-MM-DD-HHMM-` format (e.g., `2024-05-20-1430-munch_resume_proposal.md`) so they can be sorted chronologically in the Team Hub.
     - ALL proposals MUST start with a brief, plain-English "TL;DR" opening statement summarizing the conclusion (e.g., "Yes, that is possible, but there are potential issues as listed below..."). This is for the user who prefers brief, high-level summaries before reading dense technical details.
2. **Consolidation & Conflict Checking**:
   The lead agent will review all generated PRDs. The lead agent must consolidate these plans and check for cross-domain conflicts (e.g., UI conflicting with audio, or performance constraints).
3. **Re-Consultation**:
   If conflicts exist or designs need to be adjusted based on another subagent's PRD, the lead agent must re-consult the affected subagents. Share the relevant constraints and ask them to update their PRDs.
4. **Iterative Alignment**:
   Repeat the back-and-forth consultation until all subagents are aligned and there are no unresolved conflicts.
5. **Implementation**:
   Once everyone is happy and aligned, the lead agent will proceed to implement the changes in the codebase.
