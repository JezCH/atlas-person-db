# ATLAS UI Information Inventory v1

> UI-1 checkpoint for `agent/ui-information-completeness`.
>
> Purpose: compare the information-completeness contract against the **current product-readable API surfaces** before redesigning Main/Admin screens.
>
> This inventory does not create new historical semantics. `ATLAS_REQUIREMENTS.md`, `DATA_MODEL.md`, and server-side semantic contracts remain authoritative.

## 1. Inventory states

- `READY` — the current product API already exposes enough authoritative data for the target UI use.
- `PARTIAL` — some of the required information is available, but the surface is incomplete for the final UI use.
- `BACKEND_SURFACE_NEEDED` — current authoritative data exists in the backend/schema, but there is no appropriate Main/Admin product read surface for it.
- `FUTURE` — the binding product requirement exists, but the authoritative P13/P14 data model/read model does not yet exist. UI must not fabricate it.
- `NEVER_EXPOSE` — raw value is a secret. Only safe configured/healthy/missing state may be exposed.

`READY` means UI-readable now, not merely queryable by a GitHub-only release/audit endpoint.

## 2. Audited current API surfaces

### `/api/atlas-read`

Current public/normal read projection returns one Activity-oriented row with:

- Activity UUID (`id`)
- Person canonical EN name
- Person preferred KO display name fallback
- Polity canonical EN name
- Polity preferred KO display name fallback
- activity start/end **year only**
- Role source label and KO display fallback
- Period Basis code
- notes

It does **not** return Person UUID, Polity UUID, Relation Type, full temporal boundaries, confidence, chronology status, normalized Sources/provenance, aliases, Person/Polity metadata, or object-level detail.

### `/api/atlas-authoring` authenticated GET

Current Admin authoring GET returns:

- authoring readiness (`ready`)
- current authoring schema marker
- authenticated method
- live Relation Type codes
- live Period Basis codes

This is a catalog/readiness surface for authoring. It is **not** a generic Person/Polity/Activity inspector.

### `/api/atlas-duplicate-review` authenticated GET

Current duplicate-review GET is the richest browser-authorized read surface. It exposes, for candidate Persons:

- candidate UUID/state/decision/confidence
- evidence and evidence fingerprint
- detector version
- detection/review timestamps and review count
- complete loaded Person name arrays with locale/preferred metadata
- Person UUIDs
- Activity UUID, Person UUID, Polity UUID, Relation Type UUID, Role UUID, Period Basis UUID
- Activity full start/end year/month/day/granularity/calendar/certainty
- notes and source locator
- localized polity/role names
- reconciliation groups and reconciliation semantic version
- server-authoritative physical merge execution state/interlock
- queue summary counts

However, it only covers Persons currently in the duplicate-review queue and does not expose the full persisted review history or merge-audit history. It must not be repurposed as the generic Main/Person read API.

### `/api/atlas-session`

Current Admin session GET safely exposes only whether the browser session is authenticated. Login response additionally includes session expiry. Secret values are not returned.

### `/api/atlas-audit-inventory`

A rich read-only inventory already exists for release/audit operations. It can read Person/Polity canonical keys/types/historicity, preferred names, Role metadata, Period Basis, Activity confidence/chronology, counts, identity catalogs, and Source artifact metadata.

But this endpoint is intentionally **Production main + exact deployment SHA + GitHub Actions OIDC** gated. It is not an Admin browser session API and should remain a release/audit authority rather than becoming the product inspector by accident.

## 3. Main information inventory

