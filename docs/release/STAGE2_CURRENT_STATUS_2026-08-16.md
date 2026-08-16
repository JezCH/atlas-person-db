# ATLAS Stage 2 current status — 2026-08-16

This document exists to stop historical branch/release snapshots from being mistaken for the current execution position.

## Current conclusion

- **P3–P4:** completed on the Baseline A v2 integration line.
- **P5–P9:** completed through Production. The additive schema release succeeded and the Train 2 Production release completed through the semantic-key v2 cutover.
- **P10:** **current / not complete.** The semantic-key v2 duplicate-revalidation workflow is green on current main, but the controlled Production P10 revalidation release has not completed successfully. Physical Person merge must therefore remain fail-closed unless a later exact Production revalidation proves it safe and necessary.
- **P11:** implementation/readiness is present, but the authenticated Production Baseline B capture has not yet been executed. P11 is not complete merely because the capture workflow exists.
- **P12–P14:** pending after the P10/P11 gates.

Historical Baseline A counts and digests remain valid immutable evidence for the point in time at which they were captured; they are not current Production inventory counts.

## Verified release evidence

### P3–P9 integration

PR #128 (`Rebuild Stage 2 integration from durable Baseline A`) was merged as commit `e2dad306ef7059199f4c5d801d0ec5e7491d6528`. Its reviewed package closed the P3/P4 identity/research frontier, rehearsed P5/P6, reached the P8 zero-known-blocker gate, and established Activity semantic-key v2 for P9.

### P5 additive schema in Production

`ATLAS Stage 2 Schema Release` workflow run **31797550119** completed successfully on commit `6e1952662eaa8dbd985f8fd3bc023f5dc1e41d8a`.

The earlier run 31795719913 failed and is historical failure evidence only; it must not be mistaken for the final release result.

### P6–P9 Train 2 Production release

`ATLAS Stage 2 Train 2 Release` workflow run **31806129999** completed successfully on commit `b9e38bb63244b608865d654860d4d7cb72de5133`.

The release workflow is fail-closed: its final verification requires the P9 semantic-key v2 index to be present, the legacy index to be absent, semantic duplicate groups to be zero, and physical Person merge to remain blocked at that point. A successful run therefore constitutes the Production P9 release evidence for that reviewed release envelope.

### P10 current gate

`ATLAS P10 Person Duplicate V2 Revalidation` run **31930295243** completed successfully on current-main commit `1efa27dc6a8d15f43e30d09c94f8dd65ea159a84` during this audit.

However, controlled `ATLAS P10 Revalidation Release` runs **31860809561** and **31871797502** both concluded in failure. Therefore P10 must remain pending/current in the Source of Truth. A green non-destructive revalidation workflow is not equivalent to a successful controlled Production P10 release or an authorization to perform physical Person merges.

### P11 current gate

The P11 Baseline B capture workflow and readiness checks are merged on main. During this audit, the `atlas-p11-baseline-b-capture.yml` workflow had **0 Production capture runs**. Therefore no current Production Baseline B artifact should be claimed yet.

## Cleanup/audit implication

Until the P11 Production Baseline B artifact exists, old Baseline A or earlier Production snapshots may be used only as historical clues. Current cleanup decisions that can destroy or rewrite data must be based on a fresh governed Production snapshot or the existing exact correction/authoring pathways.

The project-wide integrity audit introduced with this status update is deliberately read-only. It reports Korean-name coverage, zero-source Activities, dangling references, semantic-v2 incompleteness, exact Activity duplicates, Activity-unreferenced catalogs, and Polity/HistoricalEvent review collisions. It does not authorize deletion or mutation.
