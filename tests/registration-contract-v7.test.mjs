import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { validateHumanRegistrationRequest } from '../scripts/validate-human-registration-request.mjs';

const require = createRequire(import.meta.url);
const humanAuthoring = require('../server/atlas-human-authoring-service.js');

const DOMAIN_CODES = [
  'governance','military','knowledge','technology',
  'commerce','culture','religion','exploration'
];

function request(activity = {}) {
  return {
    schema:'atlas-human-authoring/v1',
    review_status:'approved',
    person:{ canonical_name_en:'Example Person', representative_domain:'knowledge' },
    polity:{ canonical_name_en:'Example Polity' },
    activity:{
      relation_type:'active_in',
      period_basis:'general_activity',
      confidence:'likely',
      start_year:100,
      start_certainty:'approximate',
      start_calendar:'unspecified_historical',
      end_year:120,
      end_certainty:'approximate',
      end_calendar:'unspecified_historical',
      ...activity
    },
    sources:[{ title:'Example Source' }]
  };
}

test('canonical Human Authoring owns exactly the eight reviewed Person domains and explicit null HOLD', () => {
  for (const code of DOMAIN_CODES) {
    assert.deepEqual(
      humanAuthoring.normalizeRepresentativeDomainReview({ representative_domain:code }),
      { reviewed:true, value:code }
    );
  }
  assert.deepEqual(
    humanAuthoring.normalizeRepresentativeDomainReview({ representative_domain:null }),
    { reviewed:true, value:null }
  );
  assert.deepEqual(
    humanAuthoring.normalizeRepresentativeDomainReview({}),
    { reviewed:false, value:null }
  );
  assert.throws(
    () => humanAuthoring.normalizeRepresentativeDomainReview({ representative_domain:'ruler' }),
    /HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_INVALID/
  );
  assert.throws(
    () => humanAuthoring.normalizeRepresentativeDomainReview({ representative_domain:'' }),
    /HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_INVALID/
  );
});

test('reviewed domain set is a caller-transaction Person update with no second profile-audit mutation', async () => {
  let current = null;
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql:String(sql), params });
      if (/select pg_advisory_xact_lock/.test(sql)) return { rowCount:1, rows:[{}] };
      if (/select representative_domain/.test(sql)) return { rowCount:1, rows:[{ representative_domain:current }] };
      if (/update atlas_v2\.persons/.test(sql)) {
        current = params[1];
        return { rowCount:1, rows:[{ representative_domain:current }] };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    }
  };

  const result = await humanAuthoring.resolveRepresentativeDomainWithinTransaction(client, {
    personId:'11111111-1111-4111-8111-111111111111',
    reviewed:true,
    requested:'knowledge'
  });
  assert.deepEqual(result, {
    representative_domain:'knowledge',
    requested_representative_domain:'knowledge',
    reviewed:true,
    disposition:'set'
  });
  assert.equal(current, 'knowledge');
  assert.equal(calls.some((call) => /BEGIN|COMMIT|ROLLBACK/i.test(call.sql)), false, 'helper must reuse caller transaction');
  assert.equal(calls.some((call) => /person_profile_mutation_audits/.test(call.sql)), false, 'registration domain evidence belongs in the Human Authoring ledger, not a second audit write');

  await assert.rejects(
    humanAuthoring.resolveRepresentativeDomainWithinTransaction(client, {
      personId:'11111111-1111-4111-8111-111111111111',
      reviewed:true,
      requested:'military'
    }),
    /HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_CONFLICT/
  );
  assert.equal(current, 'knowledge');
});

test('explicit null domain preserves truth and records HOLD disposition for the Human Authoring snapshot', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      if (/select pg_advisory_xact_lock/.test(sql)) return { rowCount:1, rows:[{}] };
      if (/select representative_domain/.test(sql)) return { rowCount:1, rows:[{ representative_domain:null }] };
      throw new Error(`unexpected SQL: ${sql}`);
    }
  };
  const domain = await humanAuthoring.resolveRepresentativeDomainWithinTransaction(client, {
    personId:'11111111-1111-4111-8111-111111111111',
    reviewed:true,
    requested:null
  });
  assert.deepEqual(domain, {
    representative_domain:null,
    requested_representative_domain:null,
    reviewed:true,
    disposition:'reviewed_unclassified'
  });
  assert.equal(calls.some((sql) => /update atlas_v2\.persons/.test(sql)), false);
  assert.equal(calls.some((sql) => /person_profile_mutation_audits/.test(sql)), false);

  const snapshot = humanAuthoring.buildSnapshot({
    person:{ id:'11111111-1111-4111-8111-111111111111', disposition:'created' },
    personDomain:domain,
    polity:{ id:'22222222-2222-4222-8222-222222222222', disposition:'created' },
    role:{ id:null, disposition:'none' },
    relation:{ id:'33333333-3333-4333-8333-333333333333', code:'active_in' },
    periodBasis:{ id:'44444444-4444-4444-8444-444444444444', code:'general_activity' },
    sources:[{ id:'55555555-5555-4555-8555-555555555555', disposition:'created', locator:'Example Source' }],
    activity:{ id:'66666666-6666-4666-8666-666666666666', semantic_key:'k', semantic_hash:'h' },
    transport:{ kind:'admin_session' },
    externalReferences:{ namuwiki:null }
  });
  assert.equal(snapshot.entities.person.representative_domain_reviewed, true);
  assert.equal(snapshot.entities.person.representative_domain, null);
  assert.equal(snapshot.entities.person.representative_domain_disposition, 'reviewed_unclassified');
});

