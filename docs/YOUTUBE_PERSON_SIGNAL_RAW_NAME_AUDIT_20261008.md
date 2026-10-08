# YouTube Person Signal — Raw Name Quality Audit (2026-10-08)

## Scope and authority

This is a **read-only first-pass audit** of the latest Production `atlas_v2.youtube_person_signals` global reconciled snapshot `yt-20261008T114347Z-6011ch-rebuild-v2` (6,011 successful channels, 1,536,512 video titles). All **6,445** stored signals were enumerated by rank and checked once. **A stored string is a raw-title signal, not a verified distinct Person.** No canonical Person rows, queue candidates, original titles, or rankings were changed by this audit.

## Coverage and priority

| Machine-generated review lane | Count | Policy |
| --- | ---: | --- |
| All raw name rows inspected | 6445 | Unverified identities |
| Clear non-human/non-person strings found via hand-curated exact-label checklist | 208 | **Proposed reject**, confirm by evidence; do not remove raw source |
| Punctuation/spacing/diacritic-approximate collision groups | 47 groups, 97 raw rows | Mixed persons and non-persons; compare entity before merge |
| Name + trailing Biography/Documentary/History/Bio with base raw label also present | 78 pairs | Candidate title-noise removal, raw title preserved |
| Basic English capitalized one-word raw labels | 1568 | **Not rejected**; legitimate mononyms/surnames exist |
| Manually shortlisted alternate-name groups | 19 groups | Mix of clear synonyms and unsafe ambiguous shorthand |

**Counts overlap** across lanes and must not be summed. The exact-label checklist is a sample of identified errors, not the entire false-positive population. The simple Latin-only normalization can create collisions for non-Latin or accented names; never use its keys as Person IDs.

## High priority: non-person rows (reviewed exact-label checklist)

These are currently being **counted as people**, but the expressions plainly refer to topics, locations, media metadata, works, events, groups, or fictional entities. A strict Person dashboard should not rank them as historical individuals. `King Arthur`, `Sherlock Holmes`, `Prometheus`, and `Jane Eyre` require *fictional/legendary* routing rather than being silently treated as historical people.

