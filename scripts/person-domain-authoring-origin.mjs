import fs from "node:fs";
import path from "node:path";

const SOURCE_RE = /^authoring\/requests\/[A-Za-z0-9._-]+\.json$/;
const ALLOWED_SCHEMAS = new Set(["atlas-human-authoring/v1","atlas-human-person-authoring/v1"]);

function fail(message) {
  throw new Error(message);
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

export function validateHumanAuthoringOrigin({ root, entry } = {}) {
  const repoRoot = path.resolve(String(root || ""));
  const source = text(entry?.supersedes_source);
  const requestId = text(entry?.supersedes_request_id);
  const origin = text(entry?.supersedes_origin).toLowerCase();
  const previousDomain = text(entry?.previous_representative_domain).toLowerCase();
  const canonicalName = text(entry?.canonical_name_en);
  const preferredNameKo = text(entry?.preferred_name_ko);

  if (!repoRoot) fail("HUMAN_AUTHORING_ORIGIN_ROOT_REQUIRED");
  if (origin !== "human_authoring") fail("HUMAN_AUTHORING_ORIGIN_TYPE_REQUIRED");
  if (!SOURCE_RE.test(source)) fail("HUMAN_AUTHORING_ORIGIN_SOURCE_INVALID");
  if (!requestId) fail("HUMAN_AUTHORING_ORIGIN_REQUEST_ID_REQUIRED");
  if (!previousDomain) fail("HUMAN_AUTHORING_ORIGIN_PREVIOUS_DOMAIN_REQUIRED");
  if (!canonicalName) fail("HUMAN_AUTHORING_ORIGIN_CANONICAL_NAME_REQUIRED");

  const absolute = path.resolve(repoRoot, source);
  const allowedRoot = path.resolve(repoRoot, "authoring", "requests") + path.sep;
  if (!absolute.startsWith(allowedRoot)) fail("HUMAN_AUTHORING_ORIGIN_SOURCE_OUTSIDE_REQUESTS");
  if (!fs.existsSync(absolute)) fail("HUMAN_AUTHORING_ORIGIN_SOURCE_NOT_FOUND");

  let request;
  try {
    request = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    fail("HUMAN_AUTHORING_ORIGIN_SOURCE_INVALID_JSON");
  }

  if (!ALLOWED_SCHEMAS.has(text(request?.schema))) fail("HUMAN_AUTHORING_ORIGIN_SCHEMA_UNSUPPORTED");
  if (text(request?.review_status).toLowerCase() !== "approved") fail("HUMAN_AUTHORING_ORIGIN_NOT_APPROVED");
  if (text(request?.request_id) !== requestId) fail("HUMAN_AUTHORING_ORIGIN_REQUEST_ID_MISMATCH");

  const person = request?.person || {};
  if (text(person?.representative_domain).toLowerCase() !== previousDomain) {
    fail("HUMAN_AUTHORING_ORIGIN_DOMAIN_MISMATCH");
  }
  if (text(person?.canonical_name_en) !== canonicalName) {
    fail("HUMAN_AUTHORING_ORIGIN_CANONICAL_NAME_MISMATCH");
  }
  const sourceKo = text(person?.display_name_ko);
  if (preferredNameKo && sourceKo && preferredNameKo !== sourceKo) {
    fail("HUMAN_AUTHORING_ORIGIN_KOREAN_NAME_MISMATCH");
  }

  return Object.freeze({
    source,
    request_id:requestId,
    canonical_name_en:canonicalName,
    previous_representative_domain:previousDomain
  });
}

export const HUMAN_AUTHORING_ORIGIN_SOURCE_RE = SOURCE_RE;
