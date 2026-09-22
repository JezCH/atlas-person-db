import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ledger = require("../server/atlas-correction-ledger-service.js");

test("correction ledger hash is stable across object key ordering", () => {
  assert.equal(
    ledger.manifestHash({ z:1, a:{ y:2, x:[{ b:4, a:3 }] } }),
    ledger.manifestHash({ a:{ x:[{ a:3, b:4 }], y:2 }, z:1 })
  );
  assert.match(ledger.manifestHash({schema:"atlas-correction-manifest/v2"}), /^[0-9a-f]{64}$/);
});

test("correction ledger lookup fails closed when the ledger table is absent", async () => {
  const calls=[];
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    return {rows:[{correction_manifest_runs:null}],rowCount:1};
  }};
  assert.equal(await ledger.correctionLedgerExists(client), false);
  assert.equal(await ledger.readLedger(client, "request-1"), null);
  assert.equal(calls.length, 2);
});

test("correction ledger lookup preserves exact request id and FOR UPDATE semantics", async () => {
  const calls=[];
  const row={
    request_id:"request-1",
    manifest_hash:"abc",
    manifest_schema:"atlas-correction-manifest/v2",
    result_snapshot:{ok:true},
    applied_at:"2026-09-01T00:00:00Z"
  };
  const client={query:async(sql,args)=>{
    calls.push([sql,args]);
    if(sql.includes("to_regclass")) return {rows:[{correction_manifest_runs:"atlas_v2.correction_manifest_runs"}],rowCount:1};
    return {rows:[row],rowCount:1};
  }};
  assert.deepEqual(await ledger.readLedger(client,"request-1"),row);
  assert.match(calls[1][0],/where request_id=\$1\s+for update/i);
  assert.deepEqual(calls[1][1],["request-1"]);
});
