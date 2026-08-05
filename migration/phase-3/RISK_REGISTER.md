# Phase 3 Risk Register

| Risk | Consequence | Control |
|---|---|---|
| SQL accidentally targets legacy tables | Production damage if later executed | prohibited-operation contract and static safety validator |
| Non-deterministic schema output | Unverifiable migration compiler input | stable file ordering and two independent bundle builds |
| Missing legacy field destination | Silent information loss | explicit legacy coverage contract |
| Weak foreign keys | orphan records | required FK and delete-action contract |
| Polymorphic references | unenforceable integrity | dedicated description and provenance link tables |
| Year zero or reversed periods | invalid chronology | explicit CHECK constraints |
| Locale preference duplication | ambiguous display names | partial unique indexes for preferred names |
| Conflicting date claims overwritten | historical data loss | chronology claims table |
| Random UUID generation | unstable recompilation | UUIDv5 policy; no data inserts in Phase 3 |
| Workflow writes to repository/database | unauthorized mutation | `contents: read`, no secrets, no push/deploy commands |
| Validator stops at first semantic defect | incomplete diagnosis | validators emit complete JSON reports before aggregate failure |
| Existing files changed outside scope | regression | protected-scope verifier against Phase 2 closing SHA |
