# ATLAS Premium Visual Phase II — VIS2-01 Material Hierarchy V2

**Date:** 2026-10-08
**Unit:** VIS2-01 only; [Phase II tracking #2158](https://github.com/JezCH/atlas-person-db/issues/2158).
**Pre-change Production reference:** [exact-SHA VIS2-00 run 37778331138](https://github.com/JezCH/atlas-person-db/actions/runs/37778331138), [29-photo baseline + acceptance captures](https://github.com/JezCH/atlas-person-db/actions/runs/37778331138/artifacts/11550393601).

## Scope / before-state

The global foundation already provides genuine Graphite and Champagne variables (`--atlas-canvas`, `--atlas-surface-1..3`, `--atlas-material-hairline*`, `--atlas-material-sheen*`). It also already renders panel borders, shell shear, focus rings and semantic Person rails. VIS2-01 does **not** introduce a competing color palette, heavier metal boundaries, shadows, a new font, added card chrome or a layout edit.

This unit only maps the existing scale to explicit, cross-screen **material roles**:

| Role | Immutable existing pigment | Visual ownership / actual opt-in |
| --- | --- | --- |
| M0 / M0-deep | `--atlas-canvas #121518` / `--atlas-canvas-deep #0e1114` | Work surface and sidebar background: the architectural field |
| M1 | `--atlas-surface-1 #191d21` | Info panels, toolbar and passive input background; archival object below controls |
| M2 | `--atlas-surface-2 #20252a` | Common operable buttons, compact mobile control and operational toast: neutral interactive elevation |
| M3 | `--atlas-surface-3 #262c31` | Primary action button graphite face with **existing** restrained champagne-outline and existing soft sheen |

**Implementation owner:** `atlas-ui-visual-foundation.css`; static asset freshness from `index.html`. `atlas-ui-motion-material-v9.css` retains late-load transition/focus/edge ownership. Later route-specific CSS and Person register/Spacetime geometry are not changed. The explicitly scoped selectors avoid global `.card` overrides and never touch `.person-register-entry`, `.spacetime-canvas`, timeline rulers, world positioning, label layout or domain-rail styles.

**Before/after intent:** M0 and historical M1 panels retain exactly their former palette values (no artificial contrast regression). Actual visible differentiation is concentrated on the *operable M2 controls* previously dark `#191e22`/`#191d21`, the dark passive input fields at M1 and the *M3 primary button*. No box dimensions, border widths, padding, line heights or text metrics are altered. Selected Person / selected Spacetime states retain their independent Phase I implementation.

## Invariants and failure criteria

1. No main Person portraits, cardification, change to row height, table columns/fields, name priority, sort/search/filter or Person/Activity/Polity data.
2. All 8 semantic Person domain colors including `science` untouched. Champagne honor material is not governance-gold.
3. Spacetime X/Y, time, macro/subregions, 500%/1000%/1500% camera, overview/LOD, label placement and interaction unchanged.
4. No responsive document-level horizontal overflow or missing visible labels; keyboard focus and reduced-motion continue to use existing V9 rules.
5. At 390/768/1440/1600px a **computed-style Production Chrome probe**, not an authored color guess, must confirm M0 `rgb(18, 21, 24)`, M0-deep `rgb(14, 17, 20)`, M1 `rgb(25, 29, 33)`, M2 `rgb(32, 37, 42)` and M3 `rgb(38, 44, 49)` as well as M3 sheen and real Person rows.

## Gates and evidence

- [VIS2-01 static role test](../../tests/vis2-01-material-roles.test.mjs) locks root scale, alias binding, optic-only scope and index cache freshness.
- [VIS2-01 exact-SHA Production Chrome test](../../scripts/verify-vis2-01-production-material.mjs) checks computed material classes at four viewports and saves `vis2-01-production-material.json`; the existing workflow also captures 29 new before/after-equivalent states and runs Person register, Polity, Dashboard and Spacetime acceptance.
- Compare new `vis2-00-baseline.json` screenshot states with run `37778331138`; an automatically green CI check **does not by itself constitute subjective screenshot design review**. Visually inspect selected M2/M3 versus prior baseline before marking the unit aesthetically accepted.

**Closure state:** PENDING new exact-SHA Chrome result and screenshot review. Do not advance to VIS2-02 merely because a PR merges; add run id and photo evidence after confirmation.
