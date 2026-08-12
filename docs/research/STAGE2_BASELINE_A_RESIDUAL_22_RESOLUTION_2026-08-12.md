# Stage 2 Baseline A — residual 22 historical research resolution

> Status: **P3 historical research closed / no Production mutation**  
> Baseline A: `338` Activities · digest `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`  
> Machine authority: `research/residual/stage2-baseline-a-residual-22-resolution.v1.json`

This closes the last generic `historical_research` labels in the fresh Baseline A ledger. Closing research does **not** mean every row is ready to write: chronology, Polity identity, Relation Type, Governance Context, provenance, and People/Event migration remain separate downstream queues.

## Rules used

- Bind decisions to the current Baseline A Activity UUID, never to a name alone.
- A place, people, revolt, migration, or historiographic period is not retained as a Polity merely because the old row used it as one.
- Unknown chronology remains unresolved/approximate; no placeholder year is invented.
- Person Activity never substitutes for Territory control.
- Existing generic Polity UUIDs are reused only when the reviewed identity really is the same political actor.

## Resolved cases

| Person | Current model | Final Stage 2 direction | Remaining implementation work |
|---|---|---|---|
| Hammurabi | Old Babylonian Empire | normalize the current single-use identity to the Babylon / First Dynasty political actor; preserve “Old Babylonian” as period/designation | Polity identity · Relation · provenance |
| Tomyris | Massagetae | keep Massagetae; `rules`; traditional war chronology remains approximate | Relation · provenance |
| Tian Heng | Qi | keep Qi; `rules`; preserve current one-year assertion without inventing a wider exact reign | Relation · provenance |
| Vercingetorix | Gaul | `Gaul` is not one Polity: relink the political Activity to Arverni; move pan-Gallic coalition command to Event/coalition context | Polity identity · Event migration · Relation · provenance |
| Cunobeline | Catuvellauni | keep Catuvellauni; `rules`; normalize chronology to approximately 10–40 rather than treating year 9 as exact | chronology · Relation · provenance |
| Jesus | Roman Judaea | split historical activity contexts between Roman Judaea and Herod Antipas’ Galilee tetrarchy; `active_in`, never political office | new Polity identity · chronology · Relation · provenance |
| Trưng Trắc | Trung Sisters' Realm | keep the short-lived political actor, but treat the current name as an editorial catalog label unless a historical self-designation is sourced | Polity naming/identity · Relation · provenance |
| Gongsun Zan | Eastern Han 191–199 | split Han service from the autonomous northeastern political actor after the 193 Liu Yu rupture | chronology · new Polity identity · layered relation · provenance |
| Zhang Lu | Hanzhong | do not treat the place name itself as identity; normalize current UUID to Zhang Lu’s Hanzhong political actor and separate initial commissioned service from autonomous rule | chronology · Polity identity · layered relation · provenance |
| Sun Ce | Eastern Han 194–200 | preserve nominal Han/service context and create a source-backed Sun/Jiangdong regional political actor for de-facto rule | chronology · new Polity identity · layered relation · provenance |
| Meng Huo | Nanzhong | Nanzhong is a region; migrate to the 225 Nanzhong campaign/local-leadership Event context, not a fabricated polity | People/Event migration · provenance |
| Lady Trieu | Jiaozhi resistance | resistance is an Event; add `opposes` Eastern Wu for 248 and migrate the revolt to HistoricalEvent | Event migration · Relation · provenance |
| Ingólfr Arnarson | Settlement of Iceland | settlement is a migration/Event + Place, not a Polity | Event/Place migration · chronology · provenance |
| Li Keyong | Tang 881–908 | split Tang service through 907 from post-Tang Jin rule; generic current `Jin` UUID is **not** bound by name alone | chronology · Jin identity review · Relation · provenance |
| Kupe | Maori 900–1200 | Māori is PeopleGroup and Kupe is traditional/legendary voyage history; remove the fake Polity interval and use People/Event/Place | People/Event/Place migration · chronology · provenance |
| Parameswara | Malacca Sultanate | keep Malacca political actor; `rules`; founding/conversion chronology stays approximate and role wording must remain source-supported | Relation · provenance |
| William I of Orange | Dutch Revolt | revolt is an Event; from 1572 model governance of Holland/Zeeland political authorities and opposition to Spanish monarchy; never back-project Dutch Republic | Event migration · Polity identities · chronology · Relation · provenance |
| Christina | Swedish Empire | relink to stable Sweden UUID; preserve Swedish Empire as designation/period; minority regency is Governance Context, not another Polity | Polity identity · Governance · Relation · provenance |
| Edward Teach ×2 | Nassau Pirate Republic / Republic of Pirates | both old labels describe the same informal Nassau pirate community; migrate to one Event/community context and retire both Polity labels | Event migration · provenance |
| Pocatello | Northwestern Shoshone 1854–1884 | Northwestern Shoshone is broad PeopleGroup; create/review the specific Pocatello-led band/community political actor. 1863 is source-attested; wider leadership bounds remain unresolved | PeopleGroup migration · Polity identity · chronology · Relation · provenance |
| Subhas Chandra Bose | Provisional Government of Free India | keep source-attested provisional government as Polity; `governs`; INA remains separate military/organizational context | Relation · provenance |

## Evidence spine

The machine resolution records the exact URLs. The load-bearing source families are:

- British Museum authority/catalogue for Hammurapi and Cunobeline.
- Herodotus, Caesar, *Shiji*, *Hou Han Shu*, *Sanguozhi* / annotated traditions for ancient political actors.
- Hanoi/Vietnam official cultural-history sources for Trưng Trắc and Lady Trieu.
- Þingvellir National Park and Te Ara for Iceland settlement and Kupe/Māori traditional history.
- National Library Board Singapore for Parameswara/Malacca.
- Nationaal Archief for William of Orange and the States of Holland in 1572.
- Nationalmuseum Sweden for Christina.
- Cambridge historical research for the non-cohesive Nassau pirate population.
- U.S. National Archives / treaty text for Pocatello and the Northwestern Shoshone bands.
- UK National Archives primary-document collection for Bose’s provisional government.

## P3 closure

After this resolution is applied to the current 338-row ledger:

```text
generic historical_research = 0
```

That is a **research closure only**. It deliberately leaves real implementation work in the correct queues instead of hiding it behind a generic research label. No SQL migration, Production UUID mutation, Person merge, Polity relink, or Vercel deployment is authorized by this document.
