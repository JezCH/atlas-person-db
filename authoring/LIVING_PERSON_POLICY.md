# ATLAS Living Person Exclusion Policy

**Status:** Canonical  
**Effective:** 2026-09-27  
**Scope:** ATLAS Person identity creation and Person registration

## 1. Canonical rule

ATLAS Person DB excludes every person who is currently living.

This rule is independent of office, occupation, representative domain, or historical importance. It applies equally to rulers, politicians, military figures, businesspeople, CEOs, artists, film directors, scholars, scientists, religious figures, explorers, and every other Person category.

The decision is based on the person's current life status, not on whether their historically important activity has ended.

## 2. Eligibility decision

For Person registration:

- `living` -> **EXCLUDE**. Do not create a Person identity.
- `deceased` -> may continue through the normal historicity, chronology, source, NamuWiki, domain, and registration gates.
- unresolved current life status -> **HOLD / BLOCKED** until the life-status review is resolved.

A person who was excluded while living may be reviewed for registration after their death is reliably established.

## 3. Forbidden proxies for life-status decisions

The following must never be used as a substitute for current life-status verification:

- `activity_start` or `activity_end`
- `chronology_status`
- `ongoing` or closed Activity state
- representative Activity year
- current or former office
- representative domain
- retirement or end of public activity
- birth year by itself
- the historical audit shortcut “born in 1926 or later”

A birth-year cutoff may be used only as a search-prioritization aid. It is never the final eligibility rule. Older living people are still excluded.

## 4. Registration contract

Every **new Person identity** must carry a reviewed deceased-status attestation:

```json
{
  "life_status": "deceased",
  "life_status_checked_at": "YYYY-MM-DD",
  "life_status_basis": "documented_death"
}
```

Allowed `life_status_basis` values:

- `documented_death` — reliable contemporary, official, institutional, biographical, or otherwise reviewed evidence establishes the death.
- `historical_certainty` — the person's historical chronology makes present survival impossible even when a modern death record is not a meaningful source type.

`historical_certainty` does not authorize inventing a death date. Unknown death dates remain unknown.

A new Person creation request without this attestation fails closed. An explicit `living` status is rejected.

## 5. Existing Person and replay compatibility

This policy must not rewrite or invalidate immutable historical authoring evidence merely because older requests predate the life-status field.

Therefore:

- an already-existing Person may be reused for an additional Activity without re-creating the Person identity;
- a previously committed immutable request may replay only when its authoritative Person/Activity result still exists;
- historical manifests for Persons later hard-deleted as living remain audit evidence, not registration authority;
- if such a manifest is evaluated after deletion, the missing Person cannot be recreated because new identity creation requires the reviewed `deceased` attestation.

Compatibility is permitted only for reuse/replay of existing authoritative state. It is not a bypass for a new Person insert.

## 6. Enforcement boundary

The authoritative enforcement point is the canonical Person identity creator, not Activity chronology.

All higher-level registration paths must converge on the same rule, including:

- Human Authoring
- native authoring manifests
- direct Admin `create_person`
- future reviewed Person registration surfaces that use the canonical identity creator

Repository-side request validation and Admin UI must expose the same contract for early operator feedback, but the server-side Person identity gate remains authoritative.

## 7. Future audits and removals

If a currently living Person is later found in Production:

1. confirm that the Person is currently living;
2. use the canonical Person delete service and its dependency cleanup;
3. verify Person, Activity, source-link, portrait, runtime projection, external-reference, and related live references are absent as required by the delete service;
4. keep historical audit/authoring evidence unless a separate reason requires its removal;
5. rely on this registration gate to prevent re-creation while the person remains living.

Do not use ad hoc SQL deletion when the canonical delete lifecycle is available.
