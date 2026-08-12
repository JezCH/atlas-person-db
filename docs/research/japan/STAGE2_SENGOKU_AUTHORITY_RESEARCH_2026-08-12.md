# Stage 2 Sengoku authority research — Oda / Uesugi / Hideyoshi

Status: SOURCE-BACKED MODEL NARROWING / NO PRODUCTION WRITE / NO GEOMETRY FABRICATION

Date: 2026-08-12

## Scope

This dossier continues the four unresolved Sengoku rows identified by `STAGE2_JAPAN_LAYERED_AUTHORITY_DECISIONS_2026-08-12.md`:

- Oda Nobunaga — current `Oda Clan`, 1568–1582
- Uesugi Kenshin — current `Uesugi Clan`, 1548–1578
- Toyotomi Hideyoshi — current `Toyotomi Regime`, 1582–1598
- Toyotomi Hideyoshi — current `Japan`, 1582–1598

The goal here is not to draw polygons. It is to determine what the sources justify about **political-actor identity, Person relation, authority level, and chronology**, while preserving the separate Territory-history problem for later geometry work.

## Binding model constraints

1. A clan lineage is not automatically a Polity.
2. A regime/government label is Governance Context unless evidence supports a distinct territorial political actor.
3. Person Activity does not itself define the polygon.
4. National hegemony, local/direct territorial control, alliance, campaign, and claim must not be collapsed into one `direct_control` geometry.
5. Unknown exact geometry remains unknown.

---

## 1. Oda Nobunaga

### Source findings

The Cambridge History of Japan describes Nobunaga's rise as beginning with control of Owari and Mino and states that the state created by Nobunaga and Hideyoshi was a military hegemony imposed over daimyo territorial heads. Crucially, it also states that Nobunaga died **before achieving national military hegemony**. This rules out treating his entire 1568–1582 Activity as already completed direct rule over Japan.

The same Cambridge chapter records that by 1567 Nobunaga had control of Mino and the balance of Owari, and then pursued wider unification.

Japanese scholarship independently treats the Oda authority as a territorial/regional ruling power rather than merely a genealogy. The National Diet Library catalog includes:

- `織田権力の領域支配` (The Territorial Rule of Oda Power), Sengoku History Research Association, 2011 — chapters on Oda control of Kyoto, Settsu, Izumi and other regions.
- `織田政権の形成と地域支配` (Formation of the Oda Regime and Regional Rule), Shibatsuji Shunroku, 2016 — explicitly organized around territorial formation and regional rule.
- `織田信長の畿内支配` / `織田信長政権の畿内支配` — scholarship on Nobunaga's control of the Kinai.

Gifu City's historical material independently records that Nobunaga took Mino in 1567, based himself at Gifu until 1576 and expanded his power from there. Kyoto City records his entry into Kyoto in 1568 and the expulsion of Ashikaga Yoshiaki in 1573.

### Decision

**The current `Oda Clan` target is structurally wrong, but the underlying territorial political authority is historically real.**

For Stage 2, the surviving Person Activity should target a source-backed **Oda territorial polity identity**, not a clan lineage and not blanket `Japan` direct control.

Working research label only until canonical Polity authoring is bound to the fresh Baseline A:

- English working identity: `Oda territorial polity`
- historiographical anchors: `織田氏領国`, `織田権力`, territorial/regional Oda rule

This working label is **not** authorization to create a guessed display name in Production. The final canonical name/aliases must be chosen during post-Baseline-A Polity authoring from the reviewed historiographical terminology.

### Person relation

- `rules` is justified for Nobunaga's own Oda territorial polity.
- Do **not** use `rules -> Japan` for the full 1568–1582 span.
- National-hegemony/governance modeling, where needed, belongs in Governance/authority assertions separate from the territorial polity.

### Activity interval

The existing 1568–1582 row can be preserved as the currently asserted Activity phase without asserting that the Oda polity itself began only in 1568. Sources show Nobunaga already held Owari and Mino before the row begins.

