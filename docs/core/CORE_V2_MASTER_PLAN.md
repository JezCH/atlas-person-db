# ATLAS CORE v2 — Master Architecture & Resume Contract

> **Status:** AUTHORITATIVE CORE ARCHITECTURE / EXECUTION HANDOFF  
> **Created:** 2026-09-27  
> **Repository:** `JezCH/atlas-person-db`  
> **Creation snapshot:** read current `main` when executing; never pin future work to this document's creation SHA.
>
> **Active CORE status is NOT stored here.** The only active-status authority is GitHub Issue **#917 — ATLAS CORE — ACTIVE WORK ONLY**.
>
> **Execution mechanics are NOT duplicated here.** `WORK_EXECUTION.md` remains authoritative for resume-first, resource-scoped concurrency, delta-only integration, minimum-sufficient verification, Response Barrier, and checkpoint behavior.

---

## 0. New-chat resume contract

When the user says any equivalent of **“코어작업 이어서 해 / CORE 계속해 / 코어 다음 작업 진행해”**, do **not** reconstruct the project from old conversations or scan hundreds of historical #917 comments.

Resume in this exact order:

1. Read current **#917 body**.
2. Read **`docs/core/CORE_V2_MASTER_PLAN.md`**.
3. Read **`WORK_EXECUTION.md`**.
4. Read only the exact files/contracts/direct dependencies named by the current #917 unit.
5. Reconcile against current `main` only for the touched paths/resources.
6. Complete **one work unit per user turn** unless the user explicitly requests multiple units.
7. Finish implementation + focused verification + cleanup + durable checkpoint.
8. Update #917 to the next exact resume point.
9. STOP. Do not inspect or start the next unit in the same turn.

### Precedence

When current sources disagree:

1. **Current canonical code/schema/data contracts on `main`** — implementation truth.
2. **This file** — CORE architecture, invariants, unit topology, scope boundaries.
3. **#917 body** — current active unit/state/resume point only.
4. **`WORK_EXECUTION.md`** — execution mechanics.
5. **`ATLAS_REQUIREMENTS.md` + machine requirements registry** — product requirements, after Unit 0 reconciliation.
6. Historical PRs/issues/comments/release docs — audit evidence only.

If this file becomes architecturally obsolete, update it deliberately in a CORE architecture unit. Do not silently fork a second CORE plan elsewhere.

---

# 1. CORE mission

CORE is **not** a feature-accumulation project.

CORE exists to permanently establish, for every important ATLAS fact and lifecycle:

- exactly one canonical authority,
- exactly one canonical writer per resource,
- an explicit distinction between source facts and derived/runtime state,
- deterministic publication,
- explicit uncertainty/HOLD semantics,
- complete destructive lifecycle behavior,
- no reachable obsolete writer/runtime,
- no duplicated truth registry,
- no recurring “register now, backfill later” debt,
- minimum sufficient verification,
- and a residue-free cutover.

The target is not “bugs can never exist.” The target is:

> **A bug must not be able to silently create, mutate, duplicate, resurrect, or publish invalid canonical history.**

CORE therefore optimizes for:

**fail-closed + deterministic + idempotent + single-authority + reconstructible + maintainable**

---

# 2. CORE constitution

## C-01 — One Fact, One Authority
The same semantic fact must not have multiple independently editable authorities. DB + JSON + Issue + UI may expose the same fact, but only one may be authoritative.

## C-02 — One Resource, One Writer
Each canonical resource has one mutation boundary. Admin, GitHub, AI, correction, registration, or UI workflows may orchestrate the writer; they must not implement competing identity/duplicate/transaction semantics.

## C-03 — UUID Is Identity
Names, Korean labels, canonical keys, aliases, temporal designations, display strings, and URLs are not identity.

## C-04 — Unknown Stays Unknown
Never fabricate sentinel year 0, fake start/end dates, fake Role, generic relation, fake Polity, placeholder geometry, guessed Place precision, guessed external-reference URL, or guessed representative domain.

## C-05 — Authoring Is Not Runtime
Authoring stores reviewed assertions, evidence, uncertainty, and unresolved facts. Runtime exposes only compiled, publication-ready projections.

## C-06 — Compile Is Pure Derivation
Compiler/readiness may decide publication eligibility and derive runtime/display structures. It may not mutate canonical Authoring truth to make data publishable.

## C-07 — Derived Data Is Disposable
Runtime tables, indexes, caches, projections, search facets, and display placement must be reproducible from canonical inputs + versioned compiler logic.

