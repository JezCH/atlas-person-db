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

The browser never asks for Activity granularity. The server derives `year`, `month`, or `day` granularity from the supplied boundary components and keeps signed historical years as historical data rather than converting them through JavaScript `Date`.

Allowed calendar values are the server contract values:

- `gregorian`
- `julian`
- `unspecified_historical`
- `source_calendar`

The server performs the internal work in one PostgreSQL `SERIALIZABLE` transaction:

1. exact preferred-English Person lookup; reuse one exact UUID or create the Person;
2. exact preferred-English Polity lookup; reuse one exact UUID or create the Polity;
3. exact active Role lookup; reuse one exact UUID or create a normalized Role when needed;
4. exact active Relation Type and Period Basis code resolution to UUIDs;
5. Source creation/reuse and provenance-link construction;
6. compilation to the UUID-only, full-temporal Stage 2 Activity contract;
7. semantic-key v2 duplicate enforcement through `atlas-stage2-native-activity-service`;
8. immutable request ledger snapshot and commit.

Names and controlled vocabulary codes are resolver inputs only. UUIDs remain database identity. Ambiguous exact-name matches, inactive or unknown controlled-vocabulary codes, source-less writes, historical year zero, semantic duplicates, or P9 readiness failure all fail closed.

## Browser path

The Admin page obtains the existing HttpOnly administrator session and calls `/api/atlas-authoring` directly. One registration does **not** require a GitHub commit or Vercel deployment.

`GET /api/atlas-authoring` returns active Relation Type and Period Basis codes for the human form. Both selectors are populated from that response. The UI does not hardcode the allowed Relation Type set and it does not auto-select `reign` or any other Period Basis.

The browser keeps Person/Polity/Role Korean names optional so exact existing entities can be reused without redundant typing. If the English name does not resolve to an existing entity and the corresponding Korean display name is missing, the server rejects creation explicitly and the Admin UI reports that requirement.

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

This path exists for reviewed batch work, auditability, and deployment smoke tests. It is not the required normal registration workflow.

## PostgreSQL client discipline

Authoring readiness, P9 inspection, and human catalog loading use one PostgreSQL client sequentially. They must not overlap `client.query()` calls on that client; this avoids the deprecated pg behavior that becomes unsafe in pg@9. Fresh-PostgreSQL operational parity rehearsal covers readiness, catalogs, entity reuse/create, full-temporal Activity creation, URL and URL-less Sources, idempotent replay, and semantic duplicate rejection.
