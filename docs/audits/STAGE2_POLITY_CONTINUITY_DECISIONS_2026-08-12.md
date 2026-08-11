# Stage 2 Polity Continuity Decisions — 2026-08-12

## Status

**SOURCE-BACKED AUDIT ONLY — NO PRODUCTION MUTATION**

This document closes the historical-model question behind the 13 current Activity rows previously classified as `CONTINUITY_MODEL_REVIEW`. It does **not** authorize Production migration, UUID merges, relinks, Activity retirement, date rewrites, or source backfill.

The rule is the ATLAS domain rule, not lexical normalization:

> A title, state form, territorial contraction, historiographic label, or dynastic name does not by itself prove a new Polity identity. Conversely, a primary-law union of multiple constituent kingdoms may justify a distinct composite Polity.

Historical source facts and ATLAS modeling inference are kept separate below.

---

## 1. Roman Empire → Eastern Roman / Byzantine map authority, 395

### Source facts

Modern scholarship strongly preserves the **Roman continuity** of the eastern state. Panagiotis Theodoropoulos summarizes the scholarly consensus that the state and its elites identified as Roman and that `Byzantine` is a later/conventional historiographic label rather than proof that a new non-Roman nation appeared.

J. B. Bury likewise argued for the underlying continuity of the Roman Empire while beginning his later-Roman/Byzantine account in 395, the year of Theodosius I's death and the division into eastern and western parts.

Sources:

- Panagiotis Theodoropoulos, “Did the Byzantines call themselves Byzantines? Elements of Eastern Roman identity in the imperial discourse of the seventh century,” *Byzantine and Modern Greek Studies* 45.1 (2021), Cambridge University Press.  
  https://www.cambridge.org/core/journals/byzantine-and-modern-greek-studies/article/did-the-byzantines-call-themselves-byzantines-elements-of-eastern-roman-identity-in-the-imperial-discourse-of-the-seventh-century/65B940757F334DC5D5F0E6B479045BDD
- J. B. Bury, *A History of the Later Roman Empire*, Cambridge University Press reissue.  
  https://www.cambridge.org/core/books/history-of-the-later-roman-empire/A81C90C305A9174263028FD7E53C533F

### ATLAS modeling inference

ATLAS must simultaneously preserve two facts:

1. the eastern imperial state remained Roman in historical identity;
2. after 395, eastern and western imperial administrations became separately useful territorial authorities for a diachronic GIS.

Therefore ATLAS uses **an operational territorial split at 395**, while explicitly retaining Roman-continuity metadata. Existing `Byzantine Empire` may serve as the project's conventional English label for the eastern territorial Polity; this must not be interpreted as a claim that Roman identity ended in 395.

Recommended identity relation: a reviewed `splits_from`/division relation from the previously unified Roman territorial authority, with continuity notes. This is a GIS modeling relation, not an ethnonational discontinuity claim.

### Current Activity decisions

| Activity UUID | Current row | Decision |
|---|---|---|
| `aa5f6b18-e362-5421-9547-5ed0161d3cb8` | Hypatia · Roman Empire · 393–395 | **KEEP** pre-395 representative |
| `c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa` | Hypatia · Roman Empire · 393–415 | **RETIRE** competing cross-boundary span |
| `3f0af453-7e55-5bf0-a8d8-6092788e28a6` | Hypatia · Byzantine Empire · 395–415 | **KEEP** post-395 eastern territorial authority |

---

## 2. Yuan → “Northern Yuan”, 1368

### Source facts

Khubilai became Great Khan in 1260, but the Great Yuan dynastic government was formally proclaimed in 1271. The Cambridge History of China explicitly distinguishes those two moments.

For 1368, modern scholarship describes the Yuan court as being driven from China and withdrawing into its Mongolian heartland, becoming what historians call the Northern Yuan. Timothy May explicitly notes that even the date at which the Yuan/Mongol imperial formation should be considered ended can be framed as 1368 or 1388. This is strong evidence against treating 1368 as an automatic replacement of one ruling court by a wholly new state identity.

Sources:

