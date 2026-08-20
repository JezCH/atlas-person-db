# NamuWiki reference policy for Person registration

This policy applies to every new `atlas-human-authoring/v1` Person registration created after this contract is merged.

## Required registration decision

Before the registration request is committed, the operator must check whether the exact historical Person has a NamuWiki document. Do not infer a URL from the Korean display name and do not accept a same-name or adjacent-topic page without confirming that it is the intended Person.

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

Omission, `unknown`, guessed URLs, and non-NamuWiki URLs are not valid decisions for a new human-authoring registration.

## Registry and UI

`authoring/person-namuwiki-registry.json` is a deterministic projection of reviewed human-authoring requests. After adding or changing a request, regenerate it with:

```sh
node scripts/sync-person-namuwiki-registry.mjs --write
```

CI verifies that the committed registry exactly matches the manifests. A `linked` record is used by the Person main table to turn the Person name itself into the visually distinct NamuWiki hyperlink. A `not_found` record intentionally creates no hyperlink, but preserves the explicit checked status for reporting and future re-checks.

Legacy requests created before this cutover remain replayable and are not bulk-edited merely to satisfy the new metadata contract. Existing legacy UI mappings, such as the already reviewed Imhotep mapping, remain supported as compatibility fallbacks.

## Registration completion report

Every registration completion report must state the NamuWiki outcome explicitly:

- `나무위키: 연결됨 — <document_title>` when `status` is `linked`.
- `나무위키: 문서 없음` when `status` is `not_found`.

The absence of a link must never be silently interpreted as `not_found`; only the explicit manifest status is authoritative for registrations covered by this policy.
