# ATLAS Person Domain Standard v2

**Status:** Approved migration target  
**Tracking:** #1806  
**Scope:** `representative_domain` only  
**Runtime state:** v1 remains live until the final cutover unit

## 1. Decision

ATLAS keeps exactly **eight** representative Person domains. The v2 taxonomy restores a clear distinction between science and humanities without adding a ninth sector.

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

The current eight color families are retained. `science` inherits the current Academic Blue family used by `knowledge`; no ninth color is introduced.

## 2. Classification authority

A Person receives one representative domain or NULL.

The decision is based on **representative historical identity**, not automatic Activity Role mapping. Titles, occupations, offices, or role strings may provide evidence but are not themselves classification authority.

Examples of boundary behavior:

- a philosopher or historian normally moves toward `culture`, not `science`;
- a physicist, mathematician, astronomer, or physician normally remains on the blue knowledge/science path;
- an engineer, inventor, or architect normally belongs to `technology`;
- a theologian or religious founder whose representative identity is religious belongs to `religion`;
- an economist or economic thinker may belong to `commerce` when economic systems or economic thought are the representative identity;
- multi-domain figures still receive one representative domain under the same editorial rule used by v1.

## 3. Why `knowledge` cannot be bulk-renamed now

The live v1 `knowledge` bucket contains both science-side and humanities-side Persons. A direct `knowledge → science` rename would therefore misclassify philosophers, historians, social thinkers, and similar figures as scientists.

For that reason, the v2 migration MUST NOT perform a blind code rename.

## 4. Migration sequence

The migration stays at eight semantic sectors throughout and does not create a temporary ninth sector.

### Unit 01 — contract

Record this target taxonomy and migration invariants only.

- no Production Person mutation;
- no schema constraint change;
- no runtime registry switch;
- no UI label switch.

### Review units — 5–12 current `knowledge` Persons per unit

For each bounded unit:

1. read current canonical Person/domain state;
2. determine the v2 representative target from historical representative identity;
3. if the target is not science, move the Person to the existing target code such as `culture`, `religion`, `commerce`, or `technology`;
4. if the target is science, leave the stored value as `knowledge` for now and record that Person in the same bounded review manifest's `science_targets` array;
5. each science-target record must identify the latest assignment provenance and is verified against live Production as still stored `knowledge`;
6. verify changed rows once through the canonical writer/read-back boundary;
7. write a durable checkpoint with the exact next unreviewed starting point.

No review unit may bulk-convert unresolved Persons.

### Final cutover unit

The cutover begins only after **every remaining live `knowledge` Person has been reviewed and confirmed science-target**. Immediately before cutover, the live `knowledge` Person-id set must exactly equal the durable union of reviewed `science_targets`; neither missing nor extra ids are allowed.

Then, as one bounded migration:

1. rename remaining stored `knowledge` values to `science`;
2. replace the controlled DB code;
3. update server and browser registries;
4. update labels:
   - 통치·정치 → 정치·통치
   - 기술·공학·발명 → 공학·기술
   - 상업·경제 → 경제·상업
   - 문화·예술 → 인문·예술
   - 종교·신앙 → 종교
   - 탐험·항해 → 탐험
5. reuse the current blue palette for `science`;
6. update focused tests and migration/replay guards;
7. verify `knowledge = 0` and exactly eight canonical codes.

## 5. Non-goals

This migration does not:

- add a ninth domain;
- add secondary or multi-color domains;
- infer domains automatically from Role;
- change Person/Activity identity semantics;
- change the eight established color families;
- activate P14 Territory/Geometry work.

## 6. Completion condition

Person Domain v2 is complete only when:

- all legacy `knowledge` Persons have a reviewed v2 disposition;
- no Person stores `knowledge`;
- `science` is the canonical blue science code;
- exactly eight canonical codes remain;
- runtime, Admin, Person UI, schema constraints, writer validation, and focused regression tests all agree on the v2 taxonomy.
