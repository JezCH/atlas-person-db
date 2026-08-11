# ATLAS Polity Semantic Audit — Wave 8

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: rule-based closure of low-risk Person × Polity rows from the frozen 2026-08-05 snapshot.
>
> This wave closes **Polity semantics only**. It does not certify every biography/date/office chronology. Rows whose political entity is clear can be marked `KEEP` even if a later chronology or relation-type audit may refine the Activity.

## 1. Closure rule

A row is eligible here only when the current Polity is a historically recognizable territorial political authority/jurisdiction and there is no already-known reason that the Activity is attached to a government name, clan, event, ethnicity-only label, or clearly wrong political context.

`relation_hint` is provisional:
- `rules` — ruler/head of government/state in the broad ATLAS map sense;
- `serves` — office/military/diplomatic service to the Polity;
- `relation_review` — Polity is valid, but the exact Person–Polity relation needs a richer taxonomy or chronology review.

Important:
- `KEEP` here does **not** authorize a Polity UUID merge/delete.
- Late Roman/Byzantine and Russia naming-continuity decisions remain governed by Wave 5.
- This wave does not erase temporal-name/state-form research.
- Production remains untouched.

## 2. Rule-based closed rows

| Activity UUID | Person | Current Polity | Period | Role | Decision | relation_hint |
|---|---|---|---:|---|---|---|
| `4b8b5be2-bae2-4c81-b8bc-4d5614fd62db` | Theodora | Byzantine Empire | 527–548 | Empress | `KEEP` | `relation review` |
| `03036160-150a-4cbb-8ce9-76d7ad486da1` | Catherine II | Russian Empire | 1762–1796 | Empress of Russia | `KEEP` | `rules` |
| `1bbb30e3-52d7-4e1b-8da6-ae288f208b98` | Louis XIV | Kingdom of France | 1643–1715 | King | `KEEP` | `rules` |
| `927bf16e-2d77-4110-a352-8ef301a203b6` | Kim Il Sung | North Korea | 1948–1994 | Premier and President | `KEEP` | `rules` |
| `811445b5-a52b-4579-b40f-1d3cb44b45e1` | Jia Sidao | Southern Song | 1260–1275 | Grand Chancellor and chief minister | `KEEP` | `serves` |
| `373a3b1c-7b9b-4d37-9fde-b305e0dfcae6` | Saladin | Ayyubid Sultanate | 1174–1193 | Sultan | `KEEP` | `rules` |
| `eeb84d16-f8c9-44c1-9316-df0f764bb55a` | Park Chung Hee | South Korea | 1963–1979 | President | `KEEP` | `rules` |
| `0a979da3-5d2d-41a3-b71b-e2cc4c8a0085` | Enomoto Takeaki | Republic of Ezo | 1868–1869 | President | `KEEP` | `rules` |
| `c774bf94-aff1-4740-b635-98458f9792df` | Shō Shin | Ryukyu Kingdom | 1477–1526 | King | `KEEP` | `rules` |
| `66ca18d9-d97d-4fda-8de2-c099a7e569ba` | Gunnhild Konungamóðir | Kingdom of Norway | 930–970 | Queen consort and queen mother | `KEEP` | `relation review` |
| `35a9ae2c-e7bb-4dc5-8080-626c2751cc6e` | Osman I | Ottoman Empire | 1299–1324 | Founder and ruler | `KEEP` | `rules` |
| `29bfca79-b668-4a06-b3a6-b66c9771a0a8` | Ashoka | Maurya Empire | -268–-232 | Emperor | `KEEP` | `rules` |
| `a0de373a-4dd2-475e-81e6-389f72d949b4` | Askia Muhammad | Songhai Empire | 1493–1528 | Askia and emperor | `KEEP` | `rules` |
| `76e1b17c-d76b-4a96-9fe2-9adea2e93421` | George Washington | United States | 1789–1797 | President | `KEEP` | `rules` |
| `4bb3e6a1-a0f5-40e1-a369-a85a571808d8` | Joan of Arc | Kingdom of France | 1429–1431 | Military leader and national heroine | `KEEP` | `serves` |
| `3c3755aa-8936-45b5-9602-97636e714809` | Indira Gandhi | India | 1966–1977 | Prime Minister | `KEEP` | `rules` |
| `11e85836-1570-4283-9e18-979c1e183ec7` | Indira Gandhi | India | 1980–1984 | Prime Minister | `KEEP` | `rules` |
| `9f8b5b22-34bf-424d-97c7-66fa3c8092aa` | Victoria | United Kingdom | 1837–1901 | Queen | `KEEP` | `relation review` |
| `1cd64865-5611-4a8a-88ff-9a8c8226177b` | Huayna Capac | Inca Empire | 1493–1527 | Sapa Inca | `KEEP` | `rules` |
| `2ee76cfd-23db-4ea8-90f6-f7347e0d921c` | Henry the Navigator | Kingdom of Portugal | 1415–1460 | Prince and patron of exploration | `KEEP` | `serves` |
| `78976599-a4ca-4a80-9c77-0b02a8ee5779` | Darius I | Achaemenid Empire | -522–-486 | King of Kings | `KEEP` | `rules` |
| `68db75a1-78b5-436d-b14d-515d94a47518` | Mursili I | Hittite Kingdom | -1620–-1590 | Great King | `KEEP` | `rules` |
| `3101b81a-547b-4638-bbe8-b84efd72a208` | Charlemagne | Carolingian Empire | 768–814 | King and emperor | `KEEP` | `rules` |
| `8297fe62-165d-4b94-b166-71c22856f618` | Enrico Dandolo | Republic of Venice | 1192–1205 | Doge | `KEEP` | `rules` |
| `8b68f906-5cb4-42ee-8365-4dd32d489cdd` | Suryavarman II | Khmer Empire | 1113–1150 | King | `KEEP` | `rules` |
| `766d6249-d6f4-435c-9937-b201952fb744` | Harald Hardrada | Kingdom of Norway | 1046–1066 | King | `KEEP` | `rules` |
| `fd9a16ef-4729-461d-ae08-361fac65a9f9` | Augustus | Roman Empire | -27–14 | Emperor | `KEEP` | `rules` |
| `b151ebe1-670e-4a58-9c79-5087ce77ef60` | Harun al-Rashid | Abbasid Caliphate | 786–809 | Caliph | `KEEP` | `rules` |
| `2e185fb5-2ce6-409a-bb93-d15b97c71f6a` | Nebuchadnezzar II | Neo-Babylonian Empire | -605–-562 | King | `KEEP` | `rules` |
| `120c923b-2ed8-45ee-bb48-d63976d43d14` | Pedro II of Brazil | Empire of Brazil | 1840–1889 | Emperor | `KEEP` | `rules` |
| `0c38ce0e-8dd8-40e5-892a-5d64ef575bb1` | Ashurbanipal | Neo-Assyrian Empire | -669–-631 | King | `KEEP` | `rules` |
| `4ab5bc05-c04a-460c-8771-ea7178160f89` | Gajah Mada | Majapahit Empire | 1331–1364 | Mahapatih | `KEEP` | `serves` |
| `a5de093f-5de6-47bc-8c09-0ab0af5f4ab8` | Casimir III the Great | Kingdom of Poland | 1333–1370 | King | `KEEP` | `rules` |
| `ec5e2149-a2d0-4f42-9ba4-57c73666eeba` | Frederick I Barbarossa | Holy Roman Empire | 1152–1190 | King and emperor | `KEEP` | `rules` |
| `d1ab7096-0067-493c-b1a5-fcedbc98499c` | Sejong the Great | Joseon | 1418–1450 | King | `KEEP` | `rules` |
| `3841e8e5-6217-4f85-b64a-82cfec831170` | Mansa Musa | Mali Empire | 1312–1337 | Mansa | `KEEP` | `rules` |
| `e0ce9dae-4c01-4a83-8f7c-78db6c02c025` | Franklin D. Roosevelt | United States | 1933–1945 | President | `KEEP` | `rules` |
| `6b94734a-806e-4332-bf90-4c4b5019b866` | Abu Bakr | Rashidun Caliphate | 632–634 | Caliph | `KEEP` | `rules` |
| `5fad9660-5da3-41f3-ad7c-11db4dc869dd` | Harald Bluetooth | Kingdom of Denmark | 958–986 | King | `KEEP` | `rules` |
| `dfc6c833-8ffd-44cb-91e1-ec0cb0b427c0` | Pachacuti | Inca Empire | 1438–1471 | Sapa Inca | `KEEP` | `rules` |
| `2c7dc5d3-4173-4729-8141-62958dddee1a` | Ramkhamhaeng | Sukhothai Kingdom | 1279–1298 | King | `KEEP` | `rules` |
| `d23b2e9f-06b6-43c6-b835-fc35c56ed4c0` | Henry VIII | Kingdom of England | 1509–1547 | King | `KEEP` | `rules` |
| `5dee10d8-31c4-4e64-9795-4449bb4d435c` | Börte | Mongol Empire | 1206–1230 | Great Khatun | `KEEP` | `relation review` |
| `5265a0c4-e026-4156-a044-5ddb53831111` | Eleanor Roosevelt | United States | 1933–1962 | Diplomat and human rights leader | `KEEP` | `serves/active_in review` |
| `1dd38335-b4b7-4817-810d-25079ba43bfc` | Xerxes I | Achaemenid Empire | -486–-465 | King of Kings | `KEEP` | `rules` |
| `79666b12-4059-488c-8a50-463460f77ab3` | Livia Drusilla | Roman Empire | -27–29 | Empress and political advisor | `KEEP` | `relation review` |
| `2e98687b-c843-4308-83ec-7656d3ed1b8f` | Winston Churchill | United Kingdom | 1940–1945 | Prime Minister | `KEEP` | `rules` |
| `cd0c7a24-f49a-44e9-9854-0bdbed954a28` | Cyrus the Great | Achaemenid Empire | -559–-530 | King of Kings | `KEEP` | `rules` |
| `4ef032a5-eae1-4788-8242-8181c705e28f` | Suleiman I | Ottoman Empire | 1520–1566 | Sultan | `KEEP` | `rules` |
| `be8185a4-e4c1-41da-ac2e-7ee70871d2d3` | Zara Yaqob | Ethiopian Empire | 1434–1468 | Emperor | `KEEP` | `rules` |
| `9c732470-6cb5-4f31-976a-8498f33445b7` | João II of Portugal | Kingdom of Portugal | 1481–1495 | King | `KEEP` | `rules` |
| `c28330f2-71af-4f55-9e6b-c60077ce3402` | Ahmad al-Mansur | Saadi Sultanate | 1578–1603 | Sultan | `KEEP` | `rules` |
| `5ff3d6c9-29af-4a24-b0da-07f1d7594d4b` | Constantine XI Palaiologos | Byzantine Empire | 1449–1453 | Emperor | `KEEP` | `rules` |
| `48c639d9-be2f-4a45-8870-a3476ba6d0e7` | Sun Quan | Eastern Wu | 229–252 | Emperor | `KEEP` | `rules` |
| `5ed57465-7ff2-4180-bab1-c58874eb6c75` | Emperor Xuanzong of Tang | Tang Dynasty | 712–756 | Emperor | `KEEP` | `rules` |
| `afb7e33a-2ae0-41e3-90cd-51dbf7bce466` | Said bin Sultan | Omani Empire | 1806–1856 | Sultan | `KEEP` | `rules` |
| `d08639a3-bf46-4493-9f8f-fc49f2bae361` | Emperor Taizong of Jin | Jin Dynasty | 1123–1135 | Emperor | `KEEP` | `rules` |
| `9fc0ff27-8308-43b2-a7e0-88b2e1635d32` | Emperor Taizong of Liao | Liao Dynasty | 926–947 | Emperor | `KEEP` | `rules` |
| `e7c0171f-dd66-42c8-a001-c578048fad55` | Emperor Dezong of Western Liao | Western Liao | 1124–1143 | Emperor | `KEEP` | `rules` |
| `8435b083-1d07-4059-b11b-a83c5fc35102` | Emperor Wen of Wei | Cao Wei | 220–226 | Emperor | `KEEP` | `rules` |
| `c7422b4b-82be-4d08-87d5-40e6352711d7` | Robert Guiscard | Duchy of Apulia and Calabria | 1059–1085 | Duke | `KEEP` | `rules` |
| `8b6669da-8367-4215-ae3f-f4a5b0a86dc6` | Satuq Bughra Khan | Qarakhanid Khanate | 915–955 | Khan | `KEEP` | `rules` |
| `81231d97-dcc3-432d-855c-046fe55fc661` | Modu Chanyu | Xiongnu Empire | -209–-174 | Chanyu | `KEEP` | `rules` |
| `99cdefe4-354d-483b-840a-ce2298eff590` | Trajan | Roman Empire | 98–117 | Emperor | `KEEP` | `rules` |
| `39b41f22-2712-4f66-8352-c02a0dd700ee` | Theodore Roosevelt | United States | 1901–1909 | President | `KEEP` | `rules` |
| `5f1c29d4-430d-41d0-9663-e731f56e3efc` | Afonso I of Kongo | Kingdom of Kongo | 1509–1543 | Manikongo | `KEEP` | `rules` |
| `0810aebb-6195-4d0c-bace-c82d68b175d2` | Jadwiga of Poland | Kingdom of Poland | 1384–1399 | King of Poland | `KEEP` | `rules` |
| `05a84648-e92d-4909-9f48-ed095b6b69d3` | Amanitore | Kingdom of Kush | 1–20 | Kandake | `KEEP` | `rules` |
| `43bf9c37-09ee-43f0-919f-df89b83ad6ef` | Gitarja | Majapahit Empire | 1328–1350 | Queen regnant | `KEEP` | `rules` |
| `4aabe45b-f7a2-4065-9602-028833a0387d` | Wilhelmina of the Netherlands | Kingdom of the Netherlands | 1890–1948 | Queen | `KEEP` | `relation review` |
| `bbbda339-a068-47a0-9412-d5d7b75cea78` | Robert the Bruce | Kingdom of Scotland | 1306–1329 | King | `KEEP` | `rules` |
| `f5906ae5-6e73-4a36-b01b-48883558d962` | Tamar of Georgia | Kingdom of Georgia | 1184–1213 | Monarch | `KEEP` | `rules` |
| `ca7627ca-cc2a-41a6-ac58-1fcc98ff26eb` | Matthias Corvinus | Kingdom of Hungary | 1458–1490 | King | `KEEP` | `rules` |
| `21066d04-e910-47ae-859b-2abed0673f09` | Basil II | Byzantine Empire | 976–1025 | Emperor | `KEEP` | `rules` |
| `d262d0d5-b2f4-4f6d-b07e-c45b29d64f65` | Sundiata Keita | Mali Empire | 1235–1255 | Mansa | `KEEP` | `rules` |
| `11c39927-213b-4393-8c25-1ca58423458e` | Jayavarman VII | Khmer Empire | 1181–1218 | King | `KEEP` | `rules` |
| `8d707b32-5877-46e1-afd0-4cb412a4ae44` | Chandragupta Maurya | Maurya Empire | -321–-297 | Emperor | `KEEP` | `rules` |
| `7f1bf48b-463f-400d-9573-c08f4e1bba11` | Menelik II | Ethiopian Empire | 1889–1913 | Emperor | `KEEP` | `rules` |
| `3a9c32ef-428d-4797-ba50-af402c095822` | John III of Portugal | Kingdom of Portugal | 1521–1557 | King | `KEEP` | `rules` |
| `443e0f77-ab21-4d20-92db-ea7ae85f2009` | Ludwig II of Bavaria | Kingdom of Bavaria | 1864–1886 | King | `KEEP` | `rules` |
| `24ab17da-5e48-4f3a-81de-037f491ff1f6` | Nader Shah | Afsharid Iran | 1736–1747 | Shah | `KEEP` | `rules` |
| `1b832fad-39ad-4369-bb1b-08fbf0a6a176` | Idris Alooma | Kanem-Bornu Empire | 1571–1603 | Mai | `KEEP` | `rules` |
| `23b36306-9374-417e-bd0e-c53d87f08961` | Kangxi Emperor | Qing Dynasty | 1661–1722 | Emperor | `KEEP` | `rules` |
| `633cf899-9ff6-4cdc-b79c-510e2f0c5f94` | Shaka kaSenzangakhona | Zulu Kingdom | 1816–1828 | King | `KEEP` | `rules` |
| `fe6bc9fa-6368-4631-8ad0-6a22958cdcff` | Wu Zetian | Wu Zhou | 690–705 | Emperor | `KEEP` | `rules` |
| `b919920b-3a18-4a39-8076-91f8f5fd4be5` | Mao Zedong | People's Republic of China | 1949–1976 | Chairman | `KEEP` | `rules` |
| `14e5bf35-ebf9-43ef-b53d-8f8e708dac2e` | Julius Caesar | Roman Republic | -49–-44 | Dictator / political leader | `KEEP` | `rules` |
| `2d283d31-a045-45a5-9425-552bd8c48a6f` | Alexander the Great | Macedonian Empire | -336–-323 | King | `KEEP` | `rules` |
| `59fefde1-45e8-45c4-a3be-ac1fe2255a84` | Genghis Khan | Mongol Empire | 1206–1227 | Khagan | `KEEP` | `rules` |
| `24816c9a-5670-455f-9be1-01cdc4a8ec6e` | Abraham Lincoln | United States | 1861–1865 | President | `KEEP` | `rules` |
| `074ca13f-67ce-47aa-9f16-579d842ee3c5` | K'inich Janaab' Pakal | Palenque | 615–683 | Ajaw | `KEEP` | `rules` |
| `7a8c5533-7386-444f-b412-e71c3366546d` | Xiang Yu | Western Chu | -206–-202 | Hegemon-King | `KEEP` | `rules` |
| `92052ba0-bda8-49b7-81c5-89b7402864bc` | Duke Huan of Qi | Qi | -685–-643 | Duke | `KEEP` | `rules` |
| `ac123d2c-8149-462c-961b-d126b4bdfbc8` | Duke Xiang of Song | Song | -650–-637 | Duke | `KEEP` | `rules` |
| `0c65e1a8-f602-48fb-bd08-ea0fa0148bb6` | Duke Wen of Jin | Jin | -636–-628 | Duke | `KEEP` | `rules` |
| `7bb18842-c879-44d9-a518-dcd3b07222b8` | Duke Mu of Qin | Qin | -659–-621 | Duke | `KEEP` | `rules` |

