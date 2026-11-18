import test from 'node:test';
import assert from 'node:assert/strict';
import http from '../server/atlas-read-http.js';

const response = (fields) => ({schema:'atlas-person-read/v1',mode:'list',persons:[{id:'private-id'}],...fields});

test('large JSON attribution distinguishes full list, bounded search, detail and compact identity without query values', () => {
  assert.deepEqual(http.largeJsonDisposition(response({query:null})),{mode:'person_full_list',rows:1});
  assert.deepEqual(http.largeJsonDisposition(response({query:'sensitive example name'})),{mode:'person_filtered_list',rows:1});
  assert.deepEqual(http.largeJsonDisposition(response({limit:1})),{mode:'person_filtered_list',rows:1});
  assert.deepEqual(http.largeJsonDisposition(response({namuwiki_status:'missing'})),{mode:'person_filtered_list',rows:1});
  assert.deepEqual(http.largeJsonDisposition(response({projection:'identity'})),{mode:'person_identity',rows:1});
  assert.deepEqual(http.largeJsonDisposition({schema:'atlas-person-read/v1',mode:'detail',person:{id:'private-id'}}),{mode:'person_detail',rows:1});
  assert.deepEqual(http.largeJsonDisposition({schema:'other',mode:'untrusted mode',persons:[{}]}),{mode:'other',rows:null});
});

test('large payload warning exposes only fixed category and count, preserving bytes, status, response and cache contract', () => {
  const body=response({query:'private search',persons:[{id:'private-id',notes:'SECRET_PAYLOAD_'+ 'x'.repeat(262144)}]});
  const headers={}, warnings=[];
  let actual;
  const res={req:{url:'/api/atlas-person-read?q=PRIVATE_URL_QUERY'},setHeader:(key,value)=>{headers[key]=value;},end:value=>{actual=value;}};
  const original=console.warn;
  try {
    console.warn=(...args)=>warnings.push(args.join(' '));
    http.sendJson(res,200,body);
  } finally {console.warn=original;}
  assert.equal(res.statusCode,200);
  assert.equal(headers['cache-control'],'no-store');
  assert.equal(headers['x-atlas-json-bytes'],String(Buffer.byteLength(JSON.stringify(body),'utf8')));
  assert.equal(actual,JSON.stringify(body));
  assert.equal(warnings.length,1);
  assert.match(warnings[0], /mode=person_filtered_list rows=1/);
  assert.match(warnings[0], /route=\/api\/atlas-person-read bytes=\d+ status=200/);
  for (const secret of ['private search','private-id','SECRET_PAYLOAD','PRIVATE_URL_QUERY']) assert.ok(!warnings[0].includes(secret));
});
