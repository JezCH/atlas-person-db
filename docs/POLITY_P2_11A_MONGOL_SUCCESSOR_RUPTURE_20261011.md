# POLITY-P2-11A — Mongol imperial breakup / successor Polity identity audit

**Review date:** 2026-10-11 KST  
**Seed:** `mongol-successor-khanates`  
**Decision:** `KEEP_SEPARATE` — audited *existing* political entities only.  
**Mutation:** **none** (no Polity/Activity/Source/Place/Runtime data writes or retirements).

## Authority and reproducible exact snapshot

- Complete protected read-only Production [run #38128160741](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741), [artifact #11697859340](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741/artifacts/11697859340), deployed SHA `8a54de696d0a257a9a8a2a060994509376a39c97`. This was an authenticated, fully enumerated 2026-10-11 snapshot, **not** a new database query after this SHA.
- Within the artifact, `audit.json.polities[]` supplies canonical Polity UUID/name and reference counts; `full_integrity_details.raw.activities[]` and `runtime_activities[]` provide complete exact Activity payloads. All audited rows below had identical original-vs-compiled counts.
- Research: David Morgan, [*The Decline and Fall of the Mongol Empire*](https://www.cambridge.org/core/journals/journal-of-the-royal-asiatic-society/article/abs/decline-and-fall-of-the-mongolempire/A8549B4ACF1A3A1B590BD8D80F59B7B4), *Journal of the Royal Asiatic Society* 19(4), 2009, DOI `10.1017/S1356186309990046`; Marie Favereau and Roman Yu. Pochekaev, [*The Golden Horde, c. 1260–1502*](https://www.cambridge.org/core/books/abs/cambridge-history-of-the-mongol-empire/golden-horde-c-12601502/194D20494453E0AC8373BE9ADFB8B8D6), *The Cambridge History of the Mongol Empire*, 2024; Michal Biran, [*Mongol Central Asia: The Chaghadaids and the Ögödeids, 1260–1370*](https://www.cambridge.org/core/books/abs/cambridge-history-of-the-mongol-empire/mongol-central-asia/D4970E08F6EAD86F9BF503BDDE2692BD), 2024; Metropolitan Museum of Art, [*The Legacy of Genghis Khan*](https://www.metmuseum.org/fr/essays/the-legacy-of-genghis-khan); David M. Robinson, *In the Shadow of the Mongol Empire*, Cambridge University Press (introduction).

## Exact already-live entities

| Canonical Polity | UUID | Original / compiled Activities | Observed original Activity year span | Direct Polity Sources |
| --- | --- | ---: | --- | ---: |
| Mongol Empire | `d54c540c-f3fb-5d05-9dc0-26af4ee9815a` | 6 / 6 | 1206–1271 | 3 |
| Yuan Dynasty | `d035cbd8-e7b1-5947-8542-c7dd356d52bb` | 4 / 4 | 1271–1368 | 3 |
| Golden Horde | `7e0522d7-1ff9-4464-927b-4376bf35ed7a` | 3 / 3 | 1242–1395 | 0 |
| Ilkhanate | `bf88f81f-adf6-467b-aba2-66b11d96b477` | 3 / 3 | 1256–1304 | 0 |
| Chagatai Ulus | `4c3e50cb-d76c-4b7c-b611-222849404142` | 1 / 1 | 1227–1241 | 0 |
| Western Chagatai Khanate | `256edfeb-8f35-4cbe-adca-dd3a76169ad8` | 1 / 1 | 1360–1363 | 0 |
| Northern Yuan | `986380c3-cc31-50d5-bb0d-6cae5fae0660` | 3 / 3 | 1368–1510 | 1 |

These year spans are minima/maxima of **recorded Person Activity coverage**, **NOT asserted polity founding/termination dates**. `Northern Yuan` is separately covered by the already-terminal `yuan-northern-yuan-rupture` seed and is shown here only as a control; this unit does not reopen that decision.

## Historical judgment

The historical Mongol political system did not convert into four successor regimes at one universally unambiguous midnight. Various uluses were already forming, the great-khan succession disputes intensified, and the houses exercised distinct regional sovereign power with changing nominal allegiance. The academic sources support separate operational political entities for Yuan, Jochid/Golden Horde, Ilkhanid, and Chaghadaid realms while retaining their shared Chinggisid/dynastic background. **The model must not fuse them into Mongol Empire UUID merely because they share a dynasty, political tradition or nominal khagan claim.**

The exact protected audit proves ATLAS **already maintains** the checked Mongol Empire and four observed successor-line Polities as separate UUIDs; their recorded Activity ownership is not merged into a single Mongol Empire row. Thus the scoped rupture/false-merge seed is `KEEP_SEPARATE`; there is **no safe or necessary canonical mutation in this unit**.

## Separate work not silently closed

1. **Chagatai coverage:** the exact census contains a distinct **`Chagatai Ulus`** UUID with one 1227–1241 Person Activity (original = Runtime = 1), as well as the later **`Western Chagatai Khanate`** UUID with one 1360–1363 Activity. Although the exact preferred English title `Chagatai Khanate` is absent, **that is not evidence that the early Chagatai polity is missing**. The intervening ruler/lineage coverage and the scope boundary between the two existing UUIDs still require separate source review; do not manufacture a duplicate Polity from a name-only lookup.
2. **Dynastic/identity succession edges:** `polity_identity_relation_types = 0`, `polity_identity_relations = 0` Production-wide; no validated vocabulary supports materializing the historical successor links. Do not misuse `vassal_of`, `constituent_of`, or fabricated continuity codes. The shared lineage-model gap remains a separate architectural gate with Song P2-08E-C.
3. **Polity-level provenance:** zero direct Polity Source rows for Golden Horde, Ilkhanate, Chagatai Ulus and Western Chagatai in this snapshot; recorded Activity Source counts respectively **3 / 4 / 1 / 1**, which are evidence links but do not substitute for comprehensive authoritative Polity-source coverage.
4. **Completeness:** no whole-world territory geometry, political-center fact, all ruler coverage, or P14 historic map acceptance is asserted by this rupture identity review.
5. **P3/P4:** after all remaining review seeds close, the project's global production identity-and-provenance semantic audit and Authoring→Compile→Runtime acceptance remain mandatory.

## Closure boundary

- **This work unit:** reviewed identity split `KEEP_SEPARATE` / **no Production change**.
- **Persistent result:** one canonical registry seed terminalized with this report as evidence.
- **Next independent unit:** proceed to another pending seed, or independently owned Chagatai gap / controlled identity relations, without reworking the settled Mongol successor UUID separation.
