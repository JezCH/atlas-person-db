# ATLAS UI checkpoints

Status: **table-first UI-T workstream in Draft PR #199**

Current table baseline was cut from `main@164fee7c1b8cb9d0130bd9f453be0d99b1c26242` on branch `agent/ui-t01-table-baseline-renderer`.

GitHub Actions verification is currently blocked before runner start by the repository/account billing-spending-limit condition. This is an infrastructure blocker, not a recorded test pass. Until it is cleared, do not claim exact-head CI success.

## Durable completed foundation

The earlier UI-0 through UI-5 work established and remains responsible for:

- public Person list/detail read
- raw `Person.historicity` preservation
- complete readable Activity temporal semantics
- Person and Activity provenance
- Admin Object Inspector
- Admin System Status
- Person-centered browser/search/facets
- protected Admin workspace: Overview / Review / Authoring / Inspector
- future authority navigation shells
- preservation of existing Activity authoring controls

These are foundation capabilities, not current TODO items.

## Table-first UI-T workstream

### UI-T0 — Table baseline freeze: COMPLETE

- current table-oriented Main declared as the new UI baseline
- `docs/ui/UI_TABLE_BASELINE.md` records ownership, functional parity, and information rules

### UI-T1 — Direct Person table renderer: COMPLETE ON BRANCH

- `atlas-person-main.js` directly renders table headers and rows
- correlated `activity_summaries` remain the only source for compact Activity tuples
- former post-render `atlas-person-table-view.js` MutationObserver adapter deleted
- default historical diagnostics are folded; non-default/missing states remain visible
- existing authoring/export/import/Admin flows preserved

### UI-T2 — Main table information hierarchy: COMPLETE ON BRANCH

Four overview columns are retained:

1. Person identity
2. main Activity range
3. correlated Activity relationship meaning
4. Activity count

The Activity cell shows Polity / Relation / Role / Period Basis / Activity period. Meaningful chronology/confidence exceptions remain visible without creating a permanent diagnostic column.

### UI-T3 — Mobile table model + curated non-timeline table: COMPLETE ON BRANCH

- curated legendary/mythical/non-timeline records use a real table at all breakpoints
- row detail exposes raw historicity, date basis, timeline status, Activity-year fields, decision reason, and map policy
- null years remain unknown rather than becoming year zero
- no source/provenance fields are fabricated where the curated JSON has none

### UI-T4 — Person detail drawer interaction: COMPLETE ON BRANCH

- fixed master-detail drawer
- dialog semantics
- focus entry and Tab/Shift+Tab trap
- Escape/backdrop/close handling
- originating Person row focus restoration
- rerender-safe close control/focus
- background scroll lock and mobile safe-area handling

### UI-T5 — Unified Person search: COMPLETE ON BRANCH

- authoritative and curated Person tables share one free-text query
- normalized phrase/compact/token matching
- Person/Polity/Relation/Role/Period Basis/notes/temporal semantics remain searchable where authoritative data exists
- BC/BCE/기원전 and AD/CE/서기 forms supported
- mobile result count combines authoritative and curated Person results
- authoritative semantic facets and chronology sort are not falsely projected onto the curated schema

### UI-T6 — Historicity surface boundary: COMPLETE ON BRANCH

- DB Person historicity and curated non-timeline status remain separate sources
- no date/note-based myth/legend inference
- no name-based identity join
- future reconciliation requires an explicit reviewed identity link
- contract: `docs/ui/UI_HISTORICITY_SURFACES.md`

### UI-T7 — Information Coverage Gate: COMPLETE ON BRANCH

**T7-A Main/public + curated**

- machine-readable registry: `docs/ui/ui-information-coverage.json`
- Person / Activity / Source projection leaf fields must exactly match the registry
- final nested Person detail assembly is also checked
- compact Activity projection cannot add an unmapped field
- curated JSON top-level keys cannot change without a mapping update
- every mapped field requires a declared UI surface and static implementation evidence

**T7-B Admin raw**

- Inspector capabilities come from the protected server
- server returns the complete inspected row
- Admin UI recursively flattens the complete `payload.object` without a UI field whitelist
- therefore newly exposed safe Inspector fields automatically become visible table rows

### UI-T8 — Admin table normalization: PARTIAL / T8-A COMPLETE

**T8-A complete on branch**

- System Status summary is a Scope / Current state / Detail matrix
- Status details are Field / Value tables
- Object Inspector is a Field/path / Raw value table instead of a JSON blob
- existing GET-only protected endpoints retained
- authoring forms untouched

**T8-B remaining**

- Duplicate Review comparison presentation still needs a dedicated field-comparison table treatment without changing merge/review lifecycle or mutation controls

### UI-T9 — Functional parity gate: COMPLETE ON BRANCH

Consolidated static gate preserves:

- add relationship
- refresh
- export/import
- Admin navigation
- semantic filters/search/sort
- Activity edit/delete by Activity identity
- Person detail + provenance
- curated Person discovery
- all four Admin workspace tabs
- existing physical read route contract

### UI-T10 — Responsive / accessibility hardening: COMPLETE ON BRANCH

- authoritative Persons, curated non-timeline Persons, and full relationship authoring all remain tables on mobile
- primary touch targets hardened around 44 px
- keyboard focus cues
- drawer close target/safe areas
- narrow group-header count layout fixed
- reduced-motion preference respected

### UI-T11 — Legacy residue audit: COMPLETE ON BRANCH

- dead Person table presentation adapter removed
- no remaining adapter references found
- still-live `person-card*` compatibility selectors intentionally retained until they are genuinely dependency-free
- audit: `docs/ui/UI_TABLE_RESIDUE_AUDIT.md`

### UI-T12 — Documentation source of truth: IN PROGRESS

- this checkpoint file is current
- `UI_INFORMATION_COVERAGE.md` must point to the machine registry and distinguish current coverage from future P13/P14 requirements

### UI-T13 — Integration / release: BLOCKED

Required before merge/Production claim:

1. complete T8-B or explicitly split it into a later PR without weakening current behavior
2. exact-head static/diff audit
3. GitHub Actions billing/spending-limit blocker cleared
4. exact PR head passes required Integrity / Human Authoring / P10/P11 gates
5. rebase/integrate if `main` moved
6. verify physical `api/*.js` count remains within Vercel Hobby limit
7. merge only after exact-head gates
8. verify Production deployment is READY at the exact merge SHA

## Vercel rule

Routine UI development does not require repeated Preview/Production deployments. Use Vercel only at an intentional interaction/release checkpoint. UI work must not mutate Production data for QA.
