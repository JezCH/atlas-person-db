# ATLAS CURRENT WORKSTREAMS

**As of:** 2026-10-02  
**Authority:** current main + current Production + latest durable checkpoint  
**Reconciliation state:** COMPLETE  
**Current main:** `908b10261b6288d3c38716cebc2cdd35f9f95b53` at reconciliation start  
**Current Production deployment at reconciliation start:** Vercel `dpl_5YERvFd9we5GS1k6ZD7jMREc5BD7` — READY at the same SHA  
**P14:** `PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME`

This file is the compact current-state board. Historical issue comments, merged PRs, old queue bodies and old audit documents are evidence, not execution frontiers.

## 1. PROJECT STATE

- **CORE v2:** CLOSED.
  - Issue #917 is closed after generated acceptance.
  - Re-entry requires a concrete regression against a closed invariant or a deliberately versioned future CORE program.
- **P13 lifecycle / authoring architecture:** CLOSED.
- **P14 historical map / Territory / Geometry / historical polygon work:** **PARKED_BY_USER / NOT_ACTIVE / DO_NOT_AUTO_RESUME**.
  - PR #1792 rolled back all active P14 historical-map implementation to the pre-P14 code state.
  - Historical P14 PRs/commits/research remain audit history only.
  - No P14 unit may be selected without explicit user restart.
- **Spacetime Person UI:** separate from P14. Do not treat ordinary spacetime UI work as Territory/Geometry work.

## 2. PRODUCTION SNAPSHOT

The latest exact read-only Stage 2 baseline captured immediately before the P14-only sequence was:

- Persons: **2,089**
- Activities: **2,453**
- Polities: **1,180**
- Sources: **3,162**
- baseline digest: `sha256:ec2576f8ee5b7f8c927f115d7ec176fb638a77b188520f8871ba515aae57b4b8`

Evidence: Audit Inventory run `37009317620`, exact Production SHA `e9087f665ae62839982d048323a1e30d4150b1bd`, read-only full Stage 2 baseline.

The intervening P14 units performed no Production Person/Activity/Polity mutation and were subsequently rolled back by #1792. The post-rollback Authoring Apply run `37017440147` was bootstrap-only and explicitly applied no Person or Activity manifest. NamuWiki runs after that mutate external-reference review state, not Person/Activity/Polity identity counts.

## 3. DATA REPAIR

### Exact next unit

- **#1793 — Post-CORE legacy registration obligation debt audit:** **NOT STARTED / NEXT**.
  - Audit current Production against the integrated registration-obligations contract.
  - Discover debt first; do not combine discovery with repair.
  - Confirmed repairs become later work units.

### Representative-domain residual

- **PR #1767 — AoE II SS MICROBATCH-07 representative domains:** **STILL_REQUIRED / ACTIVE FOLLOW-UP**.
- Six target Person UUIDs and reviewed assignments remain:
  - Shashanka `f371e82b-33eb-4927-8b45-1c553ea81d4c` → governance
  - Sima Yi `c3128a85-ddde-4d28-9219-5715f8611b20` → governance
  - Stilicho `dbac46ae-d3dc-4068-840f-46fedbdbd901` → military
  - Tabinshwehti `f0c7abaa-7670-49d0-a82e-7b63fd1a62c3` → governance
  - Taira no Kiyomori `b774cec1-f3b0-46a9-8cd1-3414e74780a4` → governance
  - Vardan Mamikonian `45bdc34d-3a99-4034-b03d-c546c96608f9` → military
- No merged replacement proposal or later durable domain-apply checkpoint for these six was found.
- **Do not merge merely from this board.** Repeat exact current Production domain read-back immediately before the eventual mutation.

### NamuWiki

- General review lane: **Batch 056 CLOSED**; exact next frontier is **Batch 057 — rebuild fresh current Production missing set; NOT STARTED**.
  - Batch 056 checkpoint: #820 comment `5954686202`.
  - Post-write checkpoint recorded `missing=87`, `not_found=704`.
