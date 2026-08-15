# UI work log

## UI-0 — 2026-08-15

- Created dedicated branch `agent/ui-information-completeness` from `main`.
- Disabled automatic Vercel deployments for this branch through `vercel.json` `git.deploymentEnabled`.
- Verified with the connected Vercel project that no deployment objects were created after the branch configuration and subsequent UI documentation commits.
- Added the information coverage contract and explicit branch-scope boundary.

## UI-1 — 2026-08-15

- Audited current product-facing read/API surfaces against `UI_INFORMATION_COVERAGE.md`.
- Confirmed `/api/atlas-read` is still a compact Activity-row projection and does not expose the complete current Person/Activity semantic model.
- Confirmed duplicate-review and release/audit services already contain richer server-side projections that should inform shared read primitives without becoming generic browser APIs by accident.
- Classified current-authoritative backend surface gaps separately from P13/P14 future-model requirements.

## UI-2A — 2026-08-15

Implemented the first non-breaking Person-centered Main read surface.

- Added public GET-only `/api/atlas-person-read` with schema marker `atlas-person-read/v1`.
- Kept existing `/api/atlas-read` unchanged so the current Main screen remains functional until the Person UI cutover.
- Person payload exposes UUID for stable browser selection, `person_type`, raw authoritative `historicity`, public names/aliases, public descriptions, Activity count, and earliest/latest available Activity year.
- Public Main payload intentionally does not expose `canonical_key`; raw identity remains an Admin concern.
- Historicity vocabulary is derived from observed backend values and returned with counts. The frontend must not invent a closed enum.
- Historicity is explicitly independent from chronology availability: a historical Person may have unknown dates, and a legendary/mythological Person may carry a traditional chronology.
- Registered the new endpoint in the API entrypoint contract and the zero-legacy runtime dependency inventory.
- Added focused contract tests for historicity preservation, chronology/historicity independence, GET-only behavior, and the versioned response envelope.

## UI-2B — 2026-08-15

Completed Person detail Activity semantics without changing the current Main screen.

- Added UUID detail mode to `/api/atlas-person-read` while preserving compact list mode.
- Exposed Polity, Relation Type, Role, Period Basis and full temporal boundaries for each Activity.
- Preserved BCE signed years directly rather than converting historical values through JavaScript `Date`.
- Preserved month/day/granularity/certainty/calendar independently for start and end boundaries.
- Preserved `confidence`, `chronology_status`, notes and nullable fields without inventing display defaults.
- Kept Person historicity independent from Activity chronology certainty.

## UI-2C — 2026-08-15

Completed Main-readable provenance without leaking Admin-only source identity.

- Added Person-level source projection from `person_sources`.
- Added Activity-level source projection from `person_politics_sources`.
- Exposed readable source title/type/URL/citation/locator and source locator key where it is meaningful to a user.
- Kept Source UUID, `source_key`, digest and byte-size metadata out of the public Main payload.
- Kept Person and Activity provenance structurally separate.

## UI-2D — 2026-08-15

Completed the session-authenticated Admin object-inspector read surface.

- Added GET-only `/api/atlas-admin-inspector` with schema `atlas-admin-inspector/v1`.
- Supported a bounded fixed set of current authoritative objects: Person, Activity, Polity, Role, Period Basis, Relation Type and Source.
- Exposed Admin-safe raw UUID/canonical/code/name/description/temporal/source metadata and reverse references.
- Required a valid `atlas_admin_session`; bearer-only access is rejected.
- Invalid object kind and malformed UUID fail before database access.
- Used fixed kind-to-SQL mappings with parameterized UUID lookup and read-only SQL.
- Kept the Inspector separate from GitHub OIDC audit inventory and P10 duplicate/merge execution semantics.
- Registered the route in the Phase 8 runtime API inventory after that fail-closed gate correctly detected the initially unregistered endpoint.

## UI-2E — 2026-08-15

Implemented the Admin System/status read surface without requiring a Vercel deployment.

- Added session-authenticated GET-only `/api/atlas-admin-system-status` with schema `atlas-admin-system-status/v1`.
- Runtime identity reports only non-secret provider/environment/deployment/git/region values actually supplied by the runtime; missing values remain null/unknown.
- Configuration reports presence booleans for DB/auth/session/CA settings and never returns secret values.
- Database status reports PostgreSQL/server and `atlas_v2` schema identity.
- Discovers all current `atlas_v2` ordinary/partitioned tables from PostgreSQL catalogs and returns exact row counts, avoiding a manually maintained count allowlist that would hide future authoritative tables.
- Reuses the authoritative human-authoring readiness service rather than copying readiness logic.
- Reports Activity semantic-key, duplicate detector, revalidation semantic and Person-merge lifecycle versions from their authoritative server modules.
- Reports aggregate duplicate candidate/review/merge/revalidation state without loading candidate evidence or review bodies into the status response.
- Integrates P10 duplicate-revalidation readiness when that backend module exists; older UI branch states report the module as unavailable instead of fabricating readiness.
- Explicitly marks GitHub Actions verification as external to runtime rather than pretending CI state can be proven by the deployed process.
- Registered the route in API-entrypoint and Phase 8 runtime-integrity contracts in the same change.

Next safe work after CI: wire Inspector/System-status into the Admin browser as read-only panels with static/contract verification. Runtime Preview/Production verification remains deferred to the intentional Vercel checkpoint.
