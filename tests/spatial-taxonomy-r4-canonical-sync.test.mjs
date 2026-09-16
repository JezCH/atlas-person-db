import test from 'node:test';
import assert from 'node:assert/strict';

import { main as compileR4SpatialIndex } from '../scripts/compile-spatial-bindings-r4.mjs';

test('committed canonical spatial index matches deterministic r4 compiler output', () => {
  assert.doesNotThrow(() => compileR4SpatialIndex(['--check']));
});
