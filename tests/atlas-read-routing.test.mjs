import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const consolidatedRead = require('../api/atlas-read.js');

test('consolidated read surface selector accepts the three rewrite targets', () => {
  assert.equal(consolidatedRead.selectReadSurface({ query: { __atlas_read_surface: 'person' } }), 'person');
  assert.equal(consolidatedRead.selectReadSurface({ query: { __atlas_read_surface: 'admin-inspector' } }), 'admin-inspector');
  assert.equal(consolidatedRead.selectReadSurface({ query: { __atlas_read_surface: 'admin-system-status' } }), 'admin-system-status');
});

test('consolidated read surface selector preserves the legacy normalized route by default', () => {
  assert.equal(consolidatedRead.selectReadSurface({ query: {} }), '');
  assert.equal(consolidatedRead.selectReadSurface({ url: '/api/atlas-read?foo=bar' }), '');
});

test('consolidated read surface selector can recover the internal rewrite marker from URL', () => {
  assert.equal(consolidatedRead.selectReadSurface({ url: '/api/atlas-read?__atlas_read_surface=person&person_id=00000000-0000-4000-8000-000000000000' }), 'person');
});

test('ambiguous repeated surface markers do not select a privileged route', () => {
  assert.equal(consolidatedRead.selectReadSurface({ query: { __atlas_read_surface: ['admin-inspector', 'person'] } }), '');
});
