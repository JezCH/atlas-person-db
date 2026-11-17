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

async function run() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const producer = event.workflow_run;
  if (event.action !== 'completed' || event.repository?.full_name !== REPO ||
      producer?.name !== 'ATLAS Authoring Apply' ||
      producer?.event !== 'push' || producer.conclusion !== 'success') {
    console.log('SKIP: not protected main-push Authoring preflight completion');
    return;
  }
  if (producer.run_attempt !== 1) {
    console.log('SKIP: Authoring run replay must not cause duplicate dispatch');
    return;
  }
  const sourceSelector = await githubContent(REPO, SELECTOR_FILE, producer.head_sha);
  const pathMatch = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)\n$/.exec(sourceSelector.text);
  if (!pathMatch) {
    console.log('SKIP: producer not a specific read-only preflight');
    return;
  }
  const sourceManifest = await githubContent(REPO, pathMatch[1], producer.head_sha);
  const manifest = JSON.parse(sourceManifest.text);
  if (manifest.review_context?.auto_continue_after_preflight !== true) {
    console.log('SKIP: manifest did not expressly authorize event continuation');
    return;
  }
  const commit = await githubApi('/repos/' + REPO + '/commits/' + producer.head_sha);
  const changedPaths = (commit.files || []).map((f) => f.filename);
  const evidence = await readPreflightArtifact(REPO, producer.id, producer.head_sha);
  const approval = assessApprovedPreflightHandoff({
    run: producer, selector: sourceSelector.text, manifest, evidence, changedPaths
  });
  if (!approval.ok) throw new Error('REFUSED_' + approval.reason);

  // Exact optimistic resource parity, not a global task lock. If a newer
  // agent changed the shared selection file or immutable request, stop.
  const [mainSelector, mainManifest] = await Promise.all([
    githubContent(REPO, SELECTOR_FILE, 'main'),
    githubContent(REPO, approval.requestPath, 'main')
  ]);
  if (mainSelector.sha !== sourceSelector.sha || mainManifest.sha !== sourceManifest.sha) {
    throw new Error('STALE_AUTHORING_SELECTOR_OR_MANIFEST');
  }
  // No user-approved identity or data is changed here. The existing writer
  // independently performs a fresh OIDC preflight before any DB transaction.
  await githubApi('/repos/' + REPO + '/actions/workflows/' + WRITER_WORKFLOW + '/dispatches', {
    method: 'POST',
    json: {
      ref: 'main',
      inputs: { manifest: approval.requestPath, bootstrap_only: 'false', audit_all_approved: 'false' }
    }
  });
  const message = 'ATLAS_PREFLIGHT_AUTO_CONTINUED: OIDC run ' + producer.id +
    ' READY=1 for ' + approval.requestPath + '; existing protected Authoring APPLY dispatched. ' +
    'Not completed until committed+Runtime+Production readback.';
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}

if (process.env.ATLAS_PREFLIGHT_AUTODISPATCH_RUN === '1') {
  run().catch((err) => {
    console.error('ATLAS_PREFLIGHT_AUTODISPATCH_FAIL_CLOSED: ' + err.message);
    process.exitCode = 1;
  });
}