| Information | Current source | State | UI-2 implication |
|---|---|---|---|
| Person preferred KO display name | `/api/atlas-read` | `READY` | Reuse |
| Person canonical EN name | `/api/atlas-read` | `READY` | Reuse |
| Stable Person UUID for object navigation | DB / duplicate/audit surfaces only | `BACKEND_SURFACE_NEEDED` | Main Person detail must use UUID, not name as identity |
| Person aliases / native / alternate names | `person_names`; duplicate queue only for candidate Persons | `BACKEND_SURFACE_NEEDED` | Public Person detail read needed |
| Person name type / locale / preferred metadata | `person_names`; duplicate queue only | `BACKEND_SURFACE_NEEDED` | Public detail may expose human-readable names; raw flags remain Admin-detail capable |
| Person type / historicity | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Public Person detail needed |
| Person descriptions | current backend foundation | `BACKEND_SURFACE_NEEDED` | Public Person detail needed |
| Person-level Sources | current backend foundation | `BACKEND_SURFACE_NEEDED` | Public evidence detail needed |
| Birth/death date/place | P13 | `FUTURE` | Do not create placeholder facts |
| Representative media | P13 | `FUTURE` | Do not fabricate image metadata |
| Typed biographical facts | P13 | `FUTURE` | Unknown remains absent |
| Polity preferred KO display name | `/api/atlas-read` | `READY` | Reuse |
| Polity canonical EN name | `/api/atlas-read` | `READY` | Reuse |
| Stable Polity UUID | DB / duplicate/audit surfaces only | `BACKEND_SURFACE_NEEDED` | Object link/read needed |
| Polity aliases/name kinds | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Polity detail read needed |
| Polity type / historicity | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Polity detail read needed |
| Activity UUID | `/api/atlas-read` | `READY` | Reuse as Activity identity |
| Relation Type | authoritative Stage 2 Activity; duplicate API reads UUID | `BACKEND_SURFACE_NEEDED` | Main read must expose Relation code + human label, not infer it in frontend |
| Role display | `/api/atlas-read` | `READY` | Reuse |
| Role identity/category/details | DB / audit/duplicate surfaces | `BACKEND_SURFACE_NEEDED` | Detail read if exposed to Main |
| Period Basis code | `/api/atlas-read` | `READY` | Human-readable presentation mapping can consume server vocabulary |
| Start/end year | `/api/atlas-read` | `READY` | Reuse only when rendered together with certainty/full-boundary rules |
| Start/end month/day | authoritative Activity; duplicate API already reads them | `BACKEND_SURFACE_NEEDED` | Main detail/list formatter needs full boundary |
| Temporal granularity | authoritative Activity; duplicate API already reads it | `BACKEND_SURFACE_NEEDED` | Prevent certainty flattening |
| Start/end certainty | authoritative Activity; duplicate API already reads it | `BACKEND_SURFACE_NEEDED` | Required for `약`, `불확실` etc. presentation |
| Start/end calendar | authoritative Activity; duplicate API already reads it | `BACKEND_SURFACE_NEEDED` | Detail disclosure when relevant |
| Activity confidence | authoritative Activity; audit/authoring paths know it | `BACKEND_SURFACE_NEEDED` | Human-readable confidence badge/text |
| Chronology status | authoritative Activity; audit path knows it | `BACKEND_SURFACE_NEEDED` | Main must not imply certainty the DB does not claim |
| Activity notes | `/api/atlas-read` | `READY` | Reuse; presentation redesign only |
| Normalized Activity Sources | current provenance tables | `BACKEND_SURFACE_NEEDED` | Public evidence read needed |
| Source title/type/citation/URL/locator | current Source/provenance model where present | `BACKEND_SURFACE_NEEDED` | Public evidence detail needed |
| Conflicting/competing evidence | reviewed authoring semantics when represented | `BACKEND_SURFACE_NEEDED` | Must be rendered explicitly when backend can express it |
| Governance/designation/Polity relations | current Stage 2 domain where populated | `BACKEND_SURFACE_NEEDED` | Separate detail projection; no frontend reconstruction |
| People/Event connections | current separate Authoring domains where populated | `BACKEND_SURFACE_NEEDED` | Object/detail read surface required before Main shows them |
| Compile readiness / Runtime inclusion | P13 | `FUTURE` | Final Runtime model must precede UI truth claims |
| Runtime exclusion reason | P13 | `FUTURE` | Do not invent interim status |
| Place object | P13 | `FUTURE` | Future first-class object |
| Territory / Geometry | P14 | `FUTURE` | Future map integration |

### Main conclusion

The existing `/api/atlas-read` is adequate as a **transitional compact Activity list feed**, but it is not information-complete enough to support the final Main Person detail experience.

The critical gap is not styling. The Main browser currently cannot receive the already-authoritative Relation/full-temporal/confidence/provenance meaning needed to render historical statements without flattening information.

## 4. Admin information inventory