- *The Cambridge History of China*, “Chinese society under Mongol rule, 1215–1368.”  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-china/chinese-society-under-mongol-rule-12151368/9A6883E723707B5FA65850F9AD9AA402
- Susanne Reichert, “The cosmopolitanism of Karakorum, capital of the Mongol empire in Mongolia,” *Modern Asian Studies* (2025).  
  https://www.cambridge.org/core/journals/modern-asian-studies/article/cosmopolitanism-of-karakorum-capital-of-the-mongol-empire-in-mongolia/E562432CD03349E4D8A761D25592DBD6
- Timothy May, “With Success Comes Failure,” in *The Mongols* (2019).  
  https://www.cambridge.org/core/books/abs/mongols/with-success-comes-failure/89E4CDA8CB5022E0DC25FF6EB8148D8A

### ATLAS modeling inference

For the reviewed 1368–1375 data, **Northern Yuan should not own a new stable Polity UUID merely because the court lost China and later historiography applies a new label**.

ATLAS should instead:

- preserve one stable Yuan Polity identity through this immediate court continuation;
- represent the enormous 1368 territorial contraction in `Territory Records`;
- store `Northern Yuan` as a `historiographic_period` / conventional temporal designation for the reviewed post-1368 phase;
- refrain from extrapolating this conclusion to all post-1388 Mongol regimes without separate research.

This decision is deliberately narrower than the broad modern convention that sometimes extends “Northern Yuan” for centuries.

### Current Activity decisions

| Activity UUID | Current row | Decision |
|---|---|---|
| `418d957a-1658-51a6-8b35-71757f712760` | Kublai Khan · Yuan Dynasty · 1260–1294 | **SPLIT/RESEARCH**: Yuan cannot be back-projected unqualified to 1260; 1271–1294 may remain Yuan, 1260–1271 Great-Khan authority requires separate target/relation research |
| `59559235-3a54-5985-b83d-bbc16ac01467` | Emperor Huizong · Yuan Dynasty · 1333–1368 | **KEEP representative**, then coalesce continuous rule through 1370 after relink |
| `68c203e5-ac61-59ed-853b-365bdf3ed340` | Emperor Huizong · Northern Yuan · 1368–1370 | **RELINK to stable Yuan + COALESCE/DROP** |
| `c5085fdb-379a-5710-bf14-c748b5b822da` | Koke Temur · Northern Yuan · 1368–1375 | **RELINK to stable Yuan**, with Northern Yuan designation context |

The Kublai pre-1271 target remains historical/structural research, but **the Yuan/Northern-Yuan continuity question itself is closed**.

---

## 3. Tsardom of Russia → Russian Empire, 1721

### Source facts

The Russian Presidential Library records that Peter accepted the title `Emperor of All Russia` on 22 October / 2 November 1721 and explicitly states that the Russian state thereafter became known as the Russian Empire. The same institutional source places this directly after the Treaty of Nystad.

Sources:

- Presidential Library, “Пётр I принял императорский титул. Россия стала империей.”  
  https://www.prlib.ru/node/619684
- Presidential Library, “Подписан Ништадтский мирный договор.”  
  https://www.prlib.ru/history/619530

### ATLAS modeling inference

Nothing at the 1721 boundary establishes a secession, union, new ruling dynasty, or replacement territorial political community. This is a **state-form/title transition within the same Russian Polity identity**.

ATLAS should therefore use one stable Russia UUID and temporal designations such as:

- `Tsardom of Russia` before the imperial-title transition;
- `Russian Empire` thereafter.

Peter's **Role changes**, so his Person–Polity Activity remains split by Role even though the Polity UUID stays the same.

Reviewed exact transition evidence: **2 November 1721 Gregorian** (22 October Julian). This creates a sub-year migration requirement; the current year-only rows must not be made artificially exact without the shared temporal cutover.

### Current Activity decisions

