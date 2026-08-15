# UI branch scope

Branch: `agent/ui-information-completeness`

This branch is intentionally isolated from P10 duplicate-engine semantics.

## Allowed

- Main information architecture and presentation
- Admin information architecture and inspectors
- Read-only frontend composition
- UI coverage documentation and tests
- Backend read surfaces needed only to expose already-authoritative safe information
- System health/readiness surfaces that do not mutate Production

## Not allowed in this branch

- Change Activity semantic-key semantics
- Change Person/Polity identity rules
- Change duplicate detector/review meaning
- Enable physical Person merge
- Change P10 lifecycle/interlock authority
- Change historical correction semantics
- Change Territory/Geometry identity
- Fabricate P13/P14 data that backend does not yet possess

When P10 changes a server contract consumed by UI, this branch will consume the settled server result rather than implementing a parallel frontend interpretation.
