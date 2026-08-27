# ATLAS Historical Person Registration SOP — Lean Path v5

This file is the operational source of truth for ordinary reviewed historical-person registration.

The rule is simple: **screen cheaply first, research only what survives the screen, parallelize independent review, commit once, verify once.** Registration is a bounded Production data operation, not a repository/deployment investigation.

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

### 4.1 Performance invariant — no serial re-discovery

The normal path is deliberately bounded.

For **one new Person**, the expected shape is:

```text
1 bounded Production SCREEN
→ historical review + NamuWiki review in parallel
→ 1 manifest
→ 1 PR / required fast-path CI
→ 1 Authoring Apply
→ 1 canonical Production VERIFY
→ STOP
```

For **multiple requested Persons**, including a batch that mixes ordinary Timeline registrations with non-timeline figures, the expected shape is:

```text
bounded SCREENs in parallel
→ REVIEW only surviving candidates, in parallel
→ one manifest per ordinary Timeline registration
   + one bounded non-timeline registry edit when needed
→ all registration data on one branch / one PR
→ one required registration-data fast-path CI
→ one Authoring Apply batch for Timeline manifests
→ one Production deployment for non-timeline static data only when needed
→ canonical Production VERIFY reads in parallel
→ STOP
```

The registration-data fast path recognizes exactly two routine data surfaces:

- `authoring/requests/*.json`;
- `non-timeline-persons.json`.

A PR containing only those surfaces is still a registration-only PR. It must not trigger P10, P11, Human Authoring Operational Parity, or the full integrity suite merely because ordinary and non-timeline Persons were reviewed in the same user batch.

Do **not** process a batch as repeated end-to-end single-Person pipelines unless a concrete dependency forces serialization. GitHub, CI, and Apply overhead should normally be paid once per user batch, while each logical registration still keeps its own transaction and immutable `request_id`.

During the normal path, do not inspect implementation files merely to remember how registration works. The SOP and deployed authoring contract are already authoritative. Inspect code, workflows, migrations, Vercel state, or repository internals only after a concrete validation/runtime failure points to that boundary.

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
- If the intended Person and intended Activity already exist, stop. Do not research or submit anything else.
- If the Person exists but the intended Activity is missing, reuse that Person and review only the missing Activity.
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

### Source reuse policy

A real Source remains mandatory. When a submitted Source has an exact canonical URL already present in Production, Human Authoring reuses that Source identity instead of creating another request-specific copy. URL-less bibliographic sources remain reviewable as separate records unless an explicit existing Source identity is supplied.

## 7. Stage 3 — COMMIT: one logical request, one atomic write

Use one `atlas-human-authoring/v1` request for one logical registration.

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

For an existing Person whose Production NamuWiki state is already `linked` or `not_found`, omit the new NamuWiki decision. The server reuses the existing reviewed value. A different value never silently overwrites an existing linked document; it requires separate review.

The Human Authoring transaction persists the NamuWiki decision to `person_external_references`; it is not merely authoring-ledger metadata. Do not perform a separate NamuWiki write after a successful registration.

### Batch behavior

A batch shares transport/authentication and may share read-only catalog caching, but **each logical registration has its own `SERIALIZABLE` transaction**.

Operationally, batching is the default whenever the user supplies multiple Persons:

- create one manifest per logical registration;
- put all eligible manifests on **one working branch and one PR**;
- pay the required authoring-only CI cost **once**;
- let **one Authoring Apply batch** attempt all eligible manifests;
- verify the resulting Persons concurrently after Apply.

Do not create one branch/PR/CI/Apply cycle per Person unless a concrete conflict, dependency, or user instruction requires separation.

Transaction behavior remains independent inside the shared batch:

- A success commits independently.
- B success commits independently.
- C failure rolls back C only.
- D is still attempted and may commit.
- the batch reports failure after all eligible items have been attempted.

On retry, already committed items replay idempotently and only unresolved items need new work.

### GitHub fallback only

When the GitHub fallback is used:

1. read latest `main` once, immediately before creating the working branch;
2. create one `agent/...` branch for the whole current registration batch;
3. add only the required registration data: `authoring/requests/*.json` and, when the routing gate requires it, the bounded `non-timeline-persons.json` edit; no unrelated code/UI changes;
4. open one PR containing the whole reviewed registration batch, including mixed Timeline + non-timeline registrations;
5. require only the repository's mandatory registration-data fast-path `test` check unless changed files or a concrete failure require more;
6. squash merge when green;
7. use one normal `ATLAS Authoring Apply` batch for the merged Timeline manifests; non-timeline static data is delivered by the normal Production deployment and does not block Authoring runtime compatibility.

Do not repeatedly fetch `main`, reopen repository structure, rediscover available GitHub/Vercel tools, or inspect workflow source during a normal green path. Re-check a transport boundary only when mergeability, CI, Apply, or Production verification supplies a concrete reason.

For registration-data-only work — `authoring/requests/*.json`, `non-timeline-persons.json`, or a mixture of the two — the registration-data integrity fast path is expected. P10, P11, full schema rehearsal, and Human Authoring Operational Parity are intentionally skipped because these data files do not alter those lifecycle/runtime contracts.

For manifest-only registration, do not inspect Preview deployments or poll Vercel unless Authoring Apply reports a concrete runtime/readiness/SHA boundary problem. If a true Production runtime deployment is still catching up, Authoring Apply must retry that deployment race itself before failing; do not require a human to notice the race and manually rerun the same immutable request.

A companion `non-timeline-persons.json` change is **not** an Authoring endpoint runtime dependency. It may still require a Vercel Production deployment so the static registry becomes visible, but Timeline DB Apply must not wait for that static deployment before using an already compatible Authoring runtime.

## 8. Stage 4 — VERIFY: one Production read, then stop

Perform one bounded Production Person read using the canonical Person name. For a batch, issue these canonical verification reads concurrently after Apply.

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
- repeated Production read-back after canonical verification;
- requeue-only PRs for unchanged requests.

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
- Production read-back mismatch → registration remains incomplete until that mismatch is resolved.

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

The stopping rule is strict: **first authoritative canonical Production verification completes the registration.**