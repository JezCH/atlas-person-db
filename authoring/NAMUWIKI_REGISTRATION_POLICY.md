# NamuWiki reference policy for Person registration

This policy applies to every new or genuinely unreviewed `atlas-human-authoring/v1` Person registration created after this contract is merged.

NamuWiki is part of the registration review bundle. It is not a routine post-registration cleanup pass.

## Required registration decision

Before a new registration can be declared complete, the operator must determine whether the exact historical Person has an independent NamuWiki document.

Use the same search standard as the rolling #820 re-audit:

1. preferred Korean display name and spacing variants;
2. canonical English name and transliteration variants;
3. local/native name, aliases, regnal names, titles, sobriquets, dynasty-qualified forms, and disambiguation forms;
4. external indexed search or mirror discovery when direct provider search is blocked;
5. related dynasty/Polity/event/list pages and reverse-link target recovery to discover the actual document title;
6. same-Person verification against homonyms, mentions, redirects to different people, and broken targets.

A provider block, one failed direct fetch, or one failed exact-title search is not evidence that a document does not exist.

## Linked decision

When an independent Person document is verified:

```json
"external_references": {
  "namuwiki": {
    "status": "linked",
    "checked_at": "2026-09-08",
    "document_title": "exact document title",
    "url": "https://namu.wiki/w/..."
  }
}
```

The title and canonical `https://namu.wiki/w/...` URL must identify the same historical Person.

## Confirmed not-found decision

`not_found` is allowed only after an exhaustive search, never merely because provider access failed.

New pushed manifests must include compact search evidence:

```json
"external_references": {
  "namuwiki": {
    "status": "not_found",
    "checked_at": "2026-09-08",
    "search_evidence": {
      "exhaustive": true,
      "attempted_variants": ["한글 표기", "English / native variant"],
      "evidence_note": "Briefly state the search paths used and why no independent same-Person document was verified."
    }
  }
}
```

The evidence is intentionally compact. It proves that a real search happened without creating a separate research artifact or verbose checklist for every Person.

If exhaustive review cannot support either `linked` or confirmed `not_found`, keep the registration in explicit HOLD/unresolved state. Do not fabricate a decision merely to finish the batch.

## Provider access is not a completion exception

`provider_access_blocked` may be recorded as an operational fact while research continues, but it is not a terminal registration outcome for a new/unreviewed Person.

A blocked direct provider path should trigger alternate indexed/mirror/related-page discovery, not automatic deferral to a later cleanup campaign.

Legacy immutable pre-v7 manifests remain replayable under their historical contract; this exception exists for replay compatibility only and must not be used for newly prepared requests.

## Efficient execution

NamuWiki review follows the universal registration ingest policy:

- perform it in the same bundled REVIEW as the rest of the Person;
- reuse an already-proven linked state for an existing reviewed Person;
- parallelize independent Person searches in cohorts;
- store the decision in the canonical Human Authoring request/ledger where supported;
- use a companion NamuWiki write only when the canonical writer boundary truly requires it;
- do not create a second registration API, per-Person workflow, or separate research database;
- do not repeat the search after authoritative verification unless a concrete mismatch or later re-audit requirement exists.

## Authoritative storage and read path

The NamuWiki decision is part of the Human Authoring request. The normal authoring path persists the normalized decision in the existing immutable `atlas_v2.authoring_manifest_runs.result_snapshot.external_references.namuwiki` ledger snapshot together with the Person/Activity result.

A verified linked decision is consumed by the Person read surface so the visible Person name can use the existing NamuWiki hyperlink behavior. A confirmed `not_found` decision intentionally creates no link but remains machine-readable.

Absence of a link is never equivalent to `not_found`; only an explicit reviewed stored decision is authoritative.

## Completion report

Every new Person registration completion report must state one of:

- `나무위키: 연결됨 — <document_title>`;
- `나무위키: 전수검색 후 문서 미확인` with the stored search evidence;
- `나무위키: HOLD` when review is genuinely unresolved.

Unchecked/provider-blocked state must never be reported as `문서 없음` or as a completed NamuWiki review.
