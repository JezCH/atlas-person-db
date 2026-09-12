import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import {
  validateHumanRegistrationRequest,
  loadRegistrationObligationRegistry,
  REGISTRATION_OBLIGATION_REGISTRY
} from '../scripts/validate-human-registration-request.mjs';

const require = createRequire(import.meta.url);
const humanAuthoring = require('../server/atlas-human-authoring-service.js');

const DOMAIN_CODES = [
  'governance','military','knowledge','technology',
  'commerce','culture','religion','exploration'
];

function linkedNamuWiki() {
  return {
    status:'linked',
    checked_at:'2026-09-08',
    document_title:'Example Person',
    url:'https://namu.wiki/w/Example%20Person'
  };
}

function exhaustiveNotFound() {
  return {
    status:'not_found',
    checked_at:'2026-09-08',
    search_evidence:{
      exhaustive:true,
      attempted_variants:['예시 인물','Example Person'],
      evidence_note:'Checked Korean and English/native variants plus indexed/related-page discovery; no independent same-Person document verified.'
    }
  };
}

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
    sources:[{ title:'Example Source' }],
    external_references:{ namuwiki:linkedNamuWiki() }
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

test('manifest validator accepts closed or historical-unknown boundaries and rejects genuine ongoing registration', () => {
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
  assert.throws(
    () => validateHumanRegistrationRequest(ongoing),
    /HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN/
  );

  assert.throws(() => validateHumanRegistrationRequest(request({ start_year:0 })), /START_YEAR_INVALID/);
});

