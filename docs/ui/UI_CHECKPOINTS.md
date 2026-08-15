# UI checkpoints

- UI-0 — branch isolation + information coverage baseline: COMPLETE
- UI-1 — read/API information inventory: COMPLETE
- UI-2A — Person-centered Main read surface: IMPLEMENTED; CI verification pending
  - public `/api/atlas-person-read`
  - UUID-oriented Person objects without exposing `canonical_key`
  - `person_type` and raw authoritative `historicity`
  - all public Person names/aliases and descriptions
  - Activity count + earliest/latest available Activity year
  - observed historicity vocabulary/counts returned from DB data, not hard-coded in frontend
  - chronology availability remains separate from historicity
- UI-2B — Activity full semantic/detail read: NEXT
- UI-2C — Activity provenance/source read
- UI-2D — session-authenticated Admin object inspector read
- UI-2E — session-authenticated safe System/status read
- UI-3 — Main Persons information-complete redesign
- UI-4 — Admin information architecture + authoring/object inspectors
- UI-5 — duplicate review UI alignment with settled P10 server lifecycle
- UI-6 — future object shells only where backend authority exists
- UI-7 — integrated coverage gate / cleanup
- UI-8 — intentional Vercel Preview checkpoint
- UI-9 — current-main/P10 integration and release-candidate cleanup
- UI-10 — final Production runtime verification

## Historicity presentation rule

Historicity and chronology certainty are independent axes.

- A historical Person may have unknown or uncertain dates.
- A legendary/mythological Person may have a traditional date attached to a source tradition.
- Main UI must group or label non-historical / uncertain-historicity Persons clearly rather than mixing every Person into one undifferentiated list.
- The browser must not invent a closed historicity enum. It consumes the authoritative values returned by the server and uses an explicit fallback presentation for unfamiliar values.
