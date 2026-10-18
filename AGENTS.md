# ATLAS Codex Worker Instructions

This file is an entry point, not a second source of project policy.

## Canonical project rules
- Read `WORK_EXECUTION.md` before changing code or data. It is authoritative if any instruction here conflicts.
- Load only the specific task checkpoint, affected files, and direct dependencies; do not replay entire historical issue queues or audit the whole repository.
- Independent research, review, implementation, and tests may proceed in parallel. Serialize only actual conflicting changes to the same resource, identity, or contract.
- Use the repository's existing canonical writers, authoring → compile → runtime separation, tests, and completion contracts. Never bypass security or stale-write checks.
- Never fabricate historical facts, chronology, coordinates, completeness, or Production verification.

## Safety and cost
- Do not perform unauthorized deletion, retirement, identity-changing or destructive schema operations, or unapproved Production mutations. Explicitly authorized, governed changes may proceed only through the canonical writer and the applicable fail-closed preflight, evidence, rollback/replay, and completion verification requirements in `WORK_EXECUTION.md`.
- Never invoke Vercel Sandbox in the production account. Avoid repeated Production polling and unbounded, repeated, or nonessential Production bulk reads; preserve authorized, bounded read-backs required for governed mutations or audits. Treat HTTP 402 as terminal and do not retry it. Respect `docs/VERCEL_HOBBY_QUOTA_GUARD.md`.
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