| Current rank | Raw label | Channels |
| ---: | --- | ---: |
| 23 | Exclusive | 46 |
| 43 | Exposed | 38 |
| 65 | Rome | 32 |
| 70 | Interview | 31 |
| 76 | Covid-19 | 30 |
| 84 | Shocking | 28 |
| 86 | Climate Change | 28 |
| 89 | Book Launch | 27 |
| 90 | Part 3 | 27 |
| 93 | Pearl Harbor | 27 |
| 94 | Atlantis | 27 |
| 102 | Update | 26 |
| 106 | The Odyssey | 26 |
| 117 | Titanic | 25 |
| 127 | Webinar | 24 |
| 128 | Vikings | 24 |
| 134 | King Arthur | 24 |
| 135 | The Great Wall of China | 24 |
| 136 | Book Review | 23 |
| 139 | Panel discussion | 23 |
| 143 | The Untold Story | 23 |
| 144 | Sherlock Holmes | 22 |
| 155 | Warning | 21 |
| 161 | Q&A | 20 |
| 162 | Debate | 20 |
| 163 | Coronavirus | 20 |
| 164 | Book Talk | 20 |
| 165 | Introduction | 20 |
| 166 | Mesopotamia | 20 |
| 168 | Revealed | 20 |
| 169 | Göbekli Tepe | 20 |
| 173 | Dracula | 20 |
| 183 | Podcast | 19 |
| 186 | The Fall of Constantinople | 19 |
| 188 | Artificial Intelligence | 19 |
| 194 | Panel | 18 |
| 195 | Gaza | 18 |
| 199 | The Knights Templar | 18 |
| 202 | Carthage | 18 |
| 203 | Chernobyl | 18 |
| 208 | Bonus | 17 |
| 209 | In Conversation | 17 |
| 211 | Introducing | 17 |
| 221 | In Memoriam | 17 |
| 229 | Cape Verde | 17 |
| 236 | The Renaissance | 17 |
| 237 | Live | 16 |
| 238 | Sneak Peek | 16 |
| 239 | Watch | 16 |
| 240 | Stonehenge | 16 |
| 241 | Coming soon | 16 |
| 243 | Patagonia | 16 |
| 244 | Title | 16 |
| 245 | The Book of Enoch | 16 |
| 246 | The Vikings | 16 |
| 251 | Palestine | 16 |
| 257 | New | 15 |
| 259 | Announcement | 15 |
| 260 | Day 1 | 15 |
| 262 | Tasmania | 15 |
| 263 | Day 2 | 15 |
| 265 | The Strait of Hormuz | 15 |
| 267 | Stalingrad | 15 |
| 268 | The Philippines | 15 |
| 273 | Petra | 15 |
| 290 | Lecture | 14 |
| 291 | Reflections | 14 |
| 293 | The Berlin Wall | 14 |
| 294 | Europe | 14 |
| 300 | Day 3 | 14 |
| 301 | Halloween | 14 |
| 303 | Babylon | 14 |
| 307 | POV | 14 |
| 309 | Hawaii | 14 |
| 317 | the Silk Road | 14 |
| 323 | Jerusalem | 14 |
| 338 | Artist Talk | 13 |
| 339 | Report | 13 |
| 340 | Highlights | 13 |
| 341 | Urgent | 13 |
| 342 | Dune | 13 |
| 345 | Nato | 13 |
| 346 | Korea | 13 |
| 351 | Bitcoin | 13 |
| 353 | India vs Pakistan | 13 |
| 354 | Dinosaurs | 13 |
| 356 | Islam | 13 |
| 358 | Water | 13 |
| 361 | Journey Through Time | 13 |
| 365 | Venice | 13 |
| 372 | Mission | 13 |
| 374 | Alaska | 13 |
| 378 | Hiroshima | 13 |
| 380 | Juneteenth | 13 |
| 383 | Siberia | 13 |
| 384 | The Cuban Missile Crisis | 13 |
| 387 | Chapter 1 | 12 |
| 388 | Vlog | 12 |
| 389 | Review | 12 |
| 390 | Freedom | 12 |
| 392 | Full Video | 12 |
| 394 | Chapter 2 | 12 |
| 395 | Chapter 4 | 12 |
| 398 | The Great Depression | 12 |
| 403 | The Salem Witch Trials | 12 |
| 404 | Apollo 11 | 12 |
| 405 | Brexit | 12 |
| 408 | Part 4 | 12 |
| 413 | The Bronze Age Collapse | 12 |
| 417 | Iran vs Israel | 12 |
| 431 | Easter Island | 12 |
| 445 | Genesis | 11 |
| 446 | Jane Eyre | 11 |
| 450 | Homecoming | 11 |
| 465 | Part 5 | 11 |
| 488 | The Shocking Truth | 11 |
| 500 | SHOCKING Truth | 11 |
| 507 | The Lost City of Atlantis | 11 |
| 508 | The Viking Age | 11 |
| 513 | Exclusive interview | 10 |
| 534 | The Fall of Rome | 10 |
| 584 | The Great Escape | 10 |
| 621 | SHOCKING Revelation | 10 |
| 626 | The Great Game | 10 |
| 687 | Hadrian's Wall | 9 |
| 698 | The Great Fire of London | 9 |
| 699 | The Great Flood | 9 |
| 757 | The Great Migration | 9 |
| 791 | Israel-Palestine | 8 |
| 926 | The Titanic | 8 |
| 987 | Part 6 | 7 |
| 1000 | Channel update | 7 |
| 1085 | Valentine's Day | 7 |
| 1193 | Shocking Revelations | 7 |
| 1255 | Story time | 6 |
| 1270 | Timelapse | 6 |
| 1320 | Shocking Discovery | 6 |
| 1367 | Prometheus | 6 |
| 1537 | Pandemics | 6 |
| 1573 | The Great Awakening | 6 |
| 1574 | The Great Train Robbery | 6 |
| 1614 | Author Interview | 5 |
| 1694 | Attack On Pearl Harbor | 5 |
| 1992 | Hadrian’s Wall | 5 |
| 2022 | Israel & Palestine | 5 |
| 2176 | The Great Famine | 5 |
| 2177 | The Great Gatsby | 5 |
| 2178 | The Great Pyramid of Giza | 5 |
| 2237 | Viruses | 5 |
| 2278 | Learn English Through Story | 4 |
| 2280 | Part 1/2 | 4 |
| 2281 | Part 2/2 | 4 |
| 2358 | Olympics | 4 |
| 2533 | Latest Update | 4 |
| 2617 | Time-Lapse | 4 |
| 2768 | Covid | 4 |
| 2769 | Covid 19 | 4 |
| 2901 | Havana Syndrome | 4 |
| 3115 | Noah's Ark | 4 |
| 3120 | Notre Dame | 4 |
| 3125 | Odyssey | 4 |
| 3149 | Part 7 | 4 |
| 3286 | Spiritual Warfare | 4 |
| 3336 | The Founding of Rome | 4 |
| 3340 | The Great Betrayal | 4 |
| 3341 | The GREAT debate | 4 |
| 3342 | The Great Fire of London 1666 | 4 |
| 3343 | The Great Molasses Flood | 4 |
| 3429 | UPDATED | 4 |
| 3445 | Virus | 4 |
| 3483 | Zika Virus | 4 |
| 3670 | Time Lapse | 3 |
| 3713 | Homeland | 3 |
| 3752 | Storytime | 3 |
| 3835 | COVID-19 Vaccine | 3 |
| 4040 | Rise of Rome | 3 |
| 4178 | A Day in Ancient Rome | 3 |
| 4360 | Before the Vikings | 3 |
| 4576 | Corona Virus | 3 |
| 4645 | Desert Warfare | 3 |
| 4755 | Exclusive Clip | 3 |
| 4965 | Home/Land | 3 |
| 5301 | Lyme Disease | 3 |
| 5490 | Noah’s Ark | 3 |
| 5504 | Notre-Dame | 3 |
| 5559 | Part 10 | 3 |
| 5560 | Part 11 | 3 |
| 5561 | Part 8 | 3 |
| 5562 | Part 9 | 3 |
| 5579 | Pearl Harbor Attack | 3 |
| 5795 | Salme Viking Ship Burials | 3 |
| 5853 | Shocking Reality | 3 |
| 5854 | Shocking Report | 3 |
| 5855 | Shocking Video | 3 |
| 5974 | The Andromeda Galaxy | 3 |
| 5991 | The Birth of Rome | 3 |
| 6034 | The enigma of Atlantis | 3 |
| 6061 | The Great Leap Forward | 3 |
| 6062 | The Great Purge | 3 |
| 6063 | The Great Rift | 3 |
| 6064 | The Great Sphinx of Giza | 3 |
| 6065 | The Great Stink | 3 |
| 6066 | The Greatest | 3 |
| 6140 | The Rise of Rome | 3 |
| 6297 | Valentines day | 3 |
| 6320 | Viking Berserkers | 3 |
| 6321 | Vikings in Ireland | 3 |
| 6394 | WORLD EXCLUSIVE | 3 |

