# Same-Person Activity Integrity Audit — 2026-08-16

## Scope

- Baseline inventory: 362 Activity rows, 310 Persons.
- Persons with 2+ Activity rows: 41 Persons / 94 Activity rows.
- Baseline source: Production read-only Baseline A captured at `3c0a632daa7328ec5f3b506758984963261661ea`.
- High-risk candidates were re-read from the current protected Production `atlas-person-read` detail surface before action.
- This audit distinguishes exact duplicates from role/relation/polity variants and temporal containment. Mere overlap is never an automatic delete condition.

## Current decisions

| Person | Current signal | Decision |
|---|---|---|
| Yongle Emperor | exact same person/polity/relation/role/basis/1402–1424 slot | **approved coalesce**; keep richer `d1630b88...`, retire `b5e49aa2...`, transfer provenance |
| Gautama Buddha | same slot but relation `active_in` vs legacy null | review relation normalization; **not exact** |
| Hiawatha | same polity/basis/1450–1475, role variant | review role normalization; no automatic delete |
| Mao Zedong | same polity/basis/1949–1976, role variant | review role normalization; no automatic delete |
| Haile Selassie I | 1930–1974 legacy span contains 1930–1936 and 1941–1974 split phases | stale-span candidate; requires multi-survivor provenance handling before retirement |
| Kublai Khan | 1260–1294 Yuan legacy span overlaps pre-Yuan Mongol and 1271–1294 Yuan split phases | stale-span candidate; requires multi-survivor provenance handling before retirement |
| Philip II of Spain | Spanish Empire vs Spanish Monarchy same reign slot | polity identity issue; resolve polity globally before Activity retirement |
| Edward Teach | Nassau Pirate Republic vs Republic of Pirates same slot | polity identity issue; resolve polity globally before Activity retirement |
| Cnut the Great | England/Denmark/Norway plus North Sea Empire aggregate | aggregate representation review; not an exact Activity duplicate |
| Nzinga Mbande | Ndongo/Matamba plus combined aggregate | aggregate representation review; not an exact Activity duplicate |
| Lu Bu | 192 `serves`, 193 `active_in`, 194–195 and 196–198 distinct `rules` authorities | **confirmed legitimate segmentation**; no cleanup |
| Emperor Huizong of Yuan | later row notes Northern Yuan but polity remains Yuan Dynasty | separate polity-assignment correction |
| Koke Temur | later Northern Yuan phase recorded under Yuan Dynasty in baseline | separate polity-assignment correction |
| Peter I | pre-1721 phase requires polity-transition review | separate polity-assignment correction |

## Full 2+ Activity inventory

