# Stage 2 Baseline A — Exact Parser Residual 6 Resolution

> Status: P3 RESEARCH REVIEWED / NO PRODUCTION MUTATION
>
> Baseline A digest: `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

## Why this review exists

The Baseline A ledger previously inherited old audit decisions from a `±3 lines` neighborhood around a referenced Markdown line. Replacing that fuzzy rule with exact `file + line + Person + Polity + period + Role` matching exposed six rows that genuinely still carried `historical_research` and were not covered by the existing 36 reviewed overlays.

This document closes only those six exact Activity UUIDs. It does not recreate old 346-row bindings, authorize Production writes, or invent missing chronology or geometry.

## Reviewed outcomes

| Baseline A Activity UUID | Person | Current context | Reviewed Stage 2 outcome | Remaining specific work |
|---|---|---|---|---|
| `5e503b05-371c-5dcb-91ec-68b6d0eef95c` | Solomon | Kingdom of Israel, -970–-931 | Keep only as a traditional/disputed Solomonic ruler assertion. The United Monarchy's historicity, scale and archaeological correlates remain debated; current conventional years must not be presented as uncontested exact chronology and the biblical maximal empire must not be emitted as default Territory. | chronology certainty, provenance, Relation `rules`; alternative Territory reconstruction later |
| `11969191-7ede-5c61-b911-5290d3b95f29` | Gautama Buddha | Shakya Republic, -445–-400 | Keep Shakya as a defensible political-origin context, but retire the idea that the whole current span is one Shakya Activity. Early Buddhist sources place the Buddha travelling through Kosalan territory, while absolute Buddha chronology remains debated. Rebuild source-backed origin and multi-polity activity contexts without fabricating boundaries. | chronology, exact target UUID binding, provenance, Relation `active_in` |
| `814f1293-3566-5f7f-a699-acb6249d420e` | Brennus (Galatia) | Gallic Coalition, -280–-279 | Do not treat the mobile invasion force as a stable territorial Polity. Preserve Brennus's 279 BCE invasion of Greece and the mobile Gallic coalition in Event/coalition evidence. | entity-model migration, chronology normalization, provenance |
| `df6cc626-135e-5abc-ae54-6dc1f64ac2aa` | Guan Yu | Shu Han, 211–220 | Use the already-reviewed layered-authority decision: rebind to the continuous Liu Bei political actor, Relation `serves`; delegated Jing command does not create a personal Polity. | continuous Polity UUID binding, exact end boundary, Relation backfill |
| `eed067d9-43f3-52dc-9ecc-d5ed540fe65b` | Amina | Zazzau, 1576–1610 | Zazzau remains a valid Polity, but Amina's historical chronology is source-conflicted. Preserve a source-qualified traditional/disputed ruler assertion in Authoring rather than treating 1576–1610 as uncontested exact dates. | chronology certainty, provenance, Relation `rules` |
| `5be7f060-46d1-58f9-ad7c-3b03458c198a` | Tecumseh | Tecumseh's Confederacy, 1805–1813 | Use the already-reviewed pre-Vercel decision: Tecumseh's Confederacy remains the authority-bearing Polity; Relation `rules`; approximate start becomes 1808, end remains 1813 at year precision. Shawnee is PeopleGroup affiliation, not a duplicate rule target. | chronology correction, PeopleGroup backfill, provenance, Relation backfill |

## Evidence

### Solomon / United Monarchy

- Aren M. Maeir, “The archaeology of the United Monarchy and the Kingdom of Israel,” in *The Oxford Handbook of the Books of Kings* (Oxford University Press, 2024): https://cris.biu.ac.il/en/publications/the-archaeology-of-the-united-monarchy-and-the-kingdom-of-israel/
- Jerusalem Journal of Archaeology, *Israelite United Monarchy* collection, including competing evaluations of the tenth-century political formation and the terminology used for it: https://jjar.huji.ac.il/journal-edition/israelite-united-monarchy

These sources support treating the historical scale and form of a Davidic/Solomonic polity as debated rather than converting the biblical maximal description into an uncontested Runtime polygon.

### Gautama Buddha

- *Majjhima Nikāya* 95, early Buddhist textual tradition: the Buddha is identified as a Sakyan who had gone forth and is described wandering in Kosalan territory: https://suttacentral.net/mn95/en/sujato?highlight=false&lang=en&layout=plain&notes=none&reference=none&script=latin
- D. Seyfort Ruegg, review on the date and historiography of the Buddha's nirvāṇa, *Bulletin of SOAS*: https://www.cambridge.org/core/journals/bulletin-of-the-school-of-oriental-and-african-studies/article/abs/new-publication1-on-the-date-and-historiography-of-the-buddhas-decease-nirvana-a-review-article/ADE91BA2B487D2616ADFDFCA94C6B642
- R. S. Sharma, “State Structure and the Varna System in the Age of the Buddha,” Oxford Academic: https://academic.oup.com/book/27690/chapter-abstract/197829156

The Shakya political context is not the same thing as the Buddha's entire later teaching geography, and the current absolute chronology cannot be made exact by convenience.

### Brennus (Galatia)

- Oxford Classical Dictionary, “Brennus (2), leader of the Galatian invasion”: https://academic.oup.com/edited-volume/61673/chapter-abstract/548510201
- F. N. Pryce, “The Gauls at Delphi,” *Journal of Hellenic Studies*: https://www.cambridge.org/core/journals/journal-of-hellenic-studies/article/abs/gauls-at-delphi/58D3A9AB3F600C879EAB55B0D94D37FF

The evidence describes an invasion and mobile military body under Brennus. It does not justify inventing a durable territorial state called `Gallic Coalition` for ATLAS.

### Amina / Zazzau

- Abdullahi Smith, *Some notes on the history of Zazzau under the Hausa Kings* (1970), catalog record: https://search.worldcat.org/title/Some-notes-on-the-history-of-Zazzau-under-the-Hausa-Kings/oclc/772584337
- John Hunwick, “A Historical Whodunit: The So-Called ‘Kano Chronicle’ and its Place in the Historiography of Kano,” *History in Africa* 21 (1994): https://www.cambridge.org/core/journals/history-in-africa/article/abs/historical-whodunit-the-socalled-kano-chronicle-and-its-place-in-the-historiography-of-kano/8DC5438DE86A0CF05C1E6FCE707FE67E

The source tradition is adequate to preserve Amina as a reviewed traditional/historical assertion connected to Zazzau, but the conflicting chronologies do not justify treating 1576–1610 as an uncontested exact interval.

### Guan Yu

Existing reviewed machine contract: `research/layered/stage2-r1-layered-authority-decisions.v1.json`.

### Tecumseh

Existing reviewed machine contract: `research/pre-vercel/stage2-pre-vercel-domain-closure.v1.json`.

## Closure rule

`historical_research = 0` means **zero undifferentiated research questions needed to decide the Stage 2 semantic model**. It does not mean every source uncertainty is erased. The following remain valid explicit dependencies:

- chronology correction / uncertainty encoding;
- exact Baseline A Polity UUID binding;
- Relation backfill;
- provenance backfill;
- People/Event migration;
- P14 Territory/Geometry reconstruction.

Unknown stays unknown. No Production mutation is authorized by this review.