- Reason-backfill lane: **Unit 049 CLOSED**; exact next frontier is **Unit 050 — rebuild fresh current not_found + blank absence_reason set; NOT STARTED**.
  - Unit 049 checkpoint: #820 comment `5954670498`.
- Never resume from old positional cursors or old subtraction arithmetic.

## 4. POLITY

### CONFIRMED_FIX_REQUIRED — Ireland family

Exact read-only Production state contains distinct canonical UUIDs:

- `Ireland` — `c9490230-d6cb-4f6b-a3ed-8baa0248c37e`
- `Irish Free State` — `a0a6810a-9ebf-4e63-acfe-572608fdf3e3`
- `Provisional Government of Ireland` — `9f43ac5f-c96e-448c-81f8-112e2f6e8424`

Relevant exact Activities include:

- Daniel O'Connell → generic Ireland, 1823–1847, `active_in`
- Michael Collins → generic Ireland, 1919–1921, `active_in`
- Michael Collins → Provisional Government of Ireland, 1922, `governs`
- Éamon de Valera → Irish Free State, 1932–1937

PR #1786 captured the exact-live baseline and #1788 repaired the audit deployment gate, but no subsequent merged Ireland historical-identity correction exists. The Ireland family therefore remains the first Polity correction frontier after the registration-debt audit and its confirmed repairs.

### CONFIRMED_FIX_REQUIRED — Kingdom of Italy family

Current canonical `Kingdom of Italy` UUID:

- `88921412-76c8-431c-a6e6-8c43d5a8b94a`

The same UUID currently carries historically discontinuous Activities including:

- Otto I — 951–973
- Frederick I Barbarossa — 1155–1190
- Napoleon I — 1805–1814
- Victor Emmanuel II — 1861–1878
- Umberto I / Margherita of Savoy — 1878–1900
- Victor Emmanuel III — 1900–1946
- Benito Mussolini and other modern-kingdom context

The prior reviewed 3-way distinction — medieval Regnum Italiae / Napoleonic Kingdom of Italy / 1861–1946 Kingdom of Italy — has **not** been materialized into separate canonical Production identities. This is the next Polity family after Ireland.

### COMPLETE — do not re-open without contradictory current evidence

- Later Jin family — closed by #1591.
- Kingdom of Serbia family — closed by #1596.
- Egypt family — closed by #1607.
- Poland medieval/modern false merge — repaired by #1609.
- Germany pre-1945 / FRG family — repaired/closed by #1612 and #1613.
- Japan lineage / occupation / designation / umbrella / spacetime chain — completed through #1741, #1750, #1755 and #1757.
- Previously closed Han, France duplicate, 16-family identity-audit results remain historical COMPLETE state unless a new exact Production contradiction is found.

### REVIEW_REQUIRED — future

Do **not** copy old “29 same-identity”, “16 continuity family”, designation-debt or naming-collision lists into the active board. After Ireland and Kingdom of Italy corrections, rebuild the remaining Polity audit from current Production.

## 5. PERSON PIPELINE

### Candidate review — #1374

- Current state: **NO_ACTIVE_REVIEW_FRONTIER**.
- Historical reviewed handoffs stay in comments/audit history.
- Do not infer a new review batch from old comments.

### Registration Apply — #1375

- Current state: **REGISTRATION_QUEUE_RECONCILIATION_REQUIRED**.
- The historical body count of “450 queued rows” is not accepted as current truth.
- Old APPLIED rows remain audit history in comments and must not stay in the current body.
- Before consuming old queued candidates, classify each against current Production:
  - `REGISTERED_ALREADY`
  - `QUEUED_VALID`
  - `BLOCKED_LIVING`
  - `BLOCKED_IDENTITY`
  - `HOLD_CHRONOLOGY`
  - `DUPLICATE_EXISTING`
  - `SUPERSEDED_REVIEW`
