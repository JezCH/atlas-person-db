# Same-Person Activity Integrity Audit — corrected policy, 2026-08-16

## Correction to the first audit

The first pass incorrectly treated `atlas-activity-semantic-key/v2` exact equality as the definition of duplication. That key remains the native write-uniqueness key, but it is too narrow for legacy/migration integrity review.

A legacy/migration duplicate exists when two rows represent the same historical Activity even when a migration artifact changes relation, role alias, polity alias, or leaves behind a broad row after more precise phase rows have been created.

## Production scope

Current protected Production was re-read person-by-person for all 41 Persons that had two or more Activities in the 362-row baseline inventory. The corrected verdicts below are based on current Person detail rows, not on Activity count alone.

## Corrected verdict summary

- 8 Persons contain a confirmed duplicate/redundant representation requiring correction.
- 2 Persons contain aggregate-overlay representations that require model-policy review before deletion.
- 3 Persons contain a polity-assignment error rather than a duplicate.
- 28 Persons are legitimate multi-Activity records.

## Confirmed duplicate / redundant representations

| Person | Verdict | Current rows / action |
|---|---|---|
| Yongle Emperor | EXACT_DUPLICATE | Same Ming / Emperor / reign / 1402–1424 twice. Keep `d1630b88-d82b-5c5e-a7a1-195bf9661465`; retire `b5e49aa2-44b9-5b1c-bc84-a2650d946ef5` with provenance coalesced. |
| Gautama Buddha | MIGRATION_DUPLICATE_RELATION_GAP | `11969191-7ede-5c61-b911-5290d3b95f29` and `21174e2f-1e20-57b1-ad69-e846c684a09f` are the same Shakya / Religious leader and philosopher / religious_activity / -445–-400 Activity. The former is normalized `active_in`; the latter is legacy null relation. Keep the normalized row and transfer/coalesce provenance from the legacy row. |
| Hiawatha | MIGRATION_DUPLICATE_ROLE_ALIAS | Same Iroquois Confederacy / null relation / general_activity / 1450–1475 historical founding Activity. `Co-founder and statesman` versus `Founder` is a role-label migration alias, not two historical Activities. Canonicalize role semantics then preserve provenance while retiring one representation. |
| Mao Zedong | MIGRATION_DUPLICATE_ROLE_ALIAS | Same PRC / null relation / de_facto_rule / 1949–1976 leadership Activity. `Chairman and de facto leader` and `Chairman and paramount leader` are duplicate role aliases. Canonicalize then preserve provenance while retiring one representation. |
| Haile Selassie I | STALE_WIDE_INTERVAL | Precise reign phases are 1930–1936 and 1941–1974. The separate 1930–1974 row explicitly says the Italian occupation is excluded while its interval spans that gap. Retire the broad row only after its provenance is transferred to the phase survivors. |
| Kublai Khan | STALE_BROAD_REPRESENTATION | Precise phase rows distinguish Mongol Empire Khagan 1260–1271 and Yuan rule 1271–1294. A broad Yuan 1260–1294 row conflates those phases and overlaps both. Retire the broad representation after provenance redistribution. |
| Philip II of Spain | POLITY_IDENTITY_DUPLICATE | Spanish Empire 1556–1598 and Spanish Monarchy 1556–1598 represent the same Spanish reign under competing polity identities. Portugal 1580–1598 is a legitimate separate crown. Normalize the Spanish polity identity first, then coalesce the duplicate Activity pair. |
| Edward Teach | POLITY_IDENTITY_DUPLICATE | Nassau Pirate Republic and Republic of Pirates rows have the same Pirate captain / military_activity / 1716–1718 historical activity. Normalize the two polity identities and coalesce the Activity representations. |

## Aggregate-overlay model review — do not auto-delete

| Person | Reason |
|---|---|
| Cnut the Great | England, Denmark and Norway kingships coexist with a North Sea Empire aggregate row. This is an aggregate-vs-constituent modeling question, not a safe blind duplicate deletion. |
| Nzinga Mbande | Ndongo and Matamba constituent Activities coexist with a combined `Kingdoms of Ndongo and Matamba` aggregate row. Resolve aggregate polity policy before deletion. |

## Polity-assignment errors — not duplicates

| Person | Error |
|---|---|
| Emperor Huizong of Yuan (Toghon Temur) | 1368–1370 row notes Northern Yuan rule but still points to Yuan Dynasty. Reassign polity; retain two chronological phases. |
| Koke Temur | 1368–1375 row notes Northern Yuan service but still points to Yuan Dynasty. Reassign polity; retain the phase. |
| Peter I | 1682–1721 row notes the Tsardom of Russia but points to Russian Empire. Reassign pre-1721 polity to Tsardom of Russia; retain 1721–1725 Russian Empire phase. |

## Legitimate multi-Activity Persons

The following 28 current records represent distinct terms, political contexts, relations, offices, or historical phases and must not be deduplicated merely because Activity count is greater than one:

- Lu Bu
- Catherine de' Medici
- Confucius
- Harriet Tubman
- Simon Bolivar
- Benjamin Franklin
- Charles V
- Gongsun Zan
- Hypatia
- Indira Gandhi
- Lakshmibai
- Li Keyong
- Liu Yan
- Ma Teng
- Mahatma Gandhi
- Maria I of Portugal
- Napoleon I
- Otto von Bismarck
- Shi Xie
- Shigeru Yoshida
- Sun Ce
- Tecumseh
- Tokugawa Ieyasu
- Toyotomi Hideyoshi
- Vladimir Lenin
- William I of Orange
- Yuan Shao
- Zhang Lu

## Audit policy going forward

1. Exact semantic-key equality is a sufficient duplicate signal, not the full definition of duplicate.
2. Same Person + same historical slot where the only difference is legacy-null relation versus a normalized relation is a migration-duplicate signal.
3. Same historical slot with role IDs that are lexical/semantic aliases requires role-alias review; confirmed aliases are duplicates.
4. Same historical slot under two polity IDs requires polity-identity review; if the polity records are aliases/duplicates, the Activities are duplicates after polity normalization.
5. A broad interval that survives after historically justified disjoint phase rows replace it is a stale-row candidate; it may be retired only with provenance transfer.
6. Aggregate-polity and constituent-polity rows are not auto-deleted until aggregate modeling policy is explicit.
7. Adjacent/disjoint terms and relation-changing phases remain legitimate multiple Activities.
8. All destructive corrections must preserve normalized source links, chronology claims and relationship descriptions through coalescence or v2 replacement-survivor transfer.
