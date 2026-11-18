#!/usr/bin/env node
/**
 * Last-mile ATLAS Person registration readback from the protected, immutable
 * Authoring artifact after the Runtime projection was atomically published.
 * Runs only as a bounded step of the existing Runtime Compile workflow.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = 'JezCH/atlas-person-db';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function verifyPersonReadback({ person, manifest, applied }) {
  const stop = (reason) => ({ ok: false, reason });
  if (!person?.ok || person?.schema !== 'atlas-person-read/v1' ||
      person?.mode !== 'detail' || !person.person) return stop('PERSON_DETAIL_NOT_LIVE');
  const live = person.person;
  if (live.id !== applied.person_id ||
      live.canonical_name_en !== manifest.person.canonical_name_en ||
      live.person_type !== manifest.person.person_type ||
      live.representative_domain !== manifest.person.representative_domain) {
    return stop('PERSON_IDENTITY_OR_DOMAIN_MISMATCH');
  }
  if (live.external_references?.namuwiki?.status !==
      manifest.external_references?.namuwiki?.status) return stop('NAMUWIKI_REVIEW_MISMATCH');
  const activity = live.activities?.find((a) => a.id === applied.relationship_id);
  if (!activity || activity.person_id !== applied.person_id ||
      activity.polity?.id !== manifest.polity.existing_id ||
      activity.relation?.code !== manifest.activity.relation_type ||
      activity.start?.year !== manifest.activity.start_year ||
      activity.end?.year !== manifest.activity.end_year) return stop('ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  // Bibliographic URL alone is not an assertion identity. Exact URL and title
  // without the approved citation_text silently accepted unrelated claims for
  // the same Person (e.g. Charles I Scottish versus English crowns). Normalize
  // only the same nonsemantic whitespace folding as the canonical Source writer.
  const citation = (text) => String(text ?? '').normalize('NFC').trim().replace(/\\s+/g, ' ');
  if (!Array.isArray(activity.sources) || !manifest.sources.every((source) =>
    activity.sources.some((liveSource) =>
      liveSource.canonical_url === source.canonical_url &&
      liveSource.title === source.title &&
      citation(liveSource.citation_text) === citation(source.citation_text || source.title) &&
      (source.source_type == null || liveSource.source_type === source.source_type)))) {
    return stop('ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  }
  return { ok: true, personId: live.id, activityId: activity.id };
}

async function api(url, { raw = false } = {}) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN_UNAVAILABLE');
  const response = await fetch(url.startsWith('https://') ? url : 'https://api.github.com' + url, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error('GITHUB_READ_' + response.status);
  return raw ? Buffer.from(await response.arrayBuffer()) : response.json();
}

async function readManifest(filename, sha) {
  if (!/^authoring\/requests\/[A-Za-z0-9._-]+\.json$/.test(filename)) throw new Error('UNSAFE_MANIFEST_PATH');
  const r = await api('/repos/' + REPO + '/contents/' + filename + '?ref=' + encodeURIComponent(sha));
  if (r.type !== 'file' || r.encoding !== 'base64') throw new Error('MANIFEST_NOT_BASE64');
  return JSON.parse(Buffer.from(r.content, 'base64').toString('utf8'));
}

// GitHub Actions may dispatch a protected Authoring workflow with its own
// github-actions[bot] identity. Do not reject that legitimate handoff solely
// because it was initiated by GitHub instead of the repository owner.
// A bot is trusted ONLY when GitHub confirms the exact private repository,
// the approved workflow file on main, bounded event/status and immutable SHA.
export function verifyProtectedProducer(producer) {
  const fail = (reason) => ({ ok: false, reason });
  if (producer?.name !== 'ATLAS Authoring Apply' ||
      producer?.path !== '.github/workflows/atlas-authoring-apply.yml' ||
      producer?.event !== 'workflow_dispatch' ||
      producer?.head_branch !== 'main') return fail('WORKFLOW_OR_BRANCH');
  if (producer?.repository?.full_name !== REPO ||
      producer?.head_repository?.full_name !== REPO) return fail('REPOSITORY_OR_HEAD');
  const actor = producer?.actor;
  const owner = actor?.login === 'JezCH' && actor?.type === 'User';
  const workflowBot = actor?.login === 'github-actions[bot]' && actor?.type === 'Bot';
  if (!owner && !workflowBot) return fail('UNTRUSTED_ACTOR');
  if (!['in_progress', 'completed'].includes(producer?.status) ||
      (producer.status === 'completed' && producer.conclusion !== 'success')) {
    return fail('STATUS_OR_CONCLUSION');
  }
  if (!/^[a-f0-9]{40}$/.test(producer?.head_sha || '')) return fail('INVALID_COMMIT_SHA');
  return { ok: true };
}

async function runReadback() {
  const runId = Number(process.env.ATLAS_AUTHORING_PRODUCER_RUN_ID);
  if (!Number.isSafeInteger(runId) || runId < 1) throw new Error('INVALID_AUTHORING_PRODUCER_RUN');
  const producer = await api('/repos/' + REPO + '/actions/runs/' + runId);
  // The protected Authoring job dispatches Runtime at its final step, after
  // uploading signed-by-GitHub immutable evidence but before GitHub necessarily
  // marks that job completed. Committed evidence, not a racing conclusion
  // field, is the authority for canonical writes.
  const verification = verifyProtectedProducer(producer);
  if (!verification.ok) {
    throw new Error('PRODUCER_NOT_VERIFIED_PROTECTED_DISPATCH:' + verification.reason);
  }
  const list = await api('/repos/' + REPO + '/actions/runs/' + runId + '/artifacts?per_page=100');
  const expected = 'atlas-authoring-' + producer.head_sha;
  const artifacts = (list.artifacts || []).filter((x) => x.name === expected && x.expired !== true);
  if (artifacts.length !== 1 || artifacts[0].size_in_bytes > 5242880) {
    throw new Error('AUTHORING_EVIDENCE_NOT_UNIQUE_OR_TOO_LARGE');
  }
  const zip = await api('/repos/' + REPO + '/actions/artifacts/' + artifacts[0].id + '/zip', { raw: true });
  if (zip.length > 5242880) throw new Error('AUTHORING_ARTIFACT_TOO_LARGE');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-runtime-readback-'));
  let preflight, applied;
  try {
    const zipfile = path.join(dir, 'artifact.zip');
    fs.writeFileSync(zipfile, zip, { mode: 0o600 });
    const get = (name) => {
      try {
        return JSON.parse(execFileSync('unzip', ['-p', zipfile, 'responses/' + name], {
          encoding: 'utf8', maxBuffer: 1048576, timeout: 10000,
          stdio: ['ignore', 'pipe', 'ignore']
        }));
      } catch {
        return null;
      }
    };
    preflight = get('human-authoring-preflight.json');
    applied = get('human-authoring-batch.json');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // An already-present request may legitimately have no new apply response.
  // Such a run is not counted as a new registration completion.
  if (!applied) {
    if (preflight?.already_present_count >= 1 && preflight?.ready_count === 0 &&
        preflight?.blocked_count === 0) {
      console.log('ALREADY_PRESENT canonical replay; zero newly committed Persons. No new Person readback required.');
      return;
    }
    throw new Error('AUTHORING_COMMIT_EVIDENCE_MISSING');
  }
  if (applied.ok !== true || applied.committed !== true ||
      applied.failed_count !== 0 || applied.succeeded_count < 1 ||
      !Array.isArray(applied.results) ||
      applied.results.length !== applied.succeeded_count ||
      applied.results.length > 5 ||
      !Array.isArray(preflight?.results)) throw new Error('AUTHORING_COMMIT_NOT_CONFIRMED_OR_UNBOUNDED');
  let verified = 0;
  for (const result of applied.results) {
    if (!UUID.test(result.person_id || '') || !UUID.test(result.relationship_id || '')) {
      throw new Error('AUTHORING_COMMIT_MISSING_IDENTIFIERS');
    }
    const matching = preflight.results.filter((x) =>
      x.request_id === result.request_id && x.status === 'READY');
    if (matching.length !== 1) throw new Error('PREFLIGHT_COMMIT_ID_MISMATCH');
    const manifest = await readManifest(matching[0].manifest_path, producer.head_sha);
    if (manifest.request_id !== result.request_id || manifest.polity?.existing_id == null) {
      throw new Error('MANIFEST_PROVENANCE_OR_POLITY_UNRESOLVED');
    }
    const url = 'https://atlas-person-db.vercel.app/api/atlas-person-read?person_id=' + encodeURIComponent(result.person_id);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status === 402) throw new Error('VERCEL_QUOTA_402_TERMINAL');
    if (!response.ok) throw new Error('PERSON_PRODUCTION_READ_' + response.status);
    const person = await response.json();
    const check = verifyPersonReadback({ person, manifest, applied: result });
    if (!check.ok) throw new Error('PRODUCTION_READBACK_' + check.reason);
    verified++;
    console.log('LIVE_PERSON_VERIFIED ' + check.personId + ' ACTIVITY ' + check.activityId);
  }
  if (verified !== applied.succeeded_count) throw new Error('VERIFIED_COUNT_MISMATCH');
  console.log('ATLAS_AUTHORING_RUNTIME_COMPLETE: ' + verified + ' newly committed Person/Activity pairs, Source, Polity, domain and NamuWiki checked in Production.');
}

if (process.env.ATLAS_RUNTIME_READBACK_RUN === '1') {
  runReadback().catch((err) => {
    console.error('ATLAS_AUTHORING_RUNTIME_NOT_COMPLETE: ' + err.message);
    process.exitCode = 1;
  });
}
