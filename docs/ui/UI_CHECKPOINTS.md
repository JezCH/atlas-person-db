# UI checkpoints

- UI-0 — branch isolation + information coverage baseline: COMPLETE
- UI-1 — read/API information inventory: COMPLETE
- UI-2A — public Person list/read surface + historicity preservation: COMPLETE
- UI-2B — Person detail Activity semantics: COMPLETE
  - Relation Type
  - Polity / Role / Period Basis readable identity
  - full temporal start/end boundaries
  - certainty / granularity / calendar
  - confidence / chronology status / notes
  - UUID detail lookup with fail-closed validation
- UI-2C — Main provenance/source read: COMPLETE
- UI-2D — Admin object inspector read: COMPLETE
- UI-2E — Admin System/status read: IMPLEMENTED — CI PENDING
  - session-authenticated and GET-only
  - deployed/runtime identity when supplied by the runtime
  - secret-free configuration-presence status
  - PostgreSQL / atlas_v2 schema identity
  - catalog-discovered exact atlas_v2 table counts
  - authoring readiness through the authoritative readiness service
  - Activity semantic-key / duplicate detector / reconciliation versions
  - duplicate queue/review/merge/revalidation aggregate lifecycle
  - optional P10 revalidation readiness integration when that backend module is present
  - GitHub Actions status intentionally not fabricated inside runtime
- UI-3 — Main Persons information-complete redesign
- UI-4 — Admin interface consolidation
- UI-5 — navigation / future-authority shells
- UI-6 — responsive and interaction polish
- UI-7 — coverage gate and integration verification
- UI-8 — intentional Vercel runtime checkpoint
- UI-9 — backend-lifecycle-aware main integration
- UI-10 — Production verification

Vercel rule: routine `agent/ui-information-completeness` commits must create zero deployments. Preview/Production are reserved for intentional checkpoints. UI-2E and subsequent static/contract work can be completed with GitHub + CI only; runtime deployment verification waits for an intentional checkpoint.