## 3. Result

- rows closed by this Wave: **96**
- previously individually reviewed unique UUIDs: **71**
- new covered total if this Wave is accepted: **167 / 309 = 54.05%**
- frozen rows still not covered after this Wave: **142**

This is deliberately a **rule-based semantic closure**, not 96 separate full-biography essays. The high-risk categories were researched first in Waves 1–7; this Wave uses those calibrated rules to close obvious political-entity rows efficiently.

## 4. Rows deliberately excluded from this Wave despite appearing nearby in the source snapshot

These require separate review rather than bulk KEEP:

- `Liu Bei -> Shu Han, 211–223` — the Activity begins before Shu Han was formally established; political-context chronology needs reconstruction.
- `Guan Yu -> Shu Han, 211–220` — Guan Yu died before the Shu Han imperial state was founded; current Polity/date pairing is anachronistic as written.
- `Yuan Shu -> Zhong Dynasty, 197–199` — short-lived rebel/claimant state should be handled with the transitional-authority rules rather than low-risk bulk closure.
- `Hammurabi -> Old Babylonian Empire` — the political authority is real, but the exact Polity identity/name (`Old Babylonian` as historiographic period/state label) deserves a continuity/naming check before final closure.
- `Sun Yat-sen -> Republic of China, 1912–1925` — Polity is valid, but one continuous Activity through 1925 conflates distinct offices/revolutionary phases.
- `Hatshepsut -> Egyptian New Kingdom` — `New Kingdom` is a historiographic period label; identity/name modelling should be reviewed before final Polity closure.
- `Christina of Sweden -> Swedish Empire` — `Swedish Empire` is a historiographic great-power-period label and may be a temporal name/state-form of Sweden rather than a distinct Polity identity.
- `Himiko -> Yamatai` — valid candidate polity, but location/nature/historicity issues warrant research.
- `Wak Chanil Ajaw -> Naranjo`, `Chan Imix K'awiil -> Copán`, `Pericles -> Athens`, `Gorgo -> Sparta` — likely valid city-polity cases, reserved for the dedicated city-polity pass so the same rule is applied consistently.

## 5. Next

The next pass should focus on:
1. city-state / city-kingdom / regional-domain labels;
2. late-Han warlord activities whose current `Later Han` attachment may mean `serves`, de facto regional rule, or merely legal allegiance;
3. non-ruler chronology/relation rows;
4. historiographic-period labels (`New Kingdom`, `Swedish Empire`, etc.).

No Production mutation is authorized by this document.