## C-08 — Review Once, Reuse the Decision
Do not routinely re-research existing Source identity, Person domain, reviewed NamuWiki state, spatial binding, Polity continuity decision, or approved candidate evidence unless new evidence/conflict requires it.

## C-09 — No Silent Obligation Debt
If a field/relation/classification/reference becomes important enough for retrospective full-coverage audit/backfill, the same obligation must be added to future applicable registration in the same architectural change.

## C-10 — No Parallel Lifecycle
There is one final authoritative lifecycle. Do not create separate AI/GitHub/Admin/batch authoring truth systems.

## C-11 — Idempotent by Default
Replaying the same approved request must not create duplicates, change identity silently, or cause duplicate semantic Runtime publication.

## C-12 — Fail Closed on Ambiguity
Collision, ambiguous identity, unresolved continuity, conflicting evidence, or unproven destructive precondition → HOLD/BLOCK/REVIEW.

## C-13 — Risk-Proportional Verification
Verify once at the boundary that proves the changed invariant. No unrelated full audits, repeated Runtime polling, duplicate read-backs, or ceremonial release gates.

## C-14 — Cut Over, Then Delete
A replacement is incomplete while the replaced executable path remains reachable. Add successor → reconcile → cut consumers over → prove → delete obsolete path → preserve only needed audit evidence.

## C-15 — Active State Is Not Audit History
#917 body is active CORE only. Historical comments/PRs/releases are evidence only and cannot reactivate work.

---

# 3. Authority map

| Meaning | Authority | Non-authoritative surfaces |
|---|---|---|
| Canonical historical data | normalized `atlas_v2` canonical state | Runtime/UI/indexes/issues |
| CORE architecture/invariants/unit topology | **this file** | old CORE docs/conversation summaries |
| Current CORE unit/status | **#917 body** | comments/old issue rows |
| Execution mechanics | **`WORK_EXECUTION.md`** | old Train procedures |
| Product requirements | `requirements/atlas-requirements.v1.json` after Unit 0 | Markdown explanation |
| Human-readable requirements | aligned/generated `ATLAS_REQUIREMENTS.md` | historical status docs |
| Person domain vocabulary | existing canonical representative-domain registry | UI colors/CSS |
| Person historical fact counting | `docs/ATLAS_PERSON_REGISTRATION_VALUE_STANDARD.md` (`ATLAS-PHFC-3.1`) | PHFC 3.0 / legacy PRV qualitative scoring / Lite / earlier Coverage Test / SCI-OFI-MCG-DRS / categorical ranking systems |
| Candidate review result | one durable reviewed candidate revision | issue prose/pasted handoff |
| Registration state | one execution state tied to canonical entity/revision | queue prose |
| Spatial taxonomy/reviewed source | canonical spatial authoring source | compiled spatial index |
| Runtime state | compiler-generated projection | never historical authority |
| Historical evidence | Git history / PRs / issue comments | never active status |

### No duplicate-registry rule
A registry is allowed only if it represents a different semantic object. If two registries answer the same semantic question, one must be removed or made generated/read-only.

---

# 4. Final architectural flow

```text
Research / AI / discovery
        ↓
Non-authoritative Candidate
        ↓
Human Review
 APPROVE / HOLD / REJECT
        ↓ approved revision/reference
Canonical Authoring
 Person / Activity / Polity
 Source / Place / Context
 Domain / External Reference
 Historical spatial facts
        ↓ canonical revision
Compile / Readiness
 deterministic / pure derivation
 explicit inclusion/exclusion disposition
        ↓
Staging Runtime Projection
        ↓ validation
Atomic Runtime Activation
        ↓
Public API / UI
```

Rules:
- AI never bypasses canonical writer.
- UI never decides historical identity.
- Runtime never repairs Authoring.
- Compiler never invents history.
- Derived data remains reconstructible.
- Failed publication never corrupts successful canonical Authoring.

---

# 5. Canonical model decisions

## 5.1 Person
Separate identity/profile from registration eligibility/review.

Identity/profile:
- UUID, canonical key, names/aliases, person type, historicity,
- descriptions/supported profile facts,
- representative_domain,
- optional media reference.

Registration eligibility after 2026-09-26:
- living → new Person creation forbidden,
- deceased + reviewed basis → eligible,
- unresolved → HOLD.

Remove obsolete “only currently serving public-office Persons are excluded” wording during Unit 0.

