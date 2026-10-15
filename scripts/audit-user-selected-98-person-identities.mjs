#!/usr/bin/env node
/**
 * USER-SELECTED 98 — READ-ONLY, fail-closed, exact Production Person screen.
 *
 * Normal user workflow: first restore access to the existing deployed /api/atlas-read
 * identity projection. Then run:
 *   node scripts/audit-user-selected-98-person-identities.mjs --out /tmp/atlas-user98-identity.json
 *
 * The output is an exact-identity SCREEN, not an authorization to register or
 * merge Persons. A missing exact name remains HUMAN_REVIEW_REQUIRED until
 * identity, aliases, life status, historicity and authoring-source review pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROSTER = path.join(ROOT, 'research/person-registration/user-selected-98-identity-reconciliation-20261016.v1.json');
const API_URL = 'https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=person&view=identity';

export function identityKey(value) {
  return String(value ?? '').normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .toLocaleLowerCase('en')
    .replace(/\s+/g, ' ').trim();
}

export function validateIdentityProjection(body, { minPersons = 1500 } = {}) {
  if (body?.ok !== true || body?.schema !== 'atlas-person-read/v1' ||
      body?.mode !== 'list' || body?.projection !== 'identity' ||
      !Array.isArray(body.persons)) {
    throw new Error('INVALID_PRODUCTION_IDENTITY_PROJECTION');
  }
  if (body.persons.length < minPersons) {
    throw new Error('INCOMPLETE_PRODUCTION_PERSON_CENSUS');
  }
  const ids = new Set();
  for (const p of body.persons) {
    if (typeof p?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(p.id) ||
        !Array.isArray(p.names) || !p.names.every(n => typeof n?.name === 'string')) {
      throw new Error('INVALID_PRODUCTION_PERSON_RECORD');
    }
    if (ids.has(p.id)) throw new Error('DUPLICATE_PRODUCTION_PERSON_UUID');
    ids.add(p.id);
  }
  return body.persons;
}

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 6) return 1000;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1,
        prev[j - 1] + Number(a[i - 1] !== b[j - 1]));
    }
    prev = curr;
  }
  return prev[b.length];
}

function possibleNames(terms, index, found) {
  const result = [];
  for (const [key, refs] of index) {
    if (found.has(key) || key.length < 6) continue;
    const match = terms.some(t => t.length >= 7 && (
      (t.length >= 12 && (t.includes(key) || key.includes(t))) ||
      (Math.abs(t.length - key.length) <= 4 &&
       distance(t, key) / Math.max(t.length, key.length) <= 0.19)
    ));
    if (match) {
      for (const ref of refs) {
        if (result.every(x => x.id !== ref.id)) result.push({ id:ref.id, name:ref.name });
      }
      if (result.length >= 8) return result.slice(0, 8);
    }
  }
  return result.slice(0, 8);
}

export function reconcileSelected98(roster, census) {
  if (roster?.schema !== 'atlas-user-selected-person-identity-reconciliation/v1' ||
      !Array.isArray(roster.entries) || roster.entries.length !== 98 ||
      new Set(roster.entries.map(x => x.ordinal)).size !== 98 ||
      roster.entries.some((x,i) => x.ordinal !== i+1)) {
    throw new Error('INVALID_USER_SELECTED_98_ROSTER');
  }
  const index = new Map();
  const personsById = new Map();
  for (const p of census) {
    personsById.set(p.id, p);
    for (const n of p.names) {
      const key = identityKey(n.name);
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ id:p.id, name:n.name, locale:n.locale ?? null });
    }
  }

  const entries = roster.entries.map(entry => {
    const names = [...new Set([entry.expected_name_en, entry.display_name_ko,
      ...(entry.aliases_to_check || [])].filter(Boolean))];
    const searchTerms = [...new Set(names.map(identityKey))];
    const exact = Array.from(new Map(searchTerms.flatMap(k =>
      (index.get(k)||[]).map(r=>[r.id,r]))).values());
    const historical = entry.historical_uuid_evidence || [];
    const seenHistoricIds = historical.filter(id => personsById.has(id));
    const matchedIds = [...new Set([...seenHistoricIds, ...exact.map(x => x.id)])];
    let verdict;
    if (matchedIds.length > 1) verdict = 'MULTIPLE_PERSON_UUIDS_HOLD';
    else if (matchedIds.length === 1) verdict =
      seenHistoricIds.length ? 'ALREADY_REGISTERED_UUID' : 'ALREADY_REGISTERED_EXACT_NAME';
    else if (entry.prior_evidence_kind === 'production_confirmed_in_pr_686')
      verdict = 'HISTORIC_PRODUCTION_CONFIRMATION_DRIFT_REVIEW';
    else if (entry.prior_evidence_kind === 'approved_authoring_request_no_current_readback')
      verdict = 'PRIOR_APPROVED_MANIFEST_NOT_FOUND_REVIEW';
    else if (historical.length) verdict = 'HISTORIC_PRODUCTION_UUID_MISSING_REVIEW';
    else verdict = 'NO_EXACT_NAME_MATCH_HUMAN_REVIEW_REQUIRED';

    const exactKeys = new Set(searchTerms.filter(k => (index.get(k)||[]).length));
    const near = matchedIds.length ? [] : possibleNames(searchTerms, index, exactKeys);
    return {
      ordinal:entry.ordinal,
      name_en:entry.expected_name_en, name_ko:entry.display_name_ko,
      verdict, matched_person_ids:matchedIds,
      matched_exact_names:exact.map(x=>({id:x.id,name:x.name,locale:x.locale})),
      prior_snapshot_person_ids:historical, prior_evidence_kind:entry.prior_evidence_kind,
      possible_similar_names_for_manual_review:near,
      ...(entry.identity_or_chronology_caveat ? {review_caveat:entry.identity_or_chronology_caveat}: {})
    };
  });
  const counts = Object.fromEntries([...new Set(entries.map(x=>x.verdict))].sort()
    .map(k=>[k,entries.filter(x=>x.verdict === k).length]));
  return {
    schema:'atlas-user-selected-98-live-identity-audit/v1',
    read_only:true, registration_approved:false, physical_merges_authorized:false,
    production_persons_scanned:census.length,
    persons_with_historical_uuid:roster.counts.snapshot_uuid,
    counts, entries
  };
}

async function main() {
  const args=process.argv.slice(2);
  const outIndex=args.indexOf('--out');
  const out=outIndex>=0?args[outIndex+1]:null;
  if (outIndex>=0 && !out) throw new Error('MISSING_OUT_PATH');
  const roster=JSON.parse(fs.readFileSync(ROSTER,'utf8'));
  const controller=new AbortController();
  const limit=setTimeout(()=>controller.abort(),20_000);
  let response;
  try {
    response=await fetch(API_URL,{method:'GET',signal:controller.signal,headers:{accept:'application/json'}});
  } finally {clearTimeout(limit);}
  if (!response.ok) {
    throw new Error('PRODUCTION_IDENTITY_READ_UNAVAILABLE_HTTP_'+response.status+
      ' (do not classify absences from GitHub snapshots)');
  }
  const census=validateIdentityProjection(await response.json());
  const audit=reconcileSelected98(roster,census);
  const output=JSON.stringify({generated_at:new Date().toISOString(),...audit},null,2)+'\n';
  if (out) fs.writeFileSync(path.resolve(out),output);
  else process.stdout.write(output);
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(e=>{console.error('USER98_AUDIT_FAIL_CLOSED:',e.message);process.exitCode=1;});
}
