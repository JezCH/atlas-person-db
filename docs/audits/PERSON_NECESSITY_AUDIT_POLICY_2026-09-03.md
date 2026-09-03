# ATLAS Person necessity audit policy addendum — 2026-09-03

## Purpose

This addendum refines the 2026-08-27 necessity audit after the Person corpus expanded from 788 to 1,552 Persons.

It does **not** invalidate the historical 2026-08-27 decisions. It changes how newly added Persons are screened from this point forward.

## Core rule

A local or subordinate office is **not sufficient by itself** to justify Timeline inclusion.

A mayor, ordinary governor, prefect, commissioner, administrator, magistrate, local noble, or equivalent subordinate officeholder should not be retained merely because the represented Polity is sparse.

### Sparse-Polity rule revised

The prior sparse-Polity rule is now a **coverage signal**, not an automatic KEEP rule.

Scarcity may trigger closer review, but a Person still needs at least one substantive retention basis:

1. leadership of a distinct sovereign, independent, breakaway, quasi-independent, or de facto autonomous political community;
2. representation of a distinct remote/outer territory or minority political community that ATLAS intentionally models;
3. direct significance in state/polity formation, independence, collapse, constitutional transition, conquest, resistance, or decolonization;
4. historical influence that clearly exceeds the local office itself, including military, diplomatic, religious, intellectual, scientific, cultural, economic, or collective-memory significance;
5. head office of a genuine polity such as a sovereign city-state, federation, confederation, or short-lived government.

A purely routine local administrator with no such basis should be classified REVIEW and may become `DELETE_CANDIDATE_PENDING_USER_APPROVAL` after evidence review.

## Important distinctions

- A title sounding local does not prove the Person is local-only. A provincial governor may in fact be a de facto warlord or national leader.
- A colonial governor can be retained when the Person shaped a distinct colonial political formation or a major imperial transition.
- A Governor-General of an independent country is a national constitutional office, not a local governorship.
- Remote-territory representation remains valid where the project intentionally represents that distinct territory.
- Major cultural/scientific actors are evaluated on their historical importance, not on the administrative label attached to their Activity.

## Chronology / identity problems

Person necessity and data correctness are separate questions.

If a Person is worth retaining but the Activity chronology, polity binding, identity, or role is weak, classify the Person as `REVIEW` for the specific data problem. Do **not** solve chronology uncertainty by inventing a replacement year.

## Deletion governance

The existing governance remains binding:

- automated audit outcomes: `KEEP`, `REVIEW`, `DELETE_CANDIDATE_PENDING_USER_APPROVAL`;
- no Production Person is deleted from an audit alone;
- exact user approval for the exact Person UUID is required before any hard delete;
- the Person must be re-read from current Production immediately before deletion;
- post-delete live-reference verification is mandatory.

See `PERSON_NECESSITY_DELETION_GOVERNANCE_2026-08-27.md`.
