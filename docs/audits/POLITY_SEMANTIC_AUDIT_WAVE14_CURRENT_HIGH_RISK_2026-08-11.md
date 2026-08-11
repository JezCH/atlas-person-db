# ATLAS Polity Semantic Audit — Wave 14: Current High-Risk Rebinding

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: current Production UUIDs that remained uncovered after safe exact carry-forward and that have known semantic risk, competing alternatives, back-projection, or chronology problems.

## Decisions

| Current Activity UUID | Person | Current Polity | Period | Decision | Reason |
|---|---|---|---:|---|---|
| `9fae3456-f8b7-56c3-8fab-9f147756e9fe` | Hammurabi | Old Babylonian Empire | -1792–-1750 | `RELABEL_IDENTITY_RESEARCH` | Old Babylonian is a historiographic period; use Babylonian kingdom/state identity after consistent Babylon audit. |
| `3c213212-f4f3-5018-8a2f-1eb2602984d7` | Hatshepsut | New Kingdom of Egypt | -1479–-1458 | `TEMPORAL_LABEL_REVIEW` | New Kingdom is an Egyptological period label, not automatically a separate polity identity. |
| `e725f957-7ce2-5aa0-805b-5f9c2be7d250` | Akhenaten | New Kingdom of Egypt | -1353–-1336 | `TEMPORAL_LABEL_REVIEW` | Same New Kingdom identity issue; retain Akhenaten rule while normalizing Egyptian polity identity. |
| `45c30e16-92ba-5e89-8ef1-68dad29129bc` | Nefertiti | New Kingdom of Egypt | -1353–-1336 | `TEMPORAL_LABEL_REVIEW+RELATION_REVIEW` | Same New Kingdom identity issue; Nefertiti relation is consort/political role, not territorial rule. |
| `9f3b397d-0224-57bf-af75-420fb42ef97e` | Ramses II | New Kingdom of Egypt | -1279–-1213 | `TEMPORAL_LABEL_REVIEW` | Same New Kingdom identity issue; preserve reign chronology separately from period label. |
| `76fe49de-1cda-5a22-8629-657c85433b0c` | Dido | Carthage | -814–-814 | `KEEP_POLITY+PERSON_HISTORICITY_REVIEW` | Carthage is a valid polity; Dido is a legendary/traditional founder and should not be treated as an ordinary verified reign. |
| `21174e2f-1e20-57b1-ad69-e846c684a09f` | Gautama Buddha | Shakya | -445–-400 | `DUPLICATE_POLITY_ALIAS_RECONCILIATION` | Current Shakya row competes with Shakya Republic for the same Buddha activity; reconcile polity identity/alias, do not keep both blindly. |
| `a77a000e-2fec-5983-afb9-5d7dbc829223` | Ying Bu | Western Han | -202–-196 | `DEPENDENT_KINGDOM_RESEARCH` | Ying Bu was a vassal king within the Han order; whole Western Han should not automatically be rendered as his ruled territory. |
| `943ebf94-4a0c-53aa-a535-969e8fb60b2c` | Vercingetorix | Gaul | -52–-52 | `RELINK+RESEARCH` | Gaul is a macro-region; separate Arverni kingship from wider coalition leadership. |
| `d071f96f-9efe-575b-8ede-d536238bd319` | Jesus | Roman Judaea | 27–30 | `MULTI_JURISDICTION_RESEARCH` | Roman Judaea is a useful jurisdiction but does not cover all of Jesus activity context such as Galilee; reconcile with Roman Empire parent/local jurisdictions. |
| `675de4b2-9dd3-505c-b1c8-db475659c5a5` | Zhang Jue | Eastern Han | 184–184 | `KEEP_POLITY_CONTEXT+RELATION_FIX` | Eastern Han is the polity opposed by Zhang Jue; relation is rebel/opposes, not service or territorial rule of Han. |
| `c4e44df1-a880-55a5-8607-0c5ebf17cc87` | Sun Jian | Eastern Han | 184–191 | `KEEP_POLITY_CONTEXT+SPLIT_RELATION_REVIEW` | Sun Jian served/fought within the late-Han order; do not read the whole Eastern Han as his personal territory. |
| `15777776-b739-5988-9a04-472b2d6629c7` | Liu Yan | Eastern Han | 188–194 | `RELINK_REGIONAL_AUTHORITY` | Liu Yan established autonomous power in Yi Province while formally under Han; regional authority is map-relevant. |
| `d22767c7-4e64-5c59-a5d9-60e32d146a4c` | Tao Qian | Eastern Han | 188–194 | `RELINK_REGIONAL_AUTHORITY` | Tao Qian governed Xu Province; whole Eastern Han is not his ruled territory. |
| `eaa40098-26b0-5425-8daf-83f85207da3f` | Dong Zhuo | Eastern Han | 189–192 | `KEEP_POLITY_CONTEXT+CONTROLS_GOVERNMENT` | Dong Zhuo dominated the Han imperial government; do not equate that with control of the full Han territory. |
| `b449d90d-783f-598b-aaeb-67cf37ea549a` | Liu Yu | Eastern Han | 189–193 | `RELINK_REGIONAL_AUTHORITY` | Liu Yu governed northern Han jurisdictions while remaining loyal; model dependent jurisdiction separately. |
| `42274e4c-af35-503f-a14f-e7460489b252` | Ma Teng | Eastern Han | 189–212 | `SPLIT+RELINK_REGIONAL_AUTHORITY` | Ma Teng regional power and Han-court relationship changed through time. |
| `36a3ade9-b108-5358-8732-be7b3f6637f9` | Yuan Shao | Eastern Han | 189–202 | `SPLIT+RELINK_REGIONAL_AUTHORITY` | Yuan Shao built an autonomous northern territorial power while retaining Han titles. |
| `583d7e8d-ed63-5a7e-947a-2a3c43f8dfad` | Liu Biao | Eastern Han | 190–208 | `RELINK_REGIONAL_AUTHORITY` | Liu Biao governed Jing Province under nominal Han order. |
| `c5481afc-4cf2-5516-aceb-254c5c95c58b` | Gongsun Zan | Eastern Han | 191–199 | `RELINK+RESEARCH` | Gongsun Zan exercised de facto northeast authority; exact territorial normalization needed. |
| `f427a8d8-2e3f-5dbd-a00e-ff8585dc5ae4` | Zhang Lu | Hanzhong | 191–215 | `KEEP_RESEARCH_REGIONAL_POLITY` | Hanzhong can represent Zhang Lu theocratic territorial authority, but polity identity/extent should be source-normalized. |
| `5b4fa9a3-ca6f-5e6b-a417-874f31b10650` | Lu Bu | Eastern Han | 192–198 | `SPLIT+RELINK_REGIONAL_AUTHORITY` | Lü Bu changed allegiances and later controlled Xu Province; one Eastern Han row is too coarse. |
| `989d2115-e02f-53e6-bc68-90cf557bdd17` | Liu Yao | Eastern Han | 194–198 | `RELINK+CHRONOLOGY_REVIEW` | Liu Yao had authority over only part of Yang Province; map should use regional actual authority. |
| `4c91cb84-5e53-5bcf-a4d6-d82a8a0c903f` | Sun Ce | Eastern Han | 194–200 | `RELINK+RESEARCH` | Sun Ce built the Jiangdong base of later Wu; do not use the entire Eastern Han polygon or back-project Eastern Wu. |
| `e4988193-016b-5ca2-ba4a-8a85cbecf6e7` | Meng Huo | Nanzhong | 225–225 | `OUT_OF_CURRENT_POLITY_LABEL+RESEARCH` | Nanzhong is a macro-region, not one Meng Huo polity. |
| `1a3440db-c329-58c4-af35-fdcf488fa3fd` | Lady Trieu | Jiaozhi resistance | 248–248 | `OUT_OF_CURRENT_POLITY_LABEL+RESEARCH` | Jiaozhi resistance is an uprising/event label, not a polity identity. |
| `e4b374f5-ee25-5c12-80bf-5b7b1d2d149c` | Muhammad | Medina | 610–632 | `BACK_PROJECTION+SPLIT` | Medina cannot cover Muhammad 610–632; pre-Hijra Mecca phase and post-622 Medinan polity must be separated. |
| `39615465-6343-5d4e-8718-9e20f3344119` | Ingólfr Arnarson | Settlement of Iceland | 874–900 | `OUT_OF_POLITY_MODEL+RESEARCH` | Settlement of Iceland is a process, not a polity. |
| `d250fe38-6fa2-50f2-a902-0f4370022324` | Li Keyong | Tang Dynasty | 881–908 | `SPLIT_AT_907+RESEARCH` | Tang ended in 907 while Li Keyong remained politically active to 908; post-Tang Jin authority must be separated. |
| `fb97f845-48ab-5457-ace7-93aa6f0e9c2b` | Cnut the Great | North Sea Empire | 1016–1035 | `AGGREGATE_COMPOSITE_REVIEW` | North Sea Empire is an aggregate/historiographic composite over Cnut separate crowns; do not duplicate territory without composite-policy decision. |
| `418d957a-1658-51a6-8b35-71757f712760` | Kublai Khan | Yuan Dynasty | 1260–1294 | `BACK_PROJECTION+COMPETING_ROW` | Yuan name/state form begins 1271; current 1260–1294 Yuan row competes with 1271–1294 Yuan plus Mongol-khagan relation. |
| `94dc0003-495b-58e6-abec-48860ee6d710` | Kublai Khan | Mongol Empire | 1260–1271 | `KEEP_POLITY+AUTHORITY_LAYER_REVIEW` | Kublai was Great Khan from 1260; Mongol Empire/Great-Khan claim is a real authority layer distinct from Yuan territorial government. |
| `d82b82dc-e263-5116-ae62-888452bc2655` | Kublai Khan | Yuan Dynasty | 1271–1294 | `KEEP_POLITY+OVERLAP_REVIEW` | 1271–1294 Yuan territorial polity is defensible; reconcile overlap with Great-Khan claim rather than deleting either meaning. |
| `8198cad1-dc14-5c1e-9b01-ddbddc447da7` | Fang Guozhen | Yuan Dynasty | 1348–1367 | `KEEP_POLITY_CONTEXT+REGIONAL_AUTHORITY_REVIEW` | Fang Guozhen operated as an autonomous regional warlord during Yuan collapse; Yuan context alone is not his territorial rule. |
| `2a9029b6-3485-55a3-924f-6e9bc9adb901` | Bolad Temur | Yuan Dynasty | 1359–1365 | `KEEP_POLITY_CONTEXT+REGIONAL_AUTHORITY_REVIEW` | Bolad Temur was a Yuan warlord; distinguish Yuan service/allegiance from effective regional power. |
| `2f2a2dfe-12b3-52b7-957e-42d6f7b89f2a` | Hiawatha | Haudenosaunee Confederacy | 1450–1475 | `DUPLICATE_POLITY_ALIAS_RECONCILIATION` | Haudenosaunee Confederacy and Iroquois Confederacy are competing English labels for the same confederacy context. |
| `9db8d593-a73c-5993-bfe6-b2b30ec71167` | Hiawatha | Iroquois Confederacy | 1450–1475 | `DUPLICATE_POLITY_ALIAS_RECONCILIATION` | Iroquois Confederacy row duplicates the same Hiawatha confederacy context under another name. |
| `d1630b88-d82b-5c5e-a7a1-195bf9661465` | Yongle Emperor | Ming Dynasty | 1402–1424 | `DUPLICATE_POLITY_NAME_RECONCILIATION` | Competes with identical `Ming dynasty` row differing only capitalization/name identity. |
| `b5e49aa2-44b9-5b1c-bc84-a2650d946ef5` | Yongle Emperor | Ming dynasty | 1402–1424 | `DUPLICATE_POLITY_NAME_RECONCILIATION` | Competes with identical `Ming Dynasty` row differing only capitalization/name identity. |
| `7a066122-2b29-54ba-8c4e-e0502ad3b98b` | Philip II of Spain | Spanish Empire | 1556–1598 | `AGGREGATE_IDENTITY_REVIEW` | Spanish Empire may be an aggregate imperial label overlapping Spanish Monarchy and separate crowns/possessions; do not duplicate map authority until model is fixed. |
| `34ed5d1e-b93b-5955-b5e9-2edbc4ffaf8d` | Nzinga Mbande | Kingdom of Ndongo | 1624–1663 | `KEEP_POLITY+CLAIM_CONTROL_REVIEW` | Ndongo is a real polity; Nzinga relation after loss of Luanda/throne requires claimed/effective-control distinction. |
| `af14645b-de83-5d35-a977-eb7afce17710` | Nzinga Mbande | Kingdoms of Ndongo and Matamba | 1624–1663 | `AGGREGATE_COMPOSITE_REVIEW` | Combined Kingdoms of Ndongo and Matamba row overlaps two real polity relations; likely derived aggregate, not third independent polity identity. |
| `d4b59923-f1a5-531d-a70f-42ffac486c85` | Nzinga Mbande | Kingdom of Matamba | 1631–1663 | `KEEP_POLITY` | Matamba is a real polity ruled by Nzinga from the 1630s. |
| `68b05da1-42cb-5dc7-b584-179aceceebb4` | Edward Teach | Nassau Pirate Republic | 1716–1718 | `DUPLICATE/WEAK_POLITY_RESEARCH` | Nassau Pirate Republic is a contested/loose pirate-governance label; current competing pirate-republic rows require one source-based policy. |
| `b43cfb03-3d45-5566-a7d8-cabb37c93115` | Edward Teach | Republic of Pirates | 1716–1718 | `DUPLICATE/WEAK_POLITY_RESEARCH` | Republic of Pirates is a competing aggregate label for the same loose Nassau pirate community. |
| `932998e2-839b-5818-99bb-37221498cadd` | Tecumseh | Shawnee | 1805–1813 | `KEEP_POLITY+PARALLEL_CONFEDERACY_REVIEW` | Shawnee political identity can coexist with Tecumseh confederacy leadership; do not collapse automatically. |
| `6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8` | Otto von Bismarck | Kingdom of Prussia | 1862–1871 | `CHRONOLOGY_CORRECTION` | Bismarck remained Prussian Minister-President after 1871; current Prussia end 1871 is wrong and must overlap German chancellorship to 1890. |
| `17eba513-c00d-59c5-ba29-4a69f9143d9a` | Sun Yat-sen | Republic of China | 1912–1925 | `SPLIT+ROLE_CHRONOLOGY_REVIEW` | 1912–1925 continuous ROC row conflates provisional presidency, revolutionary opposition and later Guangzhou government phases. |
| `6ec884b8-5b36-573f-afcb-968aef1e2833` | Chiang Kai-shek | Republic of China | 1928–1975 | `SPLIT_TERRITORIAL_CONTEXT_REVIEW` | ROC political identity continues after 1949 in Taiwan, but 1928–1975 one de-facto-rule row hides the mainland/Taiwan territorial rupture and office changes. |
| `68e4dc5d-d7e3-50b7-b2a3-b68180a6922c` | Mao Zedong | People's Republic of China | 1949–1976 | `DUPLICATE_RELATION_RECONCILIATION` | Competes with same PRC period under another leadership-role label. |
| `80b1397f-83f2-5ffd-bb52-e3e7c61addaf` | Mao Zedong | People's Republic of China | 1949–1976 | `DUPLICATE_RELATION_RECONCILIATION` | Competes with same PRC period under another leadership-role label. |
| `e5337054-ff56-58fd-a105-ea6d71d4ef33` | Aung San Suu Kyi | Myanmar | 1988–2021 | `SPLIT+ROLE_CHRONOLOGY_CORRECTION` | State Counsellor was not an office from 1988; current row conflates opposition/detention era with 2016–2021 office. |

Current high-risk UUIDs explicitly covered in this Wave: **52**

These decisions do not authorize mutation. `RESEARCH`, overlap, identity and chronology items must be source-resolved in correction change sets. The purpose of this Wave is to guarantee that the current Production UUID, not a stale historical UUID, is attached to the known audit finding.

No Production mutation is authorized by this document.
