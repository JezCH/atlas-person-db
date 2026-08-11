# ATLAS Stage 2 R0 — Normalized Inventory Evidence (2026-08-11)

> Status: READ-ONLY EVIDENCE — NO PRODUCTION DATA MUTATION

## Exact Production evidence

- Production SHA: `768eb8a25182beb81fb92198608d711d87aa0e22`
- Vercel status: success (`Deployment has completed`)
- ATLAS Audit Inventory run: `31499183625`
- artifact: `atlas-stage2-r0-normalized-inventory`
- artifact id: `9104264546`
- artifact digest: `sha256:ac1d91800412c2d79921b6ed791e6c82f94d125fc4203568f2cad4ddf5db3eb3`
- requested Activity UUIDs: 53
- returned normalized rows: 53
- response marker: `ATLAS_AUDIT_INVENTORY_V1`
- transaction contract: `read_only=true`, `committed=false`

This evidence supersedes the provisional R0 assumption that public surface duplicates might hide Person/Polity identity duplication.

## Six exact duplicate groups are proven TRUE_ACTIVITY_DUPLICATE

For every pair below, the normalized inventory proves equality of:

`person_id + polity_id + role_id + period_basis_id + activity_start + activity_end`

Each row currently has one relationship-source link and no chronology-claim or relationship-description children. Notes are not always identical, so the representative relationship is chosen deliberately rather than by arbitrary UUID order; the dropped row's complete pre-state must remain in the correction ledger.

| Group | Keep | Drop | Representative choice |
|---|---|---|---|
| Wu Zetian — Wu Zhou 690–705 | `da809f25-40ff-5c27-b10b-88d4acc4070d` | `75a124e8-df55-5247-aa48-dc9d7934c10e` | keep the more explicit sovereign-reign note |
| Sejong the Great — Joseon 1418–1450 | `4263e4d0-a0a0-5803-a61b-85a57322db7e` | `d1e0a5a6-31a1-5691-8d05-570dccdcad18` | keep the richer historical note |
| Mehmed II — Ottoman Empire 1451–1481 | `b0d35acc-9705-5b80-96bb-02616df72bcc` | `25ce2112-9b21-55dd-88d1-029153fc1a5a` | keep the richer historical note |
| Charles V — Holy Roman Empire 1519–1556 | `16ebebde-e4e4-553d-a520-00da68a276d2` | `d641eec9-2770-5099-8017-8ec3bcc9244e` | notes are identical; keep reviewed correction-source row |
| Simón Bolívar — Gran Colombia 1819–1830 | `05d7091a-5cfc-5ec0-9aa3-32461925e7c7` | `caa526f9-220d-540c-93ea-d889f6d9b8cb` | notes are identical; keep reviewed correction-source row |
| Otto von Bismarck — German Empire 1871–1890 | `1ff585a7-c481-5d38-98ff-38381c81d961` | `a8946a02-9235-5985-b882-0c7d60b555dd` | equivalent notes; keep existing primary audited row |

### Normalized IDs by group

- Wu Zetian: person `492b042f-ff7f-5ca9-85aa-521d64c94fbb`; polity `79812485-7daa-5311-bb10-f47fe9be7106`; role `2a2e0e91-3db2-5d2f-a2f0-c70713ecf77e`; basis `b5ebe21e-4e81-5678-8e0e-7f66ff56992b`.
- Sejong: person `e51ad0be-e92b-5b2b-a8f4-9a81f35e57c9`; polity `5fb816f2-2d44-55f9-a9c4-35e31625df38`; role `8290e1c0-fbc9-5efb-a65a-ca2c5ed432c3`; basis `b5ebe21e-4e81-5678-8e0e-7f66ff56992b`.
- Mehmed II: person `25f65f14-f78c-5f9b-a176-eedb1056d5d2`; polity `6d1520e2-0aff-5063-b2b7-95eb86daf372`; role `1a91542a-fc8f-5c4c-b4d2-f533d1af7fb8`; basis `b5ebe21e-4e81-5678-8e0e-7f66ff56992b`.
- Charles V: person `449b224b-2b5d-5c6c-aa9d-b3a63de00192`; polity `aefaece0-759c-5bde-b653-6eed173f98f8`; role `3557a0e6-70a3-59fa-9df9-372eb79b943e`; basis `b5ebe21e-4e81-5678-8e0e-7f66ff56992b`.
- Simón Bolívar: person `4c5ed768-0d28-5e13-aa3d-976760d7e4ce`; polity `1aaee35e-844d-5ba3-807d-7b105d43305c`; role `ccb47923-2134-5868-92f6-29785847e79c`; basis `e78bcf72-81e3-5db8-a76a-8c2ca9c6d745`.
- Bismarck: person `5401a194-c4e1-57e9-97da-49538d756182`; polity `4203b03f-524f-5466-b718-37b72ae61e38`; role `6d5c65cd-baee-5cb0-b272-a9b9cb1ac355`; basis `e78bcf72-81e3-5db8-a76a-8c2ca9c6d745`.

