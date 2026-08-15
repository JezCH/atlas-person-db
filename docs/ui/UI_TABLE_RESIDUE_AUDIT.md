# UI-T11 Table Residue Audit

Status: **audited / dead presentation adapter removed**

Baseline branch: `agent/ui-t01-table-baseline-renderer`.

## Removed dead architecture

The former `atlas-person-table-view.js` presentation adapter was deleted in UI-T1.

That adapter previously observed Person-card DOM mutations and decorated the already-rendered card structure into a table presentation. The direct Main renderer now owns table headers and rows, so the post-render presentation observer has no valid runtime responsibility.

Repository search after removal found no remaining references to:

- `atlas-person-table-view.js`
- `ATLAS_PERSON_TABLE_VIEW`
- `data-person-table-decorated`

## Intentionally retained compatibility selectors

The following class vocabulary still appears even though the visual result is a table:

- `person-card`
- `person-card-grid`
- `person-card-activity*`

These names are **not dead code** at this checkpoint. `atlas-person-main.js`, `atlas-person-main.css`, and `atlas-person-table-view.css` still use them as shared semantic/style hooks. Renaming them would be a cosmetic refactor with no user-visible benefit and would increase regression risk.

They may be renamed only in a future isolated cleanup after tests prove that no browser behavior, selector, mobile search count, selected-row state, or authoring integration depends on them.

## Mobile card conversion residue

The old global `styles.css` still contains card conversion rules for the legacy `.table-scroll` surface. Rather than deleting global rules that may still serve non-authoritative compatibility paths, UI-T10 applies a more specific table-first override under `.relationship-authoring-body`.

The effective Main contract is therefore:

- authoritative Persons: table on desktop/mobile
- curated non-timeline Persons: table on desktop/mobile
- full relationship authoring table: table on desktop/mobile

No current Main Person data surface intentionally switches to a card data model at a mobile breakpoint.

## MutationObserver audit

Presentation-level Person-table observation has been removed.

Remaining Main `MutationObserver` use is limited to synchronization with the existing legacy Activity authoring DOM after edit/delete/import operations. It does not construct, decorate, or reinterpret table data.

The responsive shell also uses observers only for generated UI mechanics such as maintaining drawer controls/sidebar action decoration; those observers do not create a second data model or read path.

## Deletion rule

Do not remove a compatibility selector merely because its name contains `card`, `legacy`, or an older milestone label. A file or selector is removable only when:

1. no runtime import/reference remains,
2. no test contract depends on it,
3. no event bridge depends on it,
4. no responsive override depends on it, and
5. removal does not reduce historical information or authoring accessibility.
