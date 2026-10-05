# ATLAS CURRENT WORKSTREAMS

**As of:** 2026-10-05  
**Authority:** current `main` + current Production + latest durable checkpoint  
**Workstream state baseline:** verified against current repository state on 2026-10-05  
**Latest READY Production deployment:** Vercel `dpl_Ak1mJbKhZHo7UKYWcswX5LPyMEvY` at `dc321441d453b03d8415cf91f6cbf4a258a24178` (#1901)  
**Repository/Production state:** current executable cleanup is deployed; closed one-shot NamuWiki, Person Domain v2 cutover and Place authority backfill mutation surfaces are retired, and live Person Domain verification is independent from the historical cutover snapshot.  
**P14:** `PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME`

This file is the compact current-state board. Historical issue comments, merged PRs, old queue bodies and old audit documents are evidence, not execution frontiers. User-selected candidate/registration pools are not backlog debt.

## 1. ACTIVE WORKSTREAMS

There are currently **two active project workstreams**.

### A. Polity identity / continuity cleanup — #1895

All remaining Polity identity work is managed as one coherent workstream.

Current sequence:

1. **Ireland family** — exact next resume point.
2. **Kingdom of Italy** — reviewed 3-way historical split:
   - medieval Regnum Italiae;
   - Napoleonic Kingdom of Italy, 1805–1814;
   - Kingdom of Italy, 1861–1946.
3. **Fresh whole-Production Polity audit** after Ireland and Italy close.

The final audit must be rebuilt from current Production and may check false merges, true duplicates, orphans, stale retired references, temporal-designation debt, KO/EN naming collisions and continuity contradictions.

Do **not** replay historical “29 same-identity”, “16 continuity family”, old designation or old naming-collision lists as execution queues.

Already completed Polity families remain closed unless contradictory current evidence appears, including Later Jin, Kingdom of Serbia, Egypt, Poland, Germany, Han 韓/漢, France and the Japan lineage/occupation/designation chain.

### B. UI information coverage / completeness — #1896

Re-audit **current main**, not old UI plans.

Classify current requirements as:

- `DONE`
- `PARTIAL`
- `MISSING`
- `STALE_REQUIREMENT`
- `INTENTIONALLY_NOT_EXPOSED` where applicable

Only current in-scope `PARTIAL` / `MISSING` findings become implementation work.

Current review targets include canonical Person/Activity/Polity/Source visibility, Admin authoring parity, Source bibliographic projection, lifecycle/history observability and measured mobile/Spacetime regressions.

Core Spacetime Person UI is considered complete unless a measured regression is found. P14 historical-map Geometry is not part of this lane.

## 2. USER-DRIVEN PERSON WORK — NOT BACKLOG

### Candidate review — #1374

State:

`USER_DRIVEN / NO_BACKLOG / NO_AUTOMATIC_FRONTIER`

The user may choose any Person or candidate set at any time.

- No historical candidate list creates a mandatory next batch.
- No mandatory batch size exists.
- Historical review comments remain evidence only.
- Candidate review starts only from an explicit user-selected target and current Production state.

### Registration apply — #1375

State:

`USER_MANAGED_QUEUE / INTENTIONAL_PERSISTENCE / NO_DRAIN_REQUIRED`

Queued/approved candidates may intentionally remain unregistered.

- The queue is a persistent user-managed pool.
- No whole-queue reconciliation is required.
- No automatic drain is required.
- Do not resume historical queue order.
- Do not remove old queued candidates merely because they remain pending.
- The `USER-CORE40-20261004` handoff is preserved evidence/pool state, not a mandatory active batch.

When the user explicitly selects Person(s) for registration, run current-state duplicate/life-status/identity/timeline/domain/NamuWiki/source/spatial/publication checks **for the selected Person(s) only**, then apply if valid.

## 3. CLOSED NAMUWIKI LEGACY DRAIN

Issue #820 is CLOSED archival authority.

Terminal current Production reconciliation:

- `namuwiki_status=linked`: **1,375**
- `namuwiki_status=not_found`: **730**
- `namuwiki_status=missing`: **0**
- `not_found` with blank/missing `absence_reason`: **0**

There is no next Batch/Unit frontier.

Future NamuWiki review is event-driven through the registration lifecycle for newly selected/registered Persons. Historical Batch/Unit comments do not create work.

## 4. PARKED / NOT ACTIVE

### Broad legacy registration-obligation census — former #1793

#1793 is **CLOSED / NOT_PLANNED_BY_CURRENT_DIRECTION**.

The prior 2,280-manifest diagnostic run remains evidence only. Do not resume the repository-wide legacy census automatically. Confirmed bounded residuals may still be handled if they independently become relevant.

### Portrait content production

Portrait infrastructure is substantially implemented, but mass portrait creation, provenance expansion and reconstruction-quality expansion are:

`PARKED_BY_USER / NOT_ACTIVE`

Do not select portrait content work unless the user explicitly prioritizes it.

### P14 Territory / Geometry historical map

`PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME`

Historical P14 research/commits remain audit history only. No Territory/Geometry unit may be selected without explicit user restart.

## 5. CLOSED / SUPERSEDED — DO NOT RE-ENTER AUTOMATICALLY

- CORE v2 / P13 lifecycle
- #1037 Place / PolityPlaceFunction structural debt
- #977 as an active execution board
- Person Domain v2 migration and former #1767 residual
- #1845 Person Domain cleanup path
- old NamuWiki Batch/Unit legacy-drain frontiers
- eight-Person duplicate authoring-evidence cleanup (#1893)
- completed Later Jin / Serbia / Egypt / Poland / Germany / Han / France / Japan Polity fixes
- mandatory era-icon/material-frame UI proposals that are no longer binding

## 6. CURRENT EXECUTION AUTHORITY

The active project queue is intentionally small:

1. **Polity identity cleanup — #1895**
2. **UI information coverage/completeness — #1896**

Person candidate review (#1374) and Person registration (#1375) are **user-triggered tools/lanes**, not backlog workstreams.

Portrait content, P14 historical-map Geometry and the broad legacy census are parked/not active.

## 7. EXACT NEXT RESUME POINT

If no different task is explicitly selected by the user:

**Resume #1895 at the Ireland Polity family.**

If the user selects a Person candidate or registration target, that explicit choice may run independently through #1374/#1375 without changing the active-project backlog.