- Cnut the Great / 크누트 대왕 — 4 — `6767baba-82d1-5ba2-9cf3-b5143cd84010`
- Lu Bu / 여포 — 4 — `74611130-a9b8-52b2-85b2-e62e9bf4a892`
- Catherine de' Medici / 카트린 드 메디시스 — 3 — `d3db3949-d37e-5e7f-9b75-7c993fce314b`
- Confucius / 공자 — 3 — `f5f06440-64dc-5b83-bf9f-8ceea93cc204`
- Haile Selassie I / 하일레 셀라시에 1세 — 3 — `98142a9e-e43b-5fab-be58-8004cfd1aca6`
- Harriet Tubman / 해리엇 터브먼 — 3 — `de41d98d-2ca9-5858-ac9f-1de3cc7c8136`
- Kublai Khan / 쿠빌라이 칸 — 3 — `7144205f-083f-542e-a946-154c7e0ee048`
- Nzinga Mbande / 은징가 음반데 — 3 — `f19f4847-cac8-5d61-a6c5-bcf3c6a6b0a4`
- Philip II of Spain / 펠리페 2세 — 3 — `8cda708e-eb60-590e-8749-853a5ef4a6c3`
- Simon Bolivar / 시몬 볼리바르 — 3 — `4c5ed768-0d28-5e13-aa3d-976760d7e4ce`
- Benjamin Franklin / 벤저민 프랭클린 — 2 — `4ac78579-a8ce-56b9-a901-89f0b34317b9`
- Charles V / 카를 5세 — 2 — `449b224b-2b5d-5c6c-aa9d-b3a63de00192`
- Edward Teach / 에드워드 티치 — 2 — `b258dd75-aeb6-5603-bda8-ccb6fd078327`
- Emperor Huizong of Yuan / 원 순제 — 2 — `c5f831b4-ca83-5fb5-8477-278c4ec0323c`
- Gautama Buddha / 석가모니 — 2 — `8e006020-b055-5d7c-8d18-2bf962a15396`
- Gongsun Zan / 공손찬 — 2 — `a42f5603-2add-5391-9b00-20467337e835`
- Hiawatha / 히아와타 — 2 — `5e80cd21-07a8-5f45-83eb-a08dc5c7e37f`
- Hypatia / 히파티아 — 2 — `7f63697a-9164-5c4a-933f-d46ee52ed3ae`
- Indira Gandhi / 인디라 간디 — 2 — `35f0004f-28fc-5227-9977-3414849f0c1c`
- Koke Temur / 쾨케 테무르 — 2 — `eee1e3e6-f474-5438-8a07-44c88027d0c7`
- Lakshmibai / 락슈미 바이 — 2 — `e10fcad7-6e2f-5567-bfc7-fca4855101c7`
- Li Keyong / 이극용 — 2 — `46fd1ea5-29a2-5d21-98c9-63b0a31c1873`
- Liu Yan / 유언 — 2 — `e0596736-50b6-53a1-9edc-61a5f108c3c7`
- Ma Teng / 마등 — 2 — `23c49394-3596-533e-9217-7bc3d1f1ea3b`
- Mahatma Gandhi / 마하트마 간디 — 2 — `b8d7ce6b-c6ee-5ba0-80f2-51b59c50126d`
- Mao Zedong / 마오쩌둥 — 2 — `44078197-7f99-5f12-a0cf-48c402798023`
- Maria I of Portugal / 마리아 1세 — 2 — `de8aab73-cb73-5214-b28e-0e1f7dfee9c0`
- Napoleon I / 나폴레옹 1세 — 2 — `945b78a7-3941-5e05-a6c9-ce57e7395727`
- Otto von Bismarck / 비스마르크 — 2 — `5401a194-c4e1-57e9-97da-49538d756182`
- Peter I / 표트르 1세 — 2 — `072f2262-acbb-53a8-a63f-c3e798c24132`
- Shi Xie / 사섭 — 2 — `a80ed18e-d531-50ff-abbe-6b400d0340d4`
- Shigeru Yoshida / 요시다 시게루 — 2 — `6b378414-7043-523a-a890-7e46d5a86c37`
- Sun Ce / 손책 — 2 — `4fef4a14-911e-51a5-b9d6-80454ce6455b`
- Tecumseh / 테쿰세 — 2 — `62d43a03-b980-55f8-a992-d57346b62e70`
- Tokugawa Ieyasu / 도쿠가와 이에야스 — 2 — `308373b7-1bb5-5e02-9e95-a832a875c8a2`
- Toyotomi Hideyoshi / 도요토미 히데요시 — 2 — `10c0c302-4cdb-5fd2-a029-8d1a6c3287cf`
- Vladimir Lenin / 블라디미르 레닌 — 2 — `c04d7a35-49b0-5e44-9049-67b89d970d52`
- William I of Orange / 오라녜 공 빌럼 1세 — 2 — `91b6365a-4192-5fcb-836e-3250f60d6e02`
- Yongle Emperor / 영락제 — 2 — `37634648-d825-557a-ba1f-4e2534f28fd8`
- Yuan Shao / 원소 — 2 — `2452e991-f4ae-553a-b2a7-abf073d5cd9e`
- Zhang Lu / 장로 — 2 — `0ac865c1-ba51-503b-9110-23458503d549`

## Integrity policy

1. `exact_activity_duplicate` may be auto-nominated for reviewed coalescence, but Production mutation still requires an approved correction manifest and exact target snapshot.
2. `relation_variant_same_slot`, `role_variant_same_slot`, `polity_variant_same_slot`, and `containment_same_context` are review signals only.
3. Adjacent or overlapping Activities with distinct relation/polity/role semantics remain valid.
4. Stage 2 native writes continue to use `atlas-activity-semantic-key/v2`; this audit fills the legacy/null-metadata gap and must not weaken the native semantic key.