| Information / capability | Current source | State | UI-2 implication |
|---|---|---|---|
| Browser session authenticated state | `/api/atlas-session` | `READY` | Reuse |
| Session expiry after login | `/api/atlas-session` login response | `PARTIAL` | Existing session boot GET does not return expiry |
| Human authoring readiness | `/api/atlas-authoring` GET | `READY` | Reuse server authority |
| Relation Type catalog | `/api/atlas-authoring` GET | `READY` | Reuse; no frontend hard-coded authority |
| Period Basis catalog | `/api/atlas-authoring` GET | `READY` | Reuse |
| Simple human Person/Polity/Activity authoring | `/api/atlas-authoring` POST | `READY` for current contract | UI may be redesigned without changing semantics |
| Generic Person identity inspector | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Protected session-authenticated inspector required |
| Person UUID/canonical key/type/historicity | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Admin inspector |
| All Person names + name UUID/type/locale/preferred | DB / audit inventory; duplicate GET only for candidates | `BACKEND_SURFACE_NEEDED` | Admin inspector |
| Generic Polity identity inspector | DB / audit inventory | `BACKEND_SURFACE_NEEDED` | Admin inspector |
| Generic Activity raw inspector | DB; duplicate GET only for candidates | `BACKEND_SURFACE_NEEDED` | Share one authoritative Activity projection with Main/detail where possible |
| Activity semantic-key v2 representation/hash | authoring/semantic services | `BACKEND_SURFACE_NEEDED` | Admin-only computed inspector; no frontend recomputation |
| Relation UUID/code | duplicate GET gives UUID; authoring catalog gives codes separately | `PARTIAL` | Generic inspector should return joined UUID + code |
| Full temporal raw fields | duplicate GET for candidate Persons | `PARTIAL` | Generic inspector required for all Activities |
| Confidence / chronology | DB / audit; not generic Admin Person read | `BACKEND_SURFACE_NEEDED` | Generic inspector |
| Source/provenance raw bindings | DB; duplicate GET has locator only | `PARTIAL` | Need Source UUID + citation metadata + assertion links |
| Authoring request ledger/history | `authoring_manifest_runs` | `BACKEND_SURFACE_NEEDED` | Protected audit surface |
| Authoring result snapshot/dispositions/replay | ledger | `BACKEND_SURFACE_NEEDED` | Protected audit surface |
| Duplicate candidate queue | `/api/atlas-duplicate-review` GET | `READY` | Keep existing endpoint as source of truth |
| Candidate Person UUIDs/names/context | duplicate GET | `READY` | Existing data can be presented better |
| Detector version | duplicate GET | `READY` | Show in inspector/details |
| Evidence fingerprint | duplicate GET | `READY` | Show in inspector/details |
| Candidate evidence | duplicate GET | `READY` | Improve presentation only |
| Current duplicate decision | duplicate GET | `READY` | Reuse |
| Review count / latest reviewed time | duplicate GET | `READY` | Reuse |
| Full review history + rationale | review table, not list GET | `BACKEND_SURFACE_NEEDED` | Protected history read needed |
| Evidence drift/stale candidate state | duplicate lifecycle | `PARTIAL` | Current candidate_state/interlock exists; explicit review-history/drift presentation needs richer read |
| Reconciliation groups | duplicate GET | `READY` | Reuse P10-authoritative result; UI does not derive |
| Reconciliation semantic version | duplicate GET | `READY` | Reuse |
| Physical merge allowed/blocked | duplicate GET `merge_execution_state` | `READY` | Must render server state exactly |
| Merge blocked reason/lifecycle | duplicate GET `merge_execution_state` and conflict response | `READY` | Reuse |
| Merge audit history | `person_merge_audits` | `BACKEND_SURFACE_NEEDED` | After execution, protected history read needed |
| Production/runtime deployed SHA | runtime env can know it; audit route validates it | `BACKEND_SURFACE_NEEDED` | Safe System status endpoint |
| Active Activity semantic version | server semantic authority | `BACKEND_SURFACE_NEEDED` | Safe System status endpoint; no frontend constant |
| Schema/baseline version | server/repository authority where defined | `BACKEND_SURFACE_NEEDED` | Safe System status endpoint |
| DB Person/Activity/Polity/Source counts | audit inventory can query them | `BACKEND_SURFACE_NEEDED` | Session-authenticated read-only System endpoint, not OIDC audit endpoint |
| Duplicate summary counts | duplicate GET | `READY` | Reuse |
| Last authoring write | authoring ledger | `BACKEND_SURFACE_NEEDED` | System/Audit surface |
| Last correction | correction ledger | `BACKEND_SURFACE_NEEDED` | System/Audit surface |
| Live integrity/health state | distributed server/runtime sources | `BACKEND_SURFACE_NEEDED` | Consolidate only runtime-verifiable checks; GitHub CI must be labelled separately |
| Production/main drift | Vercel/Git metadata can verify at runtime/checkpoint | `BACKEND_SURFACE_NEEDED` | Never silently assume equality |
| Compile status/readiness | P13 | `FUTURE` | Future System section |
| Runtime unresolved blockers | P13 | `FUTURE` | Future System section |
| Place/Source full editors | P13 | `FUTURE` | No ad-hoc JSON replacement |