Therefore:

- Person Activity correction: **RELINK target, not chronology expansion in this correction family**.
- Polity existence/history: may predate 1568.
- Territory history: begins from source-supported earlier Owari/Mino control and changes by historical interval.

### Territory implications

At minimum, the sources prove that the Territory layer must distinguish:

- Owari/Mino core under Nobunaga before the Kyoto phase;
- subsequent expansion through Kinai and other regions;
- subordinate/allied daimyo space from direct Oda territorial administration;
- campaigns and projected conquest from actual control.

A single 1568–1582 Japan-wide polygon is prohibited.

### Research status

- Clan-vs-Polity identity class: **RESOLVED**
- Person relation class: **RESOLVED (`rules`)**
- Blanket Japan direct-control interpretation: **REJECTED**
- Canonical Production Polity UUID/name: **PENDING Baseline A + authoring**
- Exact Territory intervals/geometry: **PENDING dedicated map reconstruction**

---

## 2. Uesugi Kenshin

### Source findings

Modern scholarship consistently treats Kenshin as a territorial Sengoku lord of Echigo with a real domain/territorial rule:

- Yamada Kuniaki, `上杉謙信` (Yoshikawa Kōbunkan, 2020), explicitly covers his control of people and territory and identifies him as an Echigo Sengoku daimyo.
- The 2024 research volume `上杉謙信` includes `上杉氏の領国支配` and `上杉氏の越中支配について`.
- Joetsu City's official city history has dedicated sections `上杉謙信の政治支配`, `謙信の越中支配`, and `謙信の能登支配`.
- Yonezawa City Uesugi Museum describes the northern/Hokuriku advances as important to the formation of Uesugi territory and explicitly distinguishes territorial formation from repeated military campaigns.
- Japanese encyclopedic scholarship states that Kenshin developed daimyo territorial rule based at Kasugayama in Echigo and expanded into the Hokuriku area.

The same source tradition also records repeated campaigns into Kanto. Those campaigns are not evidence that every marched-through or allied Kanto area was directly incorporated into a single Uesugi polygon.

### Decision

**The current `Uesugi Clan` target is structurally wrong as a clan label, but a source-backed Uesugi territorial polity/domain is clearly justified.**

Working research label only until canonical Polity authoring:

- English working identity: `Uesugi territorial polity`
- historiographical anchors: `上杉氏領国`, `上杉氏の領国支配`, Sengoku-daimyo territorial rule

### Person relation

- `rules` is justified for Kenshin's own territorial polity.
- The Kanto Kanrei office must not cause the whole Kanto region to be encoded as direct territorial rule.
- Office/claim authority can be modeled separately from Territory direct control.

### Activity interval

The existing 1548–1578 Activity interval is compatible with the phase beginning when Kagetora succeeded Harukage and led the Echigo Nagao authority, through Kenshin's death.

The later 1561 succession to the Uesugi name and Kanto Kanrei office is a **designation/office transition inside the same Person's territorial authority history**, not evidence that the territorial actor suddenly came into existence in 1561.

Therefore:

- Person Activity correction: **RELINK from clan label to territorial polity**, retaining 1548–1578 unless a separate chronology audit finds a more precise boundary.
- Name/office changes belong in designation/Governance/role history.

### Territory implications

The Territory compiler must support meaningful change intervals including:

- Echigo core;
- later source-supported control in Etchu/Noto/Hokuriku;
- contested or operational military zones distinct from direct control;
- Kanto expeditions/claims distinct from territorial incorporation.

### Research status

- Clan-vs-Polity identity class: **RESOLVED**
- Person relation class: **RESOLVED (`rules`)**
- Kanto expedition = blanket direct control: **REJECTED**
- Canonical Production Polity UUID/name: **PENDING Baseline A + authoring**
- Exact Territory intervals/geometry: **PENDING dedicated map reconstruction**

---

