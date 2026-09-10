# ATLAS Registration Ingest Policy

This policy is the generic completeness and efficiency rule for every ordinary registration path. It applies to Person registration today and to any future canonical entity registration that inherits the same authoring model.

## 1. Backfill-to-ingest rule

If a field, relation, classification, external reference, spatial binding, presentation binding, or other canonical obligation becomes important enough that already-registered records require a retrospective full-coverage audit or backfill, that obligation is mandatory for every newly created applicable record from that point forward.

A later cleanup campaign is not a substitute for ingest completeness. New registrations must stop creating fresh debt immediately.

## 2. Applicable-only rule

Completeness does not mean doing every possible check for every record.

Only obligations whose applicability predicate is true are executed. Examples:

- `representative_domain`: new Person;
- NamuWiki review: new or genuinely unreviewed Person;
- spacetime placement: newly created Polity, or a reused Polity already known to be spatially unbound;
- Place: only when an actual supported historical Place relation exists;
- Runtime publication: only after authoritative state changes.

Already proven canonical state is reused. Do not repeat research or writes merely because the registration pipeline has the capability.

## 3. Minimum sufficient work

The registration path must achieve complete applicable data with the fewest safe operations.

Default execution shape:

`bounded SCREEN once → one bundled REVIEW → one cohort preflight → one governed Authoring batch → only necessary companion writes → one publication/disposition → one terminal read-back pass → STOP`

Required efficiency invariants:

- SCREEN is bounded identity/dedup work, not a database-wide audit;
- independent research is parallelized;
- all applicable historical/editorial decisions are reviewed in one bundle instead of reopening the same Person repeatedly;
- reuse existing Person/Polity/Role/Source/domain/reference/spatial state when already proven;
- persist obligations in the canonical Human Authoring transaction whenever the canonical writer owns them;
- create a companion write only when a distinct canonical writer actually owns that obligation;
- prepare the companion payload during the same registration prework, not after completion;
- batch cohort transport: one preflight, one registration PR/Apply cycle, and one Runtime publication for the resulting authoritative state where ownership permits;
- serialize only the actual shared-write boundary; research, review, request preparation, tests, and nonconflicting CI remain parallel;
- perform one authoritative read-back per required written surface; no reassurance loops;
- stop immediately when the applicable terminal state is proven.

## 4. Anti-process-bloat rule

A new completeness obligation must not automatically create a new API, registration wrapper, audit table, queue, workflow, or per-Person transport loop.

The default is to extend the existing canonical contract and obligation registry.

A separate mechanism is allowed only when there is a real distinct ownership or transaction boundary that cannot safely be represented by the existing writer. Even then, it is a companion step in the same registration completion chain, not a permanent post-registration cleanup process.

Do not create:

- a second Person registration API;
- feature-specific registration wrappers;
- duplicate domain/reference audit mutations when the Human Authoring ledger already records the decision;
- one PR/workflow per Person when a safe cohort batch is possible;
- repeated Runtime compiles for the same resulting authoritative state;
- periodic audits whose only purpose is to repair omissions that the current ingest path could have prevented.

## 5. HOLD and failure semantics

Evidence-backed `HOLD` or unresolved is valid when a required decision genuinely cannot be made.

HOLD is not silent omission. It must state the unresolved obligation and evidence, and any obligation whose registry entry says `hold_blocks_registration_done` keeps the registration chain non-DONE.

Transport/provider failure alone is not historical evidence. In particular, provider blockage alone cannot prove NamuWiki absence.

## 6. Registry rule

`authoring/registration-obligations.json` is the machine-readable inventory of active registration obligations and execution invariants.

When a new project capability triggers a retrospective full-coverage audit/backfill, the same change set that establishes that audit must also:

1. add or update the corresponding obligation in the registry;
2. define its applicability predicate;
3. define its canonical writer or companion-writer boundary;
4. define whether HOLD is allowed and whether HOLD blocks registration completion;
5. add or update validation/regression coverage where the obligation is machine-checkable.

This prevents documentation drift and prevents new registrations from continuing to add the exact debt being audited.

## 7. Completion rule

`등록 완료` means all applicable registered obligations are either:

- written and authoritatively verified;
- reused from already-proven canonical state;
- or explicitly placed in the allowed evidence-backed HOLD state.

There must be no unspecified “do it later” debt.

Completeness and efficiency are simultaneous requirements: **do everything that is required, but only once, only where applicable, through the smallest canonical path.**
