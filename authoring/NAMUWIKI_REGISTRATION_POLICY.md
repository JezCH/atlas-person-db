# NamuWiki reference policy for Person registration

This policy applies to every new `atlas-human-authoring/v1` Person registration created after this contract is merged. The explicit provider-access deferral below is the only exception to the normal required-decision rule.

## Required registration decision

Before the registration request is committed, the operator must check whether the exact historical Person has a NamuWiki document. Do not infer a URL from the Korean display name and do not accept a same-name, disambiguation, or adjacent-topic page without confirming that it is the intended Person.

Every new human-authoring request must contain exactly one explicit decision under `external_references.namuwiki`.

When a document exists:

```json
"external_references": {
  "namuwiki": {
    "status": "linked",
    "checked_at": "2026-08-21",
    "document_title": "임호텝",
    "url": "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D"
  }
}
```

When no Person document can be found after the check:

```json
"external_references": {
  "namuwiki": {
    "status": "not_found",
    "checked_at": "2026-08-21"
  }
}
```

Omission, `unknown`, guessed URLs, non-NamuWiki URLs, and a `not_found` record carrying a title or URL are not valid decisions for a new human-authoring registration.

## Explicit provider-access deferral for GitHub batches

When a provider access restriction has been disclosed and the user instructs registration to continue, historical Person/Activity registration may proceed through the existing authenticated GitHub transport while the NamuWiki review remains pending. This exception does not turn a failed search or blocked page into `not_found`.

The reviewed manifest must omit `external_references.namuwiki` and include:

```json
"review_deferrals": {
  "namuwiki": {
    "reason_code": "provider_access_blocked",
    "attempted_at": "2026-09-02",
    "reason": "Describe the actual provider restriction and outstanding review.",
    "authorization": "user_requested_registration_after_disclosed_block"
  }
}
```

The immutable Git manifest is the pending-review record. No fabricated NamuWiki decision or URL is written; the Person remains unreviewed unless a reviewed value already exists, which the service reuses. Link verification is outstanding even after Person/Activity registration succeeds and must be reported separately. Do not claim complete NamuWiki review for these records.

This is a bounded GitHub batch exception. Bare omission, `unknown` decisions, and simultaneous decisions plus deferrals remain invalid for new manifests. The Admin path, OIDC authentication, source requirements, historical review, duplicate checks, transaction boundaries, overwrite protections, and canonical read-back are unchanged. Complete the reference review later through the existing NamuWiki link workflow once verified evidence is available.

## Authoritative storage and read path

The NamuWiki decision is part of the human-authoring request itself. The normal authoring transaction persists the normalized decision in the existing immutable `atlas_v2.authoring_manifest_runs.result_snapshot.external_references.namuwiki` ledger snapshot together with the Person/Activity result. No separate NamuWiki database table or second write is required.

The Person read service exposes the latest explicit NamuWiki decision recorded for that Person. A `linked` decision is consumed by the Person main table so the visible Person name itself receives the existing visually distinct NamuWiki hyperlink. A `not_found` decision intentionally creates no hyperlink but remains machine-readable for reporting and future re-checks.

The absence of a link is not equivalent to `not_found`; only an explicit stored decision is authoritative.

## Admin and GitHub registration paths

The normal Admin `/api/atlas-authoring` path fails closed if the NamuWiki decision is omitted. The form requires the operator to select `linked` or `not_found`; linked records require the exact document title and canonical `https://namu.wiki/w/...` URL.

For reviewed GitHub batch registrations, changed `atlas-human-authoring/v1` manifests are rejected by CI when the NamuWiki decision is omitted or invalid. Legacy pre-cutover GitHub requests remain replayable without being bulk-edited merely to satisfy the newer metadata contract.

Existing reviewed legacy UI mappings, such as Imhotep, remain compatibility fallbacks until those Persons obtain an authoritative ledger decision through a later reviewed authoring request.

## Registration completion report

Every registration completion report must state the NamuWiki outcome explicitly:

- `나무위키: 연결됨 — <document_title>` when `status` is `linked`.
- `나무위키: 문서 없음` when `status` is `not_found`.

The operator must never silently treat an unchecked or unresolved state as `문서 없음`.
