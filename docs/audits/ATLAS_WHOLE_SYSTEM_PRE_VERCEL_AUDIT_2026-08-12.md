# ATLAS Whole-System Pre-Vercel Audit — 2026-08-12

Status: **STRUCTURAL AUDIT COMPLETE / NO PRODUCTION MUTATION**

Scope: requirements history, current normalized schema/runtime, Stage 2 contracts/rehearsals, duplicate lifecycle, Production release controls, final Authoring product scope and historical map direction.

## Audit question

Is the current direction structurally consistent with the agreed ATLAS goal, maintainable, historically safe, functionally complete in its roadmap, and free of known contradictions that can be resolved without the next live Production dependency?

## Findings fixed in this audit

### 1. Product scope had been narrowed too far in the requirements source of truth

The current Stage 2 roadmap correctly covered Person–Polity semantics, Governance, People/Event, temporal precision, provenance, duplicate lifecycle and map integration, but it did not explicitly preserve the already-agreed final first-class Person / Place / Source Authoring product or the AI candidate review workflow.

Resolution:

- added binding Person-object, Place/Source, Compile/Runtime and unresolved-Activity principles;
- added P13 completion requirements for Person object authoring, Place/Source authoring, Compile → Runtime projection, unresolved Activity boundary authoring and AI candidate review;
- did **not** expand Production Train 1 or current Stage 2 migration scope.

### 2. Authoring / Compile / Runtime separation existed as a principle but not as an explicit completion step

Current `/api/atlas-read` is a direct normalized Authoring projection. That is acceptable as a transition runtime but cannot be the final implementation of `ATLAS-RQ-0006`, because unresolved Authoring assertions must not become publishable truth solely by existing in the database.

Resolution:

- P13 now explicitly requires deterministic Compile/readiness validation and a Runtime projection/materialization;
- P14 map consumes the compiled Runtime-ready state and shared Polity UUIDs.

### 3. Unknown Person Activity boundary had no final product requirement

Current `person_politics_v2.activity_start/end` are required integers. Stage 2 allows unresolved boundaries conceptually for new assertion families, but without a final Authoring requirement a known Person–Polity assertion could later be forced into a fake year merely for storage convenience.

Resolution:

- historical year `0` and arbitrary placeholder years are explicitly forbidden;
- P13 must represent unresolved Activity boundary assertions in Authoring and keep them out of Runtime until ready;
- current Train 1 schema is not changed merely to solve a later product-layer problem.

### 4. Duplicate physical-merge lifecycle was safe on the server but misleading in the Admin UI/docs

The server already blocked physical Person merge before DB connection while reconciliation is v1 and lifecycle is `pre-p10-blocked`. The Admin UI still rendered survivor execution controls for MERGE decisions.

Resolution:

- duplicate-review GET now exposes the server `merge_execution_state`;
- Admin consumes that exact state;
- pre-P10 MERGE decisions remain available, but survivor/relationship execution controls are replaced with a blocked-state explanation;
- documentation now distinguishes identity decision from physical merge execution.

### 5. Authoring v2 documentation used historical year 0 in its example

This contradicted the temporal contract.

Resolution:

- example uses valid non-zero years;
- Admin JSON validation explicitly rejects year 0;
- test coverage locks the rule.

## Confirmed good architecture — no change required

- UUID identity and name/alias separation.
- Polity vs Government/Regime vs PeopleGroup vs HistoricalEvent separation.
- Person → Activity → Polity → Territory → Geometry; no Person-owned geometry.
- six explicit Person–Polity Relation types with no generic default.
- semantic-key-v2 design and atomic P9 cutover plan.
- physical Person merge delayed until v2-aware reconciliation + P10 revalidation.
- Baseline A v2 scope: complete live identity/name/source inventory for rebinding, not an unnecessary full data backup.
- source/chronology/description preservation during current correction and merge infrastructure.
- Stage 2 normalized multi-locator provenance design.
- exact-SHA/OIDC Production mutation boundary.
- shared PostgreSQL client, schema reconstruction, centralized integrity CI.
- Vercel-minimized release-train strategy.
- historical uncertainty preserved rather than fabricated.

## Deliberately not added

The audit does **not** recommend extra dashboard widgets, analytics, generic workflow engines, speculative taxonomy, additional approval layers, placeholder map geometry, or unrelated security/product features merely because they could exist.

Also not elevated into the historical identity core:

- game-specific leader abilities;
- presentation-only Civilization metadata;
- Wonder authoring unrelated to the current Person/Polity/map dependency chain.

Such features may later use extension/crosswalk models if the product actually needs them. They are not prerequisites for the current ATLAS historical core.

## Remaining work is dependency-ordered, not an undiscovered design hole

Current branch-only/pre-live structural corrections are complete when ATLAS Integrity is green on this audit commit.

The next unavoidable live dependency remains:

```text
P0 main protection / release control
→ exact-SHA Production Train 1
→ R0 / R1
→ Baseline A v2
→ live UUID/name-kind rebinding
→ Stage 2 Train 2
→ P12 cleanup
→ P13 full Authoring + Compile/Runtime product acceptance
→ P14 map integration
```

P13 requirements are intentionally preserved now but not prematurely implemented against the old Production semantic state.

## Non-blocking observations

- CSP/HSTS can be revisited with the final deployment surface; current absence is not a historical-data integrity blocker and adding policy now would interact with the existing XLSX CDN.
- Current client UI contains some fixed vocabulary presentation. P9/P13 product cutover must not treat browser strings as domain identity, but introducing another vocabulary API before the final semantic cutover is not justified by this audit.
- Current file-oriented Source fields remain valid ingestion provenance. P13 expands the product Source object to citation metadata rather than replacing existing hashes/locators.

## Completion criterion for this audit

This audit is complete only if:

1. the requirements registry and human requirements agree;
2. current merge lifecycle is represented consistently in server + Admin + docs;
3. year-zero contradiction is removed;
4. ATLAS Integrity passes on the exact branch head;
5. no Production DB mutation occurs.
