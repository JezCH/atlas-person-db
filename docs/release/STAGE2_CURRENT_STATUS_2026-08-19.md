# ATLAS current status — 2026-08-19

This document supersedes `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md` **only as the current execution-position summary**. Older status documents remain immutable historical evidence for the state they recorded.

## Audit basis

This status is intentionally conservative. A phase is not promoted to `COMPLETED` unless repository and Production evidence prove the required live transition. Missing evidence remains unresolved rather than inferred.

Verified current repository state at this checkpoint:

- repository: `JezCH/atlas-person-db`
- protected `main` after the audit cleanup: `153f9cdc48852c4b3fa80caded9878d35ee1e4c7`
- `main` branch protection: enabled
- required branch-protection status context exposed by GitHub: `test`
- Production application: `https://atlas-person-db.vercel.app`
- exact Vercel Production deployment for `153f9cdc48852c4b3fa80caded9878d35ee1e4c7`: READY

The project has advanced substantially beyond the 2026-08-16 status document through P10/P11 maintenance, governed historical-person authoring, canonical spacetime placement and UI ownership cleanup.

## Roadmap state

### P0–P9 — COMPLETED

No evidence found in this audit reopens P0–P9. The 2026-08-16 status remains the historical release-evidence summary for the completed Stage 2 schema and Train 2 / semantic-key-v2 cutover.

### P10 — CURRENT / exact Production closure not re-proven by this audit

The repository contains the complete P10 semantic-key-v2 revalidation architecture and later successful non-destructive revalidation evidence after the reviewed Suleiman I corrections. The controlled Production revalidation launcher was also re-entered through PR #240 after those corrections.

The 2026-08-19 audit additionally observed repeated green `ATLAS P10 Person Duplicate V2 Revalidation` checks on the current UI/spacetime cleanup line.

However, this audit did **not** obtain authoritative evidence proving that the final controlled `ATLAS P10 Revalidation Release` completed successfully and closed every live P10 requirement. Therefore:

- `ATLAS-RQ-0220` remains `PENDING`;
- a green ordinary P10 revalidation remains distinct from controlled Production release evidence;
- no physical Person merge is authorized merely by this status refresh;
- do not downgrade or bypass the existing live P10 gates.

The correct next P10 action is evidence recovery / exact live-state remeasurement, not another speculative Person merge implementation.

### P11 — CURRENT / semantic-v2 repair prepared, final Baseline B not proven

P11 implementation is materially beyond the 2026-08-16 state:

- authenticated Baseline B v2 capture support is on main;
- Baseline B remains defined over 41 canonical historical datasets;
- PR #336 added the reviewed legacy semantic-v2 completeness repair path;
- that reviewed transition targeted 301 incomplete legacy Activities to 21 exact relation-only Authoring exceptions and zero unreviewed/blocking semantic-v2 gaps;
- later P11 changes added bounded OIDC authorization, guarded rerun support and file-backed correction payload transport after the large-request `ARG_MAX` failure;
- current cleanup PRs repeatedly pass `ATLAS P11 Baseline B Readiness`, P10 revalidation, Human Authoring Operational Parity and ATLAS Integrity.

This audit did **not** recover an authoritative successful Production artifact proving both:

1. completion of the reviewed semantic-v2 Production backfill/post-audit; and
2. a subsequent successful authenticated Production Baseline B v2 capture from the resulting live state.

Therefore `ATLAS-RQ-0221` remains `PENDING`. Do not claim a Baseline B artifact or advance P12 destructively until that evidence exists.

### P12 — PENDING

`ATLAS-RQ-0222` remains pending behind P10/P11 end-state proof.

Remove only genuinely reachable legacy/transitional writers, readers and contracts. Historical release evidence and archived artifacts must remain available for audit. P12 must not be used as a reason to delete old files that are no longer executable but remain evidentiary.

### P13 — PENDING

The end-state authoring/product lifecycle is not complete. The following remain binding unfinished requirements:

