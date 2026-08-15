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

Next checkpoint after CI verification: UI-2B full Activity semantic/detail read. No Main screen redesign occurs before that read surface is available.
