# VIS3-05T-D — KPI supporting typography and mobile appbar readability (2026-10-10)

**Status: SOURCE PROTOTYPE; CI + actual Chrome evidence pending.** VIS3-05T-C main source was merged but its Vercel Production release remained blocked by the platform daily deployment limit as of this work unit's start.

## Phase III v2.0 execution boundaries

This unit targets T-04 and T-07 from VIS3-05T-A, preserving the restrained mixed-D ornament, six real KPI values and their canonical descriptions, dashboard navigation, eight Person-domain semantic colors, nine macroregions and unchanged Spacetime camera. No new golden ornament or data rewrite.

- Existing `atlas-dashboard-monumental-v11.css`: append one scoped T-D block increasing KPI tiny title to 10px, warming its neutral text color to `#a6adb2`, raising the mobile KPI description to 10px (line-height 1.3), with neutral `#aeb4b8` details. Main figures, 6-card layout, actual text, card min-height, padding, action affordances and ornament remain unchanged. **No truncation**: content may wrap naturally; verify whether that shifts card boundaries.
- Existing `atlas-ui-mobile-v8.css`: secondary appbar text `ATLAS 편집` raised from 7.5px/#666e73 to 10px/#a6adb2, keeping the existing 58px appbar, 40px menu and title.
- Bump only the dashboard dynamic stylesheet and mobile static stylesheet existing URL versions, update their coupled source assertions and add focused regression tests.

## Acceptance and release constraints

A real Chrome **same-DOM** Production baseline vs locally injected exact changed CSS at 390/600/768/1440/1600px must record 6 KPI numbers and every detail, first-card geometry, clipping, mobile appbar labels/hit target, and no new horizontal overflow. Preserve all long NamuWiki details without ellipsis. If the two-column mobile cards grow materially, adjust carefully rather than clip text or move large elements. Browser results are proof of CSS behavior on actual current Production data, **not** evidence of a separately deployed branch.

Required: full ATLAS Integrity, documented Chrome screenshots/metrics, removal of temporary review workflow before merge, then separately check Vercel Production exact SHA and HTTP live HTML/CSS parity when quota allows. Do not bypass rate limits or start VIS3-06 before appropriate visual user approval.

**Next separate unit:** VIS3-05T-E optional sidebar collapse-toggle alignment; then VIS3-06~17 as designed. User's final selected D aesthetic approval remains pending.
