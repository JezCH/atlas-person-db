# VIS3-05T-D — KPI supporting typography and mobile appbar readability (2026-10-10)

**Status: SOURCE PROTOTYPE; CI + actual Chrome evidence pending.** VIS3-05T-C main source was merged but its Vercel Production release remained blocked by the platform daily deployment limit as of this work unit's start.

## Phase III v2.0 execution boundaries

This unit targets T-04 and T-07 from VIS3-05T-A, preserving the restrained mixed-D ornament, six real KPI values and their canonical descriptions, dashboard navigation, eight Person-domain semantic colors, nine macroregions and unchanged Spacetime camera. No new golden ornament or data rewrite.

- Existing `atlas-dashboard-monumental-v11.css`: append one scoped T-D block increasing KPI tiny title to 10px, warming its neutral text color to `#a6adb2`, raising the mobile KPI description to 10px (line-height 1.3), with neutral `#aeb4b8` details. First Chrome gate found the first mobile KPI row growing by ~3.7px and shifting the next row; therefore the mobile KPI **internal grid gap is reduced from 6px to 4px** to preserve the 94px minimum card-row geometry while still retaining 10px readable supporting type. Main figures, 6-card layout, actual text, card min-height, padding, action affordances and ornament remain unchanged. **No truncation**: content may wrap naturally; verify whether that shifts card boundaries.
- Existing `atlas-ui-mobile-v8.css`: secondary appbar text `ATLAS 편집` raised from 7.5px/#666e73 to 10px/#a6adb2, keeping the existing 58px appbar, 40px menu and title.
- Bump only the dashboard dynamic stylesheet and mobile static stylesheet existing URL versions, update their coupled source assertions and add focused regression tests.

## Acceptance and release constraints

A real Chrome **same-DOM** Production baseline vs locally injected exact changed CSS at 390/600/768/1440/1600px must record 6 KPI numbers and every detail, first-card geometry, clipping, mobile appbar labels/hit target, and no new horizontal overflow. Preserve all long NamuWiki details without ellipsis. If the two-column mobile cards grow materially, adjust carefully rather than clip text or move large elements. Browser results are proof of CSS behavior on actual current Production data, **not** evidence of a separately deployed branch.

Required: full ATLAS Integrity, documented Chrome screenshots/metrics, removal of temporary review workflow before merge, then separately check Vercel Production exact SHA and HTTP live HTML/CSS parity when quota allows. Do not bypass rate limits or start VIS3-06 before appropriate visual user approval.

**Next separate unit:** VIS3-05T-E optional sidebar collapse-toggle alignment; then VIS3-06~17 as designed. User's final selected D aesthetic approval remains pending.

## Intermediate-width Chrome correction

Second real Chrome check confirmed 390px and 600px first KPI card heights remained 94px after the mobile 4px internal gap adjustment; at 768px the 10px text caused a 3px row displacement. Applied a **5px KPI inner gap only for 601–1250px** (from original 6px) to compensate glyph growth without changing explicit min-height/padding/grid. A fresh complete five-width Chrome run remains required.

## Wide-desktop geometry closure

All five widths of Chrome check #38025943382 passed the prior code, but 1440/1600px first KPI card naturally gained 3px of height even though it did not overlap. To retain the original dashboard row placement, use the same **5px internal KPI gap for all widths >=601px** (instead of only through 1250px), while keeping 4px at <=600px. Browser gate now also checks **each card height**, not only its x/y, and will reject a shifted next panel. No data or main-number font change.
