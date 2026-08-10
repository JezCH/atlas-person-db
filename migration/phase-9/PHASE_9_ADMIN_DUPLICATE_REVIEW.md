# Phase 9 — Admin Duplicate Review V2

## Purpose

Phase 9 replaces the retired string-only duplicate checker with a review domain built directly on normalized person UUID identity.

## 9A review foundation

`atlas_v2.person_duplicate_candidates` stores the current deterministic candidate queue. A candidate is not a duplicate verdict. It records two normalized person UUIDs, detector confidence, structured evidence, an evidence fingerprint, lifecycle state, and the latest administrator decision.

`atlas_v2.person_duplicate_reviews` is append-only decision evidence. Supported decisions are:

- `MERGE` — administrator approves the pair for a later Phase 9B atomic merge transaction; **9A does not merge or delete either person**.
- `KEEP_SEPARATE` — explicitly records that the two UUID identities are distinct. The detector keeps this decision unless materially different name evidence changes the evidence fingerprint.
- `REVIEW` — leaves the pair in the human-review queue.

Candidate detection uses name evidence only to nominate pairs, never to mutate identity. It combines exact normalized names, punctuation/diacritic-folded names, token-set matches, preferred-name metadata, locale agreement, and activity chronology/context. Large ambiguous name groups are intentionally skipped.

## Runtime boundary

The admin browser calls `/api/atlas-duplicate-review` using the existing same-origin HttpOnly admin session. PostgreSQL access stays server-side. The endpoint can list candidates, rebuild the candidate queue, and append review decisions. It cannot merge or delete persons in 9A.

## 9B merge boundary

Actual entity merge remains blocked until a protected live inventory enumerates every current FK/reference to `atlas_v2.persons` and conflict rules are defined for names, activity rows, and future person-owned tables. The merge executor must be one PostgreSQL transaction, exact-candidate/decision guarded, and fail closed on conflicts.
