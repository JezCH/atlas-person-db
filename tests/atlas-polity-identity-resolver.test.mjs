import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const resolver=require('../server/atlas-polity-identity-resolver.js');

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';

function clientFor({ key=[], names=[], designations=[], continuity=[], retired=[] }={}) {
  const calls=[];
  return {
    calls,
    async query(sql,params=[]) {
      const text=String(sql);
      calls.push({sql:text,params});
      if (/from atlas_v2\.polities p\s+where p\.canonical_key=\$1/i.test(text)) return {rows:key};
      if (/from atlas_v2\.polity_names pn/i.test(text)) return {rows:names};
      if (/from atlas_v2\.polity_designation_names pdn/i.test(text)) return {rows:designations};
      if (/from atlas_v2\.polity_identity_relations pir/i.test(text)) return {rows:continuity};
      if (/from atlas_v2\.correction_manifest_runs cmr/i.test(text)) return {rows:retired};
      throw new Error('unexpected query: '+text);
    }
  };
}

function polityRow(id=A,extra={}) {
  return {
    polity_id:id,
    canonical_key:'Russia',
    polity_type:'historical_polity',
    historicity:'historical',
    ...extra
  };
}

test('exact alias reuses the existing stable Polity identity', async () => {
  const client=clientFor({
    names:[polityRow(A,{locale:'en',name:'Muscovy',name_type:'alias',is_preferred:false})]
  });
  const out=await resolver.resolvePolityIdentity(client,{
    canonical_name_en:'Muscovy',
    polity_type:'historical_polity',
    historicity:'historical'
  });
  assert.equal(out.status,'resolved');
  assert.equal(out.id,A);
  assert.equal(out.matched_by,'stable_name');
  assert.deepEqual(out.match_kinds,['alias']);
  assert.equal(out.create_allowed,false);
  assert.equal(client.calls.some(({sql})=>/correction_manifest_runs/.test(sql)),false);
});

test('temporal designation reuses its stable Polity only when Activity date context is contained', async () => {
  const designation=polityRow(A,{
    canonical_key:'Russia',
    designation_id:'33333333-3333-4333-8333-333333333333',
    designation_type:'state_form',
    valid_from_year:1721,valid_from_month:11,valid_from_day:2,
    valid_to_year:1917,valid_to_month:3,valid_to_day:15,
    locale:'en',name:'Russian Empire',is_preferred:true
  });
  const client=clientFor({designations:[designation]});
  const out=await resolver.resolvePolityIdentity(client,{
    canonical_name_en:'Russian Empire',
    polity_type:'historical_polity',
    historicity:'historical'
  },{
    temporalContext:{
      start:{year:1762,month:7,day:9,granularity:'day',certainty:'exact',calendar:'gregorian'},
      end:{year:1796,month:11,day:17,granularity:'day',certainty:'exact',calendar:'gregorian'}
    }
  });
  assert.equal(out.id,A);
  assert.equal(out.matched_by,'temporal_designation');
  assert.deepEqual(out.match_kinds,['temporal_designation']);
});

test('temporal designation without complete date context fails closed instead of creating a duplicate', async () => {
  const client=clientFor({designations:[polityRow(A,{
    designation_id:'33333333-3333-4333-8333-333333333333',
    designation_type:'historiographic_period',
    valid_from_year:1368,valid_to_year:1388,
    locale:'en',name:'Northern Yuan',is_preferred:true
  })]});
  await assert.rejects(
    resolver.resolvePolityIdentity(client,{canonical_name_en:'Northern Yuan'}),
    /POLITY_DESIGNATION_DATE_CONTEXT_REQUIRED/
  );
});

test('temporal designation outside its reviewed interval fails closed', async () => {
  const client=clientFor({designations:[polityRow(A,{
    designation_id:'33333333-3333-4333-8333-333333333333',
    designation_type:'state_form',
    valid_from_year:1721,valid_to_year:1917,
    locale:'en',name:'Russian Empire',is_preferred:true
  })]});
  await assert.rejects(
    resolver.resolvePolityIdentity(client,{canonical_name_en:'Russian Empire'},{
      temporalContext:{start:{year:1600},end:{year:1650}}
    }),
    /POLITY_DESIGNATION_DATE_MISMATCH_REVIEW_REQUIRED/
  );
});

