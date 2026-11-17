#!/usr/bin/env node
/**
 * Eliminates the second "preflight -> apply" PR entirely for explicitly
 * user-approved historical Persons. Runs only for a successful, protected
 * main-push Authoring OIDC preflight with immutable READY evidence.
 *
 * This workflow only DISPATCHES the existing Authoring writer, which itself
 * re-preflights and writes READY-only, then triggers Runtime publication.
 */
import fs from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import {
  MANIFEST_RE, SELECTOR_FILE, WRITER_WORKFLOW,
  githubApi, githubContent, readPreflightArtifact
} from './atlas-authoring-auto-continuation.mjs';

const REPO = 'JezCH/atlas-person-db';
const SHA_RE = /^[a-f0-9]{40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assessApprovedPreflightHandoff({ run, selector, manifest, evidence, changedPaths }) {
  const stop = (reason) => ({ ok: false, reason });
  if (run?.name !== 'ATLAS Authoring Apply' || run.event !== 'push' ||
      run.head_branch !== 'main' || run.status !== 'completed' ||
      run.conclusion !== 'success' || run.actor?.login !== 'JezCH' ||
      !SHA_RE.test(run.head_sha || '') || run.run_attempt !== 1) {
    return stop('NOT_FIRST_SUCCESSFUL_OWNER_MAIN_PREFLIGHT');
  }
  const match = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)\n$/.exec(selector || '');
  if (!match || !MANIFEST_RE.test(match[1])) return stop('NOT_EXACT_READ_ONLY_SELECTOR');
  const requestPath = match[1];
  if (!Array.isArray(changedPaths) || !changedPaths.includes(SELECTOR_FILE)) {
    return stop('SELECTOR_NOT_CHANGED_BY_PROTECTED_PUSH');
  }
  if (manifest?.schema !== 'atlas-human-authoring/v1' ||
      manifest.review_status !== 'approved' ||
      !/^authoring:user-/.test(manifest.request_id || '') ||
      manifest.person?.life_status !== 'deceased' ||
      manifest.person?.representative_domain_reviewed !== true ||
      !manifest.person?.canonical_name_en ||
      !UUID_RE.test(manifest.polity?.existing_id || '') ||
      !Array.isArray(manifest.sources) || manifest.sources.length < 1 ||
      !manifest.sources.every((s) => /^https:\/\//.test(s.canonical_url || '')) ||
      !['linked', 'not_found'].includes(manifest.external_references?.namuwiki?.status) ||
      !Number.isInteger(manifest.review_context?.source_draft_pr) ||
      manifest.review_context?.preflight_required !== true ||
      manifest.review_context?.auto_continue_after_preflight !== true) {
    return stop('NO_EXPLICIT_REVIEWED_PERSON_AUTOCONTINUE');
  }
  if (evidence?.ok !== true || evidence.operation !== 'preflight_batch' ||
      evidence.marker !== 'ATLAS_HUMAN_AUTHORING_BATCH_V1' ||
      evidence.committed !== false || evidence.ready_count !== 1 ||
      evidence.already_present_count !== 0 || evidence.blocked_count !== 0 ||
      !Array.isArray(evidence.results) || evidence.results.length !== 1 ||
      evidence.results[0].status !== 'READY' ||
      evidence.results[0].manifest_path !== requestPath ||
      evidence.results[0].request_id !== manifest.request_id) {
    return stop('OIDC_ARTIFACT_NOT_READY_ONE');
  }
  return { ok: true, requestPath, requestId: manifest.request_id };
}


// A batch is a single reviewed main-push change, not repeated singleton
// selector flips. Limit five to match the existing immutable Runtime readback.
export const MAX_APPROVED_PREFLIGHT_BATCH = 5;

export function approvedBatchSelectorPaths(selector) {
  if (typeof selector !== 'string' || !selector.endsWith('\n')) return null;
  const lines = selector.slice(0, -1).split('\n');
  if (lines.length < 2 || lines.length > MAX_APPROVED_PREFLIGHT_BATCH) return null;
  const paths = [];
  for (const line of lines) {
    const match = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)$/.exec(line);
    if (!match || !MANIFEST_RE.test(match[1])) return null;
    paths.push(match[1]);
  }
  return new Set(paths).size === paths.length ? paths : null;
}

// Selected62 requests predate the user-* naming convention. Their ledger IDs
// must not be renamed. Bind them to the original, immutable approved intake.
const SELECTED62_SOURCE_SHA = 'b75cecab893b342fa91c11eaef170b956c1c0cbf';
const SELECTED62_PATH = /^authoring\/requests\/selected62-remaining30-20261018-([a-z0-9][a-z0-9-]*)\.json$/;

function selected62RequestMatchesPath(path, manifest) {
  const match = SELECTED62_PATH.exec(path || '');
  return Boolean(match && manifest?.request_id ===
    'authoring:selected62-remaining30-20261018:' + match[1] + ':representative:v1' &&
    manifest.review_context?.source_draft_pr === 2549);
}

