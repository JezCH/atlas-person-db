import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  verifyTrustClaims,
  ISSUER,
  EXPECTED_AUDIENCE,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REF,
  EXPECTED_WORKFLOW_REF,
  P11_SEMANTIC_V2_BACKFILL_WORKFLOW_REF,
  SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF,
  ALLOWED_WORKFLOW_REFS
} = require('../server/atlas-audit-github-oidc.js');

const EXPECTED_SHA = '0123456789abcdef0123456789abcdef01234567';

function trustedPayload(workflowRef) {
  return {
    iss: ISSUER,
    aud: EXPECTED_AUDIENCE,
    repository: EXPECTED_REPOSITORY,
    repository_id: EXPECTED_REPOSITORY_ID,
    ref: EXPECTED_REF,
    workflow_ref: workflowRef,
    environment: 'production',
    event_name: 'workflow_dispatch',
    sha: EXPECTED_SHA
  };
}

test('audit OIDC workflow allowlist is exact and includes spatial candidate audit', () => {
  assert.equal(
    EXPECTED_WORKFLOW_REF,
    'JezCH/atlas-person-db/.github/workflows/atlas-audit-inventory.yml@refs/heads/main'
  );
  assert.equal(
    SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF,
    'JezCH/atlas-person-db/.github/workflows/atlas-spatial-candidate-audit.yml@refs/heads/main'
  );
  assert.deepEqual(ALLOWED_WORKFLOW_REFS, [
    EXPECTED_WORKFLOW_REF,
    P11_SEMANTIC_V2_BACKFILL_WORKFLOW_REF,
    SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF
  ]);
  assert.equal(ALLOWED_WORKFLOW_REFS.some((ref) => ref.includes('*')), false);
});

test('spatial candidate audit workflow passes the existing exact trust boundary', () => {
  assert.doesNotThrow(() => {
    verifyTrustClaims(trustedPayload(SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF), EXPECTED_SHA);
  });
});

test('unlisted audit workflow remains rejected', () => {
  assert.throws(
    () => verifyTrustClaims(
      trustedPayload('JezCH/atlas-person-db/.github/workflows/unlisted-audit.yml@refs/heads/main'),
      EXPECTED_SHA
    ),
    /GITHUB_OIDC_WORKFLOW_MISMATCH/
  );
});