test('related predecessor/successor candidates remain distinct and require continuity review', async () => {
  const client=clientFor({
    names:[
      polityRow(A,{canonical_key:'Portugal',name:'Portugal',is_preferred:true}),
      polityRow(B,{canonical_key:'United Kingdom of Portugal Brazil and the Algarves',name:'Portugal',is_preferred:false})
    ],
    continuity:[{
      id:'44444444-4444-4444-8444-444444444444',
      predecessor_polity_id:A,
      successor_polity_id:B,
      relation_type:'formed_into',
      transition_year:1815,
      transition_month:12,
      transition_day:16,
      transition_granularity:'day',
      transition_certainty:'exact',
      transition_calendar:'gregorian'
    }]
  });
  await assert.rejects(
    resolver.resolvePolityIdentity(client,{canonical_name_en:'Portugal'}),
    /POLITY_IDENTITY_CONTINUITY_REVIEW_REQUIRED/
  );
});

test('continuity metadata never redirects a uniquely matched predecessor to its successor', async () => {
  const client=clientFor({
    names:[polityRow(A,{canonical_key:'Kingdom of Portugal',name:'Kingdom of Portugal',is_preferred:true})],
    continuity:[{
      id:'44444444-4444-4444-8444-444444444444',
      predecessor_polity_id:A,
      successor_polity_id:B,
      relation_type:'formed_into',
      transition_year:1815,
      transition_month:12,
      transition_day:16,
      transition_granularity:'day',
      transition_certainty:'exact',
      transition_calendar:'gregorian'
    }]
  });
  const out=await resolver.resolvePolityIdentity(client,{canonical_name_en:'Kingdom of Portugal'});
  assert.equal(out.id,A);
  assert.equal(out.continuity.length,1);
  assert.equal(out.continuity[0].successor_polity_id,B);
});

test('retired identity evidence blocks silent resurrection when no current identity matches', async () => {
  const client=clientFor({
    retired:[{
      polity_id:A,
      canonical_key:'Old Duplicate Russia',
      polity_type:'historical_polity',
      historicity:'historical',
      preferred_names:[{locale:'en',name:'Old Duplicate Russia',is_preferred:true}]
    }]
  });
  await assert.rejects(
    resolver.resolvePolityIdentity(client,{canonical_name_en:'Old Duplicate Russia'}),
    (error)=>{
      assert.equal(error.message,'POLITY_RETIRED_IDENTITY_REVIEW_REQUIRED');
      assert.deepEqual(error.retired_polity_ids,[A]);
      return true;
    }
  );
});

test('truly unknown identity is the only state that permits creation', async () => {
  const client=clientFor();
  const out=await resolver.resolvePolityIdentity(client,{canonical_name_en:'New Reviewed Polity'});
  assert.equal(out.status,'unresolved');
  assert.equal(out.create_allowed,true);
  assert.equal(out.canonical_key,'New Reviewed Polity');
  assert.equal(client.calls.some(({sql})=>/correction_manifest_runs/.test(sql)),true);
});

test('designation containment honors month/day boundaries', () => {
  const row={
    valid_from_year:1721,valid_from_month:11,valid_from_day:2,
    valid_to_year:1721,valid_to_month:11,valid_to_day:30
  };
  assert.equal(resolver.designationContainsContext(row,resolver.normalizeTemporalContext({
    start:{year:1721,month:11,day:2},
    end:{year:1721,month:11,day:30}
  })),true);
  assert.equal(resolver.designationContainsContext(row,resolver.normalizeTemporalContext({
    start:{year:1721,month:10,day:31},
    end:{year:1721,month:11,day:30}
  })),false);
});
