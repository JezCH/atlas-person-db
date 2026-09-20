import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  BLOB_API_VERSION,
  portraitPathname,
  portraitPublicUrl,
  parseStoreIdFromReadWriteToken,
  resolveBlobAuth,
  createPortraitBlobStorage
} = require("../server/atlas-person-portrait-storage.js");

const SHA = "a".repeat(64);
const TOKEN = "vercel_blob_rw_storeABC_secretvalue";

function response(status, payload = {}) {
  return {
    ok:status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

test("portrait storage derives one immutable pathname and public URL from sha256", () => {
  assert.equal(portraitPathname(SHA), `portraits/${SHA}.webp`);
  assert.equal(parseStoreIdFromReadWriteToken(TOKEN), "storeABC");
  assert.equal(
    portraitPublicUrl(SHA, { env:{ BLOB_READ_WRITE_TOKEN:TOKEN } }),
    `https://storeABC.public.blob.vercel-storage.com/portraits/${SHA}.webp`
  );
});

test("portrait storage prefers OIDC plus explicit store id and falls back to read-write token", () => {
  assert.deepEqual(
    resolveBlobAuth({ VERCEL_OIDC_TOKEN:"oidc", BLOB_STORE_ID:"store_storeXYZ", BLOB_READ_WRITE_TOKEN:TOKEN }),
    { kind:"oidc", token:"oidc", store_id:"storeXYZ" }
  );
  assert.deepEqual(
    resolveBlobAuth({ BLOB_READ_WRITE_TOKEN:TOKEN }),
    { kind:"read_write", token:TOKEN, store_id:"storeABC" }
  );
});

test("portrait put is content-addressed, public, webp-only, suffix-free and overwrite-free", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url:String(url), init });
    if (calls.length === 1) return response(404, { error:{ code:"not_found" } });
    return response(200, {
      pathname:`portraits/${SHA}.webp`,
      url:`https://storeABC.public.blob.vercel-storage.com/portraits/${SHA}.webp`,
      downloadUrl:`https://storeABC.public.blob.vercel-storage.com/portraits/${SHA}.webp?download=1`,
      contentType:"image/webp",
      etag:"etag-1"
    });
  };
  const storage = createPortraitBlobStorage({ env:{ BLOB_READ_WRITE_TOKEN:TOKEN }, fetchImpl });
  const result = await storage.put(SHA, Buffer.from("test-webp-body"));
  assert.equal(result.created, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.method, "GET");
  assert.match(calls[0].url, /\?url=portraits%2F/);
  assert.equal(calls[1].init.method, "PUT");
  assert.match(calls[1].url, /\?pathname=portraits%2F/);
  assert.equal(calls[1].init.headers["x-api-version"], BLOB_API_VERSION);
  assert.equal(calls[1].init.headers["x-vercel-blob-store-id"], "storeABC");
  assert.equal(calls[1].init.headers["x-vercel-blob-access"], "public");
  assert.equal(calls[1].init.headers["x-content-type"], "image/webp");
  assert.equal(calls[1].init.headers["x-add-random-suffix"], "0");
  assert.equal(calls[1].init.headers["x-allow-overwrite"], "0");
});

test("portrait put reuses an existing hash asset without uploading again", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url:String(url), init });
    return response(200, {
      pathname:`portraits/${SHA}.webp`,
      url:`https://storeABC.public.blob.vercel-storage.com/portraits/${SHA}.webp`,
      contentType:"image/webp",
      etag:"etag-existing"
    });
  };
  const storage = createPortraitBlobStorage({ env:{ BLOB_READ_WRITE_TOKEN:TOKEN }, fetchImpl });
  const result = await storage.put(SHA, Buffer.from("same"));
  assert.equal(result.created, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "GET");
});

test("portrait remove targets only the deterministic pathname and treats not-found as replay", async () => {
  const bodies = [];
  const storage = createPortraitBlobStorage({
    env:{ BLOB_READ_WRITE_TOKEN:TOKEN },
    fetchImpl:async (_url, init) => {
      bodies.push(JSON.parse(String(init.body)));
      return response(404, { error:{ code:"not_found" } });
    }
  });
  const result = await storage.remove(SHA);
  assert.equal(result.deleted, false);
  assert.equal(result.replay, true);
  assert.deepEqual(bodies, [{ urls:[`portraits/${SHA}.webp`] }]);
});
