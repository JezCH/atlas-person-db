# ATLAS Person necessity audit — deletion governance

Date: 2026-08-27

## Non-negotiable rule

Person necessity auditing may classify a Person as `KEEP`, `REVIEW`, or `DELETE_CANDIDATE_PENDING_USER_APPROVAL`.

It MUST NOT directly delete a Person from Production.

A Production Person may be hard-deleted only after all of the following are true:

1. The audit identifies the exact Person UUID and records the historical reason for considering removal.
2. The candidate is reported to the user before any destructive mutation.
3. The user gives explicit approval for that exact deletion candidate.
4. The current Production Person is read again immediately before deletion to prevent stale-target mistakes.
5. Deletion uses the existing fail-closed `delete_person` service and must pass post-delete live-reference verification.

Silence, an earlier general instruction to continue auditing, or a previous deletion of another Person is NOT approval.

## Audit policy

Historical significance is broader than formal sovereignty or office-holding. Symbolic, cultural, religious, intellectual, resistance, civic, and collective-memory significance may independently justify `KEEP`.

Examples such as Norton I must not be downgraded merely because the Person lacked de jure or de facto sovereign power. A claim-type Activity can accurately model symbolic political figures without treating the claim as real sovereignty.

## Allowed automated outcomes

- `KEEP`
- `REVIEW`
- `DELETE_CANDIDATE_PENDING_USER_APPROVAL`

## Forbidden automated outcome

- Production hard delete without exact user approval.
