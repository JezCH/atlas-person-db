---
name: atlas-polity-identity
description: Handle ATLAS political-entity identity, succession, continuity, restoration and retirement questions with precise UUID evidence, existing registry, temporal/source boundaries and human approval gates.
---

# ATLAS polity identity and continuity

Use only when the task concerns political-entity identity, historical succession, duplicate Polities, a restored polity, or retirement/tombstones.

1. Identify the **exact target UUID(s)** and historical ambiguity. Name similarity alone never establishes identical political identity.
2. Read the existing `atlas-polity-review-registry.js` disposition for the target; it is the canonical review-ledger source, not this skill. Use the latest #1895 task checkpoint only if needed.
3. Distinguish continuity of institutions, sovereignty, dynastic succession, title/designation, geographical control and activity dates. Do not merge these concepts because the same label appears.
4. Preserve historic evidentiary provenance and distinguish *observed current Production state* from *archived audit evidence*. Never invent a dissolution/start date or silently bind uncertain IDs.
5. Check whether the fix belongs to read-only research, offline code regression, approved Authoring, migration, or Runtime Compile. An offline replay fix does **not** clean up a live retirement contradiction by itself.
6. Any destructive identity change, deletion or retirement still needs user approval, canonical-writer preflight and one actual read-back as described in `WORK_EXECUTION.md`.

Focused existing case: Draft PR #2547 concerns reappearance of Japanese retirement tombstones from migration replay; it does not grant authorization to alter three live historical identities or to merge the PR. Compare its exact files before preparing independent changes.