- first-class Person object authoring without mandatory invented optional facts;
- first-class Place authoring;
- first-class bibliographic Source authoring;
- explicit Authoring → Compile → Runtime projection/readiness filtering;
- unresolved Person Activity boundaries without fabricated endpoint years;
- source-backed AI candidate → human review → authoritative authoring workflow;
- full Production product lifecycle acceptance.

Open PR #156 (Manas) remains a concrete acceptance fixture for this gap: the reviewed legendary Person cannot be made executable by inventing chronology merely to satisfy the transitional Activity writer.

### P14 — PENDING

Historical map integration remains pending. The invariant is unchanged:

`Person → Activity → Polity → Territory → Geometry`

Person and Activity never directly own map geometry. Map integration must consume shared reviewed Polity identity and temporal political/territorial history rather than back-propagating display guesses into authoring truth.

## UI / spacetime workstream

Completed during the 2026-08-19 audit cleanup:

- PR #390 — canonical temporal polity-place-function spacetime model rebuilt on current main and merged after Integrity / P10 / P11 Readiness / Authoring Parity all passed. Vercel Production reached READY on the exact merge SHA.
- PR #392 — one shared Person era model now owns the reviewed BC 480 / AD 500 / 1492 / 1750 / 1914 / 1945 boundaries for both the Person table and spacetime view. It was merged after the same four checks passed, and Vercel Production reached READY on the exact merge SHA.
- stale/superseded PRs #370, #317, #321, #368 and #355 were closed rather than merged independently.

Current open UI-related debt:

- PR #262 — Korean localization architecture is still conceptually useful but is based on a much older main and predates the current spacetime domain. It must be rebuilt selectively on current main rather than merged as-is.
- PR #199 — old table-renderer consolidation Draft is substantially stale and requires salvage-or-close review against the current table/era architecture before any merge.
- PR #156 — reviewed Manas unresolved-chronology decision remains intentionally blocked on P13 authoring capability rather than history fabrication.

## Separate historical-map repository

The ATLAS historical-map implementation is not fully represented by `atlas-person-db`.

Repository `JezCH/civilization-map-project` must be treated as a separate P14 workstream. At the latest audit its old `main` remains far behind a large `agent/product-ui-shell` development line containing normalized authoring/runtime compilation work, Palenque and Byzantine territory data, UI/runtime work and the Byzantine production research line.

The last recorded internal checkpoint on that branch states:

- Justinianic-era milestone closed;
- `BYZ_TR_0011` geometry authored but Visual Accept pending;
- historical backcheck remediation completed enough to resume review;
- `BYZ_TR_0012` Evidence paused behind the `0011` Visual Accept gate;
- subsequent Byzantine territory sequence remains unfinished.

Do not start a parallel replacement map architecture. The next map action is to reconcile and integrate the existing product branch, then resume the accepted Evidence → Geometry → Visual → Accept workflow.

## Immediate execution queue

1. Recover or freshly prove the exact live P10 Production revalidation state.
2. Recover or execute the governed P11 semantic-v2 backfill/post-audit and authenticated Baseline B v2 capture without weakening exact-SHA/OIDC/dry-run constraints.
3. Run the project-integrity audit on the resulting Baseline B before destructive cleanup.
4. Finish current-main UI debt without resurrecting stale branches: rebuild the useful localization scope from #262 and decide whether any #199 renderer refactor remains necessary.
5. Execute P12 reachable-legacy cleanup only after Baseline B proves the end state.
6. Complete P13 first-class Authoring → Compile → Runtime lifecycle, using unresolved cases such as Manas as acceptance tests.
7. Reconcile `civilization-map-project`'s long-lived product branch into a governed integration line and resume Byzantine `0011` Visual Accept → `0012` Evidence.
8. Complete P14 shared-Polity historical-map integration.

## Safety conclusions

- No direct Production DB mutation is authorized by this status document.
- No P10 physical merge is authorized by this status document.
- No P11 completion is claimed without a captured Production artifact.
- No unknown chronology, place function, polity identity or geometry may be invented to make a workflow pass.
- Concurrent authoring/UI work means every future GitHub mutation must re-read current `main` immediately before branching or merging.