test('canonical Human Authoring itself rejects ongoing while preserving a source-unknown historical end', () => {
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
  ongoing.request_id = 'closed-boundary:ongoing';
  assert.throws(
    () => humanAuthoring.normalizeHumanAuthoringRequest(ongoing),
    /HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN/
  );

  const historicalUnknown = request({
    end_year:null,
    end_month:null,
    end_day:null,
    end_granularity:null,
    end_certainty:null,
    end_calendar:null
  });
  historicalUnknown.request_id = 'closed-boundary:historical-unknown';
  const normalized = humanAuthoring.normalizeHumanAuthoringRequest(historicalUnknown);
  assert.equal(normalized.activity.end.year, null);
  assert.equal(normalized.activity.chronology_status, 'reviewed');
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

test('new manifest NamuWiki review fails closed on omission or provider-only deferral', () => {
  const missing = request();
  delete missing.external_references;
  assert.throws(() => validateHumanRegistrationRequest(missing), /NAMUWIKI_REVIEW_REQUIRED/);

  const blocked = request();
  delete blocked.external_references;
  blocked.review_deferrals = {
    namuwiki:{
      reason_code:'provider_access_blocked',
      attempted_at:'2026-09-08',
      reason:'direct provider access unavailable'
    }
  };
  assert.throws(() => validateHumanRegistrationRequest(blocked), /NAMUWIKI_DEFERRAL_NOT_TERMINAL/);

  assert.equal(validateHumanRegistrationRequest(missing, { requireNamuWiki:false }).ok, true, 'legacy replay may preserve historical omission');
});

test('NamuWiki not_found requires compact exhaustive-search evidence, not a failed lookup', () => {
  const bare = request();
  bare.external_references.namuwiki = { status:'not_found', checked_at:'2026-09-08' };
  assert.throws(() => validateHumanRegistrationRequest(bare), /NAMUWIKI_NOT_FOUND_EVIDENCE_REQUIRED/);

  const weak = request();
  weak.external_references.namuwiki = {
    status:'not_found',
    checked_at:'2026-09-08',
    search_evidence:{ exhaustive:true, attempted_variants:['Example Person'], evidence_note:'one lookup' }
  };
  assert.throws(() => validateHumanRegistrationRequest(weak), /NAMUWIKI_NOT_FOUND_VARIANTS_INSUFFICIENT/);

  const reviewed = request();
  reviewed.external_references.namuwiki = exhaustiveNotFound();
  const result = validateHumanRegistrationRequest(reviewed);
  assert.equal(result.namuwiki_status, 'not_found');
});

test('registration obligation registry makes retrospective backfill an ingest contract without process bloat', () => {
  const registry = loadRegistrationObligationRegistry();
  assert.equal(registry.schema, 'atlas-registration-obligations/v1');
  assert.equal(registry.policy.promotion_trigger, 'retrospective_full_coverage_audit_or_backfill');
  assert.equal(registry.policy.no_unspecified_future_debt, true);

  const ids = new Set(registry.obligations.map((item) => item.id));
  for (const required of [
    'person.representative_domain',
    'person.external_references.namuwiki',
    'activity.temporal_source_truth',
    'polity.spacetime_placement',
    'place.historical_relation',
    'runtime.publication_disposition'
  ]) assert.equal(ids.has(required), true, `missing active ingest obligation ${required}`);

  const temporal = registry.obligations.find((item) => item.id === 'activity.temporal_source_truth');
  assert.equal(temporal.ongoing_registration_forbidden, true);
  assert.equal(temporal.historical_unknown_boundary_allowed, true);
  assert.equal(temporal.living_status_is_not_gate, true);

  const execution = registry.policy.execution;
  for (const key of [
    'bounded_screen_once',
    'bundle_review_once',
    'parallelize_independent_research',
    'reuse_existing_canonical_state',
    'prefer_same_authoring_transaction',
    'companion_write_only_when_canonical_writer_cannot_persist',
    'batch_cohort_transport',
    'one_preflight_per_cohort',
    'one_authoring_apply_per_cohort',
    'one_runtime_publication_per_resulting_authoritative_state',
    'one_terminal_readback_pass',
    'stop_at_proven_terminal_state',
    'no_reassurance_reads',
    'no_feature_specific_registration_api',
    'no_feature_specific_registration_wrapper',
    'no_separate_workflow_unless_distinct_writer_boundary_requires_it',
    'serialize_only_actual_shared_write_boundary'
  ]) assert.equal(execution[key], true, `efficiency invariant disabled: ${key}`);

  assert.equal(REGISTRATION_OBLIGATION_REGISTRY.schema, registry.schema);
});

test('Production Human Authoring uses the canonical service directly with no registration wrapper residue', () => {
  const api = fs.readFileSync(new URL('../api/atlas-authoring.js', import.meta.url), 'utf8');
  assert.doesNotMatch(api, /atlas-registration-human-authoring-service/);
  assert.doesNotMatch(api, /createRegistrationHumanAuthoringService/);
  assert.match(api, /createHumanAuthoringHandler\(\{ clientFactory:createPostgresClient \}\)/);
  assert.equal(fs.existsSync(new URL('../server/atlas-registration-human-authoring-service.js', import.meta.url)), false);
});

test('registration SOP and ingest policy enforce one bounded complete path and STOP', () => {
  const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
  const ingest = fs.readFileSync(new URL('../authoring/REGISTRATION_INGEST_POLICY.md', import.meta.url), 'utf8');
  assert.match(sop, /Lean Path v7\.0/);
  assert.match(sop, /SCREEN → REVIEW → WRITE → PUBLISH\/VERIFY → STOP/);
  assert.match(sop, /Universal completeness invariant — backfill becomes ingest contract/);
  assert.match(sop, /closed-boundary gate/i);
  assert.match(sop, /representative_domain/);
  assert.match(sop, /NamuWiki — mandatory review/);
  assert.match(sop, /mandatory closure for new Polity/);
  assert.match(sop, /one Runtime compile for the resulting authoritative state/);
  assert.match(sop, /immutable Human Authoring ledger/);

  assert.match(ingest, /Backfill-to-ingest rule/);
  assert.match(ingest, /Applicable-only rule/);
  assert.match(ingest, /Minimum sufficient work/);
  assert.match(ingest, /Anti-process-bloat rule/);
  assert.match(ingest, /one bundled REVIEW/);
  assert.match(ingest, /one cohort preflight/);
  assert.match(ingest, /only necessary companion writes/);
  assert.match(ingest, /one terminal read-back pass/);
  assert.match(ingest, /no unspecified “do it later” debt/);
});

test('NamuWiki policy requires exhaustive discovery but keeps evidence compact', () => {
  const policy = fs.readFileSync(new URL('../authoring/NAMUWIKI_REGISTRATION_POLICY.md', import.meta.url), 'utf8');
  assert.match(policy, /same search standard as the rolling #820 re-audit/);
  assert.match(policy, /provider block, one failed direct fetch, or one failed exact-title search is not evidence/);
  assert.match(policy, /search_evidence/);
  assert.match(policy, /evidence is intentionally compact/);
  assert.match(policy, /not a terminal registration outcome/);
  assert.match(policy, /do not create a second registration API, per-Person workflow, or separate research database/);
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
