# Phase 3 Design Decisions

1. **No deployment in Phase 3.** SQL is definition-only and remains unapplied.
2. **Deterministic identity.** Phase 4 will derive UUIDv5 values from stable canonical keys; Phase 3 prohibits random-ID generation in validation outputs.
3. **Names are rows, not columns.** Multilingual and historical names live in `person_names` and `polity_names`.
4. **No polymorphic foreign keys.** Descriptions and source links use dedicated tables per entity type.
5. **Chronology is claim-aware.** Alternative and uncertain dates are retained in `chronology_claims`.
6. **Year zero is invalid.** Unknown dates are `NULL`.
7. **Legacy relationship traceability is mandatory.** `person_politics_v2.legacy_source_key` is unique and required.
8. **Deletion is conservative.** Relationship-bearing entities use `ON DELETE RESTRICT`; owned names/descriptions use `ON DELETE CASCADE`.
9. **Vocabulary is explicit.** Roles and period bases are normalized entities with localized names.
10. **RLS is deferred.** Phase 3 includes only a documented RLS stub; operational policies are designed and applied in Phase 5 or later.
