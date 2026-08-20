# ATLAS Historical Person Registration SOP

This file is the operational source of truth for ordinary reviewed historical-person registration.

The goal is to keep the safety invariants that protect `atlas_v2` while removing repeated CI, duplicate Production probes, and requeue-only pull requests.

## 1. Scope

Use this SOP for ordinary historical Person registration through `atlas-human-authoring/v1`.

Do not use ordinary registration to add a person who is currently holding the office being modeled. Former officeholders may be registered after the modeled term is complete.

Historically real discontinuities are separate Activities. Never invent an exact day, month, or year merely to satisfy a manifest contract.

## 2. Required historical and NamuWiki review

Before writing a request, establish only the facts needed by the Activity model:

- canonical English Person name and Korean display name when the Person is new;
- canonical English Polity name and Korean display name when the Polity is new;
- relation type and period basis;
- Role label/code when applicable;
- reviewed start/end boundaries with independent certainty/calendar values;
- evidence confidence;
- at least one real Source;
- the exact NamuWiki Person-document outcome: verified document title and URL, or an explicit `not_found` result.

The NamuWiki check is mandatory for every new `atlas-human-authoring/v1` registration created after the NamuWiki registration contract cutover. Do not guess a URL from the Korean name. Verify that the page is for the intended historical Person, including same-name and disambiguation cases. If no exact Person document is found, record that outcome explicitly instead of omitting the field.

Reuse existing Person, Polity, Role, Relation Type, Period Basis, and Source identities whenever the live resolver can do so. Role identity is canonical-code based; translated display labels do not create identity.

## 3. Production duplicate check

Use the bounded Production Person read/search once before creating a new registration batch.

- If the Person and intended Activity already exist, stop. Do not create another request.
- If the Person exists but the requested Activity is new, reuse the Person and add only the missing Activity.
- Do not repeatedly re-run the same manual duplicate search between every GitHub step unless Production state could actually have changed concurrently.

The server remains authoritative for Person identity and semantic Activity duplicate enforcement at write time.

## 4. Manifest creation

For ordinary reviewed historical-person batches, use `atlas-human-authoring/v1`.

Each immutable request must contain a stable `request_id`. A retry of the same logical request must reuse the same manifest and request id. Do not mint a new request id merely because a previous Production attempt failed.

Create a new manifest/request id only when the reviewed request content itself has changed materially.

Every new human-authoring Person request must also contain `external_references.namuwiki` in one of these two states:

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

`unknown`, omission, guessed URLs, non-NamuWiki URLs, and a `not_found` record carrying a URL are invalid for a new registration.

After creating or changing human-authoring requests, regenerate the deterministic UI/reporting registry:

```sh
node scripts/sync-person-namuwiki-registry.mjs --write
```

Commit the resulting `authoring/person-namuwiki-registry.json` together with the request manifests. Detailed field rules are documented in `authoring/NAMUWIKI_REGISTRATION_POLICY.md`.

## 5. Pull request validation

A pull request that changes only `authoring/requests/*.json` plus the generated `authoring/person-namuwiki-registry.json` uses the authoring-only integrity fast path.

The required `test` status remains mandatory. The fast path validates the changed manifests, requires an explicit NamuWiki outcome for new human-authoring Person requests, and verifies that the generated NamuWiki registry exactly matches the reviewed manifests. It does not replay P10, P11, the full schema suite, or the human-authoring operational parity rehearsal.

If any runtime code, schema, migration, workflow contract, or other non-authoring file changes, the full ATLAS Integrity suite remains mandatory.

P10, P11, and Human Authoring Operational Parity workflows are intentionally skipped for manifest-only registration changes and still run for relevant code changes or explicit manual dispatch.

## 6. Production Apply

After merge to `main`, `ATLAS Authoring Apply` performs the existing Production readiness, exact runtime SHA, exact authoring SHA, GitHub OIDC, P9 duplicate, and transaction-safety checks.

A human-authoring batch is item-isolated:

- every manifest runs through its own `SERIALIZABLE` transaction;
- one failed item is recorded;
- later items in the same batch still run;
- the overall workflow fails if any item failed, and the response contains the failed indexes, manifest paths, and error codes.

This prevents one bad request from silently blocking all later registrations.

## 7. Retry policy — no requeue-only PRs

If a manifest is correct but Production Apply failed because of a server bug, deployment timing, transient conflict, or because an earlier batch item failed:

1. fix/deploy the runtime problem if one exists;
2. use `ATLAS Authoring Apply` → `workflow_dispatch`;
3. pass the existing `authoring/requests/<file>.json` path;
4. retry the same immutable request.

Do **not** create a fresh copy, timestamped replacement, or new request id solely to make GitHub select the request again.

A requeue-only pull request is prohibited unless the manifest content itself must change and therefore needs a new reviewed request version.

## 8. Final verification and completion report

A registration is complete only after authoritative Production read verification confirms:

- exactly one intended Person identity;
- the intended Activity exists;
- Polity, Role, relation type, period basis, and temporal boundaries match the reviewed request;
- there is no duplicate or partial/half-written Activity.

The registration completion report must also repeat the manifest's explicit NamuWiki result:

- `나무위키: 연결됨 — <document_title>` for `status: linked`;
- `나무위키: 문서 없음` for `status: not_found`.

For a linked record, the main Person table name is expected to become the visually distinct NamuWiki hyperlink through the generated registry. `not_found` intentionally creates no hyperlink. The absence of a link by itself is never evidence that a NamuWiki document was checked and found absent.

Do not infer success merely from a merged PR. Do not force-create a Person after a duplicate response; inspect the existing Production row first.

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
- explicit NamuWiki `linked`/`not_found` decision for new human-authoring Person registrations;
- deterministic NamuWiki registry parity in CI.

These are safety controls, not procedural overhead.

## 10. Procedure summary

Ordinary batch registration is therefore:

1. historical review and exact NamuWiki Person-document check;
2. one bounded Production duplicate check;
3. create reviewed `atlas-human-authoring/v1` manifests with explicit `linked` or `not_found` NamuWiki status;
4. regenerate `authoring/person-namuwiki-registry.json`;
5. data-only PR → required authoring manifest + NamuWiki registry validation;
6. merge;
7. Production Apply;
8. authoritative Production read verification;
9. report `나무위키: 연결됨 — <문서명>` or `나무위키: 문서 없음`;
10. retry the same manifest by workflow dispatch if an unchanged request needs another attempt.

No repeated P10/P11 rehearsal and no requeue-only PR are part of the normal path.