## 3. Toyotomi Hideyoshi — `Toyotomi Regime` row

### Source findings

Scholarship routinely uses `Toyotomi regime` / `豊臣政権` for the political regime. Stage 2 already defines Regime/Government as separate from Polity. The historical literature also distinguishes Hideyoshi's central regime from the individual daimyo domains it supervised.

For example, Nakano Hitoshi's study of Toyotomi regional control analyzes how the Toyotomi regime intervened in the Kobayakawa domain rather than treating `Toyotomi Regime` as merely another territorial domain at the same semantic level.

### Decision

The current `Toyotomi Regime` **must not survive as a Polity merely because it is a regime name**.

- Retire/relink the Person–Polity Activity according to the final Hideyoshi authority split below.
- Preserve `Toyotomi Regime` as a Governance Context / regime assertion.

### Research status

- `Toyotomi Regime` as Polity: **REJECTED**
- Governance Context requirement: **RESOLVED**
- Exact UUID-bound retirement/relink: **PENDING Baseline A + correction v2**

---

## 4. Toyotomi Hideyoshi — `Japan` row and the 1590 split

### Source findings

The chronology threshold is unusually strong:

- Cambridge research states that Hideyoshi continued Nobunaga's unification after 1582 and that **by 1590 he had effectively subdued all provinces**.
- The Cambridge History of Japan describes 1568–1590 as the period in which Nobunaga and Hideyoshi brought daimyo under a single military command/national confederation.
- Recent Cambridge scholarship likewise describes Hideyoshi as the figure who completed the reunification process begun by Nobunaga.
- Kyoto's official chronology shows Hideyoshi emerging after the 1582 Yamazaki campaign, establishing a Kyoto control base in 1583 and undertaking national-scale political works thereafter.
- The National Diet Library / Japanese reference literature places the Kyushu campaign in 1587 and the Odawara/Hojo defeat and completion of national unification in 1590.

Therefore the existing 1582–1598 `Japan` row is too coarse: it back-projects completed nationwide higher-order authority across the entire expansion phase.

### Decision: split at national consolidation

#### A. 1582 → 1590 consolidation phase

Do **not** encode this as completed `rules -> Japan` direct national control.

Hideyoshi held and expanded his own territorial/political authority while progressively subordinating other daimyo. The source record supports a real Hideyoshi/Hashiba-Toyotomi territorial authority and a growing hegemonic regime, but the exact canonical territorial-polity identity must not be fabricated from the regime label.

Required model:

- Person relation to own territorial polity: `rules`
- Governance Context: growing Hideyoshi/Toyotomi central regime
- authority over external daimyo: represented by structural authority/polity relations when source-backed, not by painting their domains as direct control
- national direct/high-order `Japan` Activity: **not yet hardened for the whole 1582–1589 interval**

The exact pre-1590 territorial Polity canonical identity remains the one unresolved identity item in this cluster and must be bound from reviewed source terminology after Baseline A.

#### B. 1590 → 1598 consolidated phase

By 1590 the sources support a completed nationwide higher-order Hideyoshi authority.

For Person Activity semantics:

- `Japan` may be retained as the **higher-order political scope** from 1590 to Hideyoshi's death, with `governs` rather than a polygon-owning personal `rules` shortcut if the Stage 2 Governance model treats Japan as the overarching polity and Toyotomi as Governance Context.
- This does **not** mean every daimyo's land becomes `direct_control` by Hideyoshi personally.
- The map must preserve constituent/subordinate daimyo territorial control beneath the national hierarchy.

This is the cleanest fit with the existing Stage 2 principle used for Kamakura/Tokugawa layered authority: Person governs/rules at the appropriate political level; direct territorial control remains in Polity Territory History.

### Exact boundary

This dossier hardens the **year-level split at 1590**. A sub-year boundary should only be hardened after the national-consolidation event contract selects the exact historical marker (for example, the Hojo/Odawara settlement and subsequent submission of remaining northern lords). Until then, do not invent a month/day.

