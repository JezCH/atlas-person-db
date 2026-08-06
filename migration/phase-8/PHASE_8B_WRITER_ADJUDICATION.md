# Phase 8B — Legacy Writer Adjudication

Status: REVIEWED / NON-DESTRUCTIVE

## Evidence baseline

- Gate 8A closure merge SHA: `18add949f3e5a234f3029b272c6849a5fc4e510c`
- Phase 8B tooling merge SHA: `56468596a202294ca7864c3796c55f1eb81af435`
- classification workflow run: `31131949063`
- classification artifact: `8976350320`
- artifact digest: `sha256:0ecc6c0ca273eec9ac5da150af65f94c79bf993c93aad0c9d915e4f1c7999a14`

## Confirmed runtime writers

### `app.js`

`app.js` is loaded by `index.html` and exposes direct user-facing mutations against `public.person_politics`.

Confirmed actions:

- record create: `insert(payload)`
- record edit: `update(payload).eq("id", id)`
- record delete: `delete().eq("id", id)`
- spreadsheet import: bulk `insert(payload)`

Classification:

- runtime scope: production authoring UI
- contract: legacy
- retirement blocker: true
- required action: route through a reversible write adapter before any legacy retirement

### `ingest.js`

`index.html` loads `ingest.js` before the reader and application scripts. The script automatically reconciles canonical records on page load and can delete, update, and insert rows in `public.person_politics`.

Confirmed actions:

- delete managed rows absent from canonical data
- delete duplicate canonical activity rows
- update differing canonical rows
- insert missing canonical rows

Classification:

- runtime scope: production page-load reconciliation
- contract: legacy
- retirement blocker: true
- risk: automatic destructive mutation during ordinary page load
- required action: isolate behind an explicit disabled control before write cutover design

## Conditional or inactive writer

### `ingest-supplement.js`

The file contains legacy delete, update, and insert operations, but current `index.html` does not load it.

Classification:

- runtime scope: inactive repository code under the current page shell
- contract: legacy
- retirement blocker: false for current runtime, retained as a latent-risk reference
- required action: keep unloaded and classify for later removal only after repository dependency proof

## Administrator writer

### `admin.js`

The administrator batch interface writes directly to `public.person_politics` by exact activity-key lookup followed by update or insert.

Classification:

- runtime scope: admin
- contract: legacy
- retirement blocker: true
- required action: preserve minimal current function until a reviewed adapter and duplicate-review contract exist

## Non-runtime writer references

Migration scripts, historical evidence scripts, and documentation may contain legacy mutation statements. They are not production runtime writers merely because they match write tokens. They remain classified separately as migration-only, evidence-only, or documentation-only and must not inflate the active writer count.

## Adjudicated writer set

Active blockers:

1. `app.js` — user create/edit/delete/import
2. `ingest.js` — automatic page-load canonical reconciliation
3. `admin.js` — administrator batch insert/update

Latent but currently unloaded:

1. `ingest-supplement.js`

## Safety conclusion

No production source, database object, grant, RLS policy, trigger, function, fallback, rollback target, or data row was changed during this adjudication.

The next implementation gate must first define a disabled write adapter and explicitly separate user-initiated mutations from automatic reconciliation. Direct legacy writes remain enabled until a later protected gate authorizes a reversible transition.