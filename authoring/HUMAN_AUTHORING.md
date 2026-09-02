# ATLAS Normal Human Authoring

`/api/atlas-authoring` is the normal operator path for creating a Person and its first Stage 2-native Activity.

The operator supplies historical information, not database identifiers:

- Person canonical English name; Korean display name is needed only when a new Person must be created
- Polity canonical English name; Korean display name is needed only when a new Polity must be created
- relation code selected from the active live Relation Type catalog
- Role label, when applicable; Korean display name is needed only when a new Role must be created
- period-basis code selected explicitly from the active live catalog
- historical start/end year with optional month/day
- independent start/end certainty and calendar values
- evidence confidence
- at least one Source title/reference; URL is optional
- an explicit NamuWiki Person-document outcome: `linked` with the exact document title and canonical URL, or `not_found`, plus the date checked

The NamuWiki outcome is required for normal Person registration. The operator must confirm the exact Person page, including same-name/disambiguation cases. Bare omission and `unknown` are rejected; the system never converts an unchecked state into `not_found`. For a disclosed provider access block followed by a user instruction to continue, the GitHub batch exception in `NAMUWIKI_REGISTRATION_POLICY.md` permits an explicit `review_deferrals.namuwiki` record and leaves the reference unreviewed. This does not claim that reference review is complete.

The browser never asks for Activity granularity. The server derives `year`, `month`, or `day` granularity from the supplied boundary components and keeps signed historical years as historical data rather than converting them through JavaScript `Date`.

Allowed calendar values are the server contract values:

- `gregorian`
- `julian`
- `unspecified_historical`
- `source_calendar`

The server performs the internal work in one PostgreSQL `SERIALIZABLE` transaction:

1. validate the explicit NamuWiki `linked`/`not_found` decision;
2. exact preferred-English Person lookup; reuse one exact UUID or create the Person;
3. exact preferred-English Polity lookup; reuse one exact UUID or create the Polity;
4. exact active Role lookup; reuse one exact UUID or create a normalized Role when needed;
5. exact active Relation Type and Period Basis code resolution to UUIDs;
6. Source creation/reuse and provenance-link construction;
7. compilation to the UUID-only, full-temporal Stage 2 Activity contract;
8. semantic-key v2 duplicate enforcement through `atlas-stage2-native-activity-service`;
9. immutable request ledger snapshot containing the normalized NamuWiki decision and commit.

The NamuWiki result uses the existing `atlas_v2.authoring_manifest_runs.result_snapshot` JSONB ledger. No extra NamuWiki table or second transaction is required. The Person read service projects the latest explicit stored decision back onto the Person response.

Names and controlled vocabulary codes are resolver inputs only. UUIDs remain database identity. Ambiguous exact-name matches, inactive or unknown controlled-vocabulary codes, source-less writes, historical year zero, semantic duplicates, invalid NamuWiki decisions, or P9 readiness failure all fail closed.

## Browser path

The Admin page obtains the existing HttpOnly administrator session and calls `/api/atlas-authoring` directly. One registration does **not** require a GitHub commit or Vercel deployment.

`GET /api/atlas-authoring` returns active Relation Type and Period Basis codes for the human form. Both selectors are populated from that response. The UI does not hardcode the allowed Relation Type set and it does not auto-select `reign` or any other Period Basis.

The browser keeps Person/Polity/Role Korean names optional so exact existing entities can be reused without redundant typing. If the English name does not resolve to an existing entity and the corresponding Korean display name is missing, the server rejects creation explicitly and the Admin UI reports that requirement.

The same form requires a NamuWiki result and checked date. When `linked` is selected, exact document title and a canonical `https://namu.wiki/w/...` URL are required. When `not_found` is selected, title and URL are omitted. The successful result panel explicitly reports either `나무위키: 연결됨 — <문서명>` or `나무위키: 문서 없음`.

## NamuWiki display behavior

The Person list/detail API carries `external_references.namuwiki` when an explicit decision has been stored by authoring. The main Person table consumes that authoritative read data:

- `linked` → the visible main Person name itself receives the existing colored/underlined `↗` NamuWiki hyperlink;
- `not_found` → no hyperlink is rendered, while the checked status remains available in Person read data.

No NamuWiki link is added to the Person detail-panel heading. Legacy reviewed mappings may remain as compatibility fallbacks for Persons registered before this contract.

## Temporal boundary policy

Each start/end boundary supports:

- signed non-zero historical year
- optional month `1..12`
- optional day `1..31` (day requires month)
- independent certainty
- independent calendar

Missing month/day remain `NULL`; the system never invents placeholder dates. The server remains authoritative for validation even when the browser performs the same checks for operator feedback.

## Source policy

New Source rows receive server-generated UUIDs. URL/title/citation fields remain provenance metadata and are not promoted to Source identity. An authoritative human registration requires at least one Source link; the system never invents provenance.

- URL present → `web_bibliographic_reference`
- URL absent → `bibliographic_reference`
- Source title is required
- citation/reference text is optional but recommended
- no fake URL is generated for books, papers, or other non-web bibliography

## GitHub fallback / smoke transport

Reviewed `authoring/requests/*.json` files may also use `atlas-human-authoring/v1`. The existing `ATLAS Authoring Apply` workflow sends those requests to the same service with the already-established exact runtime SHA + authoring SHA + GitHub OIDC boundary.

New or changed human-authoring manifests are structurally rejected by CI if `external_references.namuwiki` is missing or invalid. Pre-cutover immutable GitHub requests remain replayable through the OIDC fallback without being bulk rewritten solely to satisfy the newer NamuWiki field.

This path exists for reviewed batch work, auditability, and deployment smoke tests. It is not the required normal registration workflow.

## PostgreSQL client discipline

Authoring readiness, P9 inspection, and human catalog loading use one PostgreSQL client sequentially. They must not overlap `client.query()` calls on that client; this avoids the deprecated pg behavior that becomes unsafe in pg@9. Fresh-PostgreSQL operational parity rehearsal covers readiness, catalogs, entity reuse/create, full-temporal Activity creation, URL and URL-less Sources, idempotent replay, semantic duplicate rejection, and the NamuWiki authoring contract.
