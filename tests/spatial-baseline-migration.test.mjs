import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateSpatialBaseline } from '../scripts/migrate-spatial-index-to-reviewed-baseline.mjs';

const canonicalPath = fileURLToPath(new URL('../atlas-polity-spatial-index.json', import.meta.url));
const canonicalRaw = readFileSync(canonicalPath, 'utf8');

test('baseline migration preserves canonical bytes and refuses accidental overwrite', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'atlas-spatial-baseline-'));
  try {
    const source = path.join(root, 'canonical.json');
    const output = path.join(root, 'nested', 'baseline.index.json');
    writeFileSync(source, canonicalRaw, 'utf8');

    const first = migrateSpatialBaseline({ sourcePath: source, outPath: output, force: false });
    assert.equal(readFileSync(output, 'utf8'), canonicalRaw);
    assert.match(first.sha256, /^[0-9a-f]{64}$/);
    assert.equal(first.geography_count, Object.keys(JSON.parse(canonicalRaw).polity_geography).length);
    assert.equal(first.subregion_count, Object.keys(JSON.parse(canonicalRaw).polity_subregions).length);

    assert.throws(
      () => migrateSpatialBaseline({ sourcePath: source, outPath: output, force: false }),
      /SPATIAL_BASELINE_ALREADY_EXISTS/
    );

    const refreshed = migrateSpatialBaseline({ sourcePath: source, outPath: output, force: true });
    assert.equal(refreshed.sha256, first.sha256);
    assert.equal(readFileSync(output, 'utf8'), canonicalRaw);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
