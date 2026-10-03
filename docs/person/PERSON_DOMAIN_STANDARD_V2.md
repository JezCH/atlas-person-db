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

## 4. Final cutover authority

The immutable reviewed science set is `contracts/person-domain-v2-final-cutover.json`. It contains exactly 72 Person UUIDs and is derived from all durable `science_retained` review checkpoints.

The dedicated final-cutover transaction must:

1. run only on exact Production `main` SHA with the dedicated GitHub Actions OIDC policy;
2. acquire the global Person Domain v2 advisory lock and table/row locks;
3. prove the complete live `knowledge` UUID set exactly equals the reviewed 72 science UUIDs;
4. prove all pre-cutover domain counts match the approved checkpoint;
5. drop the v1 domain constraint inside the same serializable transaction;
6. update exactly those 72 rows from `knowledge` to `science`;
7. write immutable per-Person `set_person_representative_domain` audits;
8. install and validate the v2 eight-code DB constraint;
9. prove the complete post-cutover distribution before commit;
10. roll back everything on any mismatch.

Normal Authoring migrations never perform the canonical row rewrite.

## 5. Migration/replay contract

The replay-safe schema migration recognizes only coherent states:

- **pre-cutover:** `knowledge` exists and `science` does not; replay leaves the v1 constraint untouched so only the dedicated cutover transaction can move data;
- **post-cutover / clean reconstruction:** `knowledge` is absent and the validated v2 constraint is installed.

A mixed live `knowledge` + `science` storage state fails closed.

The old proposal apply path is retired after v2. Pre-v2 batches remain immutable review evidence; current automation performs read-only v2 verification.

## 6. Completion condition

Person Domain v2 is complete only when:

- all reviewed science targets store `science`;
- no Person stores `knowledge`;
- `science=72` and the other seven counts match the Unit 23 checkpoint;
- exactly eight canonical codes are exposed;
- runtime, Admin/Human Authoring, browser registry, Person UI, Spacetime UI, DB constraint, clean-schema replay, and regression tests all agree on v2;
- exact Production SHA and immutable cutover evidence are recorded on #1806.