## 5.2 Representative domain
`representative_domain` is a nullable canonical Person property with controlled values:
`governance / military / knowledge / technology / commerce / culture / religion / exploration`.

Rules:
- review during new Person registration;
- store when clear;
- null/HOLD is valid;
- never auto-infer Role→domain;
- existing non-null domain is not overwritten by unrelated Activity registration;
- conflict → dedicated re-review.

Routine “register Persons now, add domains later” must disappear.

## 5.3 Timeline / non-timeline
Historical identity and timeline eligibility are separate axes.

Target:
```text
Person UUID
  └─ timeline disposition
      ├─ timeline
      ├─ chronology_unresolved
      ├─ legendary
      ├─ mythical
      └─ other reviewed exclusion
```

A Person must not need a fake long Activity rail merely to exist. The separate non-timeline static registry is transitional and must eventually reconcile into one Person identity world.

## 5.4 Polity
Final Polity:
```text
Polity stable UUID
├─ preferred/canonical names
├─ aliases
├─ semantic name kinds
├─ temporal designations
├─ state forms
├─ structural/diachronic relations
└─ retired/redirect identity state
```

Resolver must consider preferred names, aliases, semantic name kinds, temporal designations, retired/merged identities, redirects, Activity date, and reviewed continuity/split decisions.

Example:
`"Kingdom of France", 1654 → stable France UUID + period designation`.

Do not recreate a duplicate Polity merely because an old designation is absent from preferred-name lookup.

State-form/name change is not automatically a new identity; catastrophic political/territorial discontinuity may justify one. String heuristics are never authority.

## 5.5 Retired identity / no resurrection
Merge/retire leaves durable semantic redirect/tombstone:
`retired identity A → canonical survivor B`.

Merge completion includes reviewed relink, temporal designation preservation, spatial handling, source identity retirement, redirect/tombstone, and resolver non-resurrection proof.

## 5.6 Source
Reuse existing first-class Source substrate.

Target bibliographic capability:
UUID, source type, title, author/creator, institution/publisher, publication date/year, canonical URL, external identifier when applicable, citation metadata, optional artifact/hash metadata.

Keep separate Source identity vs locator/page/section vs assertion provenance.

## 5.7 Place
Place is first-class identity, not Polity and not display coordinates.

Author historical relations only when supported: Person life facts, Activity location, PolityPlaceFunction. Do not force Place to make registration look complete.

## 5.8 Historical spatial facts
Canonical:
```text
Polity → PolityPlaceFunction → Place
```

Functions may include capital, royal_court, administrative_center, authority_center, with valid interval, certainty, confidence, and sources.

World X, label anchors, UI bands, and display displacement are derived presentation, never historical facts.

## 5.9 Spatial registration handshake
For a new/relevant Polity, registration leaves one explicit spatial disposition:
- existing reviewed binding,
- reviewed temporal place-function,
- reviewed static binding,
- or explicit review_queue/HOLD.

No silent new-Polity spatial debt.

Camera/minimap/500%-800%/label allocator remain NONCORE.

## 5.10 Context objects
Polity / Government-Regime / PeopleGroup / HistoricalEvent remain distinct. CORE enables only the minimum real authoring relations needed so PeopleGroup/Event/Governance facts are not fabricated as Polities.

## 5.11 External references
NamuWiki review is part of registration completion.

Target decision shape:
```text
provider
status
checked_at
document_title?
url?
review_reason?
evidence?
```

No guessed URLs, no not_found from provider-access failure alone, no routine post-registration follow-up knowingly skipped by registration.

---

# 6. Registration architecture

Registration is one completion chain, not one giant DB transaction.

```text
SCREEN
→ REVIEW
→ materialize applicable obligations
→ AUTHORING COMMIT
→ AUTHORING READ-BACK
→ necessary companion canonical writers
→ COMPILE
→ RUNTIME DISPOSITION
→ RUNTIME READ-BACK if included
→ COMPLETE
```

A Registration Coordinator may orchestrate state but owns no historical truth.

## Registration obligations registry
Maintain one machine-readable applicability/completion registry storing only:
- obligation key,
- applicability,
- owning writer,
- required/optional/HOLD semantics,
- completion condition,
- canonical contract reference.

It must not duplicate actual historical values.

Baseline obligations:

**New Person**
- deceased-status review
- identity/historicity review
- timeline disposition review
- representative_domain review
- external-reference/NamuWiki review
- evidence/source basis

