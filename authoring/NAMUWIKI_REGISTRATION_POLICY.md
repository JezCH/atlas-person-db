# NamuWiki reference policy for Person registration

This policy applies to every new `atlas-human-authoring/v1` Person registration created after this contract is merged.

**NamuWiki review is part of registration completion. It is not optional follow-up work.**

## Required registration decision

Before a new Person registration request is committed, the operator must check whether the exact historical Person has a NamuWiki document. Do not infer a URL from the Korean display name and do not accept a same-name, disambiguation, derivative, or adjacent-topic page without confirming that it is the intended Person.

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

When no independent Person document can be found after a reasonable review:

```json
"external_references": {
  "namuwiki": {
    "status": "not_found",
    "checked_at": "2026-08-21"
  }
}
```

Omission, `unknown`, guessed URLs, non-NamuWiki URLs, and a `not_found` record carrying a title or URL are not valid decisions for a new human-authoring registration.

## Default discovery method: external search index first

Routine NamuWiki review uses the successful discovery method established by the dedicated linking work: **search an external web index first**, inspect indexed title/snippet/redirect evidence, and only after the exact Person document is established convert the verified document title to the canonical `https://namu.wiki/w/...` URL used by ATLAS.

Direct retrieval of `namu.wiki` is **not** a normal review step and is not required for acceptance. Direct-site automation may be blocked even when a valid document exists, so a direct-site block is never by itself evidence for `not_found` and never excuses skipping registration-time review.

Required decision order:

1. search external indexes using the Korean name plus material aliases/disambiguators;
2. inspect indexed title, snippet, redirect, and disambiguation evidence for the exact historical Person;
3. accept `linked` only when the evidence identifies the intended independent Person document;
4. preserve the verified document title/path and store the canonical `https://namu.wiki/w/...` URL;
5. use `not_found` only after a reasonable indexed search review finds no independent Person document;
6. if the evidence is still insufficient for either decision, **do not close registration**.

## Hard registration-completion gate

A new or previously-unreviewed Person cannot finish registration without a reviewed NamuWiki disposition.

If the review cannot currently reach exact `linked` or reviewed `not_found`:

- keep the candidate in `QUEUED` or `BLOCKED`;
- do not create or merge a new Human Authoring manifest that omits the decision;
- do not mark the queue row `APPLIED`, `REGISTERED`, or `VERIFIED_AUTHORING_ONLY`;
- do not create a separate normal follow-up task whose only purpose is to perform the NamuWiki review that registration skipped.

`review_deferrals.namuwiki` is **retired for new registration manifests**. Historical immutable pre-cutover manifests may remain replay-compatible through legacy service behavior, but that compatibility is not a valid path for new registration work.

For an existing Person whose live NamuWiki state is already reviewed as `linked` or `not_found`, reuse that exact live state. Do not re-search NamuWiki merely because another Activity is being added.

## Authoritative storage and read path

The NamuWiki decision is part of the human-authoring request itself. The normal authoring transaction persists the normalized decision in the Person external-reference state and in the immutable authoring result snapshot together with the Person/Activity result. No second post-registration NamuWiki write is required.

The Person read service exposes the latest explicit NamuWiki decision recorded for that Person. A `linked` decision is consumed by the Person main table so the visible Person name receives the NamuWiki hyperlink. A `not_found` decision intentionally creates no hyperlink but remains machine-readable for reporting and future re-checks.

The absence of a link is not equivalent to `not_found`; only an explicit reviewed decision is authoritative.

## Admin and GitHub registration paths

The normal Admin `/api/atlas-authoring` path fails closed for a new/unreviewed Person if the NamuWiki decision is omitted. Existing reviewed Persons may reuse their live state.

For reviewed GitHub batch registrations, changed `atlas-human-authoring/v1` manifests are rejected by CI when the NamuWiki decision is omitted, deferred, or invalid. Legacy pre-cutover GitHub requests remain replayable without bulk rewriting solely to satisfy the newer metadata contract.

## Registration completion report

Every completed registration must state the NamuWiki outcome explicitly:

- `나무위키: 연결됨 — <document_title>` when `status` is `linked`;
- `나무위키: 문서 없음` when `status` is `not_found`;
- `나무위키: 기존 검토값 재사용` when an already-reviewed existing Person reused its authoritative state.

There is no completed-registration outcome called “deferred”. An unresolved NamuWiki review means the registration itself is not complete.
