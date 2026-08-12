# P0 main protection availability decision — 2026-08-12

Status: **CURRENT RELEASE GOVERNANCE DECISION / NO PRODUCTION MUTATION**

## Observed repository state

At the time of this decision, `main` is not GitHub-protected (`protected=false`). The repository Settings UI also reports that the proposed ruleset will not be enforced for this private repository under the current account arrangement unless the repository is moved to an eligible Team organization/account configuration.

This means a repository ruleset that exists but is not enforced would provide **no real safety property**. ATLAS therefore must not pretend that a disabled/non-enforced rule satisfies P0.

## P0 decision

GitHub-enforced branch protection remains the preferred control whenever the repository/account configuration supports actual enforcement. It is **not** a blocker that may be satisfied by creating a decorative, non-enforced ruleset.

While platform enforcement is unavailable, the release gate is fail-closed and application-controlled:

1. release work occurs through a reviewed PR, never an ad-hoc direct Production mutation;
2. the exact PR head SHA must have a successful `ATLAS Integrity` run;
3. unresolved review threads must be zero;
4. the merge command must include the exact expected PR head SHA so a moved head cannot be merged accidentally;
5. after merge, the exact resulting `main` SHA must be identified;
6. Vercel Production must prove that exact `main` SHA before any Production DB read/write train operation is allowed;
7. correction/audit/authoring transports continue to reject SHA mismatch;
8. if any of these conditions is unprovable, Production mutation stops.

This fallback controls the actual mutation boundary rather than relying on an unenforced repository UI setting.

## Future upgrade

When GitHub branch/ruleset protection becomes enforceable for this private repository, enable it and require `ATLAS Integrity`. Doing so strengthens prevention of accidental direct pushes, but does not replace the exact-SHA Production gate.

## What this decision does not waive

- no bypass of `ATLAS Integrity`;
- no bypass of exact deployed SHA proof;
- no Production write from a feature branch;
- no merge of a moved/unverified PR head;
- no ad-hoc Production SQL patch;
- no reduction of R0/R1 dry-run, postcondition, or Baseline A requirements.

`ATLAS-RQ-0201` is considered completed by establishing this enforceable-when-available / fail-closed-when-unavailable release gate. The repository's current `protected=false` state remains a known platform limitation, not a falsely completed GitHub protection setting.
