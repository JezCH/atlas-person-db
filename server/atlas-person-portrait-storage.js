"use strict";

const crypto = require("node:crypto");

const BLOB_API_VERSION = "12";
const DEFAULT_BLOB_API_URL = "https://vercel.com/api/blob";
const PORTRAIT_CONTENT_TYPE = "image/webp";
const PORTRAIT_CACHE_SECONDS = 31536000;
const SHA256_RE = /^[0-9a-f]{64}$/;

function codedError(code, detail = null) {
  const error = new Error(code);
  error.code = code;
  if (detail != null) error.detail = detail;
  return error;
}

function normalizeStoreId(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.startsWith("store_") ? text.slice("store_".length) : text;
}

function parseStoreIdFromReadWriteToken(token) {
  const text = String(token || "").trim();
  if (!text) return null;
  const parts = text.split("_");
  return normalizeStoreId(parts[3] || "");
}

function resolveBlobStoreId(env = process.env) {
  const direct = normalizeStoreId(env?.BLOB_STORE_ID);
  if (direct) return direct;
  return parseStoreIdFromReadWriteToken(env?.BLOB_READ_WRITE_TOKEN);
}

function resolveBlobAuth(env = process.env) {
  const oidc = String(env?.VERCEL_OIDC_TOKEN || "").trim();
  const storeId = normalizeStoreId(env?.BLOB_STORE_ID);
  if (oidc && storeId) return Object.freeze({ kind:"oidc", token:oidc, store_id:storeId });

  const readWrite = String(env?.BLOB_READ_WRITE_TOKEN || "").trim();
  const tokenStoreId = parseStoreIdFromReadWriteToken(readWrite);
  if (readWrite && tokenStoreId) {
    return Object.freeze({ kind:"read_write", token:readWrite, store_id:tokenStoreId });
  }
  throw codedError("PORTRAIT_BLOB_STORAGE_NOT_CONFIGURED");
}

function normalizeSha256(value) {
  const sha = String(value || "").trim().toLowerCase();
  if (!SHA256_RE.test(sha)) throw codedError("PERSON_PORTRAIT_SHA256_INVALID");
  return sha;
}

function portraitPathname(assetSha256) {
  return `portraits/${normalizeSha256(assetSha256)}.webp`;
}

function portraitPublicUrl(assetSha256, { env = process.env } = {}) {
  const storeId = resolveBlobStoreId(env);
  if (!storeId) return null;
  return `https://${storeId}.public.blob.vercel-storage.com/${portraitPathname(assetSha256)}`;
}

function blobApiBase(env = process.env) {
  return String(env?.VERCEL_BLOB_API_URL || DEFAULT_BLOB_API_URL).replace(/\/+$/, "");
}

async function parseResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function blobRequest({
  env = process.env,
  fetchImpl = globalThis.fetch,
  pathname = "",
  method = "GET",
  body,
  headers = {}
} = {}) {
  if (typeof fetchImpl !== "function") throw codedError("PORTRAIT_BLOB_FETCH_UNAVAILABLE");
  const auth = resolveBlobAuth(env);
  const requestId = `${auth.store_id}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`;
  const target = `${blobApiBase(env)}${pathname}`;
  const response = await fetchImpl(target, {
    method,
    ...(body == null ? {} : { body }),
    headers:{
      "x-api-blob-request-id":requestId,
      "x-vercel-blob-store-id":auth.store_id,
      "x-api-blob-request-attempt":"0",
      "x-api-version":BLOB_API_VERSION,
      authorization:`Bearer ${auth.token}`,
      ...headers
    }
  });
  const payload = await parseResponseJson(response);
  if (!response.ok) {
    const remoteCode = String(payload?.error?.code || "unknown_error");
    const error = codedError(
      remoteCode === "not_found" ? "PORTRAIT_BLOB_NOT_FOUND" : "PORTRAIT_BLOB_REQUEST_FAILED",
      { remote_code:remoteCode, status:Number(response.status || 0), message:payload?.error?.message || null }
    );
    error.status = Number(response.status || 0);
    throw error;
  }
  return payload;
}

function normalizeBlobMetadata(payload, assetSha256) {
  const expectedPathname = portraitPathname(assetSha256);
  const actualPathname = String(payload?.pathname || expectedPathname);
  if (actualPathname !== expectedPathname) throw codedError("PORTRAIT_BLOB_PATH_MISMATCH");
  return Object.freeze({
    pathname:expectedPathname,
    url:payload?.url ? String(payload.url) : null,
    download_url:payload?.downloadUrl ? String(payload.downloadUrl) : null,
    content_type:payload?.contentType ? String(payload.contentType) : null,
    etag:payload?.etag ? String(payload.etag) : null,
    size:payload?.size == null ? null : Number(payload.size)
  });
}

function createPortraitBlobStorage({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  async function head(assetSha256) {
    const sha = normalizeSha256(assetSha256);
    const pathname = portraitPathname(sha);
    try {
      const payload = await blobRequest({
        env,
        fetchImpl,
        pathname:`?url=${encodeURIComponent(pathname)}`,
        method:"GET"
      });
      return normalizeBlobMetadata(payload, sha);
    } catch (error) {
      if (error?.code === "PORTRAIT_BLOB_NOT_FOUND") return null;
      throw error;
    }
  }

  async function put(assetSha256, bytes) {
    const sha = normalizeSha256(assetSha256);
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw codedError("PERSON_PORTRAIT_BYTES_REQUIRED");
    const pathname = portraitPathname(sha);
    const existing = await head(sha);
    if (existing) return Object.freeze({ created:false, asset:existing });

    try {
      const payload = await blobRequest({
        env,
        fetchImpl,
        pathname:`/?pathname=${encodeURIComponent(pathname)}`,
        method:"PUT",
        body:bytes,
        headers:{
          "x-vercel-blob-access":"public",
          "x-content-type":PORTRAIT_CONTENT_TYPE,
          "x-add-random-suffix":"0",
          "x-allow-overwrite":"0",
          "x-cache-control-max-age":String(PORTRAIT_CACHE_SECONDS)
        }
      });
      return Object.freeze({ created:true, asset:normalizeBlobMetadata(payload, sha) });
    } catch (error) {
      const raced = await head(sha).catch(() => null);
      if (raced) return Object.freeze({ created:false, asset:raced });
      throw error;
    }
  }

  async function remove(assetSha256) {
    const sha = normalizeSha256(assetSha256);
    const pathname = portraitPathname(sha);
    try {
      await blobRequest({
        env,
        fetchImpl,
        pathname:"/delete",
        method:"POST",
        body:JSON.stringify({ urls:[pathname] }),
        headers:{ "content-type":"application/json" }
      });
      return Object.freeze({ deleted:true, pathname });
    } catch (error) {
      if (error?.code === "PORTRAIT_BLOB_NOT_FOUND") {
        return Object.freeze({ deleted:false, pathname, replay:true });
      }
      throw error;
    }
  }

  return Object.freeze({
    pathname:portraitPathname,
    publicUrl:(assetSha256) => portraitPublicUrl(assetSha256, { env }),
    head,
    put,
    remove
  });
}

module.exports = Object.freeze({
  BLOB_API_VERSION,
  DEFAULT_BLOB_API_URL,
  PORTRAIT_CONTENT_TYPE,
  PORTRAIT_CACHE_SECONDS,
  normalizeStoreId,
  parseStoreIdFromReadWriteToken,
  resolveBlobStoreId,
  resolveBlobAuth,
  normalizeSha256,
  portraitPathname,
  portraitPublicUrl,
  createPortraitBlobStorage
});