test('direct Admin requires domain review while GitHub/internal legacy transport can preserve omission', () => {
  assert.equal(humanAuthoring.requiresRepresentativeDomainReview({ kind:'admin_session' }), true);
  assert.equal(humanAuthoring.requiresRepresentativeDomainReview({ kind:'admin_bearer' }), true);
  assert.equal(humanAuthoring.requiresRepresentativeDomainReview({ kind:'github_oidc' }), false);
  assert.equal(humanAuthoring.requiresRepresentativeDomainReview(null), false);
});

test('manifest validator accepts known, unknown and ongoing temporal truth without sentinel dates', () => {
  const known = validateHumanRegistrationRequest(request());
  assert.equal(known.start_status, 'known');
  assert.equal(known.end_status, 'known');
  assert.equal(known.runtime_expected, true);

  const unknownStart = request({
    start_year:null,
    start_month:null,
    start_day:null,
    start_granularity:null,
    start_certainty:null,
    start_calendar:null
  });
  const unknownStartResult = validateHumanRegistrationRequest(unknownStart);
  assert.equal(unknownStartResult.start_status, 'unknown');
  assert.equal(unknownStartResult.runtime_expected, false);

  const unknownEnd = request({
    end_year:null,
    end_month:null,
    end_day:null,
    end_granularity:null,
    end_certainty:null,
    end_calendar:null
  });
  const unknownEndResult = validateHumanRegistrationRequest(unknownEnd);
  assert.equal(unknownEndResult.end_status, 'unknown');
  assert.equal(unknownEndResult.runtime_expected, false);

  const ongoing = request({
    chronology_status:'ongoing',
    end_year:null,
    end_month:null,
    end_day:null,
    end_granularity:null,
    end_certainty:null,
    end_calendar:null,
    ongoing_as_of:'2026-09-06'
  });
  const ongoingResult = validateHumanRegistrationRequest(ongoing);
  assert.equal(ongoingResult.end_status, 'ongoing');
  assert.equal(ongoingResult.runtime_expected, true);

  assert.throws(() => validateHumanRegistrationRequest(request({ start_year:0 })), /START_YEAR_INVALID/);
});

test('new manifest validator requires explicit canonical domain while legacy replay can omit it', () => {
  const missing = request();
  delete missing.person.representative_domain;
  assert.throws(() => validateHumanRegistrationRequest(missing), /REPRESENTATIVE_DOMAIN_REVIEW_REQUIRED/);
  assert.equal(validateHumanRegistrationRequest(missing, { requireDomain:false }).ok, true);
  const invalid = request();
  invalid.person.representative_domain = 'science';
  assert.throws(() => validateHumanRegistrationRequest(invalid), /REPRESENTATIVE_DOMAIN_INVALID/);
});

test('Production Human Authoring uses the canonical service directly with no registration wrapper residue', () => {
  const api = fs.readFileSync(new URL('../api/atlas-authoring.js', import.meta.url), 'utf8');
  assert.doesNotMatch(api, /atlas-registration-human-authoring-service/);
  assert.doesNotMatch(api, /createRegistrationHumanAuthoringService/);
  assert.match(api, /createHumanAuthoringHandler\(\{ clientFactory:createPostgresClient \}\)/);
  assert.equal(fs.existsSync(new URL('../server/atlas-registration-human-authoring-service.js', import.meta.url)), false);
});

test('registration SOP is a single bounded SCREEN REVIEW WRITE PUBLISH contract', () => {
  const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
  assert.match(sop, /Lean Path v7\.0/);
  assert.match(sop, /SCREEN → REVIEW → WRITE → PUBLISH\/VERIFY → STOP/);
  assert.match(sop, /representative_domain/);
  assert.match(sop, /VERIFIED_RUNTIME/);
  assert.match(sop, /VERIFIED_AUTHORING_ONLY/);
  assert.match(sop, /one Runtime compile for the resulting authoritative state/);
  assert.match(sop, /Do not add a standalone Spatial lookup to every registration/);
  assert.match(sop, /Place — conditional only/);
  assert.match(sop, /immutable Human Authoring ledger/);
});

test('v7 prework preserves current authoring bootstrap and transport safety invariants', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml', import.meta.url), 'utf8');
  assert.match(workflow, /readiness\.core\.ongoing_terms_ready==true/);
  assert.match(workflow, /Production runtime is still behind the authoring commit/);
  assert.match(workflow, /\.readiness\.core\.ledger_table_ready==true/);
  assert.match(workflow, /\.readiness\.core\.ledger_columns_ready==true/);
  assert.match(workflow, /\.runtime_sha==\$runtime/);
  assert.match(workflow, /\.authoring_sha==\$authoring/);
  assert.match(workflow, /v2-relation-full-temporal/);
});