**Activity**
- resolved Person/Polity
- explicit relation
- Role if applicable
- Period Basis
- known/unknown temporal boundaries
- certainty/calendar where applicable
- confidence/notes as supported
- Source/provenance

**New Polity**
- continuity/identity resolution
- designation collision/reuse review
- explicit spatial disposition

**Publication**
- Authoring verified
- Compile disposition produced
- Runtime verified only when included

---

# 7. Compile → Runtime publication contract

Target:
```text
Canonical state/revision N
        ↓
Durable publication request
        ↓
Compiler version X
        ↓
Staging projection N/X
        ↓
Focused validation
        ↓
Atomic activation
        ↓
Runtime revision N/X
        ↓
Read-back
```

Requirements:
- Authoring success does not depend on public Runtime read before compile;
- publication failure leaves prior valid Runtime active;
- publication is retryable/idempotent;
- no meaningless trigger-only commit/PR;
- no Authoring↔Runtime circular validation;
- one canonical state yields at most one semantic Runtime publication per compiler version;
- publication records enough input/compiler/schema versioning, counts, dispositions, and checksum for reproducibility.

Default to deterministic full projection compile while scale permits. Do not build incremental dependency complexity before measured need.

---

# 8. Runtime dispositions

Runtime absence is not necessarily registration failure.

Compiler emits explicit disposition such as:
- INCLUDED
- EXCLUDED_START_BOUNDARY_UNRESOLVED
- EXCLUDED_END_BOUNDARY_UNRESOLVED
- EXCLUDED_TIMELINE_DISPOSITION
- EXCLUDED_SEMANTIC_REVIEW
- other tightly-scoped reviewed reasons

Do not silently drop unresolved Authoring facts.

---

# 9. Candidate / Lane A / Lane B

Do not build a second AI authoring system.

```text
Lane A: candidate review
      ↓ one reviewed revision/reference
Lane B: registration apply
      ↓ same canonical registration coordinator/writers
```

Handoff passes reference/hash/revision rather than recopied historical truth.

Durable reviewed-candidate state distinguishes candidate identity, review revision, APPROVED/HOLD/REJECT, reviewer/time, evidence refs, proposed values, and accepted edits.

AI proposes. Human review authorizes. Canonical writer mutates.

Review state and canonical registration state are separate; queue must support canonical UUID/revision and invalidation/supersession without erasing historical review.

---

# 10. Destructive lifecycle

Merge/retire/hard-delete safety is CORE.

Use explicit dependency ownership, DB FK constraints where appropriate, dependency registry/schema introspection where useful, exact before-state, transactional mutation when feasible, and exact postcondition.

Portrait style/generation is NONCORE; Person↔portrait lifecycle dependency is CORE.

```text
precondition
→ exact before-state
→ transaction
→ mutation
→ postcondition
```

---

# 11. Test philosophy

Persistent CI protects durable invariants:
- UUID uniqueness/identity rules
- FK integrity
- semantic-key uniqueness
- no year 0
- unknown temporal tuple validity
- no retired identity resurrection
- one canonical executable writer per resource
- compiler determinism
- Runtime references valid canonical input
- reachable legacy writer/runtime count = 0

Avoid persistent tests freezing current row totals, one old batch position, retired phase wording, historical workflow names, or one-off migration counts.

Retire one-shot tests after transition unless they encode a durable invariant.

---

# 12. Compatibility and cleanup

Each CORE unit classifies residue:
- KEEP CURRENT
- ARCHIVE EVIDENCE
- DELETE OBSOLETE

Delete obsolete dead endpoints, retired workflows, one-shot launchers, trigger-only files, shadow writers, compatibility adapters, temporary migration/rehearsal helpers, duplicate registries, dead flags, and tests that only keep retired behavior executable.

“Keep just in case” is not enough when Git history is the recovery mechanism.

---

# 13. CORE / NONCORE boundary

CORE:
canonical schema/model, identity semantics, writers, registration completion, Source/Place infrastructure, Polity temporal identity/resolution, historical spatial-fact contract, Compile→Runtime publication, reviewed-candidate boundary, destructive lifecycle, closure invariants, P14 interface contract.

NONCORE:
spacetime camera/zoom/label/minimap tuning, exact UI color tuning, era icons/frames, portrait art style/prompts/image production, individual Person ranking, individual NamuWiki research, individual Spatial placement research, actual Territory polygon production.

A NONCORE feature's canonical dependency may still be CORE.

---

