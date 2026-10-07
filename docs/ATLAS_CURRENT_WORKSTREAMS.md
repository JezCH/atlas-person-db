# ATLAS CURRENT WORKSTREAMS

**As of:** 2026-10-07  
**Authority:** current `main` + current Production + latest durable checkpoint  
**Workstream state baseline:** verified against current repository state on 2026-10-05  
**Latest Polity data-mutation checkpoint:** #2114 merged current-Production `Provisional Government of Negros` into canonical `Cantonal Republic of Negros`, relinking Lacson's 1898-11-05→11-26 provisional Activity to the survivor, preserving `Provisional Government of Negros / 네그로스 임시정부` as a temporal `state_form`, and correcting the Cantonal Republic presidency from 1898-11-27→1899-07-22 to 1898-11-27→1899-03-04 (`ffad34452144c10cb920f25048a68e4b9609eb5d`); request `negros_provisional_cantonal_continuity_merge_20261007_v1` applied at `2026-10-07T21:42:05.920016Z`. Runtime compile `runtime-person-politics-v1:18949b33d13f006dcfd2e1801dcc45f89c2dca4d4d877c86104899ce2d5c1a3d` at `2026-10-07T21:42:39.749192Z` resolves both Lacson phases to the survivor. #2115 retired zero-external-reference legacy `Provisional Government of Negros` to the Cantonal Republic survivor (`ad2d85999d68c37eb51de355495e3d49578c5a60`), retirement applied at `2026-10-07T21:44:28.893026Z`.
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
   - 3 carried same-identity / continuity ledger entries; 0 remain unresolved after the Negros seed moved to terminal `FIXED` history;
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

Already completed Polity fixes remain closed unless contradictory current evidence appears, including the Negros provisional→cantonal continuity/state-form merge, the Paraguay→Republic of Paraguay formal-name identity merge, the Argentine Republic→Argentina official-name identity merge, the Austria Republic→Federal State constitutional/official-name continuity merge, the Palmyra→Palmyrene Empire sovereignty/state-form continuity merge, the Urbino legacy-Lordship→Duchy continuity/state-form correction, the Milan Lordship→Duchy state-form continuity merge, the Libya Arab Republic→Jamahiriya continuity merge, the Yugoslavia Kingdom/DFY/FPRY→SFRY continuity merge, the Congo/DRC/Zaire official-name merge, the Upper Volta/Burkina Faso official-name merge, the Iran generic/Imperial State identity merge, the Albania republic/kingdom state-form merge, the Croatia principality/kingdom state-form merge, the Apulia county/duchy state-form merge, the Portugal county/kingdom, the Lithuania grand-duchy/kingdom, the Saxony electorate/kingdom, the Hanover electorate/kingdom, Bavaria duchy/electorate and Savoy county/duchy continuity merges, the Northumbria generic/formal duplicate merge, the Bosnia banate/kingdom continuity merge, the South Kasai state-form continuity merge, the Siam/Thailand continuity merge, the South Africa continuity merge, the Ireland family correction, the Kingdom of Italy 3-way split, Later Jin, Kingdom of Serbia, Egypt, Poland, Germany, Han 韓/漢, the Kingdom-of-France generic/formal duplicate correction and the Japan lineage/occupation/designation rebuild. France's wider regime-family audit is a separate open seed and must not be conflated with the completed duplicate correction.

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

**Resume #1895 at `Kingdom of Hungary family ↔ medieval / Habsburg / 1920 restoration`, the first still-unclosed historical-family review seed.**

