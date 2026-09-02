# ATLAS Historical Person Registration SOP — Lean Path v6.2

This file is the operational source of truth for ordinary reviewed historical-person registration.

The rule is simple: **screen cheaply first, classify the route once, research only what survives the screen, parallelize independent review, commit once, verify once.** Registration is a bounded Production data operation, not a repository/deployment investigation.

A second rule is equally important: **ordinary registration must use the already-established authoring system; it must not rediscover or re-audit that system on every Person.** Source-code inspection, workflow inspection, deployment inspection, capability discovery, schema archaeology, and repository-wide investigation are exception handling, not registration steps.

## 1. Completion criterion

A registration is complete only when authoritative Production read-back confirms the intended Person and Activity.

A merged PR, green CI, Vercel deployment, authoring response without read-back, or workflow start is not completion by itself.

## 2. Safety gates that are never removed

Every ordinary registration keeps these invariants:

- bounded Production Person duplicate screening before expensive historical research;
- reviewed historical identity, chronology, relation, Role, Polity, and at least one real Source for every new Activity;
- NamuWiki review for a new Person or a Person whose NamuWiki status has never been reviewed;
- an already reviewed existing Person reuses its live `linked` or `not_found` NamuWiki state without re-searching it;
- normalized Person/Polity/Role identity reuse when an exact live identity exists;
- active Relation Type and Period Basis resolution;
- PostgreSQL `SERIALIZABLE` transaction per logical request;
- semantic Activity duplicate enforcement;
- immutable `request_id` and idempotent replay;
- Production readiness / authorization boundaries enforced by the server;
- authoritative Production read-back after the write.

Historically real discontinuities are separate Activities. Never invent an exact year, month, or day merely to satisfy a request contract.

## 3. Legendary / mythical / unresolved-chronology routing gate

Before ordinary Timeline authoring, decide whether the requested figure belongs on the historical year timeline at all.

Evaluate this routing gate during SCREEN, before expensive historical/NamuWiki research for ordinary Timeline authoring.

Historical Timeline admission requires **both** of these independent gates to pass:

1. **Historicity PASS** — there is sufficient historical basis to treat the figure as an actual human individual, or at least as a historically meaningful individual with a plausible historical core rather than a purely mythical/fictional person.
2. **Personal chronology PASS** — there is a defensible **person-specific** Activity/reign interval, narrow scholarly estimate, directly attributable event year, floruit, or representative historical point that can be drawn on the map without turning a culture-wide/period-wide date envelope into the person's own Activity rail.

In compact form:

`Timeline = Historicity PASS AND Personal chronology PASS`

If **either** gate fails, route the figure to `non-timeline-persons.json` instead of ordinary year-Timeline authoring.

For this class of figure:

- set `timeline_status=excluded`;
- keep `activity_start` and `activity_end` null;
- use the narrowest historically appropriate traditional Polity/community association;
- preserve a conventional foundation/traditional year only in `traditional_year` when the tradition itself makes that year meaningful; never promote it to a verified Activity boundary;
- never convert a culture, settlement, dynasty, confederacy, or archaeological date range into a person's Activity interval merely to make the figure visible on the timeline;
- do not admit a purely mythical/legendary individual merely because a later king list or tradition supplies precise-looking reign years.

Examples:

- **Telesilla** — historicity PASS + an ancient chronographic floruit around 451/450 BCE → ordinary Timeline as a representative `c.451 BCE` point, not a fabricated 50-year rail.
- **Hiawatha** — historically meaningful tradition, but no defensible person-specific interval amid competing confederacy chronologies → non-timeline.
- **Kupe** — plausible historical core in Māori tradition, but settlement/cultural date ranges do not establish Kupe's personal Activity interval → non-timeline.
- a wholly mythical king with a precise traditional 20-year reign → historicity FAIL → non-timeline.

Approximate dates are not themselves a reason for exclusion. A Person stays on the Timeline when both gates pass and the uncertainty can be represented honestly with `approximate`, `uncertain`, `disputed`, or a reviewed representative point.

## 4. The normal four-stage path

Ordinary registration has four top-level stages:

```text
SCREEN
→ REVIEW
→ COMMIT
→ VERIFY
```

