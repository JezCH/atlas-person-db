# ATLAS Current Spacetime Renderer Final Acceptance

This document is the closure contract for the current non-Spatial `시공간 인물도` product-completion axis. It supplements the authoritative historical `docs/spacetime-completion-contract.md`; it does not replace or weaken any of its stable-world invariants.

## Invariants that must remain unchanged

- camera minimum/default: 500%
- camera maximum: 800%
- global presentation compression: 0.748
- historical Y derives only from historical time
- no local region/time compression
- search, selection, zoom, and minimap navigation do not mutate normalized world coordinates
- Activity, Polity, spatial-uncertainty, selection, and Meanwhile semantics remain distinct from Person representative-domain color

## Current Person semantic-color contract

The spacetime surface consumes only the canonical Person representative-domain reader already exposed by `ATLAS_PERSON_DOMAIN_UI`.

Allowed domains are derived from `ATLAS_PERSON_DOMAIN_UI.DEFINITIONS` and therefore remain exactly:

- governance
- military
- knowledge
- technology
- commerce
- culture
- religion
- exploration

The spacetime layer must not infer a domain from role, name, polity, chronology, or Activity. Missing, unknown, future, or unclassified values remain neutral.

Canonical colors are not duplicated in the spacetime layer. `atlas-person-spacetime-domain-colors.css` reuses the variables owned by `atlas-person-domain-palette.css`.

Person labels and Person rails carry `data-representative-domain`. Activity glyphs and spatial-uncertainty marks do not inherit Person-domain semantics. Selection, Activity-selection, hover, and Meanwhile state colors retain priority over the default Person-domain presentation.

The legacy point-only Person renderer remains prohibited, so the current semantic surface is the Person label + rail representation rather than a reintroduced point renderer.

## Final exact-SHA Production gate

Closure requires a manual run of `ATLAS Spacetime Production Visual Acceptance` with the exact merged Production GitHub SHA supplied as `expected_runtime_sha`.

The run fails closed unless all of the following succeed:

1. `scripts/verify-spacetime-production-exact-sha.mjs`
   - requires a valid 40-character expected SHA;
   - compares the relevant Production spacetime/domain assets byte-for-byte against GitHub raw content at that exact SHA;
   - records SHA-256 evidence for every compared asset.
2. `scripts/verify-spacetime-production-visual.mjs`
   - preserves the established real-Chrome 500%/800% geometry, overlap, LOD, inspector, uncertainty, Meanwhile, and runtime-error acceptance.
3. `scripts/verify-spacetime-production-domain-colors.mjs`
   - verifies the eight-way canonical domain registry in the live browser;
   - requires live spacetime Person label and rail decoration;
   - verifies presentation domains equal the canonical Person-domain reader;
   - verifies label/rail semantics agree for the same Person;
   - verifies Activity glyphs are not recolored as Person domains;
   - verifies canonical palette variables resolve on the live Person labels.

## Closure evidence

The immutable GitHub Actions artifact contains the established screenshots plus:

- `visual-acceptance.json`
- `exact-sha-parity.json`
- `domain-color-acceptance.json`

The final run ID, artifact ID, exact merged SHA, Production deployment identity/state, exact-main read-back, and `leftover_artifacts: []` are recorded in the authoritative NONCORE queue issue #977. They are intentionally not hard-coded into this repository document so recording evidence does not create a new commit that invalidates the SHA that was just accepted.
