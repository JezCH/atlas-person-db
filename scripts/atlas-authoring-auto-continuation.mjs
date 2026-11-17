#!/usr/bin/env node
/**
 * Opt-in, event-driven continuation of ONE already-reviewed Person Apply PR.
 * Runs only from trusted default-branch source in a workflow_run job.
 * Never checks out, executes, or trusts code from the triggering PR.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const AUTO_MARKER = 'ATLAS-AUTO-CONTINUE: approved-person-apply/v1';
export const SELECTOR_FILE = '.github/atlas-authoring-preflight.txt';
export const WRITER_WORKFLOW = 'atlas-authoring-apply.yml';
export const MANIFEST_RE = /^authoring\/requests\/[A-Za-z0-9._-]+\.json$/;
export const BRANCH_RE = /^atlas\/auto-authoring-[a-z0-9][a-z0-9-]*$/;
const SHA_RE = /^[a-f0-9]{40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assessAuthoringApply({ pr, files, originalSelector, headSelector, manifest, ciRun }) {
  const stop = (reason) => ({ ok: false, reason });
  if (ciRun?.name !== 'ATLAS Integrity' || ciRun?.event !== 'pull_request' || ciRun?.conclusion !== 'success') {
    return stop('CI_NOT_EXACT_SUCCESS');
  }
  if (!pr || pr.state !== 'open' || pr.draft || pr.base?.ref !== 'main' ||
      pr.head?.repo?.full_name !== pr.base?.repo?.full_name ||
      pr.user?.login !== pr.base?.repo?.owner?.login ||
      !BRANCH_RE.test(pr.head?.ref || '')) {
    return stop('UNTRUSTED_PR_OR_BRANCH');
  }
  if (!String(pr.body || '').split(/\r?\n/).some((line) => line.trim() === AUTO_MARKER)) {
    return stop('EXPLICIT_OPT_IN_ABSENT');
  }
  if (!SHA_RE.test(pr.head?.sha || '') || !SHA_RE.test(pr.base?.sha || '')) {
    return stop('INVALID_SHA');
  }
  if (!Array.isArray(files) || files.length !== 1 ||
      files[0].filename !== SELECTOR_FILE || files[0].status !== 'modified' ||
      files[0].additions !== 1 || files[0].deletions !== 1) {
    return stop('TOUCH_SET_NOT_EXACT_SELECTOR');
  }
  const before = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)\n$/.exec(originalSelector || '');
  if (!before || !MANIFEST_RE.test(before[1])) return stop('MAIN_NOT_READ_ONLY_PREFLIGHT');
  const target = before[1];
  if (headSelector !== 'apply ' + target + '\n') return stop('HEAD_NOT_EXACT_APPLY');
  const exactPatch = '@@ -1 +1 @@\n-preflight ' + target + '\n+apply ' + target;
  if (String(files[0].patch || '').trim() !== exactPatch) return stop('PATCH_NOT_EXACT_ONE_LINE');
  if (manifest?.schema !== 'atlas-human-authoring/v1' ||
      manifest?.review_status !== 'approved' ||
      !/^authoring:user-/.test(manifest.request_id || '') ||
      manifest?.person?.life_status !== 'deceased' ||
      manifest?.person?.representative_domain_reviewed !== true ||
      !manifest?.person?.canonical_name_en ||
      !UUID_RE.test(manifest?.polity?.existing_id || '') ||
      !Array.isArray(manifest.sources) || manifest.sources.length < 1 ||
      !manifest.sources.every((s) => /^https:\/\//.test(s.canonical_url || '')) ||
      !['linked', 'not_found'].includes(manifest?.external_references?.namuwiki?.status) ||
      manifest?.review_context?.preflight_required !== true ||
      !Number.isInteger(manifest?.review_context?.source_draft_pr)) {
    return stop('MANIFEST_APPROVAL_OR_IDENTITY_NOT_CONFIRMED');
  }
  return { ok: true, target, requestId: manifest.request_id };
}

export function assessProtectedPreflight({ run, evidence, pr, target, requestId }) {
  const stop = (reason) => ({ ok: false, reason });
  if (!run || run.name !== 'ATLAS Authoring Apply' || run.event !== 'push' ||
      run.status !== 'completed' || run.conclusion !== 'success' ||
      run.head_branch !== 'main' || !SHA_RE.test(run.head_sha || '') ||
      run.actor?.login !== pr.base.repo.owner.login) return stop('OIDC_PROVENANCE_MISMATCH');
  if (!evidence || evidence.ok !== true ||
      evidence.marker !== 'ATLAS_HUMAN_AUTHORING_BATCH_V1' ||
      evidence.operation !== 'preflight_batch' || evidence.committed !== false ||
      evidence.ready_count !== 1 || evidence.blocked_count !== 0 ||
      evidence.already_present_count !== 0 ||
      !Array.isArray(evidence.results) || evidence.results.length !== 1 ||
      evidence.results[0].status !== 'READY' ||
      evidence.results[0].request_id !== requestId ||
      evidence.results[0].manifest_path !== target) {
    return stop('OIDC_NOT_EXACT_READY_ONE');
  }
  return { ok: true };
}

function parseRunId(body) {
  const all = [...String(body || '').matchAll(/https:\/\/github\.com\/JezCH\/atlas-person-db\/actions\/runs\/([1-9][0-9]*)\b/g)];
  if (all.length !== 1) throw new Error('PREFLIGHT_RUN_PROVENANCE_NOT_UNIQUE');
  return Number(all[0][1]);
}

function summary(msg) {
  console.log(msg);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, msg + '\n');
}

async function githubApi(endpoint, { method = 'GET', json = undefined, raw = false } = {}) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN_UNAVAILABLE');
  const url = endpoint.startsWith('https://') ? endpoint : 'https://api.github.com' + endpoint;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    redirect: 'follow'
  });
  if (!response.ok) throw new Error('GITHUB_API_' + method + '_' + response.status + ' ' + endpoint.split('?')[0]);
  if (raw) return Buffer.from(await response.arrayBuffer());
  if (response.status === 204) return null;
  return response.json();
}

async function githubContent(repo, filename, ref) {
  const result = await githubApi('/repos/' + repo + '/contents/' + filename + '?ref=' + encodeURIComponent(ref));
  if (result.type !== 'file' || result.encoding !== 'base64') throw new Error('CONTENTS_NOT_BASE64_' + filename);
  return { text: Buffer.from(result.content, 'base64').toString('utf8'), sha: result.sha };
}

async function readPreflightArtifact(repo, runId, headSha) {
  const data = await githubApi('/repos/' + repo + '/actions/runs/' + runId + '/artifacts?per_page=100');
  const name = 'atlas-authoring-' + headSha;
  const artifacts = (data.artifacts || []).filter((a) => a.name === name && a.expired !== true);
  if (artifacts.length !== 1 || artifacts[0].size_in_bytes > 5242880) {
    throw new Error('EXACT_PREFLIGHT_ARTIFACT_NOT_FOUND');
  }
  const buf = await githubApi('/repos/' + repo + '/actions/artifacts/' + artifacts[0].id + '/zip', { raw: true });
  if (buf.length < 50 || buf.length > 5242880) throw new Error('PREFLIGHT_ARTIFACT_SIZE_INVALID');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-oidc-evidence-'));
  try {
    const filename = path.join(dir, 'evidence.zip');
    fs.writeFileSync(filename, buf, { mode: 0o600 });
    const str = execFileSync('unzip', ['-p', filename, 'responses/human-authoring-preflight.json'], {
      encoding: 'utf8', maxBuffer: 1048576, timeout: 10000
    });
    return JSON.parse(str);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function continueAuthoring({ event, api = githubApi, content = githubContent, evidenceReader = readPreflightArtifact } = {}) {
  const run = event?.workflow_run;
  if (event?.action !== 'completed' || run?.name !== 'ATLAS Integrity' ||
      run?.event !== 'pull_request' || run?.conclusion !== 'success') {
    return summary('SKIP: not successful ATLAS Integrity pull-request completion');
  }
  const repo = event.repository?.full_name;
  if (repo !== 'JezCH/atlas-person-db') throw new Error('WRONG_REPOSITORY');
  let associated = run.pull_requests || [];
  if (associated.length === 0 && BRANCH_RE.test(run.head_branch || '')) {
    // GitHub sometimes omits workflow_run.pull_requests for same-repo PRs.
    // Resolve only an exact open owner branch + CI head SHA; never guess a PR.
    const candidates = await api('/repos/' + repo + '/pulls?state=open&head=JezCH:' +
      encodeURIComponent(run.head_branch) + '&base=main&per_page=10');
    associated = candidates.filter((x) => x.head?.sha === run.head_sha)
      .map((x) => ({ number: x.number, head: { sha: x.head.sha } }));
  }
  if (associated.length !== 1 || !Number.isInteger(associated[0]?.number)) {
    return summary('SKIP: ambiguous or missing exact PR association');
  }
  const number = associated[0].number;
  const pr = await api('/repos/' + repo + '/pulls/' + number);
  if (pr.state !== 'open') return summary('SKIP: PR already closed (idempotent)');
  if (pr.head?.sha !== associated[0]?.head?.sha ||
      (run.head_branch !== pr.head?.ref) ||
      (run.head_sha !== pr.head.sha)) {
    return summary('SKIP: stale or mismatched CI head; wait for current PR CI');
  }
  if (!BRANCH_RE.test(pr.head?.ref || '') || !String(pr.body || '').includes(AUTO_MARKER)) {
    return summary('SKIP: not explicitly opted into restricted lane');
  }
  const files = await api('/repos/' + repo + '/pulls/' + number + '/files?per_page=100');
  const main = await content(repo, SELECTOR_FILE, 'main');
  const head = await content(repo, SELECTOR_FILE, pr.head.sha);
  const match = /^preflight (authoring\/requests\/[A-Za-z0-9._-]+\.json)\n$/.exec(main.text);
  if (!match) throw new Error('MAIN_SELECTOR_NOT_PREFLIGHT');
  const mf = await content(repo, match[1], 'main');
  const manifest = JSON.parse(mf.text);
  const verdict = assessAuthoringApply({
    pr, files, originalSelector: main.text, headSelector: head.text, manifest, ciRun: run
  });
  if (!verdict.ok) throw new Error('REFUSED_' + verdict.reason);
  // The protected run and its immutable evidence are both required: success alone
  // does NOT imply READY; the Authoring preflight workflow can exit 0 for BLOCKED.
  const preflightRunId = parseRunId(pr.body);
  const preflightRun = await api('/repos/' + repo + '/actions/runs/' + preflightRunId);
  // Preserve resource-scoped concurrency: unrelated newer main commits need
  // not invalidate a protected preflight if BOTH read-only selector and
  // immutable reviewed manifest have exactly the same blob at that run.
  if (!SHA_RE.test(preflightRun.head_sha || '')) throw new Error('OIDC_HEAD_SHA_MISSING');
  const protectedSelector = await content(repo, SELECTOR_FILE, preflightRun.head_sha);
  const protectedManifest = await content(repo, verdict.target, preflightRun.head_sha);
  if (protectedSelector.sha !== main.sha || protectedManifest.sha !== mf.sha) {
    throw new Error('PROTECTED_PREFLIGHT_RESOURCE_MISMATCH');
  }
  const record = await evidenceReader(repo, preflightRunId, preflightRun.head_sha);
  const approved = assessProtectedPreflight({
    run: preflightRun, evidence: record, pr,
    target: verdict.target, requestId: verdict.requestId
  });
  if (!approved.ok) throw new Error('REFUSED_' + approved.reason);
  // Fresh re-read prevents merging against stale selector or changed base manifest.
  const freshPr = await api('/repos/' + repo + '/pulls/' + number);
  const freshMain = await content(repo, SELECTOR_FILE, 'main');
  const freshManifest = await content(repo, verdict.target, 'main');
  if (freshPr.state !== 'open' || freshPr.head.sha !== pr.head.sha ||
      freshPr.mergeable !== true || freshMain.sha !== main.sha || freshManifest.sha !== mf.sha) {
    throw new Error('SCOPED_STALE_WRITE_OR_UNMERGEABLE');
  }
  const merge = await api('/repos/' + repo + '/pulls/' + number + '/merge', {
    method: 'PUT',
    json: {
      sha: pr.head.sha,
      merge_method: 'squash',
      commit_title: 'data(authoring): apply READY ' + manifest.person.canonical_name_en + ' (#' + number + ')'
    }
  });
  if (merge.merged !== true || !SHA_RE.test(merge.sha || '')) throw new Error('MERGE_NOT_CONFIRMED');
  summary('MERGED PR #' + number + ' at ' + merge.sha + '; protected preflight READY=1');
  // A GITHUB_TOKEN-generated merge does NOT emit downstream push workflows.
  // workflow_dispatch is the documented exception. The existing canonical writer
  // independently re-preflights and applies READY-only through protected OIDC.
  await api('/repos/' + repo + '/actions/workflows/' + WRITER_WORKFLOW + '/dispatches', {
    method: 'POST',
    json: {
      ref: 'main',
      inputs: { manifest: verdict.target, bootstrap_only: 'false', audit_all_approved: 'false' }
    }
  });
  summary('DISPATCHED existing protected ATLAS Authoring Apply for ' + verdict.target +
    '. Canonical commit, Runtime Compile, and live Person readback remain separate completion gates.');
}

if (process.env.ATLAS_AUTOCONTINUE_RUN === '1') {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  continueAuthoring({ event }).catch((err) => {
    console.error('ATLAS_AUTO_CONTINUATION_FAILED: ' + err.message);
    process.exitCode = 1;
  });
}