export function hasReviewedBatchRequestIdentity(path, manifest, original) {
  if (/^authoring:user-/.test(manifest?.request_id || '')) return true;
  if (!selected62RequestMatchesPath(path, manifest) || !original ||
      original.schema !== 'atlas-human-authoring/v1' || original.review_status !== 'approved' ||
      original.request_id !== manifest.request_id ||
      !/^#2545 approved 62, remaining 30\b/.test(original.review_context?.task || '')) return false;

  // Compare every historical field, not just name/ID. Only verification
  // metadata and a separately verified existing Polity identity may differ.
  const { review_context: currentReview, polity: currentPolity, ...currentHistory } = manifest;
  const { review_context: originalReview, polity: originalPolity, ...originalHistory } = original;
  const { existing_id: currentId, canonical_name_en: currentName, ...currentRest } = currentPolity || {};
  const { existing_id: originalId, canonical_name_en: originalName, ...originalRest } = originalPolity || {};
  const polityNameMatches = currentName === originalName ||
    (originalName === 'United States of America' && currentName === 'United States' &&
      currentId === '7d09bc56-1ea0-515e-a3e7-9863361b6f15');
  return isDeepStrictEqual(currentHistory, originalHistory) &&
    isDeepStrictEqual(currentRest, originalRest) && polityNameMatches &&
    (!originalId || originalId === currentId) && UUID_RE.test(currentId || '');
}

export function assessApprovedBatchPreflightHandoff({ run, selector, manifests, evidence, changedPaths, originalManifests = {} }) {
  const stop = (reason) => ({ ok: false, reason });
  if (run?.name !== 'ATLAS Authoring Apply' || run.event !== 'push' ||
      run.head_branch !== 'main' || run.status !== 'completed' ||
      run.conclusion !== 'success' || run.actor?.login !== 'JezCH' ||
      !SHA_RE.test(run.head_sha || '') || run.run_attempt !== 1) {
    return stop('NOT_FIRST_SUCCESSFUL_OWNER_MAIN_PREFLIGHT');
  }
  const paths = approvedBatchSelectorPaths(selector);
  if (!paths) return stop('INVALID_EXACT_BATCH_SELECTOR');
  const allowedPaths = new Set([SELECTOR_FILE, ...paths]);
  if (!Array.isArray(changedPaths) || changedPaths.length !== allowedPaths.size ||
      !changedPaths.every((p) => allowedPaths.has(p))) return stop('BATCH_TOUCH_SET_MISMATCH');
  if (!Array.isArray(manifests) || manifests.length !== paths.length) {
    return stop('BATCH_MANIFEST_COUNT_MISMATCH');
  }
  const ids = new Set();
  for (const [i, manifest] of manifests.entries()) {
    if (manifest?.schema !== 'atlas-human-authoring/v1' ||
        manifest.review_status !== 'approved' ||
        !hasReviewedBatchRequestIdentity(paths[i], manifest, originalManifests[paths[i]]) ||
        manifest.person?.life_status !== 'deceased' ||
        manifest.person?.representative_domain_reviewed !== true ||
        !manifest.person?.canonical_name_en ||
        !UUID_RE.test(manifest.polity?.existing_id || '') ||
        !Array.isArray(manifest.sources) || manifest.sources.length < 1 ||
        !manifest.sources.every((s) => /^https:\/\//.test(s.canonical_url || '')) ||
        !['linked', 'not_found'].includes(manifest.external_references?.namuwiki?.status) ||
        !Number.isInteger(manifest.review_context?.source_draft_pr) ||
        manifest.review_context?.preflight_required !== true ||
        manifest.review_context?.auto_continue_after_preflight !== true ||
        ids.has(manifest.request_id)) return stop('BATCH_MANIFEST_NOT_INDIVIDUALLY_APPROVED');
    ids.add(manifest.request_id);
  }
  if (evidence?.ok !== true || evidence.marker !== 'ATLAS_HUMAN_AUTHORING_BATCH_V1' ||
      evidence.operation !== 'preflight_batch' || evidence.committed !== false ||
      evidence.count !== paths.length || evidence.ready_count !== paths.length ||
      evidence.already_present_count !== 0 || evidence.blocked_count !== 0 ||
      !Array.isArray(evidence.results) || evidence.results.length !== paths.length) {
    return stop('BATCH_OIDC_NOT_ALL_READY');
  }
  const outstanding = new Set(paths.map((p, i) => p + '\u0000' + manifests[i].request_id));
  for (const result of evidence.results) {
    const key = result.manifest_path + '\u0000' + result.request_id;
    if (result.status !== 'READY' || !outstanding.delete(key)) {
      return stop('BATCH_OIDC_RESULT_MISMATCH');
    }
  }
  if (outstanding.size) return stop('BATCH_OIDC_RESULT_MISMATCH');
  return { ok: true, requests: paths.map((p, i) => ({ path: p, requestId: manifests[i].request_id })) };
}

export async function continueApprovedPreflight({ event, api = githubApi, content = githubContent, evidenceReader = readPreflightArtifact } = {}) {
  const producer = event?.workflow_run;
  if (event?.action !== 'completed' || event.repository?.full_name !== REPO ||
      producer?.name !== 'ATLAS Authoring Apply' ||
      producer?.event !== 'push' || producer.conclusion !== 'success') {
    console.log('SKIP: not protected main-push Authoring preflight completion');
    return;
  }
  if (producer.run_attempt !== 1) {
    console.log('SKIP: Authoring run replay must not cause duplicate dispatch');
    return;
  }
  if (producer.head_branch !== 'main' || !SHA_RE.test(producer.head_sha || '')) {
    console.log('SKIP: producer is not an exact main SHA');
    return;
  }
  // A successful Authoring run using an older selector is not a new
  // selector preflight. Do not request a nonexistent or stale artifact.
  const commit = await api('/repos/' + REPO + '/commits/' + producer.head_sha);
  const changedPaths = Array.isArray(commit.files) ? commit.files.map((f) => f.filename) : [];
  if (!changedPaths.includes(SELECTOR_FILE)) {
    console.log('SKIP: producer did not change the protected selector');
    return;
  }
  const sourceSelector = await content(REPO, SELECTOR_FILE, producer.head_sha);
  const single = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)\n$/.exec(sourceSelector.text);
  const batch = single ? null : approvedBatchSelectorPaths(sourceSelector.text);
  if (!single && !batch) {
    console.log('SKIP: producer not an exact read-only Person preflight selector');
    return;
  }
  const paths = single ? [single[1]] : batch;
  const sourceManifests = await Promise.all(paths.map((p) => content(REPO, p, producer.head_sha)));
  const manifests = sourceManifests.map((file) => JSON.parse(file.text));
  if (manifests.some((manifest) => manifest.review_context?.auto_continue_after_preflight !== true)) {
    console.log('SKIP: at least one Person lacks explicit reviewed event continuation');
    return;
  }
  const originalManifests = {};
  if (batch) {
    for (const [i, manifest] of manifests.entries()) {
      if (selected62RequestMatchesPath(paths[i], manifest)) {
        const original = await content(REPO, paths[i], SELECTED62_SOURCE_SHA);
        originalManifests[paths[i]] = JSON.parse(original.text);
      }
    }
  }
  const evidence = await evidenceReader(REPO, producer.id, producer.head_sha);
  const approval = single
    ? assessApprovedPreflightHandoff({
        run: producer, selector: sourceSelector.text, manifest: manifests[0], evidence, changedPaths
      })
    : assessApprovedBatchPreflightHandoff({
        run: producer, selector: sourceSelector.text, manifests, evidence, changedPaths, originalManifests
      });
  if (!approval.ok) throw new Error('REFUSED_' + approval.reason);

  // Exact optimistic parity for the shared selector and EVERY immutable reviewed
  // manifest. A newer unrelated main commit is fine; a changed resource is not.
  const [mainSelector, ...mainManifests] = await Promise.all([
    content(REPO, SELECTOR_FILE, 'main'),
    ...paths.map((p) => content(REPO, p, 'main'))
  ]);
  if (mainSelector.sha !== sourceSelector.sha ||
      mainManifests.some((file, i) => file.sha !== sourceManifests[i].sha)) {
    throw new Error('STALE_AUTHORING_SELECTOR_OR_MANIFEST');
  }
  const inputs = single
    ? { manifest: approval.requestPath, bootstrap_only: 'false', audit_all_approved: 'false' }
    : {
        manifests_json: JSON.stringify(paths),
        approved_sha: producer.head_sha,
        bootstrap_only: 'false',
        audit_all_approved: 'false'
      };
  // The existing protected Writer independently preflights the bounded batch
  // and checks the exact reviewed SHA before any canonical transaction.
  await api('/repos/' + REPO + '/actions/workflows/' + WRITER_WORKFLOW + '/dispatches', {
    method: 'POST', json: { ref: 'main', inputs }
  });
  const message = 'ATLAS_PREFLIGHT_AUTO_CONTINUED: OIDC run ' + producer.id +
    ' READY=' + paths.length + ' individually approved requests; protected Authoring APPLY dispatched. ' +
    'Not complete until committed+Runtime+Production readback.';
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}

if (process.env.ATLAS_PREFLIGHT_AUTODISPATCH_RUN === '1') {
  continueApprovedPreflight({ event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) }).catch((err) => {
    console.error('ATLAS_PREFLIGHT_AUTODISPATCH_FAIL_CLOSED: ' + err.message);
    process.exitCode = 1;
  });
}
