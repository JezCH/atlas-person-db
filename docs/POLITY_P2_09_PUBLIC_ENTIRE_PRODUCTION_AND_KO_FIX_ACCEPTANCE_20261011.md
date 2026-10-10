# POLITY-P2-09 — Actual all-public Production census and two KO naming-seed closures

**2026-10-11 KST | Production evidence PASS — FULL PUBLIC POLITY LIST ONLY, not full internal Source/Authoring audit.**

## 1. All-Production census, before actual changes

[PR #2464](https://github.com/JezCH/atlas-person-db/pull/2464) introduced exhaustive GET-only Polity public census; Integrity [#38072584862](https://github.com/JezCH/atlas-person-db/actions/runs/38072584862) **success**, merged SHA `bb2f57a8fd7c7609458049be68e906fa7b7877b0`. [Executed public Production workflow #38072668164, first attempt](https://github.com/JezCH/atlas-person-db/actions/runs/38072668164) **success**, ZIP artifact **#11677785165**, digest `sha256:2fedde35c58112bba9c442ad72ab35021033a3e7042d3254adca5738b751039e`.

The public response is **all returned current Production Polities**, not seeded names only. Stable Production SHA **`ad777fcb81ea7a86bd6f34ac9caa3b1e62a442c3`** (pre/post public GET).

| Audit count | Before naming repair | After naming repair |
| --- | ---: | ---: |
| Public Polities | **1,158** | **1,158** |
| Polities with ≥1 linked Activity | **1,133** | **1,133** |
| Polities with 0 linked Activities | **25** | **25** |
| Total Person–Polity Activities | **2,523** | **2,523** |
| Unique Activity IDs | **2,523** | **2,523** |
| Unique linked Person IDs | **2,022** | **2,022** |
| Same Activity ID linked to multiple Polities | **0** | **0** |
| Invalid/reversed year boundaries | **0** | **0** |
| Unknown/unresolved Activity temporal bounds, public schema | **0** | **0** |
| Missing public preferred KO/EN names | **0** | **0** |
| **Duplicate normalized KO preferred-name groups** | **2** | **0** |
| Duplicate preferred-name EN groups | **0** | **0** |

The original collision groups were actual distinct Polity UUID pairs:
- Song Dynasty `1a1983fd-1850-5756-877c-3d2c17b85e1f`, 2 ruler Activities, and **ancient state Song** `f5547f25-fbae-5a84-ad65-04bdb82de1e7`, 3 historical Activities, both `송나라`.
- Qin (秦) `4ed462b6-6d39-571a-bb18-3e320bddd199`, 6 Activities, and Jin (晉) `ddf1b350-17ea-5275-bc33-e6d86ab4d868`, 1 Activity, both `진나라`.

**All 25 empty-Activity Polities are inventory only, NOT approved for deletion.** Full original candidate list is included in the artifact. It includes both modern state rows and likely contextual entity modeling candidates (movements, ethnic communities, Svalbard, regional states); no identity or life-cycle verdict is inferred merely from orphan status.

## 2. Actual scoped canonical Production name repair

[PR #2466](https://github.com/JezCH/atlas-person-db/pull/2466), Integrity [#38072958425](https://github.com/JezCH/atlas-person-db/actions/runs/38072958425) **success**, merged SHA `1a332a99fc1cf76b4d247135b1c5da90577fb292`.

Protected [Correction Apply run #38073045519](https://github.com/JezCH/atlas-person-db/actions/runs/38073045519) **success**, [artifact #11678110132](https://github.com/JezCH/atlas-person-db/actions/runs/38073045519/artifacts/11678110132), ZIP digest `sha256:13276e87a1ed2d9cb9e42c3862c2da26f48cff1010326fe91d49a8bde832fa5a`. Both `dry_run:true,committed:false,replay:false` and `apply:dry_run:false,committed:true,replay:false` proven, OIDC workflow SHA `1a332a99...` vs actual deployed handler `ad777fcb...` **distinct but approved transport rebase**, not falsely identical.

Exactly two same-row `replace_polity_preferred_name` operations, no other DB domain operation:
1. Ancient state Song `f5547f25...`, original preferred KO name-row UUID **`d21311dd-fca8-5803-ac85-4f9acd703aba`**: `송나라` → **`고대 송나라(宋)`**. **Song Dynasty** remains `송나라` with Taizu/Shenzong untouched.
2. State Jin (晉) `ddf1b350...`, original preferred KO name-row UUID **`cb1f6144-1c78-5ed0-991b-c75eaef6d9d3`**: `진나라` → **`진(晉)`**. **Qin (秦)** remains `진나라`.

Canonical `polities` count **1158→1158**, `polity_names` count **2317→2317**. The writer's same-row UUID lock and exact original text requirement plus replacement-name collision preflight passed; no Person, Activity, Source, Polity UUID or source join touched.

Source evidence: [KCI peer-reviewed Song Xianggong study](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002718595); [Chinese Text Project Song Xianggong chronicle](https://ctext.org/dictionary.pl?did=1172&if=en); [Cambridge primary Spring & Autumn chronology of Jin vs Qin](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/1365C7C3FFB36D9137D6CA9856819323/S036250282510028Xa.pdf/reading_history_obliquely_tables_on_the_spring_and_autumn_period.pdf). These sources confirm historical entity distinction; the exact preferred KO phrases are **reviewed project display policy**, not claimed verbatim scholarship titles.

## 3. Independently repeated FULL public Production census AFTER commit

The original read-only [P2-09 workflow #38072668164](https://github.com/JezCH/atlas-person-db/actions/runs/38072668164) was **rerun once**, no new write, no code modifications. Its second execution [artifact #11677521661](https://github.com/JezCH/atlas-person-db/actions/runs/38072668164/artifacts/11677521661) digest `sha256:a3ea6b7c2cb022f7c1724a374ad21f3214ffb10dd03c6aef47cc639029b623e0` included the **entire** resulting public list and derived report; stable deployment SHA `ad777fcb...` before/after. The report proves **KO exact preferred-name collision groups 2→0** (all other counts identical as table). Original Song, Qin unchanged and ancient Song/Jin display updated at exact UUIDs; **public postcondition accepted**.

## 4. Scope-specific registry disposition

- `song-ko-name-collision` → **FIXED**, keep BOTH distinct entities, exact original/updated names and source evidence.
- `qin-jin-ko-name-collision` → **FIXED**, keep BOTH distinct entities, exact original/updated names and source evidence.
- **Only after this actual Production accept:** registry 75 total / **65 terminal / 10 REVIEW_REQUIRED**. Pending: historical family **5**, temporal designation **1**, naming **0**, territorial rupture **4**. Unseeded new public audit candidates remain distinct from those originally tracked 75 and require formal review if not previously acknowledged.

## 5. Mandatory unfinished overall goals

**Do not call this full Production canonical Source or Authoring parity audit.** Public `Polity` read does **not** expose internal normalized `sources` (3,354 latest protected baseline), `polity_sources` (255 after Northern Song source repair), complete tombstones, identity-relation Source triples, governing historical designation Source bundles, or Authoring→Runtime exact row equivalence. All remain **next protected full Production audit** gates. The 25 unlinked Polities require identity/source/user-approval review (not automatic retirement).

Song `P2-08E-C` dynasty continuity vocabulary remains uncreated and generic Song original two Activities preserved. Sweden era designation (1), the 5 family and 4 rupture seeds, Japan/Place/France acceptance, and P14 user-parked scope retain previous boundaries. #1895 is **OPEN** until full program acceptance.
