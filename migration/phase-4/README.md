# Phase 4 — Deterministic Migration Compiler

This phase compiles legacy repository datasets into deterministic normalized JSON artifacts for the Phase 3 target schema.

## Safety boundary

- No database connection or deployment.
- No Supabase or Vercel mutation.
- No runtime, legacy dataset, locale, HTML, or root schema modification.
- Inputs are read-only.
- Outputs are written only below an explicit compiler output directory.
- Repository JavaScript is never executed while extracting locale maps.

## Guarantees

- Stable source locators and content hashes.
- Deterministic UUIDv5 identifiers.
- One compiled relationship for every legacy relationship row.
- No fuzzy matching, inferred aliases, inferred political identities, or last-write-wins locale resolution.
- Two independent runs must be byte-for-byte identical.
- Existing locale conflicts are represented explicitly in reports and preserved as non-preferred name variants rather than silently discarded.
