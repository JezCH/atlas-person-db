# ATLAS Polity Semantic Audit — Coverage Tracker

> Status: **STAGE 1 CURRENT SEMANTIC COVERAGE COMPLETE**
>
> Safety: **AUDIT ONLY — NO PRODUCTION DB MUTATION**

## 1. Authoritative current baseline

The original 2026-08-05 309-row snapshot is retained only as historical audit provenance. During this audit, a fresh public normalized Production read proved that the current target dataset has **346 Activity relationships**.

Authoritative coverage verification:

- endpoint: `GET https://atlas-person-db.vercel.app/api/atlas-read`
- required source marker: `v2-direct`
- GitHub Actions run: **31490306377**
- verification head: `98a60cfff261030be29a020156bb6fb4f7a04e37`
- artifact: `atlas-audit-current-coverage-final`
- artifact id: **9100736121**
- digest: `sha256:ff921c1299af176c1d30cb7f5833b13896693af29e6cb7fc194e78ab888a0986`

Machine result:

- current relationships: **346**
- current relationships with an explicit audit-document UUID decision: **346**
- uncovered current relationships: **0**
- exact surface duplicate groups: **6**
- rows contained by those exact surface duplicate groups: **12**

The verification workflow was configured to fail if even one current relationship UUID was not mentioned in the audit corpus. Run 31490306377 completed successfully.

## 2. What `346/346` means

It means every Activity relationship visible through the current normalized Production read has now been assigned an explicit semantic audit position such as:

- `KEEP_POLITY`
- `RELATION_FIX / RELATION_REVIEW`
- `RELINK`
- `SPLIT`
- `CONTINUITY_REVIEW`
- `PARENT_CHILD_REVIEW`
- `DUPLICATE / RECONCILIATION`
- `OUT_OF_POLITY_MODEL`
- `RESEARCH / DEFER`

It does **not** mean all historical corrections are resolved or ready to apply.

In particular:
- a `KEEP_POLITY` verdict validates the political entity/context for map linkage, not every biography/date/geometry;
- `RESEARCH` rows remain deliberately unresolved;
- duplicate/overlap rows must be reconciled against underlying normalized identity UUIDs before deletion or merge;
- no correction manifest has been executed;
- Production data mutated by this audit: **0 rows**.

## 3. Audit corpus

Current decisions are preserved in GitHub under `docs/audits/`:

- Wave 1: pseudo-polity / government / clan / event candidates
- Wave 2: tribal / ethnonym / confederacy candidates
- Wave 3: composite monarchies / dynasty-state names
- Wave 4: rebel / transitional authorities
- Wave 5: polity identity continuity
- Wave 6: colonial / dependent / constituent authorities
- Wave 7: previously assumed normal transitions re-audited
- Wave 8: low-risk state-polity closure
- Wave 9: city/local polities + Shu-Han chronology
- Wave 10: late-Han formal vs effective authority
- Wave 11: non-ruler / intellectual / religious / activist / traveler semantics
- Wave 12: historiographic labels + disputed/traditional polities
- Wave 13: fresh Production reconciliation and duplicate/overlap discovery
- Wave 14: current high-risk UUID rebinding
- Wave 15A–D: all remaining current Production UUIDs
- `POLITY_SEMANTIC_AUDIT_CURRENT_UUID_CARRY_FORWARD_2026-08-11.md`: safe prior-decision → current-UUID carry-forward evidence

## 4. Rules proven unsafe

The audit has explicitly rejected these shortcuts:

- `Shogunate => replace with Japan`
- `Dynasty => not a Polity`
- `Ethnonym => not a Polity`
- `Rebellion origin => not a Polity`
- `Not sovereign => not a Polity`
- `City/region name => mere Place`
- `A ends when B begins => automatic state succession`
- `valid Polity => entire Activity chronology is valid`
- `later successful state name => back-project over founder's rise`
- `formal allegiance => person's actual map territory`
- `homeland => person's whole-career polity`
- `historiographic period => polity identity`
- `uncertain territory => delete polity`

## 5. Confirmed correction-grade themes

Stage 2 must resolve, among others:

- Japan / bakufu / daimyo-domain layered authority
- Ganden Phodrang vs Tibet for Ngawang Lobsang Gyatso
- Roman / Byzantine continuity around 395
- Tsardom of Russia / Russian Empire 1721 continuity
- RSFSR / USSR constituent-parent overlap
- Prussia / German Empire simultaneous Bismarck offices
- Yuan / Northern Yuan continuity
- Shu-Han back-projection before 221
- Cao Wei back-projection over Cao Cao's Han-era career
- late-Han imperial legality vs regional effective control
- Rurik / Kievan Rus' back-projection
- Egyptian New Kingdom / Old Babylonian / Swedish Empire temporal-label identity
- long mobile careers such as Ibn Battuta / Leonardo / Lafayette
- claimant government claimed-vs-effective territory such as Azad Hind
- exact duplicate and competing current Activity rows discovered in Wave 13

## 6. Current duplicate/reconciliation debt

The final current snapshot still contains **6 exact semantic surface duplicate groups / 12 rows**. Wave 13 also records non-exact competing/overlapping alternatives such as:

- Tokugawa Ieyasu overlapping formal/de-facto rows
- Toyotomi Hideyoshi `Toyotomi Regime` vs `Japan`
- Peter I overlapping Tsardom/Russian Empire alternatives
- Benjamin Franklin pre-1776 United States back-projection
- Haile Selassie legal reign vs effective-control overlaps
- Hypatia competing Roman/Byzantine continuity models
- Maria I competing Portugal state-form rows
- Kublai overlapping Great Khan/Yuan alternatives
- Hiawatha Haudenosaunee/Iroquois aliases
- Yongle `Ming Dynasty` / `Ming dynasty`
- Nzinga separate kingdoms plus aggregate row

Public read does not expose all underlying `person_id / polity_id / role_id / period_basis_id`, so these must not be deleted from surface text alone.

## 7. Stage 2 correction-readiness plan

Before Production mutation:

1. obtain a **read-only normalized UUID inventory** for flagged rows including `activity_id, person_id, polity_id, role_id, period_basis_id` without exposing the DB credential to GitHub Actions;
2. reconcile exact duplicates and competing alternative rows first (`Reconciliation Pass 0`);
3. convert audit verdicts into reviewed correction decisions/change sets;
4. resolve `RESEARCH` cases with sources or explicitly `DEFER` them;
5. create an idempotent correction-manifest path using the existing normalized transaction primitives;
6. dry-run every change set for semantic collisions, orphan references, row-count changes and split results;
7. apply only bounded historical change sets in transactions;
8. verify Person semantics and map/runtime behavior after apply;
9. perform a final live UUID/before-state drift check immediately before every mutation.

## 8. Completion statement

**Stage 1 is complete:** all **346/346** current Production Activity relationships have explicit semantic audit coverage.

**Stage 2 is not complete:** flagged historical decisions, duplicates, continuity questions and correction manifests remain unresolved and no Production correction has been applied.
