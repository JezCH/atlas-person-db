# ATLAS UI Information Coverage

Status: **current table-first source-of-truth companion**

Goal: **ATLAS가 알고 있는 중요한 정보를 Main/Admin UI 뒤에서 잃지 않는다.**

- Main = 역사적 의미를 사람이 읽을 수 있게 보여준다.
- Admin = identity / raw semantics / provenance / duplicate lifecycle / runtime state를 안전하게 추적할 수 있게 보여준다.
- Unknown / uncertain = 정보다. 확정값으로 평탄화하지 않는다.
- Secret values = 절대 노출하지 않는다. configured / missing / healthy 같은 상태만 노출한다.

This document explains policy and current scope. The executable field registry is:

- `docs/ui/ui-information-coverage.json`
- enforced by `tests/ui-t7-information-coverage-gate.test.mjs`
- Admin generic raw coverage enforced by `tests/ui-t7b-admin-raw-coverage.test.mjs`

`ATLAS_REQUIREMENTS.md` and `DATA_MODEL.md` remain authoritative for domain semantics.

## 1. Current executable coverage model

Allowed registry surfaces are:

- `MAIN_TABLE` — fast comparison / overview
- `MAIN_DETAIL` — complete readable detail
- `MAIN_SEARCH` — discoverability by the authoritative value
- `ADMIN` — safe raw/system identity inspection

A projection field without a registry entry is a test failure. A registry entry without implementation evidence is also a test failure.

The current machine gate covers:

- public Person projection
- public Activity projection
- compact correlated Activity list projection
- public Source projection
- final nested Person detail assembly
- curated `non-timeline-persons.json` source keys

The Admin raw-object surface does not use a frontend field whitelist. Inspector returns the complete protected server object and the UI recursively renders every returned field/path as a table row. This means a new safe Inspector field is visible automatically rather than waiting for a hard-coded frontend mapping.

## 2. Main table vs detail responsibility

The Main table is an overview, not a data-loss boundary.

### Person table

Current overview hierarchy:

1. Person identity
2. main Activity range
3. correlated Activity relationship meaning
4. Activity count

The Activity relationship cell keeps the actual Activity tuple correlated:

- Polity
- Relation Type
- Role
- Period Basis
- Activity start/end period
- meaningful exceptional chronology/confidence state when present

Independent facet arrays must never be recombined to invent a tuple.

### Person detail drawer

The detail surface remains responsible for all currently supported readable Person/Activity information:

- all returned names / locale / name type / preferred state
- descriptions
- Person historicity / person type
- Person sources
- every Activity
- Polity / Relation / Role / Period Basis
- start/end year, month, day
- granularity / certainty / calendar
- confidence / chronology status
- notes
- Activity sources / citation / locator / URL

A field may be folded into detail, but not silently dropped.

## 3. Historicity and chronology rule

`Person.historicity` is ontology/status data. Activity chronology certainty is temporal evidence data. They are separate.

The Main authoritative Person grouping uses only the stored Person historicity value:

- exact raw `historical` → primary historical group
- every other raw value → preserved as non-primary/other without inventing a closed enum

Do not infer myth/legend from:

- missing dates
- approximate/disputed dates
- notes
- confidence
- chronology status
- calendar
- traditional chronology

Curated non-timeline records are a separate source and are never joined to DB Persons by name. See `UI_HISTORICITY_SURFACES.md`.

## 4. Curated non-timeline coverage

The curated table currently exposes its available source fields without fabricating provenance that the JSON does not contain.

Overview includes:

- person name
- polity
- historicity
- traditional chronology
- role
- timeline/map status

Expandable detail includes:

- raw person/polity names
- raw historicity
- date basis
- timeline status
- Activity-year fields
- decision reason
- map policy

Null chronology remains unknown and must never become year zero through numeric coercion.

## 5. Admin responsibility

Admin is not a second historical presentation layer. It is the operational/raw verification surface.

