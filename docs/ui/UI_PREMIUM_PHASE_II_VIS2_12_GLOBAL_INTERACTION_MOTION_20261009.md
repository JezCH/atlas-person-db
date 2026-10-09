# ATLAS Premium Phase II — VIS2-12 global interaction / reduced-motion consistency

**Date:** 2026-10-09 · **Work unit:** VIS2-12 only · **Tracker:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)

## Prior ownership audit and actual scope

Global V9 already provides operational focus and reduced-motion for most shell, Person register/detail, drawer and Spacetime controls. Polity POLITY-M1/M2, Dashboard DASHBOARD-M1 and Spacetime-M2/M3 own further late-loaded interaction states. This unit is not a redesign. It closes missing keyboard-focus coverage for existing filtering/source/status controls and reduces motion in remaining late-loaded domain components (including existing Spacetime region/era guidance transitions), under the system `prefers-reduced-motion: reduce` setting.

[Feature #2274](https://github.com/JezCH/atlas-person-db/pull/2274) adds a single independently removable root-linked `atlas-vis2-12-interaction-motion.css` after VIS2-10. All ordinary-motion rules are unchanged; normal-state additions apply only under `:focus-visible`, sharing existing `--atlas-focus-ring` without layout sizing. The reduced-motion media query turns off transitions/animations on specific existing Person, Spacetime, Polity, Review and Dashboard elements, including lazily loaded styles, and disables smooth scrolling on the document and Spacetime scroll container. It does **not** suppress hover/pressed/selected meaning, alter focus/tab behavior, modify data, headings, fields, typography, dimensions, historic color semantics, labels, timeline X/Y/camera/LOD, or add cards/portraits.

The CSS and static regression gate ban changes to geometry, semantic Person palette, layout and content. No JS business/authoring/navigation code was changed.

## Verification correction

The initial Production verifier used an invalid unquoted CSS attribute selector inside a readiness test; `querySelector('link[href*=atlas-vis2-12-interaction-motion.css]')` cannot parse the literal dot in an unquoted attribute value. This correctly stopped verification before its first live case. [Gate repair #2276](https://github.com/JezCH/atlas-person-db/pull/2276) quotes the attribute selector, composes the readiness predicate safely, passed full Integrity and merged as **`2356195d93653a031f4f06c8cd11de2e37e82919`**. The repair is verifier-only; no changes to product CSS or data.

## Final exact-source Production acceptance

- [GitHub Actions Production Chrome #37895795503](https://github.com/JezCH/atlas-person-db/actions/runs/37895795503): **SUCCESS**, actual source/deployed SHA **`2356195d93653a031f4f06c8cd11de2e37e82919`**.
- Same-source-sha ATLAS Integrity: **SUCCESS**. The separate CORE Final Acceptance run at that SHA was **cancelled** due to concurrency and is **not** described as passing; this work unit's independent existing visual regression workflow and its new VIS2-12 stage passed.
- [Visual artifact #11600965180](https://github.com/JezCH/atlas-person-db/actions/runs/37895795503/artifacts/11600965180), retrieved and inspected: **203 entries**, **184 PNG screenshots**, **19 JSON reports**. `vis2-12-production-interaction-motion.json`: **PASS, 8/8 cases, 16 VIS2-12 PNGs**.
- Production cases: each of Person, Polity, Dashboard and Spacetime at **390px and 1440px**, with four existing UI sample targets inspected for each case. Total **32 sampled interactive/UI targets** across the eight cases.
- In each same-live-DOM run, stylesheet disabled vs enabled while the browser **emulated reduced motion**: the marker switched correctly, all sampled enabled-side transition durations were zero (and no running sampled animations remained), text/record counts/KPI counts/tracks/domain text/semantic paints/type and bounding boxes/scroll widths remained unchanged, and no new horizontal overflow appeared.
- The same browser then emulated **normal motion** and compared enabled vs disabled CSS. Existing component transition/animation properties matched exactly: no normal-motion regression.
- The **eight matched PNG pairs** (390 / 1440 × four domains) were pixel-compared. **0 changed pixels for every pair**, an expected positive invariant: suppressing an animation/transition only in a still image does not change static appearance. A combined eight-row contact sheet and full screenshots were visually inspected; the existing dense Person table, Polity listing, Dashboard KPI panels and Spacetime canvas remained stable. Static A/B pixels alone are not claimed to prove motion safety; computed-style/underlying state checks supply that evidence.
- Keyboard-only `:focus-visible` targets were also **statically reviewed and included in the CSS regression test**. A dedicated live keyboard focus-cycle test was not part of this unit's eight-case gate; no unsupported claim of one is made.

**Final verdict: ACCEPT VIS2-12 — global interaction/reduced-motion consistency implemented and exact Production verified.**

**Next single unit: VIS2-13 — Production screenshots, regression gates, final Phase II acceptance/signoff. NOT STARTED.** Preserve the one-work-unit-per-user-turn response barrier.
