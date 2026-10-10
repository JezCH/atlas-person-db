# POLITY-P1-03R-A2 — scoped Production target attestation and UUID census runner

**2026-10-10 / user-requested next work unit.** This document is a bounded execution checkpoint, not a claim that any Production SQL query ran.

## Current real-world evidence
- The real service alias `atlas-person-db.vercel.app` returned an `atlas-runtime-identity/v1` payload: Production, Git SHA `0c9746028efa307d69580df08a18dfcf040af8b8`, branch `main`. The newer main Vercel deployment was canceled and **does not** replace the READY deployment serving the alias.
- The same live alias returned Runtime publication: Authoring 2,523, Runtime 2,523, `publication_current=true`. This proves the deployed application can read its configured database; **it does not attest which Supabase project backs that database**.
- The existing Admin Inspector and Admin System Status APIs require a signed admin session; the live `SUPABASE_DB_URL` is sensitive and its decrypted value cannot be retrieved by current connected read tools. No administrator session was bypassed. The historical 2026-10-08 connected Supabase audit identified project ref `wfrbxltvpmlprgwfysxq` and missing manifest IDs. Its zero-row result is **not** a fresh Production census.

## New narrow executable audit

`scripts/audit-place-production-authority.mjs` reads the retained `data/core/polity-place-function-authority-backfill.v1.json` and performs the following, **only inside an already trusted Vercel Production process with that process's existing environment**:

1. Fail closed without connecting if `VERCEL !== 1`, `VERCEL_ENV !== production`, the DB URL cannot be classified as a recognized Supabase dedicated host/pooler username, or the extracted Supabase project ref does not match the prior audited project. **No URL, credentials, user name, host, or observed alternative ref are output.** A different target yields `DIFFERENT`, not a guessed identity.
2. Connect using the same project `createPostgresClient` dependency; start `REPEATABLE READ READ ONLY`, set a bounded local query timeout, then inspect only six specific `atlas_v2` relations: `polities`, `places`, `sources`, `place_sources`, `polity_place_functions`, `polity_place_function_sources`. End with `ROLLBACK` even on error.
3. Compare exact 13 Polity UUIDs, 20 Place UUIDs/keys, 27 Source UUIDs/keys, 23 function fact keys/semantic tuples, 28 Place–Source links and 31 function–Source links. Report exact missing/mismatched keys and keys colliding with other rows; preserve unrelated facts for the 13 Polities, never assume zero-Activity/extra fact rows are invalid.
4. Report one of `AUTHORITY_UNPROVEN` (no SQL attempted), `TARGET_CONFIRMED_GAP`, `TARGET_CONFIRMED_COMPLETE`, or `AUDIT_FAILED`. A successful source test or an existing Runtime publication is **not** a substitute for that result.

**Note:** host/username attestation proves a recognizable Supabase project reference encoded by the configured connection URL. If the actual Production URL uses a different indirection or identity scheme, the script intentionally returns `AUTHORITY_UNPROVEN`. It does not seek project identity through information-leaking logs or network probes.

## Execution / noninterference

This **repo script is not a Vercel function endpoint and has no public route**. Installing it alone does not query Production, change Production data, or trigger an extra reader. The existing Vercel connection in this chat does not provide a privileged shell inside the active deployed Production function or an authorized Supabase SQL tool. Therefore **do not pretend this runner was executed against Production**. When a trusted production-scoped execution facility is available, an authorized operator can execute `node scripts/audit-place-production-authority.mjs` with the environment already present in the trusted process. Do not paste/expose DB URLs or auth tokens in issue comments, CI logs, chat, or a new public endpoint. No unreviewed `vercel env pull`/Production-secret export, and no request to recreate the removed #1899 one-shot backfill.

A Supabase connector can independently perform a **read-only** census of the connected project, but that alone does not establish that the Vercel Production connection is the same project. Confirm current deployed Production SHA and target together immediately before acting.

## Durable completion boundary

- **Completed:** designed/committed an independently executable, mock-tested, read-only target-aware audit with strict fail-closed checks. This is preparation/instrumentation within P1-03R-A2, **not completion of its Production attestation**.
- **Unfinished exact resume:** execute it in a genuinely authorized **Production-bound read-only session**, capture sanitized result including matched target and all UUID counts, then, *only if positive*, move into separately reviewed P1-03R-B evidence/source/identity validation. Never automatically proceed to P1-03R-C apply/cleanup or user-parked P14.
- No other active Polity registry seed, UI, YouTube, Person or Production configuration was edited.
