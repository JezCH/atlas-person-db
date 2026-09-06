# Reviewed spatial binding shards

This directory is the authoring-side source for broad reviewed Polity spatial bindings after the shard compiler cutover.

## Why this exists

Historically every spatial backfill batch edited the same three files:

- `atlas-polity-spatial-index.json`
- `tests/person-spacetime-spatial-index-coverage.test.mjs`
- `tests/spacetime-taxonomy-migration.test.mjs`

That made historically independent Polity reviews collide at the repository layer. The shard model separates human review from release compilation:

`independent reviewed shard -> deterministic compiler -> canonical runtime index`

The runtime contract does not change. Consumers continue to read `atlas-polity-spatial-index.json`.

## Baseline

`0000-migrated-baseline.index.json` is an immutable migration snapshot of the canonical index at cutover. It preserves policy, regions, temporal place-function records, review queue, and every reviewed mapping already present at cutover.

Do not hand-edit this file after cutover. Before the cutover merge, if the active B46-B77 legacy superbatch advanced the canonical index, regenerate this snapshot from that latest canonical index with:

```sh
node scripts/migrate-spatial-index-to-reviewed-baseline.mjs --force
```

This is a mechanical snapshot refresh only. It must not trigger historical re-review of B46-B77.

The migration helper is a cutover bootstrap tool, not a permanent authoring path. Once the terminal legacy canonical state has been absorbed and equivalence is green, the final cutover commit must remove `scripts/migrate-spatial-index-to-reviewed-baseline.mjs` and its migration-only test before merge. After that point the baseline is frozen and cannot be refreshed from hand-edited canonical data.

## New reviewed shard format

Future broad geography reviews live as uniquely named files under `shards/` ending in `.bindings.json`.

```json
{
  "schema": "atlas-reviewed-spatial-bindings/v1",
  "shard_id": "b78-worker-a",
  "baseline": "spatial-audit artifact or exact main SHA used for review",
  "reviewed_at": "2026-09-06T01:23:45Z",
  "bindings": [
    {
      "polity_id": "00000000-0000-4000-8000-000000000001",
      "region_code": "europe",
      "subregion_code": "italy"
    },
    {
      "polity_id": "00000000-0000-4000-8000-000000000002",
      "region_code": "south-asia",
      "subregion_code": null
    }
  ]
}
```

The shard stores only the already reviewed payload. It does not infer Polity identity or geography.

## Hard compiler failures

The compiler rejects:

- invalid or non-canonical UUIDs;
- the same Polity UUID appearing more than once, even when the mapping is identical;
- conflicting mappings for one UUID;
- unknown macroregions;
- unknown subregion leaves;
- subregions whose taxonomy parent does not match the reviewed macroregion;
- duplicate shard IDs;
- malformed baseline or canonical output.

Existing mapped UUIDs cannot be silently overridden by a later shard. Corrections to an already reviewed mapping require an explicit correction path rather than a backfill shard.

## Parallel worker contract

A parallel worker may finish historical review and produce one or more independent shard payloads without editing the canonical runtime index or numeric count locks.

Worker-side validation:

```sh
node scripts/compile-spatial-bindings.mjs --validate-only
```

The worker handoff should preserve its exact UUID payload, review baseline/artifact, and shard identity. A shard-only branch/patch is prework; it should not be merged to `main` as an applied release by itself unless the linear manager also compiles the canonical output in that release.

## Linear manager / superbatch release

The linear manager may collect many compatible reviewed shards into one release branch and compile once:

```sh
node scripts/compile-spatial-bindings.mjs
node scripts/compile-spatial-bindings.mjs --check
npm test
```

The canonical file is a generated compatibility artifact. It is not an authoring source after cutover. Direct mapping edits to `atlas-polity-spatial-index.json` are superseded; reviewed mapping changes must enter through independent shards or an explicit reviewed correction mechanism and then be compiled.

CI continuously proves this authority boundary by compiling the frozen baseline plus the real shard directory and requiring byte-for-byte equality with `atlas-polity-spatial-index.json`. Therefore either a shard that was not compiled or a manual canonical mapping edit fails the test suite.

The independent shard files are the reviewed source payloads. This keeps current runtime consumers stable while reducing repeated canonical writes, CI cycles, and release cycles.

## B46-B77 transition rule

The already READY B46-B77 payloads remain untouched and continue through the current throughput superbatch path. This structural track must not rewrite, translate, or re-review them.

The cutover merge has a hard release-order dependency on the last legacy B46-B77 canonical update that the manager intends to absorb. At that boundary only, refresh the immutable migration baseline from the latest canonical index and rerun equivalence/compiler tests. No unrelated project re-audit is required.

## Cutover cleanup completion gate

The structural migration is not complete merely because the compiler exists. Before the cutover PR may merge, all of the following must be true in the final tree:

1. the terminal legacy B46-B77 canonical state has been mechanically absorbed into `0000-migrated-baseline.index.json` without historical re-review;
2. `compile(baseline + every real reviewed shard)` is byte-for-byte identical to `atlas-polity-spatial-index.json`;
3. geography, subregion, and taxonomy split counts are derived from compiled data rather than hand-maintained batch constants;
4. `atlas-polity-spatial-index.json` is treated only as generated runtime compatibility output, not as a parallel authoring source;
5. the temporary migration refresh helper and its migration-only test are removed after the final baseline refresh, so there is no surviving path that can legitimize future hand edits by re-importing canonical output into the baseline;
6. no persisted legacy spatial batch apply workflow/helper remains authoritative. The existing `atlas-spatial-candidate-audit.yml` and `build-spatial-polity-candidates.mjs` are read-only candidate discovery and are not legacy authoring paths;
7. current runtime consumers continue reading the same canonical v2 index and all required CI is green.

After this gate is satisfied, new broad coverage work is shard-native by default:

`reviewed shard(s) -> compiler -> canonical runtime artifact`
