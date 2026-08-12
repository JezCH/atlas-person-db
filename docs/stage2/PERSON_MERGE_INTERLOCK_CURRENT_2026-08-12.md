# Person Merge Interlock — Current Contract — 2026-08-12

> Status: ACTIVE SAFETY INTERLOCK / IDENTITY REVIEW ALLOWED / PHYSICAL MERGE BLOCKED

## Problem closed by this contract

The Phase 9 duplicate subsystem was originally built before final Stage 2 Activity identity was fixed. Its existing relationship reconciliation groups Activities by Polity + Period Basis + year-level start/end, with Role handled separately.

Final Stage 2 Activity identity additionally contains Relation Type and the full interpreted temporal boundaries. Therefore physically merging Persons under the old reconciliation semantics can destroy distinctions that become meaningful after Stage 2.

The roadmap now separates:

- **P4:** duplicate candidate detection and identity decisions;
- **P9:** coherent semantic-key-v2 cutover and v2-aware reconciliation;
- **P10:** candidate rebuild/revalidation followed by physical Person merge.

The runtime must enforce that ordering, not merely document it.

## Current runtime state

`server/atlas-relationship-reconciliation.js` declares:

```text
RECONCILIATION_SEMANTIC_VERSION = v1-polity-period-year-role
```

`server/atlas-person-merge-interlock.js` requires both:

```text
reconciliation semantics = v2-relation-full-temporal
person merge lifecycle   = p10-v2-revalidated
```

Current lifecycle is `pre-p10-blocked`, so physical merge is fail-closed.

An authenticated stale `EXECUTE_APPROVED_MERGE` request receives HTTP 409 with:

```text
PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION
```

The rejection occurs before opening a database connection. There is no environment-variable bypass.

## What remains available

This interlock does **not** disable Phase 9A identity work.

The following remain available:

- duplicate candidate rebuild;
- evidence inspection;
- `MERGE` identity decision recording;
- `KEEP_SEPARATE` decision recording;
- `REVIEW` decision recording.

A `MERGE` decision means “these UUIDs represent the same historical Person.” It does not mean the database rows may yet be destructively merged.

## Why two gates are required

Changing relationship reconciliation to v2 at P9 is necessary but not sufficient to unlock physical merge. Existing candidate/review state may have been produced before the cutover.

P10 must therefore also:

1. rebuild candidates from the post-P9 live state;
2. revalidate evidence and decisions under the final Activity semantics;
3. make the merge executor consume v2 Relation/full-temporal reconciliation;
4. only then advance the lifecycle marker to `p10-v2-revalidated` in the same reviewed code change.

This prevents P9 alone from accidentally making old approvals executable.

## Train implications

The interlock is bundled into the current Train 1 branch without requiring a separate deployment. Once that exact Train 1 SHA is deployed, destructive Person merge becomes explicitly blocked while research and identity review can continue.

P9/P10 may later be shipped in the same coherent Production Train 2 if all cutover and revalidation preconditions are met. The interlock should only become `allowed=true` in the same code state that actually contains the v2 reconciliation implementation and P10 revalidation lifecycle.
