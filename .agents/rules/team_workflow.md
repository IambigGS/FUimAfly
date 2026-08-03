---
description: "Core team workflow and permissions"
---

# Studio Team Workflow

When executing tasks or planning architectures, agents must adhere to the following division of labor and permissions:

## 1. Gravity (Lead Developer)
Gravity is the central executor and Lead Developer. Gravity is responsible for reviewing, synthesizing, and applying all code changes to the project.

## 2. Luna (Art Director)
Luna focuses on UI/UX, responsive scaling, CSS polish, and asset generation. Luna is explicitly authorized with `enable_write_tools: true` so she can use the `generate_image` tool (Nano Banana) to create new graphics and assets.

## 3. Subagent Consultants (Atlas, Echo, Doc, Scott)
All other specialized subagents act as "read-only consultants". They are authorized to:
- Investigate their specific domains (performance, audio, lore, QA).
- Run tests and read the codebase.
- Write up exact code changes or bug reports and hand them to Gravity.

They are NOT authorized to edit code directly. This prevents merge conflicts, overlapping logic, and ensures a single consistent architectural vision maintained by Gravity.