# 14. P14 boundary

Seal only:
```text
Person → Activity → Polity → TerritoryRecord → Geometry
```

Territory must preserve control type, boundary certainty, evidence confidence, valid interval, and provenance.

No Person-owned geometry. No invented geometry. No display requirement may create false political authority.

---

# 15. Work-unit topology

#917 holds only the currently active unit.

## UNIT 0 — CORE-CURRENT-TRUTH-RECONCILIATION
Goal: make active requirements/status describe actual current `main`.

Scope:
- current main
- `ATLAS_REQUIREMENTS.md`
- machine requirements registry
- `WORK_EXECUTION.md` only if contradiction exists
- #917

Must reconcile:
- P11/P12 real terminal/current status
- obsolete roster wording vs all-living-Person exclusion
- CORE v2 additions
- stale execution-phase wording
- #917 alignment

No schema/Production feature work.

Exit: zero known current-state contradiction among active authority surfaces.

## UNIT 1 — CORE-AUTHORITY-OWNERSHIP-CONTRACT
Enumerate canonical resources and prove one authoritative writer each. Produce ownership map and shadow-writer cleanup targets.

## UNIT 2 — CORE-COMPILE-RUNTIME-PUBLICATION
Finish deterministic publication semantics. Absorbs old `CORE-P13-COMPILE-RUNTIME-PROJECTION-20260906`; do not resurrect #972/#973/#983.

Exit: no dummy/manual semantic trigger dependency, no circular validation, retryable/idempotent publication, atomic activation, explicit dispositions.

## UNIT 3 — CORE-POLITY-IDENTITY-RESOLVER
Resolver understands aliases/designations/retired identities/date/continuity and prevents duplicate Polity creation.

## UNIT 4 — CORE-POLITY-RETIREMENT-REDIRECT
Durable retired→survivor semantics and non-resurrection.

## UNIT 5 — CORE-NON-TIMELINE-CANONICALIZATION
One Person identity world with explicit timeline disposition; retire independently authoritative duplicate Person registry after migration.

## UNIT 6 — CORE-REGISTRATION-OBLIGATIONS
Machine-readable applicability/completion registry without duplicating values.

## UNIT 7 — CORE-REGISTRATION-WRITER-INTEGRATION
Integrate life eligibility, timeline disposition, domain, NamuWiki, Polity resolver, provenance, spatial disposition, Authoring verify→Compile→Runtime disposition.

Absorbs old `CORE-REGISTRATION-CONTRACT-V7-20260906`; do not resurrect #987.

Exit: no normal Person PR→domain PR→Spatial PR→Runtime refresh PR chain.

## UNIT 8 — CORE-EXTERNAL-REFERENCE-CONSOLIDATION
Consolidate NamuWiki/reference decision state and remove duplicate registries.

## UNIT 9 — CORE-SOURCE-BIBLIOGRAPHIC-COMPLETION
Complete reusable bibliographic Source lifecycle without replacing current Source IDs.

## UNIT 10 — CORE-PLACE-RELATION-COMPLETION
Connect first-class Place to supported historical relations only.

## UNIT 11 — CORE-SPATIAL-FACT-CONTRACT
Formalize PolityPlaceFunction, historical/display boundary, and registration handshake.

## UNIT 12 — CORE-CONTEXT-OBJECT-AUTHORING
Minimum PeopleGroup/HistoricalEvent/GovernanceContext authoring needed to avoid fake Polities.

## UNIT 13 — CORE-REVIEWED-CANDIDATE-BOUNDARY
Finish current Lane A/B human authorization boundary. Absorbs old `CORE-P13-AI-REVIEWED-AUTHORING-20260906`.

## UNIT 14 — CORE-DESTRUCTIVE-LIFECYCLE
Generalize merge/retire/delete dependency safety.

## UNIT 15 — CORE-P14-BOUNDARY-SEAL
Seal Territory/Geometry interfaces only; no bulk GIS content.

## UNIT 16 — CORE-RESIDUE-CLEANUP
Sweep old writers/routes/workflows/launchers/compat services/duplicate registries/stale tests/dead flags/temporary helpers.

