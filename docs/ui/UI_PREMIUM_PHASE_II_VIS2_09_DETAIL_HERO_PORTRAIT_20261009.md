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