### Research status

- Existing 1582–1598 single Japan Activity: **REJECTED**
- Year-level national consolidation split: **RESOLVED at 1590**
- 1590–1598 higher-order Japan authority: **RESOLVED in principle**
- relation on 1590–1598: **`governs` candidate, to be finalized with the Stage 2 Japan/Governance integration contract**
- pre-1590 territorial authority existence: **RESOLVED**
- pre-1590 canonical Polity identity/name/UUID: **PENDING Baseline A + source-bound authoring**
- exact sub-year 1590 split: **PENDING exact-event chronology review**
- exact Territory intervals/geometry: **PENDING dedicated map reconstruction**

---

## Consolidated decision table

| Current row | Current target | Final structural disposition | Relation | Interval disposition | Remaining blocker |
|---|---|---|---|---|---|
| Oda Nobunaga | Oda Clan | RELINK to source-backed Oda territorial polity | `rules` | retain current 1568–1582 Activity phase; polity history may predate it | canonical Polity binding + Territory intervals |
| Uesugi Kenshin | Uesugi Clan | RELINK to source-backed Uesugi territorial polity | `rules` | retain 1548–1578 | canonical Polity binding + Territory intervals |
| Hideyoshi | Toyotomi Regime | RETIRE as Polity target; preserve as Governance Context | n/a on regime-as-Polity row | replaced by authority split | exact UUID correction |
| Hideyoshi | Japan | SPLIT | pre-1590: own territorial polity `rules`; post-1590: higher-order Japan authority | split at 1590 year-level | pre-1590 canonical Polity + exact 1590 boundary + Territory intervals |

## What is now closed vs still open

This research **does close** these questions:

1. Oda/Uesugi lineage labels must not survive as clan-polity stand-ins.
2. Both Oda and Uesugi cases have source-backed territorial political authorities, so no fictitious province polity is needed.
3. Nobunaga never reached completed national military hegemony; blanket Japan direct control is invalid.
4. Uesugi Kanto campaigns/offices are not blanket Kanto direct territorial control.
5. `Toyotomi Regime` belongs to Governance Context, not the Polity table merely because the label exists.
6. Hideyoshi's 1582–1598 `Japan` row must split; 1590 is the supported year-level consolidation threshold.

This research **does not close**:

1. final canonical English/Japanese Polity names and UUIDs for Oda, Uesugi and pre-1590 Hideyoshi before Baseline A;
2. exact province/county-level Territory change intervals;
3. exact polygon geometry;
4. exact sub-year boundary inside 1590;
5. whether the 1590–1598 higher-order Person relation is finalized as `governs` or represented through an equivalent already-approved national Governance assertion in the consolidated Stage 2 contract.

Those remain explicit blockers rather than being guessed.

---

## Source register

### High-weight synthesis / academic

1. Asao Naohiro & Bernard Susser, “The sixteenth-century unification,” in *The Cambridge History of Japan*, vol. 4. Cambridge University Press.  
   https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/sixteenthcentury-unification/0C30DC47EA85258875CFB8F4AE5DA821

2. *The Cambridge History of Japan*, Volume 4 overview / introduction, especially the characterization of the Oda-Hideyoshi state as military hegemony and Nobunaga's unfinished national hegemony.  
   https://www.cambridge.org/core/books/cambridge-history-of-japan/7F755780D61F3BA0A14F02728CD45AD1

3. “The End of Civil War and the Formation of the Early Modern State in Japan,” *The New Cambridge History of Japan*.  
   https://www.cambridge.org/core/books/new-cambridge-history-of-japan/end-of-civil-war-and-the-formation-of-the-early-modern-state-in-japan/F418B98E1B9585977F6C960A4E07E2FF

