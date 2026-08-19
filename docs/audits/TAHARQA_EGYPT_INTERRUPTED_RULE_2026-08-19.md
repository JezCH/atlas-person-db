# Taharqa — interrupted Egyptian rule correction

Date: 2026-08-19

## Decision

The existing Egypt Activity `72b5090a-fdec-43c3-8f6d-717f11a4c042` must not remain an uninterrupted c. 690–664 BCE effective-rule interval.

Keep Taharqa's separate Kingdom of Kush Activity unchanged at c. 690–664 BCE.

Split the Egypt Activity into:

1. **c. 690–671 BCE — Egypt — Pharaoh — `rules`**
   - Taharqa's Twenty-fifth Dynasty rule in Egypt before Esarhaddon's conquest of Memphis.
   - The 671 BCE endpoint reflects the Assyrian seizure of Memphis and Taharqa's retreat south.

2. **c. 669–c. 667 BCE — Egypt — Pharaoh — `rules`**
   - After Esarhaddon's death in 669 BCE, Taharqa returned north and re-entered Memphis.
   - Ashurbanipal's first Egyptian campaign, conventionally dated 667/666 BCE, defeated Taharqa and drove him south again.
   - `rules`, rather than `claims_rule`, is used because the contemporary Assyrian royal inscription states that Taharqa entered and resided in Memphis and sought to take Egypt back from the rulers installed by Esarhaddon. The interval remains approximate because the campaign chronology is expressed in modern scholarship as 667/666 BCE.

The gap between the two Egypt Activities is intentional and represents the interruption of Taharqa's effective Egyptian rule under Assyrian control.

## Evidence

### Primary source

- Ashurbanipal, RINAP 5, royal inscription (ORACC), first Egyptian campaign: Taharqa is styled king of Egypt and Kush; the inscription states that he moved against the rulers installed in Egypt by Esarhaddon, entered Memphis, and resided there before Ashurbanipal's response.
  - https://oracc.museum.upenn.edu/rinap/rinap5/Q003702

### Academic / institutional references

- UCL Digital Egypt, **King Taharqo**: reign about 690–664 BCE; identifies Taharqa as a Twenty-fifth Dynasty/Napatan ruler in Egypt and records his repeated campaigns against Assyria and eventual flight south.
  - https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/taharqo.html
- UCL Digital Egypt, **Third Intermediate and Late Period guided tour**: the Twenty-fifth Dynasty consisted of Nubian kings who ruled Egypt and Nubian control ended in conflict with Assyria, which conquered Egypt for a short period.
  - https://www.ucl.ac.uk/museums-static/digitalegypt/main/guidelate.html
- British Museum Collections Online, **Taharqo**: institutional person authority already attached to the ATLAS Taharqa record.
  - https://www.britishmuseum.org/collection/term/BIOG56113

## ATLAS modeling consequence

- Person remains one identity: `b0962fc1-4cee-4bca-aa96-fc703adf988f`.
- Kingdom of Kush Activity remains unchanged: `11a96803-e762-466d-9d0a-ff3ab79a90e9`.
- Existing Egypt Activity UUID is preserved for the first effective-rule segment: `72b5090a-fdec-43c3-8f6d-717f11a4c042`.
- New Egypt Activity UUID is allocated deterministically for the renewed-rule segment: `f582ea25-88c2-5adc-be96-d364959d9680`.
- Both Egypt segments retain `relation_type = rules`, `role = Pharaoh`, `period_basis = reign`.
- No artificial exact day/month is created.
- Existing normalized source links are copied to the new fragment by the correction-v2 split policy.