The Negros carry-forward seed is terminal `FIXED`: fresh Production used `Provisional Government of Negros`, not the inherited seed label `Provisional Republic`; that provisional government and the `Cantonal Republic of Negros` are modeled as one continuous revolutionary polity with a genuine 1898-11-27 constitutional/state-form transition, the provisional phase is preserved as a 1898-11-05→11-26 temporal `state_form`, Lacson's Cantonal Republic presidency now ends on the official 1899-03-04 republic boundary, and the obsolete provisional Polity is retired. All same-identity carry-forward seeds are now terminal; continue through the remaining seeded historical-family/designation/naming/rupture audits before any fresh whole-Production discovery scan. The Paraguay seed is terminal `FIXED`: `República del Paraguay / Republic of Paraguay` is the formal republican name of the same Paraguayan state rather than a separate polity identity; Francia's constitutionally distinct 1813–1840 Activities remain on canonical `Paraguay`, Francisco Solano López and Stroessner now resolve to that same survivor, no artificial closed designation was created for a formal name that remains current, and the obsolete duplicate `Republic of Paraguay` Polity is retired. The Argentina seed is terminal `FIXED`: `República Argentina / Argentine Republic` is an official constitutional name of the same Argentine state rather than a separate polity identity; Sarmiento's 1868-10-12→1874-10-12 presidency resolves to canonical `Argentina`, no artificial closed designation was created for a name that remains constitutionally valid, the separately modeled `Argentine Confederation` is untouched, and the obsolete duplicate `Argentine Republic` Polity is retired. The Austria seed is terminal `FIXED`: the 1 May 1934 May Constitution and `Bundesstaat Österreich` name mark a constitutional/official-name transition within canonical Austria, not a new sovereign identity; Dollfuss's chancellorship is restored as one 1932-05-20→1934-07-25 Activity, `Federal State of Austria / 오스트리아 연방국` is preserved as a 1934-05-01→1938-03-12 temporal `official_name`, and the obsolete Federal State Polity is retired. The Palmyra seed is terminal `FIXED`: Odaenathus's c.261–c.267 kingship, Zenobia's 267–271 regency and her separate 272 Augusta phase are modeled as one continuous Odaenathid-Zenobian polity identity; `Palmyrene Kingdom / 팔미라 왕국` is preserved as the c.261→271 pre-imperial `state_form`, the explicit imperial sovereignty break remains visible in the distinct 272 Augusta Activity, and the obsolete `Palmyra` Polity is retired. The Urbino seed is terminal `FIXED`: legacy Lordship of Urbino was a modeling conflation, not a valid 1444-1474 state-form phase; the polity was already the Duchy from Oddantonio's 1443 elevation, Federico's 1444-1474 Lord and 1474-1482 Duke remain separate personal-role Activities on one Duchy survivor, the accurate pre-ducal `County of Urbino / 우르비노 백국` is preserved as a 1213→1443-04-24 temporal `state_form`, and the obsolete Lordship Polity is retired. The Milan seed is terminal `FIXED`: Lordship of Milan and Duchy of Milan are modeled as one continuous Milanese state identity; Gian Galeazzo's Lord and Duke remain separate role Activities across the 1395 legal elevation, `Lordship of Milan / 밀라노 영주국` is preserved as a 1330-03-15→1395-05-10 temporal `state_form`, and the obsolete Lordship Polity is retired. The Libya seed is terminal `FIXED`: Libyan Arab Republic and Libyan Arab Jamahiriya are modeled as one continuous Libyan state identity; the 1977 transition remains visible as a genuine RCC→GPC institutional/role boundary, Libyan Arab Republic is preserved as a 1969-09-01→1977-03-01 temporal `official_name`, and the obsolete Republic Polity is retired. The Yugoslavia seed is terminal `FIXED`: Kingdom of Yugoslavia, Democratic Federal Yugoslavia and Federal People's Republic of Yugoslavia are retired into canonical `Socialist Federal Republic of Yugoslavia`; Kingdom/DFY/FPRY survive as reviewed temporal designations, Peter II and Tito retain continuous role Activities across the name/constitutional boundaries, and 1992 Federal Republic of Yugoslavia remains outside this identity and is not present in Production. The Congo/DRC/Zaire seed is terminal `FIXED`: Patrice Lumumba, Moïse Tshombe and Mobutu Sese Seko now use the canonical `Democratic Republic of the Congo` identity; Tshombe's 1964-07-10→1965-10-13 premiership and Mobutu's 1965-11-25→1997-05-16 presidency are continuous across name changes; `Republic of the Congo (Léopoldville)` and `Republic of Zaire` are preserved as temporal `official_name` designations, and both obsolete legacy Polities are retired. The Upper Volta/Burkina Faso seed is terminal `FIXED`: Thomas Sankara's presidency is restored as one continuous 1983-08-04→1987-10-15 Activity on canonical `Burkina Faso`; `Republic of Upper Volta / 오트볼타 공화국` is preserved as a 1960-08-05→1984-08-03 temporal `official_name`, and the obsolete Upper Volta Polity is retired. The Iran/Imperial State seed is terminal `FIXED`: Mohammad Mosaddegh's two 1951–1953 Prime Minister Activities and Mohammad Reza Pahlavi's Shah Activity now share the canonical `Imperial State of Iran` identity; generic `Iran` was not fabricated into a temporal designation, `Islamic Republic of Iran` remains separate, and the obsolete generic Iran Polity is retired. The Albania republic/kingdom seed is terminal `FIXED`: Zogu's 1925-01-31→1928-09-01 republican phase is preserved as a temporal `state_form` on the continuous Kingdom of Albania identity; President and King remain separate Activities, and the obsolete Republic Polity is retired. The Croatia principality/kingdom seed is terminal `FIXED`: Tomislav's c.910–c.925 princely phase is preserved as a temporal `state_form` on the continuous Kingdom of Croatia identity; Duke and King remain separate Activities, and no exact 925 coronation date is asserted. The Apulia county/duchy seed is terminal `FIXED`: County of Apulia is preserved as a 1057–1059 temporal `state_form` on the continuous Duchy identity, while the obsolete County Polity is retired. The Sicily county/kingdom seed is terminal `KEEP_SEPARATE`: the County remains a distinct predecessor because the 1130 kingdom was created as a new composite monarchy after the unification of Sicily with south-Italian dominions, not as a simple state-form rename of the County. The Saxony, Hanover, Bavaria, Savoy, Northumbria, Bosnia, South Kasai, Siam/Thailand and South Africa continuity seeds, Ireland family and Kingdom of Italy 3-way split are terminal `FIXED`. Saxony now uses one continuous polity identity across Electorate and Kingdom while preserving the pre-1806 Electorate as a temporal `state_form` and keeping the actual Elector→King title change as separate Activities.

Continue through the current review registry's carry-forward audit groups in current order until every seed has a terminal disposition, then run the fresh whole-Production discovery scan.

If the user selects a Person candidate or registration target, that explicit choice may run independently through #1374/#1375 without changing the active-project backlog.