Git branches, PRs, CI jobs, workflow runs, deployments, UUIDs, and internal catalog lookups are transport or implementation details, not additional historical-registration stages.

For operator/user reporting, keep the process visible as these four stages. Do not narrate transport internals as if they were extra historical-review stages unless a concrete failure makes them relevant.

### 4.1 Performance invariant — no serial re-discovery

The normal path is deliberately bounded.

For **one new Person**, the expected shape is:

```text
1 bounded Production SCREEN
→ historical review + NamuWiki review in parallel
→ deterministic request_id + Production preflight
→ 1 manifest
→ 1 PR / required fast-path CI
→ 1 Authoring Apply
→ automatic canonical Production VERIFY
→ STOP
```

For **multiple requested Persons**, including a batch that mixes ordinary Timeline registrations, existing records, correction cases, non-timeline figures, exclusions, and open-ended current terms, the expected shape is:

```text
bounded SCREENs in parallel
→ classify every requested item exactly once as one of:
   COMPLETE_EXISTING
   ORDINARY_TIMELINE
   NON_TIMELINE
   EXCLUDE
   NEEDS_CORRECTION
   DEFERRED_OPEN_ENDED
→ REVIEW only ORDINARY_TIMELINE + NON_TIMELINE survivors, in parallel
→ compile one normal registration batch
→ deterministic request_ids + one Production preflight batch
→ BLOCKED items are isolated; READY items continue
→ one manifest per ordinary Timeline registration
   + one bounded non-timeline registry edit when needed
→ all normal registration data on one branch / one PR
→ one required registration-data fast-path CI
→ one item-isolated Authoring Apply batch for READY Timeline manifests
→ automatic canonical Production VERIFY reads in parallel
→ STOP normal registration lane
→ process NEEDS_CORRECTION separately through the correction lane only when required
```

The registration-data fast path recognizes exactly two routine data surfaces:

- `authoring/requests/*.json`;
- `non-timeline-persons.json`.

A PR containing only those surfaces is still a registration-only PR. It must not trigger P10, P11, Human Authoring Operational Parity, or the full integrity suite merely because ordinary and non-timeline Persons were reviewed in the same user batch.

Do **not** process a batch as repeated end-to-end single-Person pipelines unless a concrete dependency forces serialization. GitHub, CI, and Apply overhead should normally be paid once per user batch, while each logical registration still keeps its own transaction and immutable `request_id`.

During the normal path, do not inspect implementation files merely to remember how registration works. The SOP and deployed authoring contract are already authoritative. Inspect code, workflows, migrations, Vercel state, or repository internals only after a concrete validation/runtime failure points to that boundary.

### 4.2 Batch compilation + Production preflight invariant — build once, probe once, write once

Operational continuation: when the user instructs registration to continue after a disclosed provider access block, apply the explicit `review_deferrals.namuwiki` GitHub exception in `NAMUWIKI_REGISTRATION_POLICY.md`. Its pending-review record replaces the unavailable reference decision for this bounded case; never record an unverified `not_found`. If a direct Admin session is unavailable, the existing authenticated GitHub Authoring Apply workflow performs authoritative `preflight_batch` before any Person/Activity write. Report pre-commit preflight as not performed, and rely on the workflow's actual per-item classifications and canonical verification rather than claiming READY in advance. This changes neither authentication nor the pre-write database checks.

After SCREEN and REVIEW finish for a multi-Person request, compile the surviving registrations as one in-memory batch before touching Git.

The local batch compilation preflight must confirm:

- every Timeline candidate has one complete reviewed Human Authoring manifest;
- only already-supported Relation Type and Period Basis codes are used unless a bounded catalog lookup has explicitly resolved a new ambiguity;
- every new Person has its reviewed NamuWiki decision;
- when an existing Person already has a reviewed live NamuWiki value, copy that exact live value into the GitHub manifest if the current repository validator requires the field; **do not re-search NamuWiki**;
- all non-timeline additions are folded into one bounded replacement of `non-timeline-persons.json`;
- no excluded candidate produces a placeholder manifest merely to keep batch cardinality aligned.

For the GitHub fallback, materialize the compiled batch with Git objects:

