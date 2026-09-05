"use strict";

const { createMutationAuthorizer, requireEnv } = require("./atlas-session-auth.js");
const { listRepresentativeDomains, setRepresentativeDomain } = require("./atlas-person-domain-service.js");

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { throw new Error("PERSON_DOMAIN_INVALID_JSON"); }
  }
  return {};
}

function statusForError(code) {
  if (/REQUIRED|UNSUPPORTED|NOT_FOUND|INVALID/.test(code)) return 400;
  if (/UNAUTHORIZED/.test(code)) return 401;
  if (/VERIFICATION|DATABASE|SUPABASE/.test(code)) return 503;
  return 500;
}

function createPersonDomainHandler({ clientFactory, env = process.env, now } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "POST") return json(res, 405, { ok:false, code:"METHOD_NOT_ALLOWED" });

    let databaseUrl;
    try {
      databaseUrl = requireEnv(env, "SUPABASE_DB_URL");
    } catch (error) {
      return json(res, 503, { ok:false, code:"SUPABASE_DB_URL_REQUIRED" });
    }

    if (method === "POST") {
      let authorize;
      try {
        authorize = createMutationAuthorizer({ env, ...(typeof now === "function" ? { now } : {}) });
      } catch {
        return json(res, 503, { ok:false, code:"PERSON_DOMAIN_AUTH_NOT_CONFIGURED" });
      }
      const auth = await authorize({ method, headers:req?.headers || {} });
      if (!auth?.authorized) return json(res, 401, { ok:false, code:"PERSON_DOMAIN_UNAUTHORIZED" });
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl, { env });
      if (method === "GET") {
        const result = await listRepresentativeDomains(client);
        return json(res, 200, {
          ok:true,
          marker:"ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V1",
          mode:"list",
          ...result
        });
      }

      const body = parseBody(req);
      const result = await setRepresentativeDomain(client, {
        person_id:body.person_id,
        representative_domain:body.representative_domain,
        request_id:body.request_id
      });
      return json(res, 200, {
        ok:true,
        marker:"ATLAS_PERSON_REPRESENTATIVE_DOMAIN_V1",
        mode:"mutation",
        ...result
      });
    } catch (error) {
      const code = String(error?.message || "PERSON_DOMAIN_REQUEST_FAILED");
      return json(res, statusForError(code), { ok:false, code });
    } finally {
      if (client && typeof client.end === "function") {
        try { await client.end(); } catch {}
      }
    }
  };
}

module.exports = Object.freeze({ createPersonDomainHandler, parseBody, statusForError });
