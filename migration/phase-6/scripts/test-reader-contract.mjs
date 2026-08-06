import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../../atlas-reader.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window, console });
const reader = window.AtlasReader;
if (!reader) throw new Error('AtlasReader not exposed');

const validRow = {
  id: '1', person_name: 'A', politic_name: 'B', activity_start: 1,
  activity_end: 2, role: null, period_basis: 'general_activity', notes: null
};

function makeClient(tableResults) {
  return {
    from(table) {
      const state = { table, orders: [] };
      const query = {
        select() { return query; },
        order(column) {
          state.orders.push(column);
          if (state.orders.length === 4) {
            const result = tableResults[table];
            return Promise.resolve({ ...result, __orders: state.orders });
          }
          return query;
        }
      };
      return query;
    }
  };
}

const legacy = await reader.loadPersonPolitics({
  client: makeClient({ person_politics: { data: [validRow], error: null } })
});
if (legacy.error || legacy.source !== 'legacy' || legacy.data.length !== 1) throw new Error('legacy read failed');

const shadow = await reader.loadPersonPolitics({
  source: 'v2-shadow',
  client: makeClient({ atlas_person_politics_compat_v1: { data: [validRow], error: null } })
});
if (shadow.error || shadow.source !== 'v2-shadow') throw new Error('v2-shadow read failed');

const fallback = await reader.loadPersonPolitics({
  source: 'v2-shadow',
  client: makeClient({
    atlas_person_politics_compat_v1: { data: null, error: new Error('boom') },
    person_politics: { data: [validRow], error: null }
  })
});
if (fallback.error || fallback.source !== 'legacy' || !fallback.diagnostics.includes('fallback to legacy')) throw new Error('fallback failed');

const invalidSource = reader.resolveSource('bad-value');
if (invalidSource.source !== 'legacy' || !invalidSource.diagnostic) throw new Error('invalid source guard failed');

const failures = reader.validateRows([{ ...validRow, id: 'x' }, { ...validRow, id: 'x' }]);
if (!failures.some((x) => x.includes('duplicate id'))) throw new Error('duplicate guard failed');
if (Object.keys(reader).some((key) => /write|insert|update|delete/i.test(key))) throw new Error('reader exposes write API');

console.log(JSON.stringify({ status: 'PASS', tests: 6 }));
