# P14-C microbatch 01 — Sengoku territorial-authority review

**Date:** 2026-10-02  
**Status:** REVIEWED / NO PRODUCTION MUTATION  
**Normalized intake:** `research/p14/intake/20261002-sengoku-territorial-authority-microbatch-01.json`

## Scope

This is the first P14 reviewed historical Territory/Geometry microbatch. It reviews five already-canonical Sengoku territorial-authority Polities:

| Case | Live canonical Polity UUID | Live Activity |
|---|---|---|
| Date Masamune territorial authority | `0b096333-578e-486e-84c1-10d532bee428` | 1584–1590 |
| Hōjō Ujiyasu territorial authority | `b11d8733-45b5-4165-9259-f15d861a3899` | 1541–1571 |
| Imagawa Yoshimoto territorial authority | `0c00c5d5-18ca-41cd-a5a6-64302f510a5e` | 1536–1560 |
| Mōri Motonari territorial authority | `488eb50f-a337-424c-84df-267cd6466274` | 1523–1571 |
| Takeda territorial authority | `6965b90f-3a3b-481e-8e2e-ff650bc0f0af` | 1541–1573 |

All five live bindings were read back from the Production public Polity/Person surfaces on 2026-10-02. Their Person→Polity Activities are reviewed and well-established. This microbatch does **not** treat those Activity intervals as territory polygons.

## Result

**5 HOLD / 0 APPROVED / 0 REJECTED**

The common reason is structural: the political actor and ruler interval are settled, while exact TerritoryRecord intervals and Geometry evidence remain a separate historical reconstruction problem.

P14-B requires an APPROVED case to carry exact canonical Polity UUID, canonical Source UUID + locator evidence, reviewed territory semantics, and an existing or evidence-backed Geometry binding with zero blockers. The public read surface exposes the current Activity source citation metadata but not Source UUIDs, so this review does not infer or invent them.

## Case findings

### 1. Date Masamune — HOLD

Production Activity: `a485dd4e-8933-4836-a18e-f26cf8825fac`.

Existing reviewed source material:
- Fukushima Date City, 「伊達市と伊達氏」
  - https://www.city.fukushima-date.lg.jp/soshiki/87/141.html
- Sendai City Museum, 「主な収蔵品 11 伊達政宗に関する資料（1）」
  - https://www.city.sendai.jp/hakubutsu-shomu/hakubutsukan/shuzohin/shuzohin/shuzohin-18.html

The Date City source records succession in 1584 and a much larger territorial extent by 1589. Because expansion occurred inside the Activity interval, one 1584–1590 static polygon would back-project later control into earlier years.

Blockers:
- exact canonical Source UUID read-back;
- reviewed Geometry evidence;
- interval segmentation of territorial expansion.

### 2. Hōjō Ujiyasu — HOLD

Production Activity: `7cf03291-5bc5-452c-b971-de8634e29466`.

Existing reviewed/current source material:
- Odawara City, 「北条氏五代100年の歴史」
  - https://www.city.odawara.kanagawa.jp/kanko/hojo/p09347.html
- Odawara City, 「氏康の領国経営」
  - https://www.city.odawara.kanagawa.jp/encycl/neohojo5/007/

Odawara City records Ujiyasu's 1541 succession, the 1560 headship transfer, and his 1571 death. Its territorial-administration account describes cadastral reach in central Sagami, southern/eastern Musashi and part of Izu in the early 1540s. This is strong evidence of territorial government, but not a license to conflate surveyed/direct-control areas, wider political reach, and later expansion into one polygon.

Blockers:
- exact canonical Source UUID read-back;
- reviewed Geometry evidence;
- interval segmentation;
- direct-control versus wider political-scope review.

### 3. Imagawa Yoshimoto — HOLD

Production Activity: `3d075234-3723-4bfd-9ce4-37a807329007`.

Existing reviewed source material:
- Shizuoka City, 「今川氏～駿河に君臨した名家～」
  - https://www.city.shizuoka.lg.jp/s6725/p009495.html
- Shizuoka City, Imagawa chronology PDF
  - https://www.city.shizuoka.lg.jp/documents/5146/000967697.pdf

Shizuoka City describes the Imagawa as Sengoku territorial rulers of Suruga and Yoshimoto as further developing the domain before his death at Okehazama. The evidence supports territorial authority and changing expansion, not an exact invariant 1536–1560 boundary.

Blockers:
- exact canonical Source UUID read-back;
- reviewed Geometry evidence;
- interval segmentation.

### 4. Mōri Motonari — HOLD, highest near-term Geometry priority

Production Activity: `c841b7b1-9636-46b9-973a-3356b1bf28ea`.

Existing reviewed/current source material:
- Hiroshima Prefecture educational history, 「戦国大名とひろしま ～毛利元就～」
  - https://www.pref.hiroshima.lg.jp/site/kyouiku/kyoudohirosimano124.html
- Yamaguchi Prefectural Library / NDL Collaborative Reference case on pre-Sekigahara Mōri territorial maps
  - https://crd.ndl.go.jp/reference/entry/reference/show?id=1000212761

Hiroshima Prefecture describes Motonari's transformation from an Aki local lord into a Sengoku daimyo controlling nearly all of the Chūgoku region. The Yamaguchi reference identifies published maps of Mōri expansion for 1523, 1555, 1557 and about 1569. This is exactly the kind of time-sliced source family P14 needs.

However, the referenced map material has not yet been normalized into canonical Source UUID + locator links and reusable `geometry_ref` evidence. Therefore it remains HOLD rather than APPROVED.

Blockers:
- exact canonical Source UUID read-back;
- normalization/materialization of the identified map sources;
- time-sliced Territory intervals.

### 5. Takeda Shingen — HOLD

Production Activity: `e4cd2b7c-c923-4e28-932e-5c44f30e249d`.

Current Production Activity source:
- Wikipedia, “Takeda Shingen”

Additional authoritative research source:
- Yamanashi Prefectural Museum / Yamanashi Prefecture, 「生誕500年 武田信玄の生涯」
  - https://www.pref.yamanashi.jp/event/kenhaku/0303/0313kenhaku.html

Yamanashi Prefecture states that Shingen expanded his territory from Kai into Shinano, Kōzuke, Suruga and other areas. This independently supports the territorial-authority model, but also proves that the 1541–1573 extent changed materially over time. P14 must first normalize authoritative territory evidence and then reconstruct time-sliced geometry.

Blockers:
- authoritative P14 territory-source normalization;
- exact canonical Source UUID read-back;
- reviewed Geometry evidence;
- interval segmentation.

## No-fabrication conclusions

This microbatch deliberately does **not**:

- convert Person Activity dates into territorial boundary dates;
- treat every campaign, alliance, vassal relation, office or claimed sphere as direct control;
- infer province polygons from textual labels;
- back-project a late-period maximum extent over an entire rule;
- create Source UUIDs, Geometry UUIDs, TerritoryRecord rows or Production mutations;
- use coarse spatial UI placement as historical territory.

## Next safe handoff after this microbatch

The strongest near-term Geometry candidate is the Mōri case because reviewed bibliographic guidance already identifies time-sliced expansion maps. A later work unit may normalize those specific sources and inspect the actual map evidence. That next work is not part of this microbatch.