## Punctuation/spacing collisions (identity NOT yet resolved)

- `Napoleon Bonaparte` (#6, 82ch) / `Napoléon Bonaparte` (#3995, 3ch)
- `Nelson Mandela` (#9, 76ch) / `Nelson Mandela |` (#5462, 3ch)
- `Albert Einstein` (#12, 67ch) / `Albert Einstein |` (#4220, 3ch)
- `Covid-19` (#76, 30ch) / `Covid 19` (#2769, 4ch)
- `Part 3` (#90, 27ch) / `Part-3` (#5566, 3ch)
- `Bruce Lee` (#120, 25ch) / `Bruce lee |` (#4449, 3ch)
- `Vladimir Putin` (#126, 25ch) / `Vladimir Putin |` (#6329, 3ch)
- `Coronavirus` (#163, 20ch) / `Corona Virus` (#4576, 3ch)
- `Göbekli Tepe` (#169, 20ch) / `Gobekli Tepe` (#1465, 6ch) / `Göbeklitepe` (#1990, 5ch)
- `Simón Bolívar` (#217, 17ch) / `Simon Bolivar` (#1076, 7ch)
- `Ibn al-Haytham` (#220, 17ch) / `Ibn Al haytham` (#2930, 4ch)
- `Al-Khwarizmi` (#252, 16ch) / `Al Khwarizmi` (#1325, 6ch)
- `Mustafa Kemal Atatürk` (#283, 15ch) / `Mustafa Kemal Ataturk` (#5438, 3ch)
- `Salvador Dali` (#315, 14ch) / `Salvador Dalí` (#581, 10ch)
- `Al-Farabi` (#331, 14ch) / `Al Farabi` (#2643, 4ch)
- `Ibrahim Traoré` (#352, 13ch) / `Ibrahim Traore` (#379, 13ch)
- `Al-Biruni` (#428, 12ch) / `Al Biruni` (#4215, 3ch)
- `Albrecht Dürer` (#559, 10ch) / `Albrecht Durer` (#3788, 3ch)
- `Kim Jong-un` (#613, 10ch) / `Kim Jong Un` (#833, 8ch)
- `Hadrian's Wall` (#687, 9ch) / `Hadrian’s Wall` (#1992, 5ch)
- `Israel-Palestine` (#791, 8ch) / `Israel & Palestine` (#2022, 5ch)
- `Hugo Chávez` (#883, 8ch) / `Hugo Chavez` (#4980, 3ch)
- `Mary, Queen of Scots` (#949, 7ch) / `Mary Queen of Scots` (#967, 7ch)
- `Frédéric Chopin` (#1045, 7ch) / `Frederic Chopin` (#4831, 3ch)
- `Muhammad` (#1066, 7ch) / `Muhammad صلى الله عليه وسلم` (#3097, 4ch)
- `Paul Cézanne` (#1069, 7ch) / `Paul Cezanne` (#3658, 3ch)
- `Valentine's Day` (#1085, 7ch) / `Valentines day` (#6297, 3ch)
- `Atatürk` (#1103, 7ch) / `Ataturk` (#1330, 6ch)
- `Hurrem Sultan` (#1146, 7ch) / `Hürrem Sultan` (#2927, 4ch)
- `Kim Il-sung` (#1156, 7ch) / `Kim Il Sung` (#5180, 3ch)
- `Kosem Sultan` (#1158, 7ch) / `Kösem Sultan` (#5198, 3ch)
- `Story time` (#1255, 6ch) / `Storytime` (#3752, 3ch)
- `Diego Velazquez` (#1260, 6ch) / `Diego Velázquez` (#4652, 3ch)
- `Timelapse` (#1270, 6ch) / `Time-Lapse` (#2617, 4ch) / `Time Lapse` (#3670, 3ch)
- `Catherine de Medici` (#1419, 6ch) / `Catherine de' Medici` (#4490, 3ch) / `Catherine de’ Medici` (#4491, 3ch)
- `Elizabeth Báthory` (#1703, 5ch) / `Elizabeth Bathory` (#1765, 5ch)
- `Eva Perón` (#1966, 5ch) / `Eva Peron` (#4750, 3ch)
- `Harun al-Rashid` (#1999, 5ch) / `Harun Al Rashid` (#4923, 3ch)
- `Hernán Cortés` (#2006, 5ch) / `Hernan Cortes` (#2910, 4ch)
- `Learn English Through Story |` (#2263, 4ch) / `Learn English Through Story` (#2278, 4ch)
- `Amílcar Cabral` (#2656, 4ch) / `Amilcar Cabral` (#4256, 3ch)
- `Kylian Mbappe` (#3006, 4ch) / `Kylian Mbappé` (#5197, 3ch)
- `Noah's Ark` (#3115, 4ch) / `Noah’s Ark` (#5490, 3ch)
- `Notre Dame` (#3120, 4ch) / `Notre-Dame` (#5504, 3ch)
- `Rene Magritte` (#3608, 3ch) / `René Magritte` (#5696, 3ch)
- `Homeland` (#3713, 3ch) / `Home/Land` (#4965, 3ch)
- `Sultan Muhammad Fateh` (#5924, 3ch) / `Sultan Muhammad Fateh |` (#5925, 3ch)

## Trailing title-metadata variants (all matched base labels)

- `Elon Musk` (#14, 64ch) ⇄ `Elon Musk Biography` (#320, 14ch)
- `Albert Einstein` (#12, 67ch) ⇄ `Albert Einstein Biography` (#708, 9ch)
- `Marie Curie` (#17, 60ch) ⇄ `Marie Curie Biography` (#1061, 7ch)
- `Steve Jobs` (#52, 36ch) ⇄ `Steve Jobs Biography` (#1078, 7ch)
- `Stephen Hawking` (#96, 27ch) ⇄ `Stephen Hawking biography` (#1196, 7ch)
- `Bill Gates` (#63, 34ch) ⇄ `Bill Gates Biography` (#1333, 6ch)
- `Thomas Edison` (#41, 40ch) ⇄ `Thomas Edison Biography` (#1379, 6ch)
- `Cristiano Ronaldo` (#60, 35ch) ⇄ `Cristiano Ronaldo Biography` (#1432, 6ch)
- `Jeff Bezos` (#281, 15ch) ⇄ `Jeff Bezos Biography` (#1489, 6ch)
- `Lionel Messi` (#112, 26ch) ⇄ `Lionel Messi Biography` (#1514, 6ch)
- `Warren Buffett` (#385, 13ch) ⇄ `Warren Buffett Biography` (#1606, 6ch)
- `William Shakespeare` (#25, 45ch) ⇄ `William Shakespeare Biography` (#1608, 6ch)
- `Abraham Lincoln` (#4, 95ch) ⇄ `Abraham Lincoln Biography` (#1869, 5ch)
- `Adolf Hitler` (#20, 52ch) ⇄ `Adolf Hitler Biography` (#1872, 5ch)
- `Charles Darwin` (#32, 43ch) ⇄ `Charles Darwin Biography` (#1927, 5ch)
- `Ernest Hemingway` (#219, 17ch) ⇄ `Ernest Hemingway Biography` (#1964, 5ch)
- `Michael Jackson` (#27, 45ch) ⇄ `Michael Jackson Biography` (#2078, 5ch)
- `Napoleon Bonaparte` (#6, 82ch) ⇄ `Napoleon Bonaparte biography` (#2090, 5ch)
- `Virat Kohli` (#762, 9ch) ⇄ `Virat Kohli Biography` (#2236, 5ch)
- `Alan Turing` (#125, 25ch) ⇄ `Alan Turing Biography` (#2447, 4ch)
- `Alexander Graham Bell` (#133, 24ch) ⇄ `Alexander Graham Bell Biography` (#2448, 4ch)
- `Galileo Galilei` (#46, 38ch) ⇄ `Galileo Galilei biography` (#2500, 4ch)
- `Larry Ellison` (#2044, 5ch) ⇄ `Larry Ellison Biography` (#2532, 4ch)
- `Angelina Jolie` (#367, 13ch) ⇄ `Angelina Jolie Biography` (#2658, 4ch)
- `Charlie Chaplin` (#108, 26ch) ⇄ `Charlie Chaplin Biography` (#2743, 4ch)
- `Genghis Khan` (#3, 101ch) ⇄ `Genghis Khan Biography` (#2865, 4ch)
- `Imran Khan` (#141, 23ch) ⇄ `Imran Khan Biography` (#2937, 4ch)
- `Karl Marx` (#73, 31ch) ⇄ `Karl Marx Biography` (#2994, 4ch)
- `Kim Kardashian` (#1157, 7ch) ⇄ `Kim Kardashian Biography` (#3000, 4ch)
- `Leonardo DiCaprio` (#370, 13ch) ⇄ `Leonardo DiCaprio Biography` (#3018, 4ch)
- `Louis Pasteur` (#171, 20ch) ⇄ `Louis Pasteur Biography` (#3040, 4ch)
- `Michael Faraday` (#382, 13ch) ⇄ `Michael Faraday Biography` (#3079, 4ch)
- `Mother Teresa` (#99, 27ch) ⇄ `Mother Teresa Biography` (#3093, 4ch)
- `Muhammad Ali` (#54, 36ch) ⇄ `Muhammad Ali Biography` (#3096, 4ch)
- `Nelson Mandela` (#9, 76ch) ⇄ `Nelson Mandela Biography` (#3105, 4ch)
- `Nikola Tesla` (#10, 75ch) ⇄ `Nikola Tesla Biography` (#3113, 4ch)
- `Oprah Winfrey` (#285, 15ch) ⇄ `Oprah Winfrey Biography` (#3134, 4ch)
- `Serena Williams` (#1560, 6ch) ⇄ `Serena Williams Biography` (#3263, 4ch)
- `Sylvester Stallone` (#755, 9ch) ⇄ `Sylvester Stallone biography` (#3299, 4ch)
- `Taylor Swift` (#145, 22ch) ⇄ `Taylor Swift Biography` (#3303, 4ch)
- `Winston Churchill` (#13, 67ch) ⇄ `Winston Churchill Biography` (#3465, 4ch)
- `George Washington` (#8, 77ch) ⇄ `George Washington Biography` (#3898, 3ch)
- `Will Smith` (#386, 13ch) ⇄ `Will Smith Biography` (#4152, 3ch)
- `Alexander Fleming` (#269, 15ch) ⇄ `Alexander Fleming Biography` (#4229, 3ch)
- `Alfred Nobel` (#366, 13ch) ⇄ `Alfred Nobel Biography` (#4235, 3ch)
- `Arnold Schwarzenegger` (#224, 17ch) ⇄ `Arnold Schwarzenegger Biography` (#4302, 3ch)
- `Asha Bhosle` (#2675, 4ch) ⇄ `Asha Bhosle Biography` (#4309, 3ch)
- `Ayatollah Ali Khamenei` (#2455, 4ch) ⇄ `Ayatollah Ali Khamenei Biography` (#4326, 3ch)
- `Barack Obama` (#72, 31ch) ⇄ `Barack Obama Biography` (#4343, 3ch)
- `Bear Grylls` (#2690, 4ch) ⇄ `Bear Grylls Biography` (#4352, 3ch)
- `Benjamin Franklin` (#21, 50ch) ⇄ `Benjamin Franklin Biography` (#4372, 3ch)
- `Bruce Lee` (#120, 25ch) ⇄ `Bruce Lee Biography` (#4448, 3ch)
- `Christopher Columbus` (#39, 41ch) ⇄ `Christopher Columbus Biography` (#4527, 3ch)
- `Clint Eastwood` (#1424, 6ch) ⇄ `Clint Eastwood Biography` (#4548, 3ch)
- `Diego Maradona` (#566, 10ch) ⇄ `Diego Maradona Biography` (#4651, 3ch)
- `Donald Trump` (#22, 49ch) ⇄ `Donald Trump Biography` (#4670, 3ch)
- `Edgar Allan Poe` (#138, 23ch) ⇄ `Edgar Allan Poe Biography` (#4688, 3ch)
- `Elvis Presley` (#69, 32ch) ⇄ `Elvis Presley Biography` (#4707, 3ch)
- `Fidel Castro` (#75, 31ch) ⇄ `Fidel Castro Biography` (#4789, 3ch)
- `Florence Nightingale` (#91, 27ch) ⇄ `Florence Nightingale Biography` (#4805, 3ch)
- `Isaac Newton` (#24, 46ch) ⇄ `Isaac Newton Biography` (#5047, 3ch)
- `Jane Goodall` (#732, 9ch) ⇄ `Jane Goodall Biography` (#5074, 3ch)
- `Julius Caesar` (#7, 80ch) ⇄ `Julius Caesar biography` (#5145, 3ch)
- `Kamala Harris` (#442, 12ch) ⇄ `Kamala Harris Biography` (#5158, 3ch)
- `Keanu Reeves` (#494, 11ch) ⇄ `Keanu Reeves Biography` (#5168, 3ch)
- `Leonardo da Vinci` (#2, 101ch) ⇄ `Leonardo da Vinci Biography` (#5232, 3ch)
- `Marilyn Monroe` (#49, 37ch) ⇄ `Marilyn Monroe Biography` (#5331, 3ch)
- `Mark Zuckerberg` (#255, 16ch) ⇄ `Mark Zuckerberg Biography` (#5335, 3ch)
- `Michael Bloomberg` (#2547, 4ch) ⇄ `Michael Bloomberg Biography` (#5388, 3ch)
- `Mukesh Ambani` (#2086, 5ch) ⇄ `Mukesh Ambani Biography` (#5432, 3ch)
- `Narendra Modi` (#233, 17ch) ⇄ `Narendra Modi Biography` (#5453, 3ch)
- `Princess Diana` (#31, 43ch) ⇄ `Princess Diana Biography` (#5634, 3ch)
- `Roger Federer` (#1185, 7ch) ⇄ `Roger Federer Biography` (#5729, 3ch)
- `Rohit Sharma` (#1831, 5ch) ⇄ `Rohit Sharma Biography` (#5731, 3ch)
- `Tina Turner` (#1381, 6ch) ⇄ `Tina Turner Biography` (#6196, 3ch)
- `Tom Hanks` (#931, 8ch) ⇄ `Tom Hanks Biography` (#6201, 3ch)
- `Vladimir Putin` (#126, 25ch) ⇄ `Vladimir Putin Biography` (#6328, 3ch)
- `Walt Disney` (#101, 27ch) ⇄ `Walt Disney Biography` (#6343, 3ch)

## Strong and ambiguous alternate-name candidates

**Do not add stored channel counts:** the same Channel ID can appear in multiple raw-name rows. Rebuild from the archived per-channel video titles, resolve identity to a reviewed Person key, and compute each key's distinct Channel IDs.

- `Napoleon Bonaparte` (#6, 82ch) / `Napoléon Bonaparte` (#3995, 3ch) / `Napoleon` (#28, 44ch)
- `Julius Caesar` (#7, 80ch) / `Caesar` (#1917, 5ch)
- `Ibn Sina` (#189, 19ch) / `Avicenna` (#200, 18ch)
- `Robert Oppenheimer` (#908, 8ch) / `Oppenheimer` (#132, 24ch)
- `Catherine de Medici` (#1419, 6ch) / `Catherine de' Medici` (#4490, 3ch) / `Catherine de’ Medici` (#4491, 3ch)
- `Ludwig van Beethoven` (#304, 14ch) / `Beethoven` (#137, 23ch)
- `Vincent van Gogh` (#26, 45ch) / `Van Gogh` (#185, 19ch)
- `Elizabeth Báthory` (#1703, 5ch) / `Elizabeth Bathory` (#1765, 5ch)
- `Ramses II` (#286, 15ch) / `Ramesses the Great` (#1825, 5ch) / `Ramses the Great` (#2123, 5ch)
- `William Shakespeare` (#25, 45ch) / `Shakespeare` (#154, 21ch)
- `Leonardo da Vinci` (#2, 101ch) / `Da Vinci` (#1945, 5ch) / `Leonardo` (#2046, 5ch)
- `Vladimir Lenin` (#190, 19ch) / `Lenin` (#456, 11ch)
- `Mao Zedong` (#50, 37ch) / `Mao` (#3572, 3ch)
- `Jesus` (#66, 32ch) / `Jesus Christ` (#254, 16ch) / `Jesus of Nazareth` (#826, 8ch)
- `Cleopatra` (#5, 91ch) / `Cleopatra VII` (#1423, 6ch) / `Cleopatra VII Philopator` (#4546, 3ch)
- `Alexander the Great` (#1, 125ch) / `Alexander` (#1875, 5ch)
- `Wolfgang Amadeus Mozart` (#330, 14ch) / `Mozart` (#153, 21ch)
- `Genghis Khan` (#3, 101ch) / `Genghis Khan Biography` (#2865, 4ch)
- `Kim Jong-un` (#613, 10ch) / `Kim Jong Un` (#833, 8ch)

## Required correction workflow

1. Keep immutable original channel manifests and video title archives (batches 008–017). Do **not** delete any canonical Person or original evidence on the strength of this report.
2. Introduce a reviewed `NON_PERSON` classification for clear false candidates. Preserve the raw title and a rule/evidence/reviewer reason. Separate fictional/legendary figures from non-person nouns according to the project's non-timeline policy.
3. Remove trailing video-title metadata and punctuation noise only after title evidence confirms the parse. This is lexical cleanup, **not** entity identification.
4. For alternate-name candidates, confirm identity against canonical Person aliases and reliable historical references. Reject automatic surname-only and monarch-name matching where different people share a short form (e.g. `Napoleon` vs `Napoleon III`, `Cleopatra` vs other queens, `Alexander` vs other Alexanders).
5. Aggregate only from the per-Channel-ID raw archives under a reviewed canonical entity key: `count(distinct channel_id)`. Never sum channel counts across raw-name rows.
6. Before any production re-publication, compare retained channel IDs (6,770 registered, 6,011 successful) and video rows (1,536,512), produce a before/after snapshot diff and updated 3+/5+/10+/15+/20+ thresholds. Publish append-only after explicit authorization for removing previously visible invalid derived rows.
7. Keep `unresolved` candidates visible in a review lane with a reason instead of prematurely merging or erasing them.

## Data lineage

Read-only Production SQL on `atlas_v2.youtube_person_signal_snapshots` and `atlas_v2.youtube_person_signals`. The 6,445 records were fetched in 17 pages (400 rows/page), verified unique by rank, and compared using exact labels, spacing/punctuation keys and suffix pairs. Classification is an initial audit, **not comprehensive historical verification** of every proposed Person.
