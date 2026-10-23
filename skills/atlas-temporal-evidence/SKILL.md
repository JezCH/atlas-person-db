---
name: atlas-temporal-evidence
description: Work on historical BCE/CE chronology, multiple office periods and source-backed uncertainty without invented precision.
---

# ATLAS temporal evidence

- Identify exact Person, Activity and Polity normalized IDs and current Authoring revision; do not join merely on display names.
- Preserve BCE/CE convention and reject year zero, Boolean-to-number coercion and inverted intervals; use unknown bounds for unknown historical dates.
- Distinguish birth/death range, attested activity interval, rulership, title and later source estimates. A single Person may hold the same office during several discontinuous reigns.
- Keep chronological uncertainty and direct Source provenance visible; never manufacture a neat interval to satisfy a timeline UI.
- Handle legends/myths/undatable entities through the existing approved non-timeline disposition.
- Reuse Authoring→Compile→Runtime and canonical-writer guards. Offline CI is not evidence of Production application.
- For relevant code, inspect `crossCheckActivity` with the existing context script and its importers with the dependency map.
