"use strict";

const { requireEnv } = require("./atlas-session-auth.js");
const { createPersonDeleteService } = require("./atlas-person-delete-service.js");
const { verifyPersonHardDeleteGithubOidc } = require("./atlas-person-hard-delete-github-oidc.js");

const MARKER = "ATLAS_PERSON_HARD_DELETE_BATCH_V1";
const TARGET_PERSON_IDS = Object.freeze([
  "13ad86c1-0e8e-4584-9d49-2a94abb225f8",
  "39a15c79-5284-4d31-a31a-8a54cf01a481",
  "cb836ed9-4258-4ce2-9167-103da7fc7167",
  "aa76779b-7d49-423a-bd7a-160977916ec6",
  "75d5ad53-3646-4343-b65c-a115d7027296",
  "7f966b50-7a75-4764-9772-2a935500171c",
  "7bd4ccad-b602-40d1-b971-df694e550e1e",
  "6614745d-c767-4133-911e-02161d087552",
  "4057482e-ba8e-43c5-8681-5edda912df15",
  "3fef3a33-a97c-4905-b66e-7795093bfc23",
  "0deb2089-e581-4516-9a97-04f024502120",
  "5174295b-a333-46de-a6c6-18b3270e8f9a",
  "f9ac6303-f933-4b82-b661-9812b1be636b",
  "786d44c4-6f47-4c04-9e38-8057b67b59ea",
  "7b73f803-2a44-559c-acd1-b1fe1b64d0e4",
  "03729648-bf35-4b41-9ca6-cbe5414e03c4",
  "a87ee025-1cfe-4e6a-97a9-1d36c174c88b",
  "19906b24-88bd-4358-bf72-8b245de5c495",
  "68dac3a6-315f-4857-b0b7-8703f70a0379",
  "0536fa0f-a4ca-4ed9-b293-b9d7a2cf00c8",
  "8225a00f-0183-4991-9702-44ba132552b8",
  "32c2be44-5efa-42c7-b9de-1442b3fe3ab7",
  "132135f2-6937-4a46-ac01-76ed64094208",
  "31bbe437-0472-44a1-95e9-31eabe7892cb",
  "2957d4f9-c4d4-4515-8e62-461cf2807f68",
  "bf42d7a7-8434-4256-92e1-c88f0cd2ae95",
  "2465b37b-ad2f-4759-a16c-9de69dd23dfd",
  "0fbcbfbf-5190-4edc-8143-05fbcd2d98eb",
  "18aec990-63e4-46aa-a9f1-a6aecdd04ba9",
  "4ee399e0-b721-4855-81b1-66c7c4d452c5",
  "2e5f0a4f-2cf2-43b7-8264-bc919cc4640b",
  "fd4dea4d-94ed-43c9-923f-e790e49504d4",
  "43a9aeb1-89c1-4e91-bc7d-2bebb66aa548",
  "95431d5a-8728-410e-a49e-5db486b0fbff",
  "41ea69ff-d9d2-43c2-8a72-46d5c44d877b",
  "8937be77-17e2-4e7d-b1a8-8172667a6e41",
  "b7f2483b-fa22-455d-b726-17688d7163d6",
  "a954e372-2549-4721-b736-c038c0009642",
  "29783541-c10b-42d1-b052-94610723327d",
  "bcafeb78-74ab-4101-8f2c-56bde95d165e",
  "8b814f82-e4bf-438e-9e7e-189905524d43",
  "b781f7ff-9830-4456-b428-df3f28f04ce5",
  "cebd0cd9-69aa-47d2-ac96-8137b473f2cd",
  "5133aac5-5aa5-4356-821c-8c9a3beb1923",
  "c0ca5075-8b3d-4daf-992e-76223cf98a48",
  "e1c12fec-6665-4cd0-b410-01d4e1683a01",
  "b001c035-7e3d-43c2-bb38-f2ba8216efdd"
]);
const TARGET_PERSON_ID_SET = new Set(TARGET_PERSON_IDS);

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("PERSON_HARD_DELETE_INVALID_JSON"); }
  }
  return {};
}

function bearerToken(headers = {}) {
  const raw = String(headers.authorization || headers.Authorization || "").trim();
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function createPersonHardDeleteHandler({ clientFactory, env = process.env, oidcVerifier = verifyPersonHardDeleteGithubOidc } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method === "GET") {
      return json(res, 200, {
        ok:true,
        marker:MARKER,
        target_count:TARGET_PERSON_IDS.length,
        target_person_ids:TARGET_PERSON_IDS,
        runtime_sha:String(env?.VERCEL_GIT_COMMIT_SHA || "").trim().toLowerCase()
      });
    }
    if (method !== "POST") return json(res, 405, { ok:false, marker:MARKER, code:"METHOD_NOT_ALLOWED" });

    let body;
    try {
      body = parseBody(req);
    } catch (error) {
      return json(res, 400, { ok:false, marker:MARKER, code:String(error?.message || "PERSON_HARD_DELETE_INVALID_JSON") });
    }

    const personId = String(body?.person_id || "").trim().toLowerCase();
    const workflowSha = String(body?.workflow_sha || "").trim().toLowerCase();
    if (!TARGET_PERSON_ID_SET.has(personId)) {
      return json(res, 400, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_TARGET_NOT_ALLOWED" });
    }
    if (!/^[0-9a-f]{40}$/.test(workflowSha)) {
      return json(res, 400, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_WORKFLOW_SHA_REQUIRED" });
    }

    const token = bearerToken(req?.headers || {});
    if (!token) return json(res, 401, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_OIDC_REQUIRED" });
    try {
      await oidcVerifier(token, { expectedSha:workflowSha });
    } catch {
      return json(res, 401, { ok:false, marker:MARKER, code:"PERSON_HARD_DELETE_OIDC_REJECTED" });
    }

    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
    } catch {
      return json(res, 503, { ok:false, marker:MARKER, code:"SUPABASE_DB_URL_REQUIRED" });
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      const service = createPersonDeleteService({ client });
      const outcome = await service.mutate({
        operation:"delete_person",
        request_id:String(body?.request_id || `live-person-delete-${workflowSha}-${personId}`),
        payload:{ person_id:personId }
      });
      if (outcome?.committed !== true || outcome?.verification?.match !== true) {
        return json(res, 409, { ok:false, marker:MARKER, outcome });
      }
      return json(res, 200, { ok:true, marker:MARKER, outcome });
    } catch (error) {
      return json(res, 500, { ok:false, marker:MARKER, code:String(error?.message || "PERSON_HARD_DELETE_FAILED") });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({
  createPersonHardDeleteHandler,
  parseBody,
  bearerToken,
  MARKER,
  TARGET_PERSON_IDS
});
