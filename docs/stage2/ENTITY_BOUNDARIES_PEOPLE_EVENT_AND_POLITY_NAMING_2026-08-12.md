# Entity boundaries: Polity naming, PeopleGroup, HistoricalEvent — 2026-08-12

## Why this exists

Several remaining historical cases were not blocked by lack of a political actor. They were blocked because the actor lacked a clean historical state-name, or because ethnic/event context had been forced into Person–Polity Activity. Treating either problem as a naming shortcut would corrupt UUID identity.

## Polity naming

Polity UUID identity is independent of all names. Stage 2 distinguishes:

- `historical_official`
- `historical_attested`
- `historiographic_conventional`
- `editorial_catalog_label`

An editorial catalog label is allowed when a political actor is source-backed but no non-misleading historical/conventional name is available. It must be explicitly tagged, does not prove the Polity existed, is not a historical self-designation, and must never create a `polity_designations` assertion. A label change never creates a new UUID.

Existing `polity_names.name_type` values are preserved verbatim in Baseline A v2. The additive P5 proposal adds nullable `semantic_name_kind`; reviewed mapping happens only after the live catalog is captured.

## People are not Polities

`PeopleGroup` stores ethnic, ethnolinguistic, cultural, tribal, or other people identities. `PersonPeopleAffiliation` stores `member_of`, `born_into`, `identified_with`, or `associated_with` claims. None of these implies a Person–Polity Activity or territory.

A PeopleGroup can correspond to a political actor only if a separate source-backed Polity identity is authored.

## Events are not Polities

`HistoricalEvent` stores conflict, expedition, political event, migration, or other event identity. `PersonEventParticipation` stores participation such as participant, commander, interpreter, envoy, organizer, witness, or subject. The event role label is deliberately separate from the Person–Polity Role UUID.

Neither event identity nor participation enters Activity semantic-key v2.

## Case consequences

- Sacagawea: Lemhi Shoshone PeopleGroup + Corps of Discovery participation; no synthetic political relation.
- Tecumseh: Shawnee PeopleGroup affiliation is separate from his political relationship to Tecumseh's Confederacy.
- Leftraru: Reche/Mapuche PeopleGroup and Arauco War participation are separate from the source-backed wartime political aggregation/command context.
- Oda, Uesugi, regional Chinese warlords, and similar unnamed actors can receive explicit editorial catalog labels without pretending those labels were historical state names.

The PostgreSQL rehearsal proves these tables, temporal uncertainty, normalized multi-locator provenance, and zero automatic creation of Person–Polity Activity.
