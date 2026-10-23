import test from 'node:test';
import assert from 'node:assert/strict';
import {taskCapabilityHints} from '../scripts/atlas-codex-task-runner.mjs';
test('approved chronology source receives read-only graph and matching specialized skill hints',()=>{
  const s=taskCapabilityHints({id:'bce-boundary',paths:['scripts/stage2-baseline-a-intake.mjs',
    'tests/stage2-baseline-a-intake.test.mjs'],instructions:'Fix Activity Boolean year boundary.'});
  assert.match(s,/atlas-agent-dependency-map\.mjs --path scripts\/stage2-baseline-a-intake\.mjs/);
  assert.match(s,/atlas-temporal-evidence\/SKILL\.md/);
  assert.match(s,/atlas-experience-reuse\/SKILL\.md/);
  assert.match(s,/not authority|NOT an AST/i);
});
test('unrelated work does not trigger broad permanent skills or extra edits',()=>{
  assert.equal(taskCapabilityHints({id:'notes',paths:['docs/README.md'],instructions:'Review notes'}),'');
  const s=taskCapabilityHints({id:'source',paths:['server/atlas-source-service.js'],instructions:'Repair bibliographic source'});
  assert.match(s,/atlas-source-provenance/);
  assert.doesNotMatch(s,/atlas-polity-identity/);
});
test('skill hints are bounded to three and never grant credentials or extra mutation',()=>{
  const s=taskCapabilityHints({id:'fix',paths:['scripts/safe.mjs','tests/safe.test.mjs'],
    instructions:'Review person polity chronology and source evidence regression'});
  assert.ok((s.match(/skills\//g)||[]).length<=3);
  assert.doesNotMatch(s,/Vercel Sandbox|deploy Production|run external API/);
});
