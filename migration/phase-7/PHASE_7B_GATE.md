# Phase 7B Gate — Observability, Live Dual-Source Validation, and Rollback Readiness

Status: PASS

Phase 7B is closed after static observability controls, rollback controls, live legacy/v2 reads, and controlled fallback injection all passed with immutable evidence.

## Baseline

- Phase 7 plan merge SHA: `834e4071ed9cdcf4a35fa985861ebdb8136895db`
- Phase 7A merge SHA: `101daa0e34793bf2dfca6ae5f4a6ab40dd0a56d6`
- Phase 7B static controls merge SHA: `6fb5396b0b0612a16540cb521ebadcfc9b81ba64`
- Phase 7B live-smoke merge SHA: `b137c91084044d1422a063b6f2fa68b7a9537c52`

## Static control evidence

Pull request `#14` introduced:

- non-sensitive structured reader outcomes
- requested source, effective source, fallback state, row count, validation-failure count, and timestamp
- exact legacy rollback manifest
- static guards preserving writes to `public.person_politics`
- Phase 7A and Phase 7B contract tests

Verified CI:

- Phase 6 Reader Contract: PASS
- Phase 7A Control Plane: PASS
- Phase 7B Observability and Rollback: PASS
- Phase 7B workflow run: `31101303582`
- failures: 0

## Live dual-source and fallback evidence

- Workflow: `Phase 7B Live Dual-Source Smoke`
- Workflow run: `31104101781`
- Run number: `1`
- Event: `workflow_dispatch`
- Workflow result: `success`
- Workflow head SHA: `b137c91084044d1422a063b6f2fa68b7a9537c52`
- Approved checked-out SHA: `b11931d792cfae24c5ec9e14706ec2293898f177`
- Artifact ID: `8968753297`
- Artifact name: `phase-7b-live-smoke-b11931d792cfae24c5ec9e14706ec2293898f177`
- Artifact digest: `sha256:c654a885d63aecd5dbaa172dc396e8c6b5c67a03a9a8a39cd7c088b94f080ce3`
- Report digest: `sha256:9505bd58432368173eedf535cc2e2e3581c0a73c5fd7181c8d02ec6795f13f00`

All workflow steps passed:

- approved-target checkout
- authorization-input validation
- database-secret verification
- PostgreSQL client installation
- live dual-source smoke and fallback injection
- evidence upload

## Verified live state

### Legacy path

- requested source: `legacy`
- effective source: `legacy`
- fallback: `false`
- row count: `319`
- validation failures: `0`
- reader outcome dispatched exactly once

### V2 shadow path

- requested source: `v2-shadow`
- effective source: `v2-shadow`
- fallback: `false`
- row count: `349`
- validation failures: `0`
- reader outcome dispatched exactly once

### Controlled fallback path

The v2 read failure was injected only in an in-memory mock client after read-only live snapshots were captured. No database mutation occurred.

- requested source: `v2-shadow`
- effective source: `legacy`
- fallback: `true`
- row count: `319`
- validation failures recorded: `1`
- fallback diagnostic present
- reader outcome dispatched exactly once

## Safety verification

- production read default remains `legacy`
- production write target remains `public.person_politics`
- no database mutation was performed
- snapshot SQL used `begin read only` and ended with `rollback`
- no schema, RLS, grant, or privilege change occurred
- no compatibility-view or v2-table mutation exists in the application write path
- observability does not record row payloads, notes, URLs, keys, tokens, or secrets
- emergency rollback remains an exact one-variable source declaration reversal

## Gate decision

Phase 7B is closed as PASS.

This gate authorizes preparation of a separate Phase 7C production-read activation change. It does **not** itself authorize or perform activation.

At gate closure:

- production reads remain `legacy`
- production writes remain `public.person_politics`
- fallback remains enabled
- the compatibility source remains application-role read-only
- Phase 7C must be a separately reviewed single-purpose change with exact-SHA authorization, protected deployment, preflight evidence, immediate post-deploy smoke, and a prepared rollback package
- Phase 8 remains unauthorized
