# ATLAS Polity Semantic Audit — Wave 6

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: colonial, dependent, dominion, constituent and other subordinate territorial authorities.

## 1. Rule correction from earlier waves

The provisional wording `independent or semi-independent political authority` is too narrow for a historical map system.

ATLAS must also represent historically distinct subordinate territorial authorities when they are genuine map-level political jurisdictions rather than merely ordinary administrative subdivisions.

Revised working definition:

> A `Polity` is a historically identifiable territorial political authority or jurisdiction capable of holding a time-indexed territorial state in ATLAS, whether sovereign, composite, constituent, confederated, colonial, dependent, autonomous or otherwise institutionally distinct.

Sovereignty status is therefore **not** part of identity. It belongs in a time-bounded Polity-to-Polity relationship such as parent/constituent, overlord/dependent, colonial/metropolitan or federal/union membership.

This correction prevents ATLAS from erasing politically meaningful entities such as colonial governments, dominions, constituent crowns, princely states and historically autonomous lordships merely because they were subordinate to another power.

## 2. Guardrail: not every administrative area becomes a Polity

A subordinate territorial unit should be a map-level Polity only when the historical use case supports all or most of the following:

1. **stable historical identity** — it was recognized as a distinct political/jurisdictional unit during the relevant period;
2. **territorial jurisdiction** — it had an identifiable governed territory, even if boundaries were disputed or reconstruction is approximate;
3. **institutional political authority** — it possessed offices, institutions or legally meaningful governing authority relevant to the Person relation;
4. **map-semantic value** — representing it separately explains historical authority better than collapsing it into the parent state;
5. **source support** — scholarly/official sources treat it as a meaningful political or jurisdictional unit rather than only a geographic expression.

An ordinary modern province, county or municipality is therefore not automatically promoted to Polity merely because it has a governor or mayor. Such units may remain `Place / Administrative Area` unless the project explicitly needs that granularity and the historical authority relationship warrants it.

## 3. British India / colonial India

### Mahatma Gandhi

- Activity UUID: `52408ac3-67e9-4f02-93b8-226797c654f1`
- Frozen Polity display: British India / 영국령 인도
- Period: 1915–1948
- Role: nationalist / independence leader context

Decision: `KEEP` territorial colonial entity + `RELATION_FIX` + chronology review.

Cambridge scholarship distinguishes directly ruled British India from the indirectly ruled princely states and treats British India as a territorial colonial jurisdiction with its own governmental structure. This is a useful map-level political object even though ultimate sovereignty was British imperial.

For Gandhi, however, the relationship is not `rules` or `serves`. It is primarily `opposes`, with additional `active_in` semantics depending the final relation model.

The 1948 endpoint also requires correction research because British rule in India ended in 1947, while Gandhi lived until January 1948. Person life chronology must not be substituted for Person–Polity relation chronology.

Map consequence:

- British India direct colonial territory may be rendered as a subordinate/colonial Polity;
- princely states should not be silently absorbed into the same direct-control polygon;
- the metropolitan United Kingdom / British Empire relationship belongs in Polity-to-Polity authority metadata;
- Gandhi must never cause British India to render as his personal ruled territory.

Confidence: very high on colonial-polity validity and relation fix; high that end date needs review.

## 4. Province of Pennsylvania

### Benjamin Franklin

- Activity UUID: `31f92f81-58e1-459d-a9bb-83e35a1ccf8a`
- Current Polity: Province of Pennsylvania
- Period: 1757–1776
- Role: Colonial agent, scientist and writer

Decision: `KEEP` + future `RELATION_FIX=serves`.

The Province of Pennsylvania was a distinct proprietary colonial polity/jurisdiction with its own assembly and governmental framework. Franklin was sent to London in 1757 as an agent of the Pennsylvania Assembly/province.

Therefore collapsing this row directly into `Great Britain` would lose the political unit to which his agency was institutionally attached.

The later row:

- `bb21742e-02d1-4b11-ba6e-d44eccf9d02d` — Benjamin Franklin -> United States, 1776–1790

is a genuine revolutionary/successor-context transition rather than a mere name change of Pennsylvania.

Map consequence:

- Pennsylvania may exist as a subordinate colonial Polity under a British imperial parent relationship before independence;
- from independence, Pennsylvania's own later state-level identity and the new United States federal Polity require separate hierarchy decisions outside this Person audit.

Confidence: very high.

## 5. Captaincy General of the Philippines

### Jose Rizal

- Activity UUID: `ad5246d1-a4d6-40a3-99c8-df833c3153ed`
- Current Polity: Captaincy General of the Philippines
- Period: 1882–1896
- Role: Nationalist, writer and reformist