- No current applying batch is claimed by this reconciliation.
- Queue reconciliation is later than the Polity/NamuWiki priorities shown below; do not blindly resume old queue order.

### Registration architecture

Do not redesign it. Current main already integrates:

- `data/core/registration-obligations.v1.json`
- `server/atlas-registration-coordinator.js`
- canonical Human Authoring
- life-status gate
- representative-domain review/writer
- timeline disposition
- NamuWiki reviewed disposition
- spatial registration disposition
- Compile / Runtime verification

The remaining problem is **legacy Production debt against the current contract**, tracked by #1793.

### Person assessment terminology

Keep these separate:

- historical factual assessment authority: current `ATLAS-PHFC-4.3` evidence/counting contract;
- registration-priority metadata: workflow prioritization only;
- legacy grade/tier fields: historical review metadata only.

Legacy grade is never current historical truth authority.

## 6. UI / SPACETIME

- **Current UI Information Coverage Audit:** **NOT STARTED / FUTURE**.
- Future audit authority: current main + `docs/ui/UI_INFORMATION_COVERAGE.md`.
- Re-evaluate each current requirement as `DONE / PARTIAL / MISSING / STALE_REQUIREMENT`; do not copy old UI plans as current tasks.
- Existing spacetime Person UI is independent from P14 Territory/Geometry. If current functionality is healthy, only concrete regressions/current gaps justify changes.

## 7. PORTRAIT

- Infrastructure: substantially implemented — canonical charter, DB/schema, storage, Person UI, provenance editing, 4:5 pipeline.
- Content/provenance/reconstruction-quality expansion: **PARKED / OPTIONAL**, below current data-repair priorities.
- Do not redesign portrait infrastructure as the default next task.

## 8. STALE / SUPERSEDED ITEMS CLOSED BY THIS RECONCILIATION

- PR #1564 — **COMPLETE_ELSEWHERE**; current SOP + registration obligations already enforce living-person exclusion.
- PR #1599 — **COMPLETE_ELSEWHERE** via Egypt closure #1607.
- PR #1602 — **COMPLETE_ELSEWHERE** via Egypt closure #1607.
- PR #1631 — **COMPLETE_ELSEWHERE** via later canonical Unit 5 timeline-disposition/reconciliation + CORE acceptance.
- PR #1725 — **SUPERSEDED / COMPLETE_ELSEWHERE** via completed Japan chain.
- PR #1742 — **SUPERSEDED / COMPLETE_ELSEWHERE** via completed Japan chain.
- Issue #1037 — canonical Place / PolityPlaceFunction authority is implemented by #1777; current status **COMPLETE**.
- Issue #977 — closed historical NONCORE board; **not** a current active frontier.

Only special reviewed open PR from the requested audit set:

- PR #1767 — **STILL_REQUIRED / ACTIVE FOLLOW-UP**.

## 9. CURRENT PRIORITY ORDER

1. **#1793 Post-CORE Registration Obligation Debt Audit** — exact next work unit.
2. Confirmed omissions from #1793 — bounded repair units.
3. Ireland Polity correction.
4. Kingdom of Italy Polity correction.
5. Remaining Polity re-audit rebuilt from current Production.
6. NamuWiki legacy backlog drain — current Batch 057 / reason Unit 050.
7. Registration Queue Reconciliation (#1375).
8. Candidate review / new registration normal operation.
9. Current UI Information Coverage Audit.
10. Portrait content/provenance expansion.

**P14 is excluded from this execution order.**

## 10. RESPONSE BARRIER / NEXT RESUME POINT

This reconciliation is one completed work unit. After it closes, stop.

**Exact next resume point:** **#1793 — Post-CORE legacy registration obligation debt audit — NOT STARTED.**

Do not start #1793, Ireland, Kingdom of Italy, NamuWiki Batch 057, Unit 050, #1767 mutation, registration queue work, UI work, portrait work or P14 in the same turn as this reconciliation.
