# ATLAS current status — 2026-08-19

This document supersedes `docs/release/STAGE2_CURRENT_STATUS_2026-08-16.md` **only as the current execution-position summary**. Older status documents remain immutable historical evidence for the state they recorded.

## Audit basis

This status is intentionally conservative. A phase is not promoted to `COMPLETED` unless the available repository/Production evidence proves the required live transition. Missing evidence is recorded as unresolved rather than inferred.

Verified repository state at this audit checkpoint:

- repository: `JezCH/atlas-person-db`
- audited protected `main` SHA: `04606db52b78a763d3023b649768ecb31883bf26`
- `main` branch protection: enabled
- required status context exposed by GitHub branch protection: `test`
- Production application: `https://atlas-person-db.vercel.app`

The current main line has advanced substantially beyond the 2026-08-16 status document through P10/P11 maintenance, UI/spacetime work, and governed historical-person authoring.

## Roadmap state

### P0–P9 — COMPLETED

No evidence found in this audit reopens P0–P9. The 2026-08-16 status remains the historical release-evidence summary for the completed Stage 2 schema and Train 2 / semantic-key-v2 cutover.

### P10 — CURRENT / exact Production closure not re-proven by this audit

The repository contains the complete P10 semantic-key-v2 revalidation architecture and later successful non-destructive revalidation evidence after the reviewed Suleiman I corrections. The controlled Production revalidation launcher was also re-entered through PR #240 after those corrections.

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
- the reviewed transition targeted 301 incomplete legacy Activities to 21 exact relation-only Authoring exceptions and zero unreviewed/blocking semantic-v2 gaps;
- later P11 changes added bounded OIDC authorization, guarded rerun support and file-backed correction payload transport after the large-request `ARG_MAX` failure;
- PR-head P11 readiness, P10 revalidation, Human Authoring Operational Parity and ATLAS Integrity checks were observed green on the repaired line.

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

Open PR #156 (Manas) remains a concrete regression fixture for this gap: the reviewed legendary Person cannot be made executable by inventing chronology merely to satisfy the transitional Activity writer.

### P14 — PENDING

Historical map integration remains pending. The invariant is unchanged:

`Person → Activity → Polity → Territory → Geometry`

Person and Activity never directly own map geometry. Map integration must consume shared reviewed Polity identity and temporal political/territorial history rather than back-propagating display guesses into authoring truth.

## UI / spacetime workstream

Current open work after stale-PR cleanup:

- PR #368 — canonical temporal `PolityPlaceFunction` ownership for spacetime placement; **active Draft and the current spatial-model follow-up**.
- PR #355 — centralize reviewed Person era definitions; still active but stale against current main and requires rebase/revalidation before merge.
- PR #262 — centralize Korean UI localization; still active but stale against current main and requires rebase/revalidation before merge.
- PR #199 — old table-renderer consolidation Draft; requires salvage review against current main before any merge decision.
- PR #156 — reviewed Manas unresolved-chronology decision; intentionally blocked on P13 authoring capability rather than history fabrication.

Closed during this audit as superseded:

- PR #370 — duplicate Egypt/Nubia authoring branch superseded by merged PR #371.
- PR #317 — earlier transitional capital-index spacetime branch, superseded by later integrated spacetime work and PR #368.
- PR #321 — earlier independent spacetime view branch, likewise superseded by the current integrated/canonical line.

No active semantic work was discarded by those closures.

## Separate historical-map repository

The ATLAS historical-map implementation is not fully represented by `atlas-person-db`.

Repository `JezCH/civilization-map-project` must be treated as a separate P14 workstream. At the latest audit it has a large `agent/product-ui-shell` development line substantially ahead of its old `main`, containing normalized authoring/runtime compilation work, Palenque and Byzantine territory data, UI/runtime work and the Byzantine production research line.

The last recorded internal project checkpoint on that branch states:

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
4. Reconcile active UI/spacetime PRs against current main in dependency order: canonical place-function ownership (#368) and era/localization/table ownership without resurrecting superseded branches.
5. Execute P12 reachable-legacy cleanup only after Baseline B proves the end state.
6. Complete P13 first-class Authoring → Compile → Runtime lifecycle, using unresolved cases such as Manas as acceptance tests.
7. Reconcile `civilization-map-project`'s long-lived product branch into a governed integration line and resume Byzantine `0011` Visual Accept → `0012` Evidence.
8. Complete P14 shared-Polity historical-map integration.

## Safety conclusions

- No direct Production DB mutation is authorized by this status document.
- No P10 physical merge is authorized by this status document.
- No P11 completion is claimed without a captured Production artifact.
- No unknown chronology, capital, authority center, polity identity or geometry may be invented to make a workflow pass.
- Concurrent authoring/UI work means every future GitHub mutation must re-read current `main` immediately before branching or merging.