Decision: `KEEP` colonial territorial authority + `RELATION_FIX` + chronology/context review.

The Spanish colonial Philippines had a distinct colonial governmental/jurisdictional structure. Treating that political-territorial object separately from metropolitan Spain is useful for the historical map.

Rizal, however, did not `serve` or `rule` that government. His political relationship was oppositional/reformist, while significant portions of the recorded 1882–1896 period were spent in Europe and elsewhere. Therefore a generic `active_in` relation covering the entire interval would also be misleading if interpreted literally as physical location.

The future relation model should distinguish at least:

- political target/context: colonial Philippines;
- opposition/reform relation: `opposes` or an evidence-based extension;
- actual places of residence/activity: Person–Place chronology, not Polity identity.

Map consequence:

- colonial Philippines remains a territorial political object;
- Spanish metropolitan sovereignty becomes a parent/colonial relation;
- Rizal's selection must not imply governance of the colony or residence there for every year 1882–1896.

Confidence: very high on entity validity and relation mismatch; high that place chronology is separately needed.

## 6. Dominion of Canada

### Wilfrid Laurier

- Activity UUID: `31ca4fef-8cd5-48ec-be24-a04585a8285b`
- Current Polity: Dominion of Canada
- Period: 1896–1911
- Role: Prime Minister

Decision: `KEEP ENTITY` + `SAME_POLITY_NAME_STATE_FORM_RESEARCH`.

Official Canadian material identifies Laurier as Prime Minister of Canada from 1896 to 1911. `Dominion of Canada` is historically associated with Canada's post-Confederation constitutional status, but ATLAS should not assume from the wording alone that `Dominion of Canada` and a later/current `Canada` require separate Polity UUIDs.

Likely final model:

- one continuing Canadian Polity identity across changing constitutional sovereignty/status;
- time-indexed state-form / conventional-name metadata;
- changing relationship to the British imperial/Crown structure represented separately.

Do not merge UUIDs until all Canada identities/references are inventoried and the temporal naming/state-form layer exists.

Confidence: high.

## 7. Commonwealth of Australia

### John Curtin

- Activity UUID: `b3eacdac-623d-4667-bf99-633a57941260`
- Current Polity: Commonwealth of Australia
- Period: 1941–1945
- Role: Prime Minister

Decision: `KEEP`.

Australian parliamentary sources identify Curtin as Prime Minister from 7 October 1941 until 5 July 1945. `Commonwealth of Australia` is the constitutional/formal name of the Australian federal polity, not a separate government/regime analogous to `French Fifth Republic`.

If the database later also contains `Australia` as a separate Polity UUID, the issue would be identity/name normalization, not rejection of the current object as non-polity.

Confidence: very high.

## 8. General authority-level model discovered

The audit now needs a non-destructive `authority_level / polity relationship` concept separate from Polity identity. Candidate categories for later schema design include:

- `sovereign`
- `composite_parent`
- `constituent`
- `federal_member`
- `colonial_or_dependent`
- `autonomous_subordinate`
- `confederated_member`
- `overlord`
- `tributary_or_vassal`

These are **not** approved database enum values yet. They are audit concepts used to prevent false merges and false exclusions.

The relationship must be time-bounded because sovereignty and constitutional status can change while a Polity identity continues.

## 9. Consequence for the ATLAS Polity definition

The full audit should use this broader test:

> Does the object represent a historically evidenced territorial political authority/jurisdiction whose separate representation is meaningful for the historical map?

This is better than either extreme:

- `Polity = only sovereign countries` — too narrow;
- `Polity = anything with a territorial label or local administrator` — too broad.

Examples after Waves 1–6:

### Valid despite subordination/composition

- Crown of Castile
- Kingdom of Portugal under the Iberian Union
- Province of Pennsylvania
- British India
- Dominion of Canada
- Habsburg Monarchy
- constituent/tribal polities and confederacies where historically evidenced

### Invalid or wrong semantic object

- French Fifth Republic as the Polity of de Gaulle
- Dutch Revolt
- Settlement of Iceland
- Maori for Kupe
- Nassau Pirate Republic for Edward Teach, absent stronger evidence of coherent state authority

## 10. Correction gate

No Production mutation is authorized.

Before any correction engine can modify subordinate/composite Polities it must support or safely defer:

1. time-bounded Polity-to-Polity authority relationships;
2. temporal names/state forms;
3. Person–Polity relation type;
4. exact Production UUID reconciliation;
5. non-destructive preservation of historical labels and source evidence.
