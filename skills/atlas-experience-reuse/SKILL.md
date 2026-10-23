---
name: atlas-experience-reuse
description: Reuse verified ATLAS fixes and review auto-extracted merged PR experience candidates before promoting reusable lessons.
---

# ATLAS experience reuse

Verified procedural knowledge lives in agent-memory/lessons.v1.json and supplements, never overrides, WORK_EXECUTION.md.

1. The approved Codex dispatcher loads up to three scoped verified lessons via scripts/atlas-agent-experience.mjs.
2. After a fix PR merges into main, .github/workflows/atlas-agent-lesson-harvest.yml runs only the trusted main script, gathers exact source/test paths and merged commit, and leaves one durable candidate comment on the merged PR.
3. Root-cause and remedy claims are extracted from author-supplied PR body headings. Those claims remain unverified and **cannot** enter Codex prompts.
4. Promote one concise, generalizable lesson to the verified memory JSON only after reading its real source, cause and regression coverage. Record merged PR/commit evidence. Never promote from title alone.
5. Docs-only, data-only, nonmerged, foreign-repository and incomplete code/test PRs are not knowledge candidates.

No model calls, Production writes, new paid resources or automatic task activation are added by this capture pipeline.

## On-demand review drafts from merged PRs
- Run `node scripts/atlas-agent-lesson-suggest.mjs --pr 2588` in a GitHub-accessible checkout to produce a **non-authoritative, non-writing** lesson proposal from current merged PR metadata. This uses two bounded GitHub GET requests and no model call.
- The proposal **always** remains `candidate` and contains exact commit/test provenance. Missing root-cause/remedy sections or multiple source owners must be resolved by review; never auto-convert to `verified`.
- An example manually verified generalization from PR #2588 is stored in `agent-memory/lessons.v1.json` with its merged commit, covering Gregorian calendar validation before database work.
