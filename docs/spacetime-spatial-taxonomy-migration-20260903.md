# ATLAS spacetime spatial taxonomy migration — 2026-09-03 r2

## Goal

Refine the 33-leaf equal-width X-axis introduced by PR #835 without returning to density-weighted geography.

The rule for this migration is:

**Split a mixed leaf only when the historical-geographic distinction is clear and the current reviewed spatial index has real polity bindings on both sides.**

This keeps the axis geographically more coherent without creating empty equal-width cells that would waste the readable 500% floor.

## Invariants

- Macroregions remain 9.
- Every leaf receives exactly one equal spatial unit.
- Person count, polity count, and temporal density never change width.
- Reviewed polity-subregion binding count remains **299**.
- All **39** refined leaves have at least one reviewed polity binding at migration time.
- World path:
  **Americas → Europe → Africa → West Asia → Central Asia → South Asia → Southeast Asia → East Asia → Oceania**.
- The path is a one-dimensional adjacency path. Geographic adjacency takes priority; representative longitude is the secondary ordering cue.
- Southeast Asia → East Asia → Oceania remains locked.

## Applied splits

| Old leaf | New leafs | Reviewed binding split | Examples |
|---|---|---:|---|
| Mesoamerica·Caribbean | Mesoamerica / Caribbean | 8 / 1 | Aztec, Maya, Mexico / Republic of Pirates |
| Eastern Europe·Russia | Eastern Europe / Russia·Volga | 3 / 6 | Kievan Rus', Makhnovshchina, Scythians / Russia, Kazan |
| North Africa·Nile | Maghreb·North Africa / Nile Valley | 4 / 4 | Carthage, Marinids / Egypt, Kush |
| Anatolia·Caucasus | Anatolia / Caucasus | 2 / 2 | Hittites / Armenia, Georgia |
| Levant·Mesopotamia | Levant / Mesopotamia | 9 / 6 | Israel, Tyre, Umayyads / Akkad, Babylon, Abbasids |
| Deccan·South India | Deccan·South India / Sri Lanka·Maldives | 2 / 2 | Kakatiya, Portuguese India / Polonnaruwa, Maldives |

## Applied conceptual merge / rename

The former **Manchuria·Mongolia** East Asian leaf is retired.

- Balhae, Goguryeo, and Liao move to **Manchuria**.
- Mongolia/steppe political geography is represented by the existing Central Asian leaf, whose display label is broadened to **Eastern Central Asia·Inner Asia**.
- This removes the artificial East Asia leaf that mixed Manchuria and Mongolia while avoiding a new empty Mongolia cell.

Other display-only clarifications:
- Britain·Ireland instead of state-like United Kingdom·Ireland.
- Italian Peninsula instead of modern-country-only Italy.
- Balkan Peninsula instead of bare Balkans.
- Northwest South Asia instead of context-free Northwest.
- Japanese Archipelago instead of modern-state-only Japan.
- Australia·New Zealand instead of the ambiguous display label Australasia.

## Deliberately not split yet

These remain combined because the current reviewed data occupies only one side or because another split would add empty equal-width cells without improving current historical placement:

- East Africa·Horn of Africa — currently only Ethiopian Empire is subregion-bound.
- Pacific Islands — currently only Kingdom of Hawaii is subregion-bound.
- Maritime Southeast Asia — current six bindings all fit the standard maritime historical-geographic category.
- Western Europe / Central Europe — boundaries remain broad but current polity assignments are not cleanly separable without more polity-specific geographic review.
- China — many dynasties span multiple Chinese macro-regions; static north/south splitting would imply false precision.

## Horizontal adjacency path

### Americas
North America → Mesoamerica → Caribbean → South America

### Europe
Britain·Ireland → Iberia → Western Europe → Italian Peninsula → Central Europe → Northern Europe → Balkan Peninsula → Eastern Europe → Russia·Volga

### Africa
West Africa → Maghreb·North Africa → Central Africa → Southern Africa → East Africa·Horn → Nile Valley

The final Nile leaf intentionally meets the Levant at the Africa/West Asia boundary.

### West Asia
Levant → Anatolia → Caucasus → Mesopotamia → Arabia → Iranian Plateau

### Central Asia → South Asia
Western Central Asia → Eastern Central Asia·Inner Asia → Northwest South Asia → North India·Ganges → Deccan·South India → Sri Lanka·Maldives

### Southeast Asia → East Asia → Oceania
Mainland Southeast Asia → Maritime Southeast Asia → China → Manchuria → Korean Peninsula → Japanese Archipelago → Australia·New Zealand → Pacific Islands

## Presentation geometry

Increasing from 33 to 39 equal leaves narrows each leaf. To avoid undoing PR #833's readability gains, the default non-Place rail corridor share changes from **22% to 12%**.

Historical placement is unchanged:
- exact reviewed Place rail stays at its historical anchor,
- non-Place rail movement remains presentation-only,
- labels remain inside their leaf band,
- historical Y never moves.

At the 1275px base-world wide-desktop 500% floor, a leaf remains above 120px and the standard 100px natural label acceptance remains locked.

## Follow-up

A future split must satisfy the same gate:
1. historically coherent boundary,
2. exact reviewed polity remap,
3. no guessed precision,
4. both resulting leaves actively represented unless there is a separately justified product need,
5. equal-width and density-independence preserved.