| Activity UUID | Current row | Decision |
|---|---|---|
| `57cdefa5-9a5d-533c-b229-47e398f1d07a` | Peter I · Tsardom of Russia · 1682–1721 · Tsar | **KEEP Role phase + RELINK** to stable Russia identity |
| `eda26b64-2f59-5f15-954a-73404ceed064` | Peter I · Russian Empire · 1682–1725 · Tsar and emperor | **RETIRE** back-projected competing span |
| `9ec53325-3a97-58a8-a7e7-81a496a47e57` | Peter I · Russian Empire · 1721–1725 · Emperor | **KEEP Role phase + RELINK** to the same stable Russia identity |

This is a **designation/state-form change, not a diachronic successor-Polity relation**.

---

## 4. Kingdom of Portugal → United Kingdom of Portugal, Brazil and the Algarves, 1815

### Source facts

The primary law of **16 December 1815** is unusually explicit. It elevates Brazil to a kingdom and says that the kingdoms of Portugal, the Algarves, and Brazil shall form **one single United Kingdom** under the new title. The 13 May 1816 arms law again describes the three kingdoms as together constituting one and the same kingdom.

Sources:

- Câmara dos Deputados, Carta de Lei de 16 de Dezembro de 1815, original publication.  
  https://www2.camara.leg.br/legin/fed/carlei/anterioresa1824/cartadelei-39554-16-dezembro-1815-569929-publicacaooriginal-93095-pe.html
- Câmara dos Deputados, Carta de Lei de 13 de Maio de 1816.  
  https://www2.camara.leg.br/legin/fed/carlei/anterioresa1824/cartadelei-39478-13-maio-1816-569762-publicacaooriginal-92979-pe.html

### ATLAS modeling inference

This is materially different from Russia in 1721. The primary law explicitly creates a **composite union political entity** from multiple kingdoms.

ATLAS should therefore:

- keep `United Kingdom of Portugal, Brazil and the Algarves` as a distinct composite Polity;
- allow `Kingdom of Portugal` (and the other legally relevant component kingdoms) to continue as constituent Polities through `constituent_of` structural relations where the source-backed model requires;
- model formation of the union through the reviewed union/identity relation model rather than treating the United Kingdom as a mere alias of Portugal;
- assign Maria I's top-level sovereign Activity after formation to the United Kingdom rather than duplicating a full-span Kingdom-of-Portugal sovereign row.

The primary-law boundary is **16 December 1815**, so this is another newly explicit sub-year correction case.

### Current Activity decisions

| Activity UUID | Current row | Decision |
|---|---|---|
| `a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7` | Maria I · Kingdom of Portugal · 1777–1815 | **KEEP** pre-union sovereign phase; sub-year boundary needed |
| `fefe572f-95f7-5913-86ed-304c7c2ca679` | Maria I · Kingdom of Portugal · 1777–1816 | **RETIRE** competing cross-union span |
| `25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89` | Maria I · United Kingdom · 1815–1816 | **KEEP** post-union composite-Polity phase; sub-year boundary needed |

---

## Result

The 13 former `CONTINUITY_MODEL_REVIEW` rows are no longer unresolved continuity-policy questions.

They resolve into four different historical models:

1. **Roman → Eastern Roman/Byzantine**: map-operational territorial split with explicit Roman continuity.
2. **Yuan → Northern Yuan**: immediate post-1368 court continuity under one stable Yuan identity; Northern Yuan is a historiographic temporal designation for the reviewed interval.
3. **Tsardom → Russian Empire**: one stable Russia identity with temporal state-form/designation and a Role transition.
4. **Portugal → 1815 United Kingdom**: distinct composite union Polity, with Portugal as a constituent rather than a mere rename.

This is exactly why ATLAS must not use one generic `successor_of` rule for every historical name change.

## Remaining work is correction work, not continuity-policy ambiguity

No Production data is changed here. Remaining work includes:

- choose/reconcile exact stable Polity UUID survivors where identity unification is required;
- inspect all references before retiring a duplicate Polity identity;
- prepare UUID-bound Activity relink/retire/coalesce/split manifests;
- add designation and Polity-relation assertions with normalized Sources;
- incorporate the newly identified 1721 Russia and 1815 Portugal sub-year transition cases into temporal correction planning;
- separately research Kublai's 1260–1271 Great-Khan authority target;
- apply only after the additive Stage 2 schema, semantic-key cutover, and Production deployment gates are satisfied.
