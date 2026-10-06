# ATLAS CURRENT WORKSTREAMS

**As of:** 2026-10-07  
**Authority:** current `main` + current Production + latest durable checkpoint  
**Workstream state baseline:** verified against current repository state on 2026-10-05  
**Latest Polity data-mutation checkpoint:** Correction Apply `37543389958` SUCCESS after #1992; legacy `County of Portugal` retired to canonical Kingdom of Portugal after preserving the 1128–c.1139 comital phase as temporal `state_form`; Runtime compile `37543479617` SUCCESS
**Repository/Production state:** current executable cleanup is deployed; closed one-shot NamuWiki, Person Domain v2 cutover and Place authority backfill mutation surfaces are retired, and live Person Domain verification is independent from the historical cutover snapshot.  
**P14:** `PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME`

This file is the compact current-state board. Historical issue comments, merged PRs, old queue bodies and old audit documents are evidence, not execution frontiers. User-selected candidate/registration pools are not backlog debt.

## 1. ACTIVE WORKSTREAMS

There are currently **two active project workstreams**.

### A. Polity identity / continuity cleanup — #1895

All remaining Polity identity work is managed through the **current Polity review registry**:

- canonical review registry: `atlas-polity-review-registry.js`
- historical 2026-09-27 snapshot only: `atlas-polity-review-candidates.js`
- terminal dispositions: `FIXED / KEEP_SEPARATE / SUPERSEDED / NOT_PRESENT / HOLD_UNRESOLVED`

The registry distinguishes **execution order** from **audit obligation**. Historical candidate conclusions are not automatic writes, but the carried audit seeds must not disappear until each receives a terminal disposition against current Production.

Current sequence:

1. **Carry-forward closure audit** — re-review every still-unclosed historical seed against current Production:
   - 18 same-identity / continuity candidates;
   - 16 separate historical-family judgments;
   - 2 temporal-designation residuals (Russia, Sweden);
   - 2 KO/EN naming-collision residuals;
   - 16 catastrophic-territorial-rupture probes, with Yuan → Northern Yuan already locked `KEEP_SEPARATE`.
2. **Fresh whole-Production discovery scan** after the seeded ledger is closed, to catch cases not represented in the historical seed set.
3. Close the workstream only when every seed and every fresh discovery result has a terminal disposition or an explicit unresolved hold reason.

Important distinction:

- **Do not replay old decisions as writes.**
- **Do not discard old audit seeds merely because they are historical.**
- Rebuild the decision from current Production + current identity rules, then assign a terminal status.

Already completed Polity fixes remain closed unless contradictory current evidence appears, including the Portugal county/kingdom, the Lithuania grand-duchy/kingdom, the Saxony electorate/kingdom, the Hanover electorate/kingdom, Bavaria duchy/electorate and Savoy county/duchy continuity merges, the Northumbria generic/formal duplicate merge, the Bosnia banate/kingdom continuity merge, the South Kasai state-form continuity merge, the Siam/Thailand continuity merge, the South Africa continuity merge, the Ireland family correction, the Kingdom of Italy 3-way split, Later Jin, Kingdom of Serbia, Egypt, Poland, Germany, Han 韓/漢, the Kingdom-of-France generic/formal duplicate correction and the Japan lineage/occupation/designation rebuild. France's wider regime-family audit is a separate open seed and must not be conflated with the completed duplicate correction.

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
- Person Domain v2 migration and former #1767 residual — closed; the standalone mutation/cleanup path is retired
- #1845 Person Domain cleanup path — historical evidence only
- standalone representative-domain backlog/batch work — retired; every new Person receives domain review inside the normal registration lifecycle, with only evidence-driven targeted corrections allowed later; retired proposal apply stub and misleading apply-named workflow path removed, historical manifests retained as archive-only evidence
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

**Resume #1895 at `County of Sicily → Kingdom of Sicily`, the first still-unclosed carry-forward continuity seed.**

The Saxony, Hanover, Bavaria, Savoy, Northumbria, Bosnia, South Kasai, Siam/Thailand and South Africa continuity seeds, Ireland family and Kingdom of Italy 3-way split are terminal `FIXED`. Saxony now uses one continuous polity identity across Electorate and Kingdom while preserving the pre-1806 Electorate as a temporal `state_form` and keeping the actual Elector→King title change as separate Activities.

Continue through the current review registry's carry-forward audit groups in current order until every seed has a terminal disposition, then run the fresh whole-Production discovery scan.

If the user selects a Person candidate or registration target, that explicit choice may run independently through #1374/#1375 without changing the active-project backlog.
