# ATLAS Premium Phase II — VIS2-09 Detail Hero / Authentic Portrait Edge

**Date:** 2026-10-09 · **Unit:** VIS2-09 only · tracker [#2158](https://github.com/JezCH/atlas-person-db/issues/2158).

**Prior checkpoint:** VIS2-08 already signed off at [#2222](https://github.com/JezCH/atlas-person-db/pull/2222), [exact-SHA Chrome #37851784735](https://github.com/JezCH/atlas-person-db/actions/runs/37851784735) SUCCESS. The current unit does not redo selected-register state or begin VIS2-10 Chronicle/Source.

## Before-write duplication/identity audit

The existing `atlas-person-chronicle-detail.css` already owns the full Detail hero: 184px portrait / biography grid (mobile one column at 250/230px), title and BC/AD dates, a modest canonical-name inscription, neutral material sheen, honor-metal eyebrow, eight domain identity markers, and `DETAIL-LUX1` genuine `.has-portrait` versus absent `:not(.has-portrait)` frame treatment. Phase II VIS2-01 materials, VIS2-02 engraving and VIS2-03 mixed-script type are already applied. **Do not reimplement any of those.**

The actual `atlas-person-main.js` sets `.has-portrait` **only when a real stored portrait provides a validated HTTP asset URL**, otherwise retains a separately labeled no-portrait state and a nonportrait era background. This task never generates/images, changes or assumes a historical likeness.

## Reversible, microscopic optical treatment

`atlas-person-detail-hero-frame-v2.css` is independently linked in `index.html` after VIS2-08. It exclusively scopes to `#personMainDetail.person-main-detail .person-chronicle-*` and refines:
- existing biography hero neutral surface depth / inset hairline **paint only**;
- existing genuine `.has-portrait` frame outside shadow, without adding frame width, border, image overlay or changing URLs;
- existing `:not(.has-portrait)` neutral missing-portrait frame, less ceremonial than a true likeness;
- existing eyebrow, canonical name and historicity/status neutral inscriptions, **never** primary name color, historical dates or eight domain-color markers.

Only CSS properties `background-image`, `box-shadow`, and `color` are modified. No layout dimensions, new DOM or pseudo-elements, invented portrait, image URLs, typography metrics, font loading, metadata, data, interactions, selected domain semantics, Person Register columns, Spacetime camera or Polity values.

## Exact-Production A/B acceptance

Static test `tests/vis2-09-person-detail-hero-frame.test.mjs` requires genuine portrait presence conditional and a strict CSS paint allowlist. `scripts/verify-vis2-09-production-detail-hero.mjs` runs after the established Production exact SHA and all previous VIS2-00–08 gates, and toggles only the VIS2-09 CSS link on **the same actual open Person detail**:

- 390/768/1440/1600 first real Person opening (four width variants);
- 390/1440 real Person row with multiple Activities (two variants), verifying at least two actual detailed Activity records;
- 1440 *if one is truly found*, a real stored-portrait Person from up to 32 production records using the existing readonly Person Portrait API; **report availability/no evidence honestly**, never synthesize a face or force `.has-portrait` in the production DOM.
- Compare exact Person name, primary title/date/domain colors, source and Activity counts, genuine image source/alt, all Detail hero/portrait/text bounding boxes, scroll heights/widths, main register row cardinality, no Person main portraits and no horizontal overflow. Every existing target must show computed paint change, without geometry drift.
- Matched 390/1440 screenshots: normally 8 PNG for four cases, plus 2 only if a genuine portrait is actually found. Actual images must be compared side-by-side; the CSS is not signed off solely by a passing test.

**Release gate:** Successful exact-SHA Production run + actual before/after screenshot examination; if the genuine portrait case is unavailable in Production, explicitly record the evidence gap and do not claim it was tested. Sign off VIS2-09 only to the evidence level actually supported. VIS2-10 remains a separate unstarted work unit.


## Verified 2026-10-09 KST — final exact-SHA Production acceptance

**VIS2-09 COMPLETE / PRODUCTION SIGNED OFF.** This closeout records the real Production evidence chain, including failures and the final human A/B correction. **VIS2-10 remains unstarted.**

### Implementation and evidence-correction provenance

1. Feature [PR #2224](https://github.com/JezCH/atlas-person-db/pull/2224), merge `348f915872416b28b825fcc63eace436e939b47f`, added only the reversible paint stylesheet and VIS2-09 Production verifier. Product data, Person/Activity/Polity semantics, portrait assets, layout geometry, route behavior and main-register portrait policy were unchanged.
2. Initial Production [run #37854482518](https://github.com/JezCH/atlas-person-db/actions/runs/37854482518) failed. [#2227](https://github.com/JezCH/atlas-person-db/pull/2227) corrected the verifier's main-register portrait invariant to scope only the register list, not the open Person Detail.
3. [#2231](https://github.com/JezCH/atlas-person-db/pull/2231) made the real stored portrait branch deterministic by checking the canonical stored-source Person first. Production [run #37856881152](https://github.com/JezCH/atlas-person-db/actions/runs/37856881152) was green and did find a genuine Yi Sun-sin portrait.
4. **That green run was not accepted as final visual evidence.** Manual side-by-side review found the genuine-portrait A screenshot still showing the placeholder while B showed the loaded Yi Sun-sin portrait. DOM `src` / `.has-portrait` were already stable, so the verifier had a render-timing race: screenshot A could occur before image pixels decoded.
5. Evidence fix [PR #2234](https://github.com/JezCH/atlas-person-db/pull/2234), merge **`92735ae1d678b1c0b273d44bc48737b81c7defad`**, changes verifier/test only. It waits for the actual stored image to report `complete` with non-zero `naturalWidth/naturalHeight`, records those readiness fields, and requires them to remain equal across the A/B toggle before capture.

### Final exact Production gate

- [Production Chrome run #37859628343](https://github.com/JezCH/atlas-person-db/actions/runs/37859628343): **SUCCESS** at exact deployed/source SHA **`92735ae1d678b1c0b273d44bc48737b81c7defad`**.
- [Artifact #11585502654](https://github.com/JezCH/atlas-person-db/actions/runs/37859628343/artifacts/11585502654): downloaded and inspected, **24,900,460 bytes**, **144 archive entries**, **128 PNGs**, **16 JSON reports**.
- `vis2-09-production-detail-hero.json`: **PASS**, 7 actual Production cases, 10 matched VIS2-09 screenshots, genuine portrait lookup **FOUND_CANONICAL_SOURCE**.
- Actual tested Person states:
  - 390: Narmer default / Fu Hao multi-Activity
  - 768: Narmer default
  - 1440: Narmer default / Fu Hao multi-Activity / **Yi Sun-sin genuine stored portrait**
  - 1600: Narmer default
- All cases preserve Person identity, canonical/KO names, dates, domain semantic foreground, source count, Activity count, hero/portrait/identity/text bounding boxes, scroll dimensions, register row cardinality, no main-register portraits, and no horizontal overflow.
- Genuine portrait branch now proves the same real Yi Sun-sin image is fully decoded and painted in **both** A and B captures before comparing VIS2-09 CSS.

### Human A/B screenshot review

All five captured pairs were opened side-by-side and inspected: 390 default, 390 multi-Activity, 1440 default, 1440 multi-Activity, and 1440 genuine portrait. The final genuine-portrait A/B pair now shows the same loaded Yi Sun-sin image on both sides; the earlier placeholder-vs-image evidence defect is gone.

Pixel comparison over exact RGB arrays:

| Pair | Changed pixels | Full screenshot share | Mean absolute channel delta on changed pixels |
|---|---:|---:|---:|
| 390 default | 92,092 | 27.9779% | 1.796 |
| 390 multi | 92,446 | 28.0854% | 1.795 |
| 1440 default | 90,556 | 6.2886% | 1.734 |
| 1440 multi | 92,285 | 6.4087% | 1.714 |
| 1440 genuine portrait | 102,932 | 7.1481% | 1.902 |

The relatively broad pixel share is expected from the hero/panel background-image treatment over a large surface, while the very low mean channel delta shows the intended restrained optical material change. Direct review shows no cardification, no new historical likeness, no text or chronology displacement, no semantic domain recoloring and no detail geometry drift. The genuine portrait receives a slightly more ceremonial existing-frame depth; absent-portrait states remain visibly subordinate.

**Final visual verdict: ACCEPT VIS2-09.** The Detail hero now has the intended archival surface depth and distinct genuine/missing portrait framing, with the final evidence race repaired and verified against exact Production. **Do not start VIS2-10 in this work unit.**
