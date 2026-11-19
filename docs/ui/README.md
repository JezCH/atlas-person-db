# ATLAS UI workstream

## Current UI routing — 2026-11-19 (supersedes October execution order)

**Start with [UI_MANAGER_INTEGRATED_EXECUTION.md](UI_MANAGER_INTEGRATED_EXECUTION.md) (all-plan UI manager and oversight), then [ATLAS_UI_DELIVERY_PLAN.md](ATLAS_UI_DELIVERY_PLAN.md) (current user-approved UI-01→05 release order), and [ATLAS_UI_VISUAL_GUIDELINES.md](../../ATLAS_UI_VISUAL_GUIDELINES.md) (design constraints).** Older Phase II/III plans remain indexed historical/decision evidence; do not treat their execution order as current.

The approved target is **Chronographic Luxury / Monumental Chronographic Modernism**: a refined, coherent premium UI built from historical names and chronology, restrained graphite/champagne material, archival typography and precise interaction.

**Non-negotiable:** The Person main register **MUST remain a dense table, never a card grid**. Do not change historical data, spatial coordinates, filtering/sorting or chronology under visual polish. Current delivery starts with the Person main table (UI-01), followed by Person/Polity Detail, Spacetime, shell/mobile/accessibility, and information/admin/final acceptance. Reorder only for real P0 regressions, approval constraints or independently useful non-conflicting work.

## Separate information-coverage workstream

The coverage, Korean-localization, Phase II/III and visual workstreams are all part of the integrated UI manager review, but historical snapshots are **not** automatically unfinished tasks. Use the active crosswalk above and latest GitHub/Product evidence.

- `UI_INFORMATION_COVERAGE.md` — continuing Main/Admin information visibility contract, reviewed against today's UI/API state.
- `UI_BRANCH_SCOPE.md` — semantic/data and authorship boundaries.
- `UI_CHECKPOINTS.md` and `UI_WORK_LOG.md` — historical checkpoint records, not a current execution queue.
- `ATLAS_KOREAN_UI_COMPLETION_20261011.md` — cross-screen Korean localization plan with latest-main revalidation required before reopening older findings.
- `UI_PREMIUM_VISUAL_EXECUTION_PLAN.md` and `UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md` — prior approved/revised aesthetics and user decision gates; do not auto-promote all decorative candidates.

Implementation proceeds through bounded, verified PRs. After passing current-main CI, explicitly verify Vercel deployment; visual quality still requires real rendered before/after comparison and must not be inferred from tests alone.
