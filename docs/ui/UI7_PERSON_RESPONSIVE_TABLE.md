# UI-7 Person Responsive Table

## Goal

Keep the Person-centered authoritative read model introduced by UI-3/UI-6R4 while presenting the Person list as a table on both desktop and mobile.

## Contract

- No second Person read path.
- No mutation path in the table presentation layer.
- Preserve UI-6R4 compact Activity tuples exactly as rendered by `atlas-person-main.js`.
- Desktop and mobile use the same Person row model.
- Mobile does not switch to cards; the table remains horizontally scrollable and keeps the Person identity column sticky.
- Person selection, detail reads, filters, search, add/edit/delete, Excel tools, and the complete relationship table continue to be owned by the existing Main/legacy authoring surfaces.

## Columns

1. Person identity
2. Main activity range
3. Activity relation tuples
4. Activity count
5. Historicity and Person type

Activity relation tuples preserve Polity, Relation, Role, Period Basis, boundary period, chronology status, and confidence from the bounded list payload.

## Isolation

`atlas-person-table-view.js` is a presentation-only decorator. It listens to `atlas-person-main-rendered` and reorganizes only the already-rendered Person row DOM. It does not fetch, read detail data, write data, or instantiate the server write adapter.
