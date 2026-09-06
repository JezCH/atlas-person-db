"use strict";

const { readPersons, readPersonDetail } = require("./atlas-person-read-service.js");
const { readPersonListSemantics } = require("./atlas-person-list-semantic-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-normalized-read-handler.js");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 120;
const MAX_LIST_LIMIT = 50;
const NAMUWIKI_STATUS_VALUES = Object.freeze(["missing", "linked", "not_found"]);

function requestQueryValue(req, key) {
  const direct = req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? String(direct[0] || "").trim() : "__INVALID_MULTI__";
  if (direct != null) return String(direct).trim();
  const rawUrl = String(req?.url || "").trim();
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, "http://atlas.local");
    return parsed.searchParams.has(key) ? String(parsed.searchParams.get(key) || "").trim() : null;
  } catch {
    return null;
  }
}

function personIdFromRequest(req) {
  return requestQueryValue(req, "person_id");
}

function personQueryFromRequest(req) {
  return requestQueryValue(req, "q");
}

function namuwikiStatusFromRequest(req) {
  return requestQueryValue(req, "namuwiki_status");
}

function listLimitFromRequest(req) {
  return requestQueryValue(req, "limit");
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("und").replace(/\s+/gu, " ");
}

function personMatchesQuery(person, query) {
  const needle = normalizeSearchText(query);
  if (!needle) return true;
  const names = Array.isArray(person?.names) ? person.names.map((row) => row?.name) : [];
  const haystack = [person?.canonical_name_en, person?.preferred_name_ko, person?.display_name, ...names]
    .map(normalizeSearchText)
    .filter(Boolean);
  return haystack.some((value) => value.includes(needle));
}

function personMatchesNamuWikiStatus(person, status) {
  if (!status) return true;
  const reference = person?.external_references?.namuwiki;
  if (status === "missing") return reference == null;
  return String(reference?.status || "") === status;
}

function parseListLimit(value) {
  if (value == null) return null;
  if (value === "__INVALID_MULTI__" || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_LIST_LIMIT) return null;
  return parsed;
}

function filteredSummary(persons) {
  const byHistoricity = {};
  for (const person of persons || []) {
    const key = String(person?.historicity || "");
    byHistoricity[key] = (byHistoricity[key] || 0) + 1;
  }
  return Object.freeze({
    total: (persons || []).length,
    historicity_values: Object.freeze(Object.keys(byHistoricity).sort()),
    by_historicity: Object.freeze(byHistoricity)
  });
}

function createPersonReadHandler({ clientFactory, env = process.env, readListSemantics = readPersonListSemantics } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof readListSemantics !== "function") throw new Error("readListSemantics is required");

  return async function handler(req, res) {
    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    const requestedPersonId = personIdFromRequest(req);
    if (requestedPersonId != null && !UUID_PATTERN.test(requestedPersonId)) {
      sendJson(res, 400, {
        ok: false,
        code: "INVALID_PERSON_ID",
        error: "valid person_id UUID is required"
      });
      return;
    }

    const requestedQuery = personQueryFromRequest(req);
    if (requestedQuery === "__INVALID_MULTI__" || (requestedQuery != null && requestedQuery.length > MAX_QUERY_LENGTH)) {
      sendJson(res, 400, {
        ok: false,
        code: "INVALID_PERSON_QUERY",
        error: `q must be a single string of at most ${MAX_QUERY_LENGTH} characters`
      });
      return;
    }

    const requestedNamuWikiStatus = namuwikiStatusFromRequest(req);
    if (requestedNamuWikiStatus === "__INVALID_MULTI__" ||
        (requestedNamuWikiStatus != null && !NAMUWIKI_STATUS_VALUES.includes(requestedNamuWikiStatus))) {
      sendJson(res, 400, {
        ok: false,
        code: "INVALID_NAMUWIKI_STATUS",
        error: `namuwiki_status must be one of: ${NAMUWIKI_STATUS_VALUES.join(", ")}`
      });
      return;
    }

    const requestedLimitValue = listLimitFromRequest(req);
    const requestedLimit = parseListLimit(requestedLimitValue);
    if (requestedLimitValue != null && requestedLimit == null) {
      sendJson(res, 400, {
        ok: false,
        code: "INVALID_LIST_LIMIT",
        error: `limit must be an integer from 1 to ${MAX_LIST_LIMIT}`
      });
      return;
    }

    if (requestedPersonId && (requestedQuery || requestedNamuWikiStatus || requestedLimitValue != null)) {
      sendJson(res, 400, {
        ok: false,
        code: "PERSON_READ_MODE_CONFLICT",
        error: "person_id cannot be combined with q, namuwiki_status, or limit"
      });
      return;
    }

    let databaseUrl;
    try {
      databaseUrl = requireDatabaseUrl(env);
    } catch (error) {
      console.error("ATLAS Person read configuration error", error);
      sendJson(res, 503, { ok: false, code: "SERVER_CONFIGURATION_ERROR", error: "Person read service is not configured" });
      return;
    }

    let client = null;
    try {
      client = await clientFactory(databaseUrl);
      if (requestedPersonId) {
        const person = await readPersonDetail({ client, personId: requestedPersonId });
        if (!person) {
          sendJson(res, 404, { ok: false, code: "PERSON_NOT_FOUND", error: "Person not found" });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          source: "v2-person-read",
          schema: "atlas-person-read/v1",
          mode: "detail",
          person
        });
        return;
      }

      const data = await readPersons({ client });
      const hasListFilter = Boolean(requestedQuery || requestedNamuWikiStatus || requestedLimit != null);
      if (hasListFilter) {
        let filteredPersons = data.persons;
        if (requestedQuery) filteredPersons = filteredPersons.filter((person) => personMatchesQuery(person, requestedQuery));
        if (requestedNamuWikiStatus) {
          filteredPersons = filteredPersons.filter((person) => personMatchesNamuWikiStatus(person, requestedNamuWikiStatus));
        }
        const matchedTotal = filteredPersons.length;
        if (requestedLimit != null) filteredPersons = filteredPersons.slice(0, requestedLimit);
        const persons = await readListSemantics({ client, persons: filteredPersons });
        sendJson(res, 200, {
          ok: true,
          source: "v2-person-read",
          schema: "atlas-person-read/v1",
          mode: "list",
          ...data,
          summary: filteredSummary(persons),
          query: requestedQuery || null,
          ...(requestedNamuWikiStatus ? { namuwiki_status: requestedNamuWikiStatus } : {}),
          ...(requestedLimit != null ? { limit: requestedLimit, matched_total: matchedTotal } : {}),
          persons
        });
        return;
      }

      const persons = await readListSemantics({ client, persons: data.persons });
      sendJson(res, 200, {
        ok: true,
        source: "v2-person-read",
        schema: "atlas-person-read/v1",
        mode: "list",
        ...data,
        summary: data.summary,
        query: null,
        persons
      });
    } catch (error) {
      console.error("ATLAS Person read failed", error);
      sendJson(res, client ? 500 : 503, {
        ok: false,
        code: client ? "PERSON_READ_FAILED" : "DATABASE_UNAVAILABLE",
        error: client ? "Person read failed" : "database unavailable"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports = Object.freeze({
  UUID_PATTERN,
  MAX_QUERY_LENGTH,
  MAX_LIST_LIMIT,
  NAMUWIKI_STATUS_VALUES,
  personIdFromRequest,
  personQueryFromRequest,
  namuwikiStatusFromRequest,
  listLimitFromRequest,
  normalizeSearchText,
  personMatchesQuery,
  personMatchesNamuWikiStatus,
  parseListLimit,
  createPersonReadHandler
});
