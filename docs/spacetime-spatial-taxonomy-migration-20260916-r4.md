# ATLAS Spatial Taxonomy r4 — hierarchy-first migration

Date: 2026-09-16
Revision: `2026-09-16-r4`

## Scope

r4 publishes the display hierarchy before exact polity reassignment. The active display taxonomy is exactly **9 macroregions / 45 equal-width leaf subregions**.

This phase does not edit the immutable migrated baseline and does not assign any polity UUID to a newly introduced leaf.

## Active r4 delta

- `east-africa-horn` is retired as an active display leaf and replaced by `east-africa` + `horn-of-africa`.
- `western-siberia` is added under `central-asia`.
- `tibetan-plateau` is added under `central-asia`.
- `himalayas` is added under `south-asia`.
- `eastern-siberia-far-east` is added under `east-asia`.
- Macro code `central-asia` is retained; its display label becomes `중앙유라시아`.
- Leaf widths remain density-independent and equal across all 45 active leaves.

## Phase-1 compatibility rule

The immutable r3 baseline still contains reviewed polity bindings to `east-africa-horn`. Until the exact-UUID migration is applied, that retired code is accepted **only as baseline compatibility**.

Display code resolves `east-africa-horn` to a virtual band spanning the two adjacent active r4 leaves `east-africa` and `horn-of-africa`. The virtual band:

- is not present in the active 45-leaf list;
- is not available to newly authored reviewed binding shards;
- preserves existing reviewed placement without guessing which side of the split a polity belongs to;
- must be removed after Phase 2 completes.

The remaining new r4 leaves may therefore have zero reviewed polity bindings during Phase 1. Zero population is not a taxonomy error and must not affect width.

## Phase 2

After the r4 hierarchy is verified in Production, reviewed exact-UUID migration will:

1. split all retained `east-africa-horn` bindings between `east-africa` and `horn-of-africa`;
2. move reviewed candidates into `western-siberia`, `tibetan-plateau`, `himalayas`, and `eastern-siberia-far-east`;
3. update the canonical model subregion-parent contract to r4;
4. remove the temporary `east-africa-horn` compatibility path;
5. keep the migrated baseline file physically immutable by applying the migration through the reviewed migration/compiler path.

No UUID migration is part of this Phase-1 document.
## 2026-09-25 display-order continuity pass

This pass changes **display order only**. It does not add, remove, rename, re-parent, or rebind any macroregion, leaf subregion, polity UUID, PlaceFunction, or Activity override.

The one-dimensional X axis is optimized as a historical-geographic reading path rather than a strict modern longitude sort. The primary objective is to minimize abrupt jumps both **inside each macroregion** and **across macroregion boundaries** while preserving the existing 9-macro / 45-equal-leaf contract.

Canonical leaf order after this pass:

1. Americas — `south-america → caribbean → mesoamerica → north-america`
2. Europe — `britain-ireland → northern-europe → russia-volga → eastern-europe → balkans → central-europe → italy → western-europe → iberia`
3. Africa — `maghreb-north-africa → west-africa → central-africa → southern-africa → east-africa → horn-of-africa → nile-valley`
4. West Asia — `levant → arabia → mesopotamia → anatolia → caucasus → iranian-plateau`
5. Central Eurasia — `western-central-asia → western-siberia → eastern-central-asia-steppe → tibetan-plateau`
6. South Asia — `himalayas → northwest-south-asia → north-india-ganges → deccan-south-india → maldives → sri-lanka`
7. Southeast Asia — `maritime-southeast-asia → mainland-southeast-asia`
8. East Asia — `china → manchuria → eastern-siberia-far-east → korean-peninsula → japan`
9. Oceania — `pacific-islands → australasia`

The macro-boundary bridge pairs are intentionally:

- `north-america → britain-ireland` across the North Atlantic;
- `iberia → maghreb-north-africa` across the western Mediterranean / Strait of Gibraltar;
- `nile-valley → levant` across the eastern Mediterranean / Sinai corridor;
- `iranian-plateau → western-central-asia`;
- `tibetan-plateau → himalayas`;
- `sri-lanka → maritime-southeast-asia` through the Indian Ocean / Bay of Bengal network;
- `mainland-southeast-asia → china`;
- `japan → pacific-islands`.

The display-order revision identifier is `2026-09-25-continuity-v1`. Taxonomy revision remains `2026-09-16-r4` because leaf membership and parentage are unchanged.
