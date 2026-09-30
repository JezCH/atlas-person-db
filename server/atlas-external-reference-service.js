"use strict";

const NAMUWIKI_PROVIDER = "namuwiki";
const NAMUWIKI_HOST = "namu.wiki";

function text(value) {
  return value == null ? "" : String(value).trim();
}

function validIsoDate(value) {
  const valueText = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return false;
  const parsed = new Date(`${valueText}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === valueText;
}

function canonicalNamuWikiUrl(value) {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== NAMUWIKI_HOST || url.port || url.username || url.password) return null;
    if (!url.pathname.startsWith("/w/") || url.pathname.length <= 3) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function decodeTitle(url) {
  try { return decodeURIComponent(new URL(url).pathname.slice(3)); } catch { return ""; }
}

function normalizeNamuWikiDecision(raw, { checkedAtRequired = false, allowTitleShorthand = false } = {}) {
  if (raw == null) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_REQUIRED");
  let input = raw;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    if (!allowTitleShorthand) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_INVALID");
    input = { status:"linked", document_title:raw };
  }

  const status = text(input.status || (allowTitleShorthand ? "linked" : "")).toLowerCase();
  if (status !== "linked" && status !== "not_found") throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_STATUS_INVALID");
  const checkedAt = text(input.checked_at) || null;
  if (checkedAtRequired && !checkedAt) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_CHECKED_AT_REQUIRED");
  if (checkedAt && !validIsoDate(checkedAt)) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_CHECKED_AT_INVALID");

  if (status === "not_found") {
    if (text(input.document_title) || text(input.url || input.canonical_url)) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_NOT_FOUND_FIELDS_INVALID");
    const reviewReason = text(input.review_reason) || null;
    return Object.freeze({ provider:NAMUWIKI_PROVIDER, status, checked_at:checkedAt, document_title:null, url:null, review_state:"reviewed", review_reason:reviewReason });
  }

  let url = canonicalNamuWikiUrl(input.url || input.canonical_url);
  let documentTitle = text(input.document_title);
  if (!url && allowTitleShorthand && !text(input.url || input.canonical_url) && documentTitle) {
    url = `https://${NAMUWIKI_HOST}/w/${encodeURIComponent(documentTitle)}`;
  }
  if (!url && allowTitleShorthand && !documentTitle) {
    url = canonicalNamuWikiUrl(raw);
    if (url) documentTitle = text(decodeTitle(url));
  }
  if (!url) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_URL_INVALID");
  if (!documentTitle) documentTitle = text(decodeTitle(url));
  if (!documentTitle) throw new Error("EXTERNAL_REFERENCE_NAMUWIKI_DOCUMENT_TITLE_REQUIRED");
  return Object.freeze({ provider:NAMUWIKI_PROVIDER, status, checked_at:checkedAt, document_title:documentTitle, url, review_state:"reviewed", review_reason:null });
}

function sameDecision(left, right, { includeCheckedAt = false } = {}) {
  const same = Boolean(left && right)
    && left.status === right.status
    && left.document_title === right.document_title
    && left.url === right.url
    && (left.review_state == null || right.review_state == null || left.review_state === right.review_state)
    && (left.review_reason ?? null) === (right.review_reason ?? null);
  return includeCheckedAt ? same && left.checked_at === right.checked_at : same;
}

async function currentExternalReference(client, personId, provider = NAMUWIKI_PROVIDER, { forUpdate = false } = {}) {
  const result = await client.query(`
    select status,checked_at::text,document_title,url,review_state,review_reason,updated_at
      from atlas_v2.person_external_references
     where person_id=$1::uuid and provider=$2${forUpdate ? " for update" : ""}`, [personId, provider]);
  if (result.rows.length > 1) throw new Error("EXTERNAL_REFERENCE_AMBIGUOUS");
  return result.rows[0] || null;
}

async function setNamuWikiDecision(client, personId, rawDecision, {
  checkedAtRequired = false,
  allowTitleShorthand = false,
  preventLinkedOverwrite = false,
  expectedCurrent = null,
  refreshCheckedAtOnReplay = false
} = {}) {
  const next = normalizeNamuWikiDecision(rawDecision, { checkedAtRequired, allowTitleShorthand });
  const current = await currentExternalReference(client, personId, NAMUWIKI_PROVIDER, { forUpdate:true });
  if (expectedCurrent && !sameDecision(current, normalizeNamuWikiDecision(expectedCurrent, { allowTitleShorthand:true }))) {
    throw new Error("EXTERNAL_REFERENCE_EXPECTED_CURRENT_MISMATCH");
  }
  if (current?.status === "linked" && preventLinkedOverwrite && !sameDecision(current, next)) {
    throw new Error("EXTERNAL_REFERENCE_OVERWRITE_REVIEW_REQUIRED");
  }
  if (sameDecision(current, next) && (!checkedAtRequired || current.checked_at === next.checked_at)) {
    if (!refreshCheckedAtOnReplay) return Object.freeze({ replay:true, before:current, after:current });
    const refreshed = await client.query(`
      update atlas_v2.person_external_references
         set checked_at=current_date,review_state='reviewed',review_reason=$3,updated_at=now()
       where person_id=$1::uuid and provider=$2
       returning provider,status,checked_at::text,document_title,url,review_state,review_reason,updated_at`, [personId, NAMUWIKI_PROVIDER, next.review_reason]);
    return Object.freeze({ replay:true, before:current, after:refreshed.rows[0] || current });
  }

  const checkedAtSql = checkedAtRequired ? "$3::date" : "coalesce($3::date,current_date)";
  const saved = await client.query(`
    insert into atlas_v2.person_external_references(person_id,provider,status,checked_at,document_title,url,review_state,review_reason,updated_at)
    values($1::uuid,'namuwiki',$2,${checkedAtSql},$4,$5,'reviewed',$6,now())
    on conflict (person_id,provider) do update
      set status=excluded.status,checked_at=excluded.checked_at,document_title=excluded.document_title,url=excluded.url,
          review_state='reviewed',review_reason=excluded.review_reason,updated_at=now()
    returning provider,status,checked_at::text,document_title,url,review_state,review_reason,updated_at`,
    [personId, next.status, next.checked_at, next.document_title, next.url, next.review_reason]);

  const after = saved.rows[0] || null;
  if (!after || !sameDecision(after, next) || (checkedAtRequired && after.checked_at !== next.checked_at)) {
    throw new Error("EXTERNAL_REFERENCE_VERIFICATION_FAILED");
  }
  return Object.freeze({ replay:false, before:current, after });
}

module.exports = Object.freeze({
  NAMUWIKI_PROVIDER,
  NAMUWIKI_HOST,
  validIsoDate,
  canonicalNamuWikiUrl,
  normalizeNamuWikiDecision,
  sameDecision,
  currentExternalReference,
  setNamuWikiDecision
});
