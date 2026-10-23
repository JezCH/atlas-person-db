---
name: atlas-experience-reuse
description: Reuse verified ATLAS bug-fix and workflow lessons to avoid repeated failed approaches; add concise, evidence-backed procedural knowledge only after an actual completed task.
---

# ATLAS experience reuse

The persistent memory file is `agent-memory/lessons.v1.json`. It is **advisory**, version-controlled, and is never a new authority over `WORK_EXECUTION.md`, canonical data or GitHub's current state.

1. Run `node scripts/atlas-agent-context.mjs --query 'relevantSymbolOrFailure'` and use only lessons returned for this exact task. Avoid loading the entire history.
2. Each lesson includes a concrete failure mode, successful remedy, limited scope, and a real merged PR/commit. Treat the current file and task version as authoritative if they disagree.
3. After an actually completed improvement, add **one short reusable rule** only when it would prevent repetition. Include `id`, `status: verified`, `scope`, `keywords`, `lesson`, and `evidence` (merged PR/commit or equivalent). Do not record guesses as verified.
4. A new unresolved failure may be placed in the task checkpoint, **not** added to verified long-term lessons. Never create entries just to satisfy a quota, and do not expand this into another management system.
5. Review changes in a normal isolated PR; the memory file grants no merge, model-dispatch or Production authority.

This adapts the procedural-skill and reflective-memory ideas from Voyager/Reflexion without invoking an additional AI API or memory server.