```text
create blobs concurrently
→ create one tree based on current main
→ create one commit
→ move one working-branch ref
```

Do not create one GitHub Contents commit per manifest. That serial network overhead adds no historical, validation, transactional, or audit safety and is therefore removed from the normal batch path.

This optimization changes only transport materialization. SCREEN, REVIEW, mandatory sources, NamuWiki review/reuse, CI, Authoring Apply, transaction boundaries, and Production VERIFY are unchanged.

Before the GitHub fallback batch is committed, run one authoritative Production `preflight_batch` through the same Human Authoring resolver used for the real write. The preflight executes every candidate inside a SERIALIZABLE transaction and always rolls it back. Each candidate is classified independently as:

- `READY` — the exact reviewed request can be committed;
- `ALREADY_PRESENT` — the immutable request is already committed and only read-back verification is needed;
- `BLOCKED` — request-id collision, identity ambiguity, unresolved catalog entry, semantic duplicate, NamuWiki overwrite conflict, or another concrete authoring error.

A BLOCKED candidate must not prevent unrelated READY candidates from being applied.


### 4.3 SCREEN routing invariant — classify once, then stay in lane

Every requested item receives exactly one initial route after bounded Production screening and the minimum historical identity check needed to understand the request:

- `COMPLETE_EXISTING` — the intended Person and intended Activity already exist correctly. Stop for that item.
- `ORDINARY_TIMELINE` — a new Person or missing non-conflicting Activity can be authored through normal Human Authoring.
- `NON_TIMELINE` — the figure passes the project inclusion gate but not the historical Timeline gate; route to `non-timeline-persons.json`.
- `EXCLUDE` — fictional, generic-title-only, unsupported identity, or otherwise outside the reviewed project inclusion criteria. Report the exclusion; do not create placeholder data.
- `NEEDS_CORRECTION` — the Person/Activity already exists but the requested change would alter its semantic identity, primary Polity, chronology, relation, Role, or another authoritative field. Do **not** create a competing Activity to simulate a correction.
- `DEFERRED_OPEN_ENDED` — the requested Activity is genuinely ongoing/current and the current authoring contract cannot represent an open end without fabricating an end boundary. Do not invent a terminal year.

This routing decision is a performance and safety boundary. Once an item is classified as `NEEDS_CORRECTION` or `DEFERRED_OPEN_ENDED`, it leaves the ordinary registration batch. Do not continue ordinary manifest authoring for that item merely to keep the whole user list on one path.

Completed earlier Activities for the same Person may still proceed normally even when a separate current term is `DEFERRED_OPEN_ENDED`.


## 5. Stage 1 — SCREEN: cheapest useful check first

Do not begin full historical research before checking whether the intended Person is already in Production.

Start with only enough identity information to search reliably:

- canonical or strongly likely English name;
- materially distinct aliases only when genuinely needed to distinguish the Person.

Use the bounded Person search surface:

```text
/api/atlas-read?__atlas_read_surface=person&q=<person-name>
```

Rules:

- For a multi-Person user request, issue the bounded Person SCREENs concurrently rather than waiting for each Person to finish before starting the next.
- If the intended Person and intended Activity already exist correctly, classify `COMPLETE_EXISTING` and stop. Do not research or submit anything else.
- If the Person exists but the intended Activity is genuinely missing and does not conflict with an existing semantic Activity, classify `ORDINARY_TIMELINE`, reuse that Person, and review only the missing Activity.
- If the Person exists and the user's request actually requires changing an existing Activity's Polity, relation, Role, chronology, notes with semantic significance, or other authoritative identity-bearing field, classify `NEEDS_CORRECTION`. Do not add a second overlapping Activity as a workaround.
- If the requested term is ongoing and the active authoring contract requires a closed end boundary, classify that term `DEFERRED_OPEN_ENDED`. Never substitute the current year, an expected election year, or another guessed endpoint.
- If the Person exists, note its current NamuWiki state. `linked` or `not_found` counts as reviewed and is reused; do not search NamuWiki again merely because a new Activity is being added.
- If the Person is absent, continue to REVIEW.
- Once an exact Person is identified, do not keep trying more spellings for reassurance.
- Do not inspect comparable rulers or neighboring records merely to infer ordinary Role/Polity conventions when the requested identity is already historically clear.
- Never dump the full Production dataset for one registration.