### Object Inspector

Supported server capabilities currently include:

- Person
- Activity
- Polity
- Role
- Period Basis
- Relation Type
- Source

The Inspector must preserve raw identities and safe diagnostic fields such as UUIDs, canonical keys/codes, source identity, provenance locators, hashes/bytes when the protected backend exposes them.

### System Status

System Status is table-based and must use backend/runtime authority rather than duplicated frontend constants.

It may show:

- runtime/deployment identity when supplied
- secret presence state, never secret value
- database/schema identity
- migration identity
- semantic/detector/merge versions
- authoring readiness
- duplicate lifecycle/readiness
- exact discovered atlas_v2 table counts
- runtime verification boundary

GitHub-only CI state must not be fabricated as a runtime fact.

## 6. Duplicate / identity review

Admin must expose enough information for a human to judge and audit identity decisions while respecting the server lifecycle.

Required concepts include:

- candidate identity and Person pair
- detector/evidence context
- decision `MERGE / KEEP_SEPARATE / REVIEW`
- review history/state
- evidence drift/revalidation state
- physical merge allowed/blocked state
- block reason
- merge audit when execution exists

The UI must never imply physical merge is possible when the server says it is blocked.

The current remaining table-first UI task is to normalize the Duplicate Review comparison presentation without altering these server semantics.

## 7. Authoring execution / audit

Existing authoring controls must remain practically reachable, not merely present in hidden DOM.

Current preserved workflows include:

- add relationship
- refresh
- Activity edit/delete
- semantic search/filter/sort
- Excel export/import
- full relationship editing table
- Admin navigation

Operational authoring/audit information that the backend exposes safely belongs in Admin, including request/result identity, disposition, replay state, provenance completeness, and applied timestamps as those surfaces mature.

## 8. Secret handling

Never display:

- database passwords or full connection strings
- `SUPABASE_DB_URL` value
- admin password
- session signing secret
- bearer/mutation tokens
- GitHub OIDC token
- private API credentials

Allowed display examples:

```text
Database connection      healthy / unhealthy
Session secret           configured / missing
Admin credential         configured / missing
GitHub OIDC capability   available / unavailable / not checked
```

## 9. Future first-class product objects

The following remain binding future product areas but must not be fabricated before backend/model support exists.

| Object / capability | Main | Admin | Status |
|---|---|---|---|
| Place object | required | required | FUTURE P13 |
| Source object editor | read | edit | FUTURE P13 |
| Person birth/death date/place | when sourced | required | FUTURE P13 |
| Representative media | when present | required | FUTURE P13 |
| Optional typed biographical facts | when present | required | FUTURE P13 |
| AI research candidates | reviewed result only | required | FUTURE P13 |
| Compile readiness / Runtime projection | publication meaning | diagnostics | FUTURE P13 |
| Territory records | map/detail | required | FUTURE P14 |
| Geometry | map | diagnostic/editor | FUTURE P14 |

A shell may say a capability is unavailable/future. It must not invent authoritative data.

## 10. Non-negotiable implementation gates

1. **No historical information loss.**
2. **No certainty flattening.**
3. **No raw-only Main.** Human historical meaning is primary; raw identity remains available in Admin.
4. **No hidden Admin state when the backend can expose it safely.**
5. **No secret disclosure.**
6. **Server authority wins for lifecycle/readiness/writeability.**
7. **No future-data fabrication.**
8. **No parallel identity/Relation/temporal/confidence semantics in frontend code.**
9. **No name-based identity merge between authoritative and curated sources.**
10. **New projected fields require coverage mapping before merge.**

## 11. Release rule

A UI implementation is not complete merely because fields exist in source code or DOM. Required information/actions must be practically reachable in the intended desktop/mobile interaction path.

Exact-head release additionally requires the repository CI gates when GitHub Actions is available. A billing/spending-limit runner failure is an infrastructure blocker and must not be reported as a passing test result.
