import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');

test('reviewed GitHub fallback accepts human-readable requests without weakening native v2 manifests', () => {
  assert.match(workflow, /atlas-human-authoring\/v1/);
  assert.match(workflow, /ATLAS_HUMAN_AUTHORING_ENDPOINT: https:\/\/atlas-person-db\.vercel\.app\/api\/atlas-authoring/);
  assert.match(workflow, /\.activity\.relation_type \| IN\("rules","governs","serves","active_in","opposes","claims_rule"\)/);
  assert.match(workflow, /\.activity\.period_basis \| type == "string"/);
  assert.match(workflow, /\.sources \| type == "array" and length > 0/);
  assert.match(workflow, /atlas-authoring-manifest\/v2/);
  assert.match(workflow, /\.activity\.relation_type_id \| type == "string"/);
});

test('all-human authoring batches preflight then apply through the runtime-race-safe batch helper', () => {
  assert.match(workflow, /post_human_batch\(\)/);
  assert.match(workflow, /post_human_batch "preflight_batch"/);
  assert.match(workflow, /post_human_batch "apply_batch"/);
  assert.match(workflow, /manifest_paths:\$manifest_paths/);
  assert.match(workflow, /requests:\$requests/);
  assert.match(workflow, /oidc_token="\$\(request_oidc\)"/);
  assert.match(workflow, /AUTHORING_RUNTIME_SHA_MISMATCH/);
  assert.match(workflow, /refresh_runtime_sha/);
  assert.match(workflow, /for attempt in 1 2 3/);
  assert.match(workflow, /ATLAS_HUMAN_AUTHORING_BATCH_V1/);
  assert.match(workflow, /atlas-human-authoring-batch\/v1/);
  assert.match(workflow, /all\(\.results\[\];/);
  assert.match(workflow, /\.result\.semantic_version=="v2-relation-full-temporal"/);
  assert.match(workflow, /role\.source_label \/\/ \.role\.canonical_name_en \/\/ ""\) \| ascii_downcase/);
  assert.match(workflow, /\(\$m\.activity\.role \/\/ ""\) \| ascii_downcase/);
});

test('native or mixed authoring retains the existing safe per-manifest fallback', () => {
  assert.match(workflow, /while IFS= read -r manifest/);
  assert.match(workflow, /manifest_path:\$manifest_path,manifest:\$manifest\[0\]/);
  assert.match(workflow, /ATLAS_AUTHORING_MANIFEST_V2_STAGE2_NATIVE/);
  assert.match(workflow, /authorization: Bearer \$\{oidc_token\}/);
});

test('authoring readiness retries both route propagation and deployment races', () => {
  assert.match(workflow, /for attempt in \$\(seq 1 60\)/);
  assert.match(workflow, /if \[\[ "\$status" == "404" \]\]/);
  assert.match(workflow, /retrying in 5s/);
  assert.match(workflow, /AUTHORING_RUNTIME_CODE_DRIFT remained after 60 attempts/);
  assert.match(workflow, /Production runtime is still behind the authoring commit/);
});

test('workflow-only changes run the trusted read-only completeness audit instead of replaying a historical batch', () => {
  assert.match(workflow, /audit_all_approved:/);
  assert.match(workflow, /Workflow-only change selected the trusted read-only completeness audit/);
  assert.match(workflow, /ATLAS_AUTHORING_AUDIT_ALL_APPROVED/);
  assert.match(workflow, /Build immutable approved human-authoring audit batches/);
  assert.match(workflow, /Preflight every approved human-authoring manifest read-only/);
  assert.match(workflow, /operation:"preflight_batch"/);
  assert.match(workflow, /data_level_missing_count: ready\.length/);
  assert.match(workflow, /Approved manifests that are READY against Production/);
  assert.doesNotMatch(workflow, /recovery_commit=/);
  assert.doesNotMatch(workflow, /Workflow recovery selected the most recent immutable authoring batch/);
});

test('trusted completeness audit is mutation-free and preserves normal apply semantics', () => {
  assert.match(workflow, /audit_all_approved and bootstrap_only are mutually exclusive/);
  assert.match(workflow, /Completeness audit is read-only and requires an already-ready Production authoring runtime/);
  assert.match(workflow, /Bootstrap bounded authoring schema migrations\n\s+if: .*ATLAS_AUTHORING_AUDIT_ALL_APPROVED != 'true'/);
  assert.match(workflow, /Apply manifests through deployed Vercel server\n\s+if: .*ATLAS_AUTHORING_AUDIT_ALL_APPROVED != 'true'/);
  assert.match(workflow, /\.committed==false/);
  assert.match(workflow, /result_count_mismatch/);
});