This stage intentionally comes before expensive research.

## 6. Stage 2 — REVIEW: research only what is actually needed

For a new Person, or for the missing Activity of an existing Person, establish only the facts needed to author that record:

- canonical English Person name;
- Korean display name when a new Person will be created;
- primary Polity under the current ATLAS political-community rules;
- relation type;
- Role when applicable;
- period basis;
- reviewed start/end boundaries and certainty/calendar values;
- evidence confidence;
- at least one real Source;
- NamuWiki result only when the Person is new or currently unreviewed: exact `linked` Person document or explicit `not_found`.

Historical research and NamuWiki research **should be performed in parallel** after SCREEN has established that they are necessary. For a batch, review different surviving Persons in parallel as well; do not serialize independent historical/NamuWiki checks.

Do not expand ordinary registration into a repository audit, deployment audit, unrelated Person comparison, whole-DB investigation, source-code inspection, workflow inspection, or capability discovery. Those actions require a concrete failure or ambiguity first.

### Polity / Role lookup policy

Human Authoring itself resolves or creates exact normalized Person/Polity/Role identities inside the authoritative transaction.

Therefore manual catalog lookup is **not a mandatory standalone step** for every registration. Use a bounded catalog lookup only when:

- the reviewed historical label is ambiguous;
- several plausible existing identities may exist;
- a naming/canonicalization decision actually needs operator review.

If the reviewed entity is clearly legitimate and there is no exact live identity, let Human Authoring create it. Do not search for a comparable ruler merely to infer a Polity or Role.

For a **correction** whose reviewed target Polity does not yet exist, do not manufacture an unrelated Person Activity merely to obtain a Polity UUID. Prefer a supported reviewed identity-authoring path or an atomic correction path that can bind the new Polity safely. A prerequisite ordinary Activity may create the Polity only when that Activity is independently historically warranted and already belongs in the user's reviewed work; record the dependency explicitly. If no safe identity path exists, keep the correction blocked rather than inventing data.

### Source reuse policy

A real Source remains mandatory. When a submitted Source has an exact canonical URL already present in Production, Human Authoring reuses that Source identity instead of creating another request-specific copy. URL-less bibliographic sources remain reviewable as separate records unless an explicit existing Source identity is supplied.

## 7. Stage 3 — COMMIT: one logical request, one atomic write

Use one `atlas-human-authoring/v1` request for one logical registration.

For new Human Authoring requests, `request_id` is optional at the reviewed-data surface. If omitted, the server and repository validator deterministically derive the same id as `human-v6.1:<sha256-prefix>` from the stable reviewed payload with `request_id` excluded. Identical reviewed payloads therefore replay under the same id automatically; materially changed payloads receive a different id. Existing explicit request ids remain valid and are never rewritten.

Preferred transport:

- normal Admin Human Authoring when available;
- reviewed GitHub manifest only as an operational fallback or when an auditable manifest review is intentionally required.

The server is authoritative for:

- exact Person/Polity/Role reuse or creation;
- Relation Type and Period Basis resolution;
- Source canonical-URL reuse;
- NamuWiki reuse/persistence;
- semantic Activity duplicate detection;
- transaction and verification boundaries.

### NamuWiki behavior

For a new or previously unreviewed Person, submit exactly one decision at `external_references.namuwiki`:

```json
{
  "status": "linked",
  "checked_at": "YYYY-MM-DD",
  "document_title": "exact document title",
  "url": "https://namu.wiki/w/..."
}
```

or:

```json
{
  "status": "not_found",
  "checked_at": "YYYY-MM-DD"
}
```

For an existing Person whose Production NamuWiki state is already `linked` or `not_found`, the historical review reuses that live value and **does not perform a new NamuWiki search**. The Human Authoring server can reuse the existing reviewed value. However, while the repository fast validator still requires `external_references.namuwiki` on every changed Human Authoring manifest, the GitHub fallback must copy the exact live reviewed value into that manifest as validation metadata. A different value never silently overwrites an existing linked document; it requires separate review.