4. “Foreign faith and rising state: An examination of state-building dynamics in late 16th-century Japan,” *Political Science Research and Methods*.  
   https://www.cambridge.org/core/journals/political-science-research-and-methods/article/foreign-faith-and-rising-state-an-examination-of-statebuilding-dynamics-in-late-16thcentury-japan/566C0575FE9C7FAE53079ED1BB302C17

5. Nakano Hitoshi, “Regional Control under Toyotomi Hideyoshi during the Bunroku Era,” *Shigaku Zasshi* 102(7), 1993.  
   https://www.jstage.jst.go.jp/article/shigaku/102/7/102_KJ00003671560/_article/-char/en

### Oda territorial authority

6. 戦国史研究会編, *織田権力の領域支配*, 岩田書院, 2011. NDL.  
   https://ndlsearch.ndl.go.jp/books/R100000002-I000011214618

7. 柴辻俊六, *織田政権の形成と地域支配*, 戎光祥出版, 2016. NDL.  
   https://ndlsearch.ndl.go.jp/books/R100000002-I027608101

8. 深谷幸治, *織田信長と戦国の村 : 天下統一のための近江支配*, 吉川弘文館, 2017. NDL.  
   https://ndlsearch.ndl.go.jp/books/R100000002-I028624399

9. 早島大祐, “織田信長の畿内支配,” *日本史研究* 565, 2009. NDL.  
   https://ndlsearch.ndl.go.jp/books/R000000004-I10360026

10. 岐阜市, “岐阜城の歴代城主” — 1567 Mino acquisition, Gifu base, expansion.  
    https://www.city.gifu.lg.jp/kankoubunka/kankou/1013051/1005097/1034742/1034737.html

11. 京都市, 京都市のあゆみ — 1568 entry, 1573 expulsion of Yoshiaki, 1582 Honnoji.  
    https://www.city.kyoto.lg.jp/sogo/page/0000015599.html

### Uesugi territorial authority

12. 山田邦明, *上杉謙信*, 人物叢書, 吉川弘文館, 2020. NDL.  
    https://ndlsearch.ndl.go.jp/books/R100000002-I030543773

13. 前嶋敏編著, *上杉謙信*, シリーズ・中世関東武士の研究 第36巻, 2024. NDL — includes `上杉氏の領国支配` and `上杉氏の越中支配について`.  
    https://ndlsearch.ndl.go.jp/books/R100000002-I033336365

14. 上越市史 通史編2 中世 — chapters on Kenshin political rule, Etchu control and Noto control.  
    https://www.city.joetsu.niigata.jp/soshiki/koubunsho/koubunsyokan-shishi-tushi-02.html

15. 米沢市上杉博物館 / 上杉文華館 material on Nagao-Uesugi Hokuriku expansion and territorial formation.  
    https://sengoku.oki-tama.jp/?l=538282&p=log

16. 文化庁 文化遺産データベース, 国宝「上杉家文書」 — lineage/office documentary context.  
    https://online.bunka.go.jp/db/heritages/detail/197506

### Hideyoshi chronology

17. 熊本県立図書館 / NDL Reference Collaborative Database, Hideyoshi Kyushu campaign chronology, 1587.  
    https://crd.ndl.go.jp/reference/entry/index.php?id=1000318489&page=ref_view

18. 京都市, 京都の歴史年表 — Yamazaki aftermath, 1583 Kyoto control base, later Hideyoshi urban authority.  
    https://www2.city.kyoto.lg.jp/somu/rekishi/fm/nenpyou/toshi_nenpyo.html

## Porting rule after Baseline A

Do not copy old Activity UUID assumptions from the 346-row ledger into Production corrections.

After Train 1 produces Baseline A:

1. resolve each surviving Person Activity UUID from Baseline A;
2. author/reuse canonical Oda/Uesugi/pre-1590 Hideyoshi territorial Polity identities with reviewed aliases/sources;
3. bind the decisions in this dossier to those UUIDs;
4. reconstruct Territory history separately;
5. only then emit Correction v2 `RELINK`/`SPLIT`/Governance assertions.