### Admin conclusion

The current Admin has strong **write** and **duplicate-review** primitives, but lacks a generic read-only object inspector and consolidated System/Audit surfaces.

An operator can currently learn more about a duplicate candidate than about an arbitrary Person. That is a product-read gap, not a database-model gap.

## 5. Secrets

| Value | State | Allowed UI representation |
|---|---|---|
| `SUPABASE_DB_URL` raw value | `NEVER_EXPOSE` | database configured/healthy/missing only |
| DB credentials | `NEVER_EXPOSE` | connection health only |
| `ATLAS_ADMIN_PASSWORD` | `NEVER_EXPOSE` | configured/missing only |
| session signing secret | `NEVER_EXPOSE` | configured/missing only |
| mutation/bearer token | `NEVER_EXPOSE` | capability configured/unavailable only |
| GitHub OIDC token | `NEVER_EXPOSE` | capability available/unavailable/not checked only |
| private API credentials | `NEVER_EXPOSE` | safe capability/health status only |

## 6. Reuse findings

### 6.1 Do not duplicate Activity semantics in the frontend

`/api/atlas-duplicate-review` already proves the server can produce a rich Activity projection containing Relation UUID and full temporal fields. The generic read path should share/refactor the same authoritative server projection instead of introducing a second frontend-owned interpretation.

### 6.2 Do not use duplicate-review as the generic Person endpoint

The duplicate endpoint is scoped to identity review candidates and contains review/reconciliation semantics. Main Person read and Admin object inspection need dedicated read contracts so duplicate lifecycle remains isolated.

### 6.3 Do not expose the release audit route to the browser

`/api/atlas-audit-inventory` already contains useful raw queries, but its GitHub OIDC + exact Production SHA restrictions are deliberate release controls. Product Admin needs a **separate session-authenticated, read-only, least-privilege inspector/status surface**, potentially sharing domain query primitives but not bypassing the audit route's trust boundary.

## 7. UI-2 backend surface plan

No visual redesign should be blocked on inventing data. The next checkpoint should add only read-only surfaces required to expose **already-authoritative** information.

### A. Main historical detail read

Keep `/api/atlas-read` lightweight for the current list/search compatibility path, and add/refactor a UUID-oriented Person detail read that can return:

- Person UUID + canonical/display/alternate names + current metadata
- related Activities with Polity UUID/names
- Relation code + human-readable label
- Role identity/display
- Period Basis identity/code/display
- full start/end temporal boundaries
- confidence + chronology status + notes
- normalized Activity evidence/Sources available today
- current related historical domains only when authoritative and populated

The server owns all semantics. Main receives presentation-ready meaning plus stable identifiers; it does not calculate identity or historical certainty.

### B. Admin object inspector

Add a session-authenticated read-only inspector for:

- raw Person / Polity / Role / Period Basis identity metadata
- all name rows and UUIDs
- Activity raw semantic dimensions
- provenance/source bindings
- semantic-key v2 representation/hash from the server
- authoring ledger/history
- duplicate/review/merge audit references

### C. Admin System status

Add a session-authenticated safe status endpoint/surface for:

- deployed SHA and runtime identity
- active semantic version
- authoring readiness
- safe schema/baseline marker when defined
- entity counts
- duplicate summary
- last authoring/correction timestamps/references
- merge lifecycle/interlock
- runtime-verifiable integrity/health
- secret **status only**, never values

Where a status can only be known from GitHub CI and not from the running system, label it `not runtime-verifiable` rather than manufacturing a PASS.

## 8. Gate before screen redesign

UI-1 is complete when this inventory is committed.

UI-2 may change backend **read projection only**. It must not change:

- semantic-key v2 definition
- Relation meanings
- temporal semantics
- duplicate candidate/review semantics
- P10 physical merge authority
- historical corrections
- Production DB data
- P13/P14 future object semantics

After UI-2 provides the already-authoritative information safely, UI-3 can redesign Main Persons as a real Person list/detail experience without losing data.