# ATLAS Polity Semantic Audit — Current UUID Carry-Forward

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Purpose: rebind prior historical audit decisions to the current Production relationship UUIDs only where `Person + Polity + activity_start + activity_end + Role` exactly match the already-audited row.

## Carry-forward rule

- This file does **not** create a new historical verdict.
- It proves that the current Production row has the same audited semantic context and role as a prior Wave row, despite relationship UUID regeneration.
- Any row with changed Person, Polity, period, or Role is excluded and remains subject to fresh review.
- Current UUID is authoritative for later correction targeting; old UUID remains provenance only.

Exact safe carry-forward rows: **149**

| Current Activity UUID | Person | Polity | Period | Role | Prior audit source |
|---|---|---|---:|---|---|
| `16781cf4-9279-5ce0-a7f4-0c491d7af9c5` | Mursili I | Hittite Kingdom | -1620–-1590 | Great King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:49` |
| `5e503b05-371c-5dcb-91ec-68b6d0eef95c` | Solomon | Kingdom of Israel | -970–-931 | King of Israel | `POLITY_SEMANTIC_AUDIT_WAVE12_2026-08-11.md:30` |
| `251bf74f-0b62-556d-bdda-8dd5f9241880` | Duke Huan of Qi | Qi | -685–-643 | Duke | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:120` |
| `84ef9925-1396-5976-b0b1-2e81d5bf92f6` | Ashurbanipal | Neo-Assyrian Empire | -669–-631 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:58` |
| `48c7ae80-f2d9-5e4d-901f-9f0d49a3d6ee` | Duke Mu of Qin | Qin | -659–-621 | Duke | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:123` |
| `9b21f064-2d4a-5805-af81-774cd41773e7` | Duke Xiang of Song | Song | -650–-637 | Duke | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:121` |
| `68539bbf-3919-5351-9bca-83d8663f99c3` | Duke Wen of Jin | Jin | -636–-628 | Duke | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:122` |
| `b7aff6cc-95af-58e6-ba3b-5b2fc6be0600` | Nebuchadnezzar II | Neo-Babylonian Empire | -605–-562 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:56` |
| `10a847a8-acf3-585a-b2bf-28ec72745e1a` | Cyrus the Great | Achaemenid Empire | -559–-530 | King of Kings | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:75` |
| `c06e5237-957c-5a3c-b9e2-3ae5daa24879` | Tomyris | Massagetae | -530–-529 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:36` |
| `dee419da-a75b-5624-8048-c4fbc422a056` | Confucius | State of Lu | -522–-479 | Philosopher, educator and political thinker | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:24` |
| `deb6241f-f3b0-50dc-a667-a3dc0ec2b9f9` | Darius I | Achaemenid Empire | -522–-486 | King of Kings | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:48` |
| `01af9900-a817-5c40-9109-cd521009dbfd` | Gorgo of Sparta | Sparta | -490–-480 | Queen and royal adviser | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:23` |
| `26871cea-7a7e-5714-9046-4127316219eb` | Xerxes I | Achaemenid Empire | -486–-465 | King of Kings | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:72` |
| `85896e61-c810-590e-bf3c-9240168d2953` | Pericles | Athens | -461–-429 | Strategos and statesman | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:20` |
| `11969191-7ede-5c61-b911-5290d3b95f29` | Gautama Buddha | Shakya Republic | -445–-400 | Religious leader and philosopher | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:32` |
| `164635b5-0930-5601-94d1-c9dd86bffa4d` | Brennus (Senones) | Senones | -390–-387 | Chieftain | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:34` |
| `984b9ae6-e4ac-5a82-ae8e-433aa147eff5` | Plato | Athens | -387–-348 | Philosopher and founder of the Academy | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:21` |
| `296fd94e-95dd-5454-8e78-1b876e8e14a8` | Chandragupta Maurya | Maurya Empire | -321–-297 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:104` |
| `814f1293-3566-5f7f-a699-acb6249d420e` | Brennus (Galatia) | Gallic Coalition | -280–-279 | Chieftain | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:71` |
| `7bb455fa-cdcb-5923-a096-fe298c3f26e4` | Ashoka | Maurya Empire | -268–-232 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:39` |
| `c174eb91-7803-53d8-ba27-22f057282215` | Modu Chanyu | Xiongnu Empire | -209–-174 | Chanyu | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:90` |
| `6494508c-aba1-5c84-b532-e8455fb84d8b` | Xiang Yu | Western Chu | -206–-202 | Hegemon-King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:119` |
| `5ad7ac77-48b4-5ede-afa5-8a1cedc33c16` | Ambiorix | Eburones | -54–-53 | King and war leader | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:35` |
| `d4215a28-4e72-57dd-b642-acbe6f556a05` | Augustus | Roman Empire | -27–14 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:54` |
| `1ddb1f26-e42d-56bb-9f7f-3617a4bbb159` | Livia Drusilla | Roman Empire | -27–29 | Empress and political advisor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:73` |
| `369264f5-dd79-5765-a52e-a035e3074ec3` | Amanitore | Kingdom of Kush | 1–20 | Kandake | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:95` |
| `ab0b9158-9395-5f02-b560-c12c5671b879` | Cunobeline | Catuvellauni | 9–40 | King | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:40` |
| `f4f5f19f-1800-5ca0-9e00-9ba812245a05` | Jesus | Roman Empire | 27–30 | Religious leader and preacher | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:31` |
| `5cdb9919-8b51-5ce9-8106-c164a00d7a8c` | Trajan | Roman Empire | 98–117 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:91` |
| `6c92fb98-4066-5e7b-a26f-2a83e8e1a1a6` | Himiko | Yamatai | 180–248 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE12_2026-08-11.md:27` |
| `4d543d48-a041-5f07-a900-560a50abaeee` | Shi Xie | Jiaozhou | 187–226 | Governor | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:84` |
| `9b371976-8c65-5ec2-85d6-23adc716254d` | Gongsun Du | Liaodong | 190–204 | Warlord | `POLITY_SEMANTIC_AUDIT_WAVE10_2026-08-11.md:52` |
| `7eefdc4d-8aec-5689-b4d8-6b1745240581` | Cao Cao | Cao Wei | 196–220 | Chancellor and de facto ruler | `POLITY_SEMANTIC_AUDIT_WAVE10_2026-08-11.md:55` |
| `df6cc626-135e-5abc-ae54-6dc1f64ac2aa` | Guan Yu | Shu Han | 211–220 | General and governor of Jing Province | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:37` |
| `f64072c1-a665-5e09-9581-ab5d8cf766a9` | Liu Bei | Shu Han | 211–223 | Founder, ruler and emperor | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:36` |
| `b16e2fb0-7515-5bd6-8aa0-0f921f55b63f` | Zhuge Liang | Shu Han | 211–234 | Strategist, chancellor and regent | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:38` |
| `50759a08-23d7-5f7d-a43a-d6fe06815130` | Emperor Wen of Wei | Cao Wei | 220–226 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:87` |
| `71cad27c-9baa-5b4b-a5f1-3e7450d3a67b` | Sun Quan | Eastern Wu | 229–252 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:81` |
| `b0e51c35-a02a-568a-969e-4e9207b2c787` | Theodora | Byzantine Empire | 527–548 | Empress | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:28` |
| `e8d423eb-3ea1-56a0-951c-72b182afda36` | K'inich Janaab' Pakal | Palenque | 615–683 | Ajaw | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:118` |
| `fc68a326-f59f-5780-a6f0-c5206d9ceba3` | Muhammad | Medinan Polity | 622–632 | Religious leader, statesman and military leader | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:33` |
| `55ea8fe5-ba27-5ce1-be9c-66f588e523ff` | Chan Imix Kʼawiil | Copán | 628–695 | Ajaw | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:25` |
| `636c6cbe-2ab0-5f0e-8532-31287aece721` | Abu Bakr | Rashidun Caliphate | 632–634 | Caliph | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:65` |
| `ef3dc559-5440-5f7e-a7cb-0f935c46f588` | Wak Chanil Ajaw | Naranjo | 682–741 | Ruler and dynastic founder | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:24` |
| `75a124e8-df55-5247-aa48-dc9d7934c10e` | Wu Zetian | Wu Zhou | 690–705 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:112` |
| `da809f25-40ff-5c27-b10b-88d4acc4070d` | Wu Zetian | Wu Zhou | 690–705 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:112` |
| `699c3829-bb8d-58d3-9f94-9ce71170490b` | Emperor Xuanzong of Tang | Tang Dynasty | 712–756 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:82` |
| `4987a639-e916-54e0-bd21-93d3d21e4d5a` | Charlemagne | Carolingian Empire | 768–814 | King and emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:50` |
| `fccc9f1f-0d1b-5f52-a0fa-f6e2ce1d950b` | Harun al-Rashid | Abbasid Caliphate | 786–809 | Caliph | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:55` |
| `b651ff3e-0df1-552a-9134-56ca95e9f3be` | Rurik | Kievan Rus' | 862–879 | Prince | `POLITY_SEMANTIC_AUDIT_WAVE12_2026-08-11.md:26` |
| `3d7aeb05-3aaa-5c24-8e32-e9fbef9115e8` | Kupe | Maori | 900–1200 | Navigator and ancestral figure | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:72` |
| `a093903c-5571-55f5-b84b-5f52f437cc5f` | Satuq Bughra Khan | Qarakhanid Khanate | 915–955 | Khan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:89` |
| `e8bd5f94-0feb-5945-aa37-7da2cf7da8dd` | Emperor Taizong of Liao | Liao Dynasty | 926–947 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:85` |
| `3f1570f2-a413-5bf8-90ad-3492cc5a3d62` | Gunnhild Konungamóðir | Kingdom of Norway | 930–970 | Queen consort and queen mother | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:37` |
| `9259d672-e727-5af4-80c0-a9921f6915c5` | Harald Bluetooth | Kingdom of Denmark | 958–986 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:66` |
| `0a920f69-1f5c-58ce-9990-c9fd1bf3adf3` | Basil II | Byzantine Empire | 976–1025 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:101` |
| `ec5313b1-e86a-53cf-9e69-c78a099f9dde` | Harald Hardrada | Kingdom of Norway | 1046–1066 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:53` |
| `bd35068f-fe1c-5617-9710-c20d3c00a0ed` | Robert Guiscard | Duchy of Apulia and Calabria | 1059–1085 | Duke | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:88` |
| `dc7e7412-0127-5455-9213-3fc230007a13` | Suryavarman II | Khmer Empire | 1113–1150 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:52` |
| `d2b71d0f-84ca-53b2-bf03-0d023ce1f820` | Emperor Taizong of Jin | Jin Dynasty | 1123–1135 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:84` |
| `73953cab-4df0-50e0-a8a7-7cd89c41fa44` | Emperor Dezong of Western Liao | Western Liao | 1124–1143 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:86` |
| `15f10025-af50-5889-a9a2-a60ac607ed94` | Frederick I Barbarossa | Holy Roman Empire | 1152–1190 | King and emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:61` |
| `0fa2820c-6457-5a48-b6ab-070f2e3b04ab` | Saladin | Ayyubid Sultanate | 1174–1193 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:33` |
| `67283a91-286f-5de9-87dd-7184af54358c` | Tamar of Georgia | Kingdom of Georgia | 1184–1213 | Monarch | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:99` |
| `9810a3c1-6b39-5235-9e23-d2289d939773` | Enrico Dandolo | Republic of Venice | 1192–1205 | Doge | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:51` |
| `bc0d3651-1f67-525e-a33b-7cbe7cf5f017` | Genghis Khan | Mongol Empire | 1206–1227 | Khagan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:116` |
| `bd86bc5b-e7d2-5e8e-bbcc-bfb077e27a0c` | Börte | Mongol Empire | 1206–1230 | Great Khatun | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:70` |
| `93d97cd0-35a4-5a10-b22b-1406af505890` | Jayavarman VII | Khmer Empire | 1181–1218 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:103` |
| `265b783f-9852-5093-8bef-7e8b379eb36e` | Sundiata Keita | Mali Empire | 1235–1255 | Mansa | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:102` |
| `0e2608b4-06f3-55eb-91f2-3317b66d458c` | Ramkhamhaeng | Sukhothai Kingdom | 1279–1298 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:68` |
| `155df8c4-f383-5efb-a665-2b198a4d38ab` | Mansa Musa | Mali Empire | 1312–1337 | Mansa | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:63` |
| `57ee154d-ecae-5568-82b2-f993110ac89e` | Gitarja | Majapahit Empire | 1328–1350 | Queen regnant | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:96` |
| `762297c8-0bf5-586a-a7a5-bdf4e93f7a24` | Casimir III the Great | Kingdom of Poland | 1333–1370 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:60` |
| `7b8f7575-5cd1-5e8e-975c-0d24aed3bc7c` | Gajah Mada | Majapahit Empire | 1331–1364 | Mahapatih | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:59` |
| `1a16cb76-0c1c-5cb6-b1fc-0ef9146b7b1e` | Jadwiga of Poland | Kingdom of Poland | 1384–1399 | King of Poland | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:94` |
| `f09e3cf4-9045-5bb4-884c-823f4e5bdcd0` | Sejong the Great | Joseon | 1418–1450 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:62` |
| `4263e4d0-a0a0-5803-a61b-85a57322db7e` | Sejong the Great | Joseon | 1418–1450 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:62` |
| `d1e0a5a6-31a1-5691-8d05-570dccdcad18` | Sejong the Great | Joseon | 1418–1450 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:62` |
| `947a57dd-e585-5009-9d1b-2836e165efc8` | Henry the Navigator | Kingdom of Portugal | 1415–1460 | Prince and patron of exploration | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:47` |
| `e3912f03-b9bd-580e-9183-fdd21093190e` | Joan of Arc | Kingdom of France | 1429–1431 | Military leader and national heroine | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:42` |
| `5ef35bfd-5ad4-534e-9b8e-5a06cb5ab0d3` | Zara Yaqob | Ethiopian Empire | 1434–1468 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:77` |
| `97c0ce18-8f33-5158-8b75-e99b518c76bc` | Pachacuti | Inca Empire | 1438–1471 | Sapa Inca | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:67` |
| `25ce2112-9b21-55dd-88d1-029153fc1a5a` | Mehmed II | Ottoman Empire | 1451–1481 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:??` |
| `b0d35acc-9705-5b80-96bb-02616df72bcc` | Mehmed II | Ottoman Empire | 1451–1481 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:??` |
| `02712d28-e28c-5d81-b80c-04d1f9511a59` | Matthias Corvinus | Kingdom of Hungary | 1458–1490 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:100` |
| `a47f314a-3b0a-5e2c-a188-a8aaf2ecc90d` | Leonardo da Vinci | Republic of Florence | 1472–1519 | Artist, engineer and polymath | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:36` |
| `0363cab7-0788-5f89-b009-cca0b5855d19` | Isabella I of Castile | Crown of Castile | 1474–1504 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:39` |
| `353086c5-76e7-5b9c-b7b8-3c4f39398841` | Shō Shin | Ryukyu Kingdom | 1477–1526 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:36` |
| `0c043901-2c20-5876-bdd2-de090bf32a1e` | João II of Portugal | Kingdom of Portugal | 1481–1495 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:78` |
| `166bc270-ee22-5218-af30-ac73b0e0c9ad` | Askia Muhammad | Songhai Empire | 1493–1528 | Askia and emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:40` |
| `e413afe4-7315-562b-8387-01c80a507d93` | Huayna Capac | Inca Empire | 1493–1527 | Sapa Inca | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:46` |
| `cf0e606a-7f93-5154-93b7-0b3b29a4650a` | Niccolo Machiavelli | Republic of Florence | 1498–1527 | Political philosopher, diplomat and statesman | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:26` |
| `3e8ba883-3e1a-550e-8901-bb9c54fdb5b2` | Afonso I of Kongo | Kingdom of Kongo | 1509–1543 | Manikongo | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:93` |
| `4a5a7fbd-0ede-528f-b4fe-66a7da894abd` | Henry VIII | Kingdom of England | 1509–1547 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:69` |
| `789bdf2e-5431-595c-a7a1-7f289b8cd4fd` | Sayyida al-Hurra | Tetouan | 1515–1542 | Queen and corsair leader | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:26` |
| `2dfeec71-7fe2-56d3-b17a-06bc964b1e53` | Charles V | Spanish Monarchy | 1516–1556 | King | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:35` |
| `16ebebde-e4e4-553d-a520-00da68a276d2` | Charles V | Holy Roman Empire | 1519–1556 | Holy Roman Emperor | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:36` |
| `d641eec9-2770-5099-8017-8ec3bcc9244e` | Charles V | Holy Roman Empire | 1519–1556 | Holy Roman Emperor | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:36` |
| `c8aaf090-cab4-50c8-8abb-b77baddffb30` | Suleiman I | Ottoman Empire | 1520–1566 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:76` |
| `886fe3c6-1488-515d-b54a-5a7a924dbeb9` | John III of Portugal | Kingdom of Portugal | 1521–1557 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:106` |
| `c0987b73-203c-5b49-9d84-8d96ce0e44e9` | Leftraru | Mapuche | 1541–1557 | Toqui | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:31` |
| `110c080c-b891-50a7-950c-1c80d3ef75b8` | Uesugi Kenshin | Uesugi Clan | 1548–1578 | Daimyo | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:65` |
| `1645ec77-4ae8-52e0-8555-27ef1a185caa` | Philip II of Spain | Spanish Monarchy | 1556–1598 | King | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:37` |
| `2b566bc6-600a-5a75-bf32-60fe3e558bcd` | Oda Nobunaga | Oda Clan | 1568–1582 | Daimyo and de facto national leader | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:64` |
| `4fe7a2d1-c4de-5451-b660-cf17d5475e4e` | William I of Orange | Dutch Revolt | 1568–1584 | Revolt leader and stadtholder | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:67` |
| `09cd83ff-2de6-5649-abca-c92c7cf68b06` | Idris Alooma | Kanem-Bornu Empire | 1571–1603 | Mai | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:109` |
| `eed067d9-43f3-52dc-9ecc-d5ed540fe65b` | Amina | Zazzau | 1576–1610 | Queen and military leader | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:27` |
| `f7c46f12-652b-5fce-9b1a-9944e88f9fa9` | Ahmad al-Mansur | Saadi Sultanate | 1578–1603 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:79` |
| `5ca5da06-ce59-519d-953a-421d17e6270c` | Philip II of Spain | Kingdom of Portugal | 1580–1598 | King | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:38` |
| `61bf1687-9815-5844-9f98-02a558470b51` | Toyotomi Hideyoshi | Toyotomi Regime | 1582–1598 | Military leader and Kampaku | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:63` |
| `daf85f20-db1f-50c2-aff1-86830290da8e` | Christina of Sweden | Swedish Empire | 1632–1654 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE12_2026-08-11.md:24` |
| `77f56b60-eeb3-5996-b262-3a725abb5d0f` | Louis XIV | Kingdom of France | 1643–1715 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:30` |
| `70e5d0b1-bac1-5bc9-a47d-b7a63ec41051` | Kangxi Emperor | Qing Dynasty | 1661–1722 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:110` |
| `d2f52f7d-66f9-5745-afff-96fb2c2ec259` | Nader Shah | Afsharid Iran | 1736–1747 | Shah | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:108` |
| `694d1057-2ab3-57b5-8c40-3a1e884e97b8` | Maria Theresa | Habsburg Monarchy | 1740–1780 | Archduchess of Austria and Queen of Hungary and Bohemia | `POLITY_SEMANTIC_AUDIT_WAVE3_2026-08-11.md:34` |
| `7b7dcdaf-9f40-5004-a479-ae457fa21790` | Gilbert du Motier, Marquis de Lafayette | Kingdom of France | 1777–1830 | Military officer and statesman | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:25` |
| `b651741c-c802-53a0-a15f-a7625bd7422f` | George Washington | United States | 1789–1797 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:41` |
| `c73146d6-0558-502f-8e81-11343e41f963` | Sacagawea | Lemhi Shoshone | 1804–1806 | Guide, interpreter and diplomat | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:32` |
| `5be7f060-46d1-58f9-ad7c-3b03458c198a` | Tecumseh | Tecumseh's Confederacy | 1805–1813 | Confederacy leader and military commander | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:38` |
| `f8108b3a-2f67-526f-b996-30d8b8e91f7d` | Said bin Sultan | Omani Empire | 1806–1856 | Sultan | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:83` |
| `0720fd23-154c-5570-8d8a-78a45c2957c1` | Ada Lovelace | United Kingdom | 1833–1852 | Mathematician and writer | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:27` |
| `40f6349e-2028-5ca8-bb7d-e2ef73715190` | Victoria | United Kingdom | 1837–1901 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:45` |
| `ae9b7ba9-4c62-508b-b019-2ded901413bc` | Pedro II of Brazil | Empire of Brazil | 1840–1889 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:57` |
| `7981dd26-4200-57d9-b4d4-bbd97f13e28f` | Harriet Tubman | United States | 1849–1913 | Abolitionist, humanitarian and Union scout | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:29` |
| `b37993f9-df6c-52a6-b27a-ad931e3aa99e` | Lakshmibai | Jhansi | 1853–1858 | Queen and military leader | `POLITY_SEMANTIC_AUDIT_WAVE9_2026-08-11.md:28` |
| `592aa8f9-4eb4-527c-a72d-a78ee7769daf` | Pocatello | Northwestern Shoshone | 1854–1884 | Chief | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:33` |
| `7030fde2-e2da-5f2e-a3d2-62e5314a6fe3` | Abraham Lincoln | United States | 1861–1865 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:117` |
| `49a58fd7-6c0d-5014-8d44-ef54b7b89256` | Ludwig II of Bavaria | Kingdom of Bavaria | 1864–1886 | King | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:107` |
| `8a9e8177-ff70-59f6-bcc1-f0ff89eb111a` | Enomoto Takeaki | Republic of Ezo | 1868–1869 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:35` |
| `b4a6b048-9465-539a-bc4b-ec50a057b594` | Sitting Bull | Lakota | 1868–1890 | Chief and spiritual leader | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:29` |
| `062c9186-2981-5745-9b60-ae733a2fc86d` | Poundmaker | Cree | 1873–1885 | Chief | `POLITY_SEMANTIC_AUDIT_WAVE2_2026-08-11.md:30` |
| `ca30481f-9e6a-5482-bf88-5b7b594f2f55` | Jose Rizal | Captaincy General of the Philippines | 1882–1896 | Nationalist, writer and reformist | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:30` |
| `1462e53a-3cb8-5a3f-bbea-62b9f44d35e2` | Menelik II | Ethiopian Empire | 1889–1913 | Emperor | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:105` |
| `e36505b4-8fdc-5f00-a90b-c4d449eb14d9` | Wilhelmina of the Netherlands | Kingdom of the Netherlands | 1890–1948 | Queen | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:97` |
| `9c2f5501-fbef-5140-8666-78e6766970a2` | Theodore Roosevelt | United States | 1901–1909 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:92` |
| `aa3dee6c-2a11-5e98-ba2b-1b256844c7dc` | Sophia Duleep Singh | United Kingdom | 1907–1948 | Suffragette and social activist | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:34` |
| `cd5e1162-79c9-562e-8d4c-2a70d1897f5e` | Eleanor Roosevelt | United States | 1933–1962 | Diplomat and human rights leader | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:71` |
| `6402856d-f82b-5a26-b8ae-bd73ac4f82b7` | Franklin D. Roosevelt | United States | 1933–1945 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:64` |
| `e985fb0b-c594-5e10-905c-179efd34da71` | Winston Churchill | United Kingdom | 1940–1945 | Prime Minister | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:74` |
| `e81225b6-2c9b-52ea-a39b-9cd622067a61` | Subhas Chandra Bose | Provisional Government of Free India | 1943–1945 | Head of State and Supreme Commander | `POLITY_SEMANTIC_AUDIT_WAVE11_2026-08-11.md:35` |
| `161b1b02-2e61-5a00-b9cc-ab13ad566f29` | Kim Il Sung | North Korea | 1948–1994 | Premier and President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:31` |
| `4ac4c38c-6d8b-55ce-b999-b0639e67eb22` | Charles de Gaulle | French Fifth Republic | 1959–1969 | President | `POLITY_SEMANTIC_AUDIT_2026-08-11.md:66` |
| `01f5e054-3e61-5b90-8ddc-53cd1e00ab27` | Park Chung Hee | South Korea | 1963–1979 | President | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:34` |
| `acd18f4e-e74d-568a-b024-5ebbfc51fa3d` | Indira Gandhi | India | 1966–1977 | Prime Minister | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:43` |
| `97cc4fc9-9714-5373-97de-e8b4428be58b` | Indira Gandhi | India | 1980–1984 | Prime Minister | `POLITY_SEMANTIC_AUDIT_WAVE8_2026-08-11.md:44` |

## Exclusion rule

Rows that matched only Person/Polity/period but had a changed Role were deliberately excluded. Role enrichment may be harmless, but it can also change relation semantics; they must be reviewed explicitly rather than inherited automatically.

No Production mutation is authorized by this document.
