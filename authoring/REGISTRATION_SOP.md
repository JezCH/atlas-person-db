# ATLAS Historical Person Registration SOP

This file is the operational source of truth for ordinary reviewed historical-person registration.

The goal is to keep the safety invariants that protect `atlas_v2` while removing repeated CI, duplicate Production probes, full-dataset inspection, tool rediscovery, and requeue-only pull requests.

## 1. Scope

Use this SOP for ordinary historical Person registration through `atlas-human-authoring/v1`.

Do not use ordinary registration to add a person who is currently holding the office being modeled. Former officeholders may be registered after the modeled term is complete.

Historically real discontinuities are separate Activities. Never invent an exact day, month, or year merely to satisfy a manifest contract.

## 2. Required historical and NamuWiki review

Before writing or submitting a request, establish:

- canonical English Person name and Korean display name when the Person is new;
- canonical English Polity name and Korean display name when the Polity is new;
- relation type and period basis;
- Role label/code when applicable;
- reviewed start/end boundaries with independent certainty/calendar values;
- evidence confidence;
- at least one real Source;
- the exact NamuWiki Person-document outcome: verified document title and URL, or an explicit `not_found` result.

The NamuWiki check is mandatory for every new `atlas-human-authoring/v1` registration after this contract cutover. Do not guess a URL from the Korean name. Verify that the page is for the intended historical Person, including same-name and disambiguation cases. If no exact Person document is found, record `not_found`; omission is not equivalent to document absence.

Reuse existing Person, Polity, Role, Relation Type, Period Basis, and Source identities whenever the live resolver can do so. Role identity is canonical-code based; translated display labels do not create identity.

## 3. Bounded Production preflight

Ordinary registration must use bounded read surfaces. Do not dump or repeatedly inspect the complete normalized Production dataset merely to resolve one registration.

### Person duplicate check

Use the Person search surface once for each materially distinct name or alias that is needed to rule out a duplicate:

```text
/api/atlas-read?__atlas_read_surface=person&q=<person-name>
```

- If the Person and intended Activity already exist, stop. Do not create another request.
- If the Person exists but the requested Activity is new, reuse the Person and add only the missing Activity.
- Do not repeatedly re-run the same manual duplicate search between every GitHub step unless Production state could actually have changed concurrently.

### Polity and Role catalog lookup

Use the bounded catalog surface to resolve existing vocabulary before writing the manifest:

```text
/api/atlas-read?__atlas_read_surface=catalog&kind=polity&q=<polity-name>
/api/atlas-read?__atlas_read_surface=catalog&kind=role&q=<role-name-or-code>
```

The catalog lookup is intentionally capped and returns only matching canonical/display vocabulary required for authoring. It is the normal way to decide whether an existing Polity or Role should be reused.

If no matching Polity or Role exists after the reviewed lookup, a new identity may be authored through the normal Human Authoring resolver. Do not guess that an identity exists, and do not create a near-duplicate merely because the full Production export was not inspected.

The server remains authoritative for Person identity and semantic Activity duplicate enforcement at write time.

## 4. Request creation

For ordinary reviewed historical-person registration, use `atlas-human-authoring/v1` through either the normal Admin authoring path or the reviewed GitHub fallback.

Each request must contain a stable `request_id`. A retry of the same logical request must reuse the same request and request id. Do not mint a new request id merely because a previous Production attempt failed.

Every new human-authoring Person request must contain `external_references.namuwiki` in exactly one of these states:

```json
{
  "status": "linked",
  "checked_at": "2026-08-21",
  "document_title": "정확한 나무위키 문서명",
  "url": "https://namu.wiki/w/..."
}
```

or:

```json
{
  "status": "not_found",
  "checked_at": "2026-08-21"
}
```

`unknown`, omission, guessed URLs, non-NamuWiki URLs, and a `not_found` record carrying a title or URL are invalid for a new registration. Detailed field rules are documented in `authoring/NAMUWIKI_REGISTRATION_POLICY.md`.

The normal authoring transaction stores the normalized NamuWiki decision in the existing immutable `authoring_manifest_runs.result_snapshot` together with the Person/Activity result. There is no separate NamuWiki write or registry file to maintain.

## 5. Pull request validation

A pull request that changes only `authoring/requests/*.json` uses the authoring-only integrity fast path.

The required `test` status remains mandatory. The fast path structurally validates changed manifests and, for `atlas-human-authoring/v1`, rejects a missing or invalid NamuWiki decision. It does not replay P10, P11, the full schema suite, or the human-authoring operational parity rehearsal.

If runtime code, schema, migration, workflow contract, or another non-manifest file changes, the full ATLAS Integrity suite remains mandatory.

P10, P11, and Human Authoring Operational Parity workflows are intentionally skipped for manifest-only registration changes and still run for relevant code changes or explicit manual dispatch.

## 6. Production Apply

After merge to `main`, `ATLAS Authoring Apply` performs the existing Production readiness, exact runtime SHA, exact authoring SHA, GitHub OIDC, P9 duplicate, and transaction-safety checks.

