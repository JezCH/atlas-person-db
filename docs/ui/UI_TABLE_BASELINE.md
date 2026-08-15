# ATLAS Main Table UI Baseline

Status: **UI-T0 frozen baseline / UI-T1 direct-render contract**

Baseline source before the T0/T1 refactor: `main@164fee7c1b8cb9d0130bd9f453be0d99b1c26242`.

## Purpose

This document freezes the table-oriented Main UI as the architectural baseline for the remaining UI-T work. The table is the fast comparison surface; Person detail remains the information-complete historical surface; Admin remains the safe raw/system inspection surface; authoring stays in explicit forms and mutation controls.

## Authoritative list model

The Persons table is rendered from the existing Person list read model. Compact Activity information MUST come from correlated `activity_summaries` rows. Independent facet arrays MUST NOT be recombined to invent an Activity tuple.

A compact Activity summary keeps these values correlated:

- Activity identity
- Polity
- Relation Type
- Role when present
- Period Basis
- Start boundary
- End boundary
- chronology status
- confidence
- notes when available to the bounded list-read contract

## Table contract

The Main Persons table uses one renderer in `atlas-person-main.js`.

Visible overview columns are:

1. Person identity
2. Main activity range
3. Correlated Activity relationship information
4. Activity count

The Activity relationship cell exposes the compact semantic tuple as available: Polity + Relation, Role + Period Basis, and Activity period. Ordinary default diagnostics may be visually folded; meaningful exceptional chronology/confidence states remain visible.

Default `historicity=historical` / `person_type=historical` values are not repeated on every row. Non-default or missing authoritative values remain visible rather than being silently converted to historical.

## Master-detail contract

Selecting a Person row opens/updates the Person detail surface. Detail remains responsible for the complete readable Person/Activity information already supported by the read contract, including:

- names and descriptions
- Person historicity and person type
- Person sources
- every Activity
- Polity / Relation / Role / Period Basis
- full start/end boundaries
- granularity / certainty / calendar
- confidence / chronology status
- notes
- Activity sources/provenance

The table is therefore an overview, not a replacement for information-complete detail.

## Functional parity contract

The table refactor must preserve direct access to the existing workflows:

- add relationship
- refresh
- semantic filters
- sort
- broad Person/Activity search
- Excel export/import
- Admin navigation
- full legacy relationship editing table
- Activity edit/delete from detail

A control merely remaining somewhere in the DOM does not count as preserved if it is no longer practically reachable.

## Renderer ownership

`atlas-person-main.js` owns the Person list markup directly. `atlas-person-table-view.css` remains a presentation stylesheet for the table layout. There is no post-render `MutationObserver` adapter that turns Person cards into table rows.

`MutationObserver` usage that remains in `atlas-person-main.js` is limited to synchronization with the existing legacy Activity authoring DOM; it is not part of table presentation.

## Responsive baseline

The historical Persons list uses the same table model across desktop and mobile. Responsive CSS may change widths, overflow, sticky behavior, or prioritization, but must not silently replace the authoritative table with a different data model.

The curated non-timeline / legend-myth surface is intentionally left for UI-T3/UI-T6, where its mobile card conversion will be reconciled with the project-wide table vocabulary.

## Change boundary for T0/T1

T0/T1 does **not**:

- add or change API endpoints
- change database/schema semantics
- change P10 duplicate lifecycle
- weaken Admin authentication
- fabricate missing historical fields
- infer historicity from chronology uncertainty or notes
- redesign the final column hierarchy beyond the existing table baseline

## Next gates

- **UI-T2:** final Main table information hierarchy
- **UI-T3:** true table behavior across mobile, including non-timeline records
- **UI-T4:** master-detail drawer interaction completion
- **UI-T5:** search/filter/sort consolidation
- **UI-T6:** historicity and curated non-timeline integration
- **UI-T7:** machine-readable Information Coverage Gate
- **UI-T8+:** Admin table normalization, regression audit, responsive/a11y, legacy cleanup, docs/release
