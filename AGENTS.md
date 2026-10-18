# ATLAS Codex Worker Instructions

This file is an entry point, not a second source of project policy.

## Canonical project rules
- Read `WORK_EXECUTION.md` before changing code or data. It is authoritative if any instruction here conflicts.
- Load only the specific task checkpoint, affected files, and direct dependencies; do not replay entire historical issue queues or audit the whole repository.
- Independent research, review, implementation, and tests may proceed in parallel. Serialize only actual conflicting changes to the same resource, identity, or contract.
- Use the repository's existing canonical writers, authoring → compile → runtime separation, tests, and completion contracts. Never bypass security or stale-write checks.
- Never fabricate historical facts, chronology, coordinates, completeness, or Production verification.

## Safety and cost
- Never delete or retire historical/canonical data, perform destructive schema operations, or make unapproved Production changes.
- Never invoke Vercel Sandbox in the production account. Do not repeatedly poll Production, trigger bulk reads, or retry HTTP 402. Respect `docs/VERCEL_HOBBY_QUOTA_GUARD.md`.
- Do not upgrade paid plans, add paid AI/API dependencies, or introduce any new recurring charges without explicit user approval.
- For UI changes, CI or merge alone does not mean Production-visible completion. Follow `WORK_EXECUTION.md`.

## Work unit
1. Establish the exact task and its current authoritative state.
2. Work on the smallest relevant touch set.
3. Run focused checks and respect required preflight/approval gates.
4. Record a durable checkpoint with results, caveats, and exact resume point.
5. Stop after completing the requested work unit unless explicitly asked to process more.

## Automation-specific constraint
GitHub issue dispatch, tests, and status checks are not proof of an AI execution trigger. Never claim a Codex Cloud or ChatGPT Work agent was automatically launched unless an actual supported integration was invoked and its run was verified. Do not use unofficial ChatGPT UI scripting, credential sharing, or a ChatGPT Plus subscription as an API key.
