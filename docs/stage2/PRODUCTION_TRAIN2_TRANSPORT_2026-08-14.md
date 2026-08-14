# ATLAS Stage 2 Production Train 2 Transport — 2026-08-14

Status: branch-only release transport. No Production DB mutation from this branch.

Purpose: carry the already reviewed Stage 2 data package from deployed main through true Production P9 before P10 begins.

Order:
1. Existing `ATLAS Stage 2 Schema Release` manual dispatch applies the six-component additive schema.
2. `ATLAS Stage 2 Train 2 Release` manual dispatch applies reviewed P5 identity/source rows and P6 role prerequisites.
3. All reviewed P7 Source/Polity/Governance prerequisite manifests are exact-row replayed.
4. The full P6 54-target package is materialized and dependency-scheduled.
5. Reviewed P7 execution plans are applied with a fresh live v2 snapshot and dry-run before every apply; retirement plans run after non-retirement plans.
6. P9 DB semantic-key v2 preflight rejects duplicate groups, then atomically replaces the legacy NULL-role index with the final relation/full-temporal index.
7. Final verification requires the new index, no legacy index, zero duplicate groups, and the P10 physical Person merge interlock still blocked.

Safety:
- main-only exact deployed SHA;
- GitHub Actions OIDC bound to the exact Train 2 workflow;
- explicit `APPLY:<release_id>` phrase;
- source artifacts cannot self-authorize Production mutation;
- live snapshot before every correction;
- dry-run before every mutation;
- idempotent replay where already applied;
- no physical Person merge;
- no Territory/Geometry mutation.
