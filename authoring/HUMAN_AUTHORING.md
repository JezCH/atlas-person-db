# ATLAS Normal Human Authoring

`/api/atlas-authoring` is the normal operator path for creating a Person and its first Stage 2-native Activity.

The operator supplies historical information, not database identifiers:

- Person canonical English name and Korean display name
- Polity canonical English name and Korean display name
- relation code (`rules`, `governs`, `serves`, `active_in`, `opposes`, `claims_rule`)
- Role label, when applicable
- period-basis code selected from the live catalog
- historical start/end boundaries and certainty
- evidence confidence
- at least one Source citation/reference

The server performs the internal work in one PostgreSQL `SERIALIZABLE` transaction:

1. exact preferred-English Person lookup; reuse one exact UUID or create the Person;
2. exact preferred-English Polity lookup; reuse one exact UUID or create the Polity;
3. exact active Role lookup; reuse one exact UUID or create a normalized Role when needed;
4. exact active Relation Type and Period Basis code resolution to UUIDs;
5. Source creation/reuse and provenance-link construction;
6. compilation to the UUID-only, full-temporal Stage 2 Activity contract;
7. semantic-key v2 duplicate enforcement through `atlas-stage2-native-activity-service`;
8. immutable request ledger snapshot and commit.

Names and controlled vocabulary codes are resolver inputs only. UUIDs remain database identity. Ambiguous exact-name matches, unknown controlled-vocabulary codes, source-less writes, historical year zero, semantic duplicates, or P9 readiness failure all fail closed.

## Browser path

The Admin page obtains the existing HttpOnly administrator session and calls `/api/atlas-authoring` directly. One registration does **not** require a GitHub commit or Vercel deployment.

`GET /api/atlas-authoring` returns only active Relation Type and Period Basis codes for the human form. Internal UUIDs are not exposed as required operator inputs.

## GitHub fallback / smoke transport

Reviewed `authoring/requests/*.json` files may also use `atlas-human-authoring/v1`. The existing `ATLAS Authoring Apply` workflow sends those requests to the same service with the already-established exact runtime SHA + authoring SHA + GitHub OIDC boundary.

This path exists for reviewed batch work, auditability, and deployment smoke tests. It is not the required normal registration workflow.

## Source policy

New Source rows receive server-generated UUIDs. URL/title/citation fields remain provenance metadata and are not promoted to Source identity. An authoritative human registration requires at least one Source link; the system never invents provenance.
