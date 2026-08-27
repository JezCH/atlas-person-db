# ATLAS Person necessity full-population audit — 2026-08-27

Production baseline: `df676d23405f469952c044fd240f6233019272f4`

## Outcome

- Persons audited: **788**
- KEEP: **788**
- REVIEW: **0**
- DELETE_CANDIDATE_PENDING_USER_APPROVAL: **0**
- Production deletions performed: **0**

No current Person met the deletion threshold under the revised ATLAS criteria.

This result intentionally treats historical significance more broadly than formal sovereignty. Symbolic political figures, collective-memory figures, religious/intellectual/scientific/cultural actors, resistance figures, and regionally important representatives can all justify retention.

The audit used two coverage passes:

1. **Sparse-polity coverage:** any Person attached to a Polity represented by four or fewer current Persons was retained to protect world/civilization-history breadth unless independent evidence justified escalation.
2. **Crowded-polity review:** every Person in a Polity represented by five or more current Persons was reviewed as part of that crowded group for distinct historical, transition, cultural, institutional, or symbolic value.

Borderline crowded-group checks included United States, Roman Empire, United Kingdom, Later Han, Kingdom of England, Kingdom of France, Joseon, Byzantine Empire, Japan, Egypt, Kush, Silla, Portugal, Shu Han, Goryeo, Ottoman Empire, Sweden, Chile, New Kingdom Egypt, Athens, Goguryeo, Norway, Holy Roman Empire, Ming, Spanish Monarchy, Russian Empire, Mexico, and French Republic.

Examples that remain KEEP after specific re-check:
- Norton I — symbolic political/collective-memory significance; `claims_rule` correctly distinguishes claim from real sovereignty.
- Antoninus Pius — central Antonine/Pax Romana representative.
- Charles XI of Sweden — absolutist, fiscal and military restructuring.
- Ramón Freire — early Chilean state formation, abolition of slavery, final incorporation of Chiloé.
- Jorge Montt — 1891 civil-war transition and parliamentary-regime consolidation.
- Pedro Aguirre Cerda — Popular Front, industrialization and education.
- Liu Yao — documented late-Han Yang Province regional authority immediately preceding Sun Ce's Jiangdong consolidation.

Deletion governance remains controlled by `docs/audits/PERSON_NECESSITY_DELETION_GOVERNANCE_2026-08-27.md`. This audit does **not** authorize any future deletion without a fresh candidate report and explicit user approval.

Machine-readable decisions: `docs/audits/PERSON_NECESSITY_AUDIT_2026-08-27.json`.
