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
  SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF,
  SWEDEN_POLITY_AUDIT_WORKFLOW_REF,
  SONG_POLITY_AUDIT_WORKFLOW_REF,
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

test('audit OIDC workflow allowlist is exact and includes only designated audits', () => {
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
    SPATIAL_CANDIDATE_AUDIT_WORKFLOW_REF,
    SWEDEN_POLITY_AUDIT_WORKFLOW_REF,
    SONG_POLITY_AUDIT_WORKFLOW_REF
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

test('Sweden bounded read-only audit workflow has exact main-SHA OIDC permission', () => {
  assert.equal(
    SWEDEN_POLITY_AUDIT_WORKFLOW_REF,
    'JezCH/atlas-person-db/.github/workflows/atlas-polity-sweden-p2-06-audit.yml@refs/heads/main'
  );
  assert.doesNotThrow(() => verifyTrustClaims(trustedPayload(SWEDEN_POLITY_AUDIT_WORKFLOW_REF), EXPECTED_SHA));
  assert.throws(
    () => verifyTrustClaims(trustedPayload(SWEDEN_POLITY_AUDIT_WORKFLOW_REF), 'fedcba9876543210fedcba9876543210fedcba98'),
    /GITHUB_OIDC_SHA_MISMATCH/
  );
  assert.throws(() => verifyTrustClaims({...trustedPayload(SWEDEN_POLITY_AUDIT_WORKFLOW_REF), ref:'refs/heads/other'}, EXPECTED_SHA), /GITHUB_OIDC_REF_MISMATCH/);
});

test('Song bounded audit OIDC caller is exact-main production trusted and cannot forge a foreign SHA',()=>{
 assert.equal(SONG_POLITY_AUDIT_WORKFLOW_REF,'JezCH/atlas-person-db/.github/workflows/atlas-polity-song-p2-08-audit.yml@refs/heads/main');
 assert.doesNotThrow(()=>verifyTrustClaims(trustedPayload(SONG_POLITY_AUDIT_WORKFLOW_REF),EXPECTED_SHA));
 assert.throws(()=>verifyTrustClaims(trustedPayload(SONG_POLITY_AUDIT_WORKFLOW_REF),'fedcba9876543210fedcba9876543210fedcba98'),/GITHUB_OIDC_SHA_MISMATCH/);
 assert.throws(()=>verifyTrustClaims({...trustedPayload(SONG_POLITY_AUDIT_WORKFLOW_REF),environment:'staging'},EXPECTED_SHA),/GITHUB_OIDC_ENVIRONMENT_MISMATCH/);
});
