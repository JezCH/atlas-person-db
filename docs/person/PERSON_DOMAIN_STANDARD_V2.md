# ATLAS Person Domain Standard v2

**Status:** Active canonical standard  
**Tracking:** #1806  
**Scope:** `representative_domain` only

## 1. Canonical taxonomy

ATLAS has exactly eight Person representative domains.

| Code | Korean label | Representative scope |
|---|---|---|
| `governance` | **정치·통치** | political power, rule, state leadership, de facto governance |
| `military` | **군사** | warfare and military command |
| `science` | **과학** | natural science, mathematics, medicine, astronomy, formal/empirical inquiry |
| `technology` | **공학·기술** | engineering, invention, architecture, applied technology |
| `commerce` | **경제·상업** | commerce, finance, enterprise, economic systems/thought when representative |
| `culture` | **인문·예술** | philosophy, history, language, literature, social thought, arts |
| `religion` | **종교** | religious leadership, theology, faith traditions, reform |
| `exploration` | **탐험** | exploration, navigation, expeditions, geographic discovery |

`science` owns the existing Academic Blue family formerly used by legacy `knowledge`; no ninth color or runtime sector exists.

## 2. Classification authority

A Person receives exactly one representative domain or NULL. Representative historical identity is the authority. Activity Role, titles, occupations, and offices are evidence only and never an automatic mapping rule.

## 3. Legacy `knowledge` retirement

`knowledge` is retired from the active DB constraint, server registry, browser registry, Admin/Human Authoring catalog, UI selectors, and new writes.

Historical pre-v2 review batches, authoring requests, and audit evidence may still contain the literal value `knowledge` because those artifacts describe the state that existed when they were reviewed. Those artifacts are evidence, not current assignments.

For an already-recorded Human Authoring request only, legacy `knowledge` is replay-normalized to canonical `science` while the original manifest hash and stored evidence remain unchanged. A new request carrying `knowledge` is rejected.

## 4. Historical final-cutover evidence

The immutable reviewed science set is preserved in `contracts/person-domain-v2-final-cutover.json`. It contains the 72 Person UUIDs used for the completed v1 → v2 cutover and is derived from the durable `science_retained` review checkpoints.

That contract is **historical audit evidence, not a live execution dependency**. The one-shot cutover workflow, handler, service, and OIDC mutation surface have been removed after successful completion.

The completed cutover transaction:

1. ran against exact Production `main`;
2. acquired the dedicated advisory/table/row locks;
3. proved the complete live `knowledge` UUID set exactly matched the reviewed 72 science UUIDs;
4. proved the approved pre-cutover checkpoint;
5. replaced the v1 DB constraint inside the serializable transaction;
6. rewrote exactly those 72 rows from `knowledge` to `science`;
7. wrote immutable per-Person mutation audits;
8. installed and validated the exact v2 eight-code DB constraint;
9. proved the post-cutover state before commit;
10. failed closed on any mismatch.

Normal Authoring never replays this historical cutover. Future registrations write the active v2 vocabulary directly.

## 5. Migration/replay contract

The replay-safe schema migration recognizes only coherent states:

- **pre-cutover:** `knowledge` exists and `science` does not; replay leaves the v1 constraint untouched so only the dedicated cutover transaction can move data;
- **post-cutover / clean reconstruction:** `knowledge` is absent and the validated v2 constraint is installed.

A mixed live `knowledge` + `science` storage state fails closed.

The old proposal apply path is retired and its executable stub has been removed. Pre-v2 batches remain immutable review evidence only; current automation performs read-only v2 verification.

## 6. Current invariant

Person Domain v2 migration is complete. The live invariant is now structural rather than tied to the historical cutover counts:

- no live Person stores `knowledge`;
- every non-null live representative domain is one of the exact eight canonical v2 codes;
- new Person registration performs representative-domain review by default and persists the result inside the registration lifecycle;
- omitted domain review cannot complete a new Person registration;
- Role→Domain automatic inference remains forbidden;
- live counts are allowed to grow or change as legitimate Persons are registered or evidence-backed corrections are made;
- runtime, Admin/Human Authoring, browser registry, Person UI, Spacetime UI, DB constraint, clean-schema replay, and regression tests must continue to agree on v2.

The historical `science=72` cutover set and Unit 23 distribution remain audit evidence only; they are not permanent live-count invariants.