## UNIT 17 — CORE-FINAL-ACCEPTANCE
Required end-state:
- requirements contradictions = 0
- multi-writer canonical resources = 0
- duplicate truth registries = 0
- reachable legacy writer/runtime = 0
- retired identity resurrection path = 0
- fake date/sentinel dependency = 0
- unresolved data silently Runtime-published = 0
- manual semantic Runtime refresh dependency = 0
- normal registration follow-up completeness debt = 0
- Runtime reproducibility = PASS
- compiler determinism = PASS
- writer idempotency = PASS
- destructive lifecycle = PASS
- provenance preservation = PASS
- AI authoritative bypass = 0
- obsolete CORE execution code = 0

---

# 16. Work-unit execution rule

Every unit:

```text
1. Read #917 active unit.
2. Read only exact current-main paths/direct dependencies.
3. Determine smallest complete vertical architectural delta.
4. Implement.
5. Focused verification only.
6. Merge/apply only where required.
7. Remove/retire residue superseded by the unit.
8. Durable checkpoint.
9. Update #917 to exact next resume point.
10. STOP.
```

## Response Barrier
Default: **one work unit = one user turn**.

Complete the unit fully when feasible, then report completion/verification/next resume point and do not open, claim, or prepare the next unit.

Exception only when user explicitly requests multiple units in one response.

---

# 17. Change-size rule

Preferred change = complete vertical architectural slice.

Good:
`Polity resolver + focused tests + consumer cutover + old resolver removal`.

Bad:
- successor helper while old authority stays reachable;
- unrelated Source + Runtime + UI + Spatial + portrait rewrite together.

---

# 18. Migration rule

```text
additive schema
→ successor writer/read support
→ exact migration/reconciliation
→ consumer cutover
→ focused proof
→ obsolete path/schema cleanup
```

Dual-write only for genuinely necessary transition windows. Any temporary compatibility path needs an explicit removal condition at creation.

---

# 19. Efficiency target

Normal reviewed Person registration should become:

```text
bounded candidate review
→ one reviewed revision set
→ one current-state/preflight
→ one governed authoring superbatch
→ only necessary companion canonical writes
→ one Runtime publication
→ one batched verification
→ done
```

Recurring registration→domain→spatial→Runtime trigger→NamuWiki follow-up→later audit is a CORE failure.

---

# 20. Starting evidence for Unit 0

These are starting evidence only, never permanent status.

At plan creation:
- #917 still had the old three-item spine: Compile→Runtime, Registration v7, AI-reviewed authoring.
- `ATLAS_REQUIREMENTS.md` dated 2026-09-23 still described P11/P12 as pending despite later retirement/reframing work on main.
- requirements still contained old “currently serving political/public office” roster exclusion while canonical Person creation had moved to excluding all living Persons.
- NamuWiki review had become mandatory inside registration.
- recent main history showed repeated post-registration domain assignment and Runtime refresh trigger commits, proving fragmented completion.
- temporal Polity designations and identity corrections had become important enough to require CORE resolver/retirement semantics.
- living-Person hard deletion required Runtime/portrait dependency fixes, proving destructive lifecycle needs generalization.
- Lane A/B already exists, so AI work must complete its review boundary rather than create another authoring stack.

Unit 0 must re-read current main before mutating authority docs.

---

# 21. Historical task mapping

| Historical task | CORE v2 destination |
|---|---|
| P11 Baseline B / Canonical Freeze | Unit 0 reconciliation; do not recreate one-shot architecture unless current evidence proves a missing invariant |
| P12 reachable legacy retirement | Unit 0 reconciliation + Unit 16 residue proof |
| CORE-P13-COMPILE-RUNTIME-PROJECTION | Unit 2 |
| CORE-REGISTRATION-CONTRACT-V7 | Units 6–7 |
| CORE-P13-AI-REVIEWED-AUTHORING | Unit 13 |
| Source / Place P13 foundation | preserve; residuals Units 9–11 |
| old release trains | historical evidence only |
| obsolete rehearsal/executor tasks | never reactivate without new current evidence |

---

# 22. Master-plan change protocol

Update this file only when:
- a CORE architectural invariant changes,
- unit topology/dependency changes materially,
- a major scope boundary changes,
- or a completed architectural decision makes part of the plan obsolete.

Do not update it for ordinary progress, PR numbers, batch counts, temporary blockers, current SHA, or percent-complete. Those belong in #917 or Git history.

---

# 23. Exact initial resume point

Next unit:

`CORE-V2-UNIT-0-CURRENT-TRUTH-RECONCILIATION-20260927`

Do not begin Unit 2/old P13 compile-runtime work before Unit 0 is terminal.

The first future chat receiving “코어작업 이어서 해” must fetch #917, confirm the active unit, then execute that unit only.