The Human Authoring transaction persists the NamuWiki decision to `person_external_references`; it is not merely authoring-ledger metadata. Do not perform a separate NamuWiki write after a successful registration.

### Batch behavior

A batch shares transport/authentication and may share read-only catalog caching, but **each logical registration has its own `SERIALIZABLE` transaction**.

Operationally, batching is the default whenever the user supplies multiple Persons **within the same route**:

- create one manifest per logical registration;
- put all eligible manifests on **one working branch and one PR**;
- pay the required authoring-only CI cost **once**;
- let **one Authoring Apply batch** attempt all eligible manifests;
- accept the workflow's automatic canonical Production read-back as the normal final VERIFY; do not immediately re-query every successful item manually.

Do not create one branch/PR/CI/Apply cycle per Person unless a concrete conflict, dependency, or user instruction requires separation.

Transaction behavior remains independent inside the shared batch:

- Production preflight first removes known BLOCKED items from the write set.
- A success commits independently.
- B success commits independently.
- C failure rolls back C only.
- D is still attempted and may commit.
- the batch reports partial failure after all eligible items have been attempted, including the successful result rows and failed indexes.

On retry, already committed items replay idempotently and only unresolved items need new work. No successful item needs a retry-only PR.

### GitHub fallback only

When the GitHub fallback is used:

1. read latest `main` once, immediately before creating the working branch;
2. create one `agent/...` branch for the whole current registration batch;
3. compile all reviewed registration files first, then create their Git blobs concurrently, one tree on the current-main base tree, and one commit for the batch;
4. include only the required registration data: `authoring/requests/*.json` and, when the routing gate requires it, the single bounded `non-timeline-persons.json` edit; no unrelated code/UI changes;
5. open one PR containing the whole reviewed registration batch, including mixed Timeline + non-timeline registrations;
6. require only the repository's mandatory registration-data fast-path `test` check unless changed files or a concrete failure require more;
7. squash merge when green;
8. use one normal `ATLAS Authoring Apply` batch for the merged Timeline manifests; non-timeline static data is delivered by the normal Production deployment and does not block Authoring runtime compatibility.

Do not repeatedly fetch `main`, reopen repository structure, rediscover available GitHub/Vercel tools, or inspect workflow source during a normal green path. Re-check a transport boundary only when mergeability, CI, Apply, or Production verification supplies a concrete reason.

For registration-data-only work — `authoring/requests/*.json`, `non-timeline-persons.json`, or a mixture of the two — the registration-data integrity fast path is expected. P10, P11, full schema rehearsal, and Human Authoring Operational Parity are intentionally skipped because these data files do not alter those lifecycle/runtime contracts.

For manifest-only registration, do not inspect Preview deployments or poll Vercel unless Authoring Apply reports a concrete runtime/readiness/SHA boundary problem. If a true Production runtime deployment is still catching up, Authoring Apply must retry that deployment race itself before failing; do not require a human to notice the race and manually rerun the same immutable request.

A companion `non-timeline-persons.json` change is **not** an Authoring endpoint runtime dependency. It may still require a Vercel Production deployment so the static registry becomes visible, but Timeline DB Apply must not wait for that static deployment before using an already compatible Authoring runtime.

## 8. Stage 4 — VERIFY: automatic Production read-back, then stop

The Authoring Apply workflow performs one authoritative Production Person-detail read for every newly committed or ALREADY_PRESENT Human Authoring result. It verifies the Person identity, exact Activity id, Polity, Relation Type, Role, Period Basis, temporal boundaries, and reviewed NamuWiki state against the manifest.

Manual canonical Person read-back is only a fallback when the automatic verifier reports a mismatch, the workflow did not produce authoritative verification, the user explicitly requests a fresh full audit, or an operator needs provenance-specific detail.

A successful Authoring Apply verification is not followed by a second full manual batch read merely for reassurance. The first authoritative canonical verification is sufficient.

Verify:

- exactly one intended Person identity;
- intended Korean/English names;
- intended Activity;
- Polity;
- Role;
- relation type;
- period basis;
- temporal boundaries;
- expected NamuWiki state, whether newly written or reused;
- no duplicate or partial Activity.

If the bounded Person result exposes all required completion fields, stop. Use Person detail only when a real ambiguity or provenance-specific verification requires it.