## Competing rows: normalized classification

The inventory also resolves several important cases:

- Tokugawa Ieyasu: all three rows share one Person UUID and one Tokugawa Shogunate Polity UUID, but use distinct Role and/or Period-basis UUIDs. This is a competing chronology/role model, not an exact duplicate deletion case.
- Toyotomi Hideyoshi: same Person/Role/basis, but `Toyotomi Regime` and `Japan` are distinct Polity UUIDs. Historical model decision required.
- Peter I: one Person; Tsardom and Russian Empire are distinct Polity UUIDs; the two Russian-Empire rows have different Role UUIDs and chronology. Continuity/back-projection correction required, not blind dedupe.
- Benjamin Franklin: one Person; Province of Pennsylvania and United States are distinct Polity UUIDs; the two United States rows also use different Period-basis UUIDs. Back-projection/relation decomposition required.
- Haile Selassie I: same Person/Polity/Role/basis across all three rows but different intervals. This is legal-reign vs effective-control modeling debt, not exact duplicate deletion.
- Hypatia: same Person/Role/basis; Roman Empire and Byzantine Empire are distinct Polity UUIDs. This is a competing continuity model.
- Maria I: same Person/Role/basis; Kingdom of Portugal and United Kingdom of Portugal, Brazil and the Algarves are distinct Polity UUIDs. State-form continuity decision required.
- Kublai Khan: Yuan 1260–1294 and Yuan 1271–1294 share one Yuan Polity UUID but have different Role UUIDs; Mongol Empire is a separate Polity UUID. Great-Khan/Yuan authority layering required.
- Hiawatha: same Person but Haudenosaunee Confederacy and Iroquois Confederacy are two distinct Polity UUIDs and different Role UUIDs. This is Polity identity reconciliation, not Activity dedupe.
- Yongle Emperor: same Person/Role/basis, but `Ming Dynasty` and `Ming dynasty` are distinct Polity UUIDs. This is a proven duplicate Polity identity candidate.
- Nzinga: Ndongo, Matamba, and combined Ndongo-and-Matamba are three distinct Polity UUIDs; aggregate-row policy required.
- Edward Teach: Nassau Pirate Republic and Republic of Pirates are distinct Polity UUIDs for the same Person/Role/basis. Weak-polity/identity reconciliation required.

## R0 apply safety decision

Only the six proven `TRUE_ACTIVITY_DUPLICATE` groups may enter the first correction change set.

The first correction engine must:

1. revalidate exact normalized before-state under row locks;
2. run inside a SERIALIZABLE transaction;
3. reuse the existing source-preserving `coalesceRelationship()` primitive;
4. move source links, chronology claims and relationship descriptions before deleting the duplicate row;
5. fail closed on source-locator conflicts;
6. preserve complete keep/drop pre-state in an immutable/idempotent correction ledger;
7. provide a real transaction rollback dry-run before commit;
8. verify expected global cardinality changes after apply;
9. never infer or mutate any R0 `RESEARCH`/continuity/alias case in this change set.
