# ATLAS Person timeline routing full-population audit — 2026-08-27

Production SHA: `df676d23405f469952c044fd240f6233019272f4`

## Result

- Production Persons audited: **788**
- Current timeline Persons: **785**
- First-class Persons intentionally routed outside timeline: **3**
- Separate non-timeline registry entries: **27**
- Timeline Persons carrying explicit disputed/traditional/uncertain routing metadata: **63**
- Structural routing contradictions remaining: **0**

The final routing rule is kept two-dimensional: historical-person plausibility and defensible *personal* chronology are separate gates. Approximate, disputed, or uncertain chronology may remain on the timeline when it is tied to the individual rather than borrowed from a broad cultural/settlement range. Fabricated midpoint years and fabricated duration rails are forbidden.

The three first-class Persons currently outside the timeline are Kupe, Hiawatha, and Gush X'een; each matches an explicit entry in `non-timeline-persons.json`. The registry itself contains 27 reviewed excluded entries, each with null Activity boundaries.

The machine-readable ledger is `docs/audits/PERSON_TIMELINE_ROUTING_AUDIT_2026-08-27.json`.