Do not perform additional alias reads merely for more confirmation.

## 9. Retry policy — reuse, never requeue

If the logical request content is correct but Commit fails because of a server bug, deployment timing, transient conflict, or another batch item:

1. fix only the concrete failure boundary if one exists;
2. replay the same immutable request;
3. for GitHub manifests, use `ATLAS Authoring Apply` → `workflow_dispatch` with the existing manifest path.

Do not create a copied manifest, timestamped replacement, new request id, or retry-only PR for unchanged content.

Create a new request/version only when the reviewed historical content itself changes.

## 10. Explicitly deleted from the normal registration process

The following are not normal registration steps unless a concrete failure makes one necessary:

- full historical research before Production duplicate screening;
- NamuWiki re-search for an existing Person already marked `linked` or `not_found`;
- mandatory separate Polity and Role catalog lookups when the reviewed labels are unambiguous;
- full Production dataset export/dump;
- comparable-Person chasing to infer identity;
- repeated discovery of GitHub/Vercel capabilities;
- re-reading authoring service/workflow/migration code merely to remember the established registration contract;
- repository-wide status inspection before every action;
- serial end-to-end processing of independent Persons in the same user batch;
- one branch/PR/CI/Apply cycle per Person when one batch can carry them safely;
- repeated reads of `main` SHA;
- Preview deployment inspection for data-only registration;
- post-merge Vercel polling without a concrete Apply/runtime error;
- separate NamuWiki persistence after Human Authoring;
- repeated Production read-back after canonical verification, including a second full batch read immediately after successful automatic Apply verification;
- requeue-only PRs for unchanged requests;
- serial GitHub Contents commits for each manifest in a multi-file batch when one Git tree commit can carry the same reviewed data.

## 11. Failure handling is narrow and local

Only move backward when a concrete gate fails:

- SCREEN finds an existing complete record → stop;
- historical evidence changes the intended record → return to REVIEW;
- identity ambiguity → perform the smallest bounded catalog/detail lookup needed;
- NamuWiki conflict with an existing linked document → separate link review, never silent overwrite;
- Source canonical URL maps ambiguously → Source duplicate review;
- manifest validation or required `test` failure → fix the same branch/request;
- runtime/readiness/SHA failure → let the bounded automatic runtime catch-up retry finish first; only diagnose if that retry exhausts;
- transient Commit failure → replay the same request;
- Production read-back mismatch → registration remains incomplete until that mismatch is resolved;
- existing Activity requires semantic replacement → leave ordinary registration and use the bounded correction lane;
- current/open-ended Activity cannot be represented by the active contract → record `DEFERRED_OPEN_ENDED`, do not fabricate an end boundary, and continue unrelated completed Activities.

Do not restart generic repository, Production, deployment, or tool-capability discovery because a later gate failed. Diagnose only the named failing boundary and then resume the same immutable registration flow.

## 12. Completion report

Report success only after VERIFY.

```text
등록 완료
Person: <English> / <Korean>
Polity: <...>
Role: <...>
Period: <...>
나무위키: 연결됨 — <document_title> | 문서 없음 | 기존 검토값 재사용
Production read-back: VERIFIED
```

The stopping rule is strict: **first authoritative canonical Production verification completes the registration.** A second manual verification pass is not part of the normal path.

For a mixed user batch, the final report should distinguish `COMPLETE_EXISTING`, newly `VERIFIED`, `NON_TIMELINE`, `EXCLUDE`, `NEEDS_CORRECTION`, and `DEFERRED_OPEN_ENDED` items without forcing them through one artificial workflow.


### Ongoing-term support (2026-09-02)

The Human Authoring path now supports source-verified current terms using
`chronology_status: "ongoing"`, an entirely null end boundary, and
`ongoing_as_of`. Review the actual start and the incumbent status at that date.
Use the ordinary path when the ongoing schema migration is deployed; retain
`DEFERRED_OPEN_ENDED` for a runtime that cannot represent this contract. Never
convert an unknown historical endpoint into an ongoing term. Do not use the
verification date as the Activity end. See `HUMAN_AUTHORING.md` for the payload
and readback contract.