A human-authoring batch is item-isolated:

- every manifest runs through its own `SERIALIZABLE` transaction;
- one failed item is recorded;
- later items in the same batch still run;
- the overall workflow fails if any item failed, and the response contains the failed indexes, manifest paths, and error codes.

The NamuWiki decision is persisted atomically with that request's normal authoring ledger snapshot. A failed authoring transaction therefore cannot leave a successful Person/Activity with a falsely recorded NamuWiki result from the same request.

For a manifest-only registration, do not inspect or wait on unrelated Preview deployments. Query Vercel/deployment state only if Authoring Apply reports a runtime/readiness/SHA problem that actually requires deployment diagnosis.

## 7. Retry policy — no requeue-only PRs

If a manifest is correct but Production Apply failed because of a server bug, deployment timing, transient conflict, or because an earlier batch item failed:

1. fix/deploy the runtime problem if one exists;
2. use `ATLAS Authoring Apply` → `workflow_dispatch`;
3. pass the existing `authoring/requests/<file>.json` path;
4. retry the same immutable request.

Do **not** create a fresh copy, timestamped replacement, or new request id solely to make GitHub select the request again.

A requeue-only pull request is prohibited unless the reviewed request content itself must change.

## 8. Final verification and completion report

A registration is complete only after authoritative Production read verification confirms:

- exactly one intended Person identity;
- the intended Activity exists;
- Polity, Role, relation type, period basis, and temporal boundaries match the reviewed request;
- there is no duplicate or partial/half-written Activity;
- the Person read surface exposes the intended explicit NamuWiki decision when the request was created under this contract.

The completion report must state:

- `나무위키: 연결됨 — <document_title>` for `status: linked`;
- `나무위키: 문서 없음` for `status: not_found`.

For `linked`, the main Person table name is expected to become the visually distinct NamuWiki hyperlink. `not_found` intentionally creates no hyperlink. The absence of a link by itself is never evidence that a NamuWiki document was checked and found absent.

Do not infer registration success merely from a merged PR. Do not force-create a Person after a duplicate response; inspect the existing Production row first.

## 9. Safety invariants that must not be removed

Keep all of the following:

- PostgreSQL `SERIALIZABLE` transaction per request;
- normalized Person/Polity/Role identity reuse;
- canonical Role code identity;
- active Relation Type and Period Basis resolution;
- real Source provenance;
- P9 semantic-key v2 duplicate enforcement;
- immutable request ledger/idempotent replay;
- exact GitHub OIDC, runtime SHA, and authoring SHA boundaries;
- Production readiness checks;
- authoritative Production read verification after write;
- explicit NamuWiki `linked`/`not_found` decision for new human-authoring Person registrations.

Legacy pre-cutover GitHub requests remain replayable without bulk rewriting; new or changed reviewed human-authoring manifests are subject to the current NamuWiki validation contract.

## 10. Execution state machine

Ordinary registration is a forward-only operational state machine:

```text
PREFLIGHT
→ REVIEWED
→ MANIFEST_CREATED
→ PR_OPEN
→ TEST_GREEN
→ MERGED
→ APPLY_VERIFIED
→ READBACK_VERIFIED
```

Once a state has been completed, do not restart generic repository/deployment discovery. Move to the next state unless a concrete gate fails.

Allowed backward movement is narrow:

- historical or manifest validation failure → return to `REVIEWED` or `MANIFEST_CREATED`;
- required CI failure → fix the same branch and return to `PR_OPEN`;
- runtime/readiness failure → diagnose that specific deployment boundary, then retry the same immutable request;
- transient Apply failure → replay the same request;
- Production read-back mismatch → treat the registration as incomplete and diagnose the concrete mismatch.

The following are explicitly not normal registration steps:

- repeated discovery of GitHub/Vercel tool capabilities;
- repeated reads of the same `main` SHA when no write boundary has been reached;
- complete Production dataset dumps to find one Person/Polity/Role;
- Preview deployment inspection for manifest-only work;
- new PRs solely to retry an unchanged request.

Re-read latest `main` exactly at the write boundary before creating the working branch, because parallel work may have changed the repository.

## 11. Procedure summary

Ordinary registration is therefore:

1. historical review and exact NamuWiki Person-document check;
2. bounded Production Person duplicate check;
3. bounded Polity/Role catalog lookup;
4. submit one reviewed `atlas-human-authoring/v1` request with explicit `linked` or `not_found` NamuWiki status;
5. for GitHub fallback work, data-only PR → required manifest validation;
6. Production Apply or normal Admin authoring transaction;
7. authoritative Production read verification;
8. report `나무위키: 연결됨 — <문서명>` or `나무위키: 문서 없음`;
9. retry the same immutable request when an unchanged GitHub manifest needs another attempt.

No full Production dump, repeated P10/P11 rehearsal, Preview-deployment sightseeing, or requeue-only PR is part of the normal path.
