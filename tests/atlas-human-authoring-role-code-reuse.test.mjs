import assert from 'node:assert/strict';
import test from 'node:test';

import humanModule from '../server/atlas-human-authoring-service.js';
const { resolveOrCreateRole, roleCodeFromLabel } = humanModule;

const ROLE_ID = '44444444-4444-4444-8444-444444444444';

test('human authoring reuses an active Role by normalized code when the English label differs', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql:String(sql), params });
      if (calls.length === 1) return { rows:[] };
      if (calls.length === 2) return { rows:[{ id:ROLE_ID }] };
      throw new Error('unexpected query');
    }
  };

  const result = await resolveOrCreateRole(client, {
    role:'Governor-General',
    role_code:roleCodeFromLabel('Governor-General'),
    role_display_name_ko:'총독',
    role_category:'government'
  });

  assert.deepEqual(result, { id:ROLE_ID, disposition:'reused' });
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /source_label=\$1 or n\.name=\$1/);
  assert.match(calls[1].sql, /r\.code=\$1/);
  assert.deepEqual(calls[1].params, ['governor_general']);
});

test('human authoring fails closed if normalized Role code is not unique', async () => {
  let call = 0;
  const client = {
    async query() {
      call += 1;
      if (call === 1) return { rows:[] };
      return { rows:[{ id:ROLE_ID }, { id:'55555555-5555-4555-8555-555555555555' }] };
    }
  };

  await assert.rejects(
    () => resolveOrCreateRole(client, {
      role:'Governor-General',
      role_code:'governor_general',
      role_display_name_ko:'총독',
      role_category:'government'
    }),
    /HUMAN_AUTHORING_ROLE_CODE_AMBIGUOUS/
  );
});
