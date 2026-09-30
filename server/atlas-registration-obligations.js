'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'core', 'registration-obligations.v1.json');
const ALLOWED_SCOPES = new Set(['new_person','activity','new_polity','publication']);
const ALLOWED_SEMANTICS = new Set(['required_or_hold','required_by_applicability','optional_or_required_by_applicability','optional']);
const FORBIDDEN_VALUE_KEYS = new Set([
  'value','values','canonical_value','actual_value','person_id','polity_id','activity_id',
  'name','url','start_year','end_year','representative_domain','timeline_disposition'
]);

function validateRegistry(registry) {
  if (!registry || registry.schema !== 'atlas-core/registration-obligations/v1' || registry.version !== 1) {
    throw new Error('REGISTRATION_OBLIGATION_REGISTRY_SCHEMA_INVALID');
  }
  if (registry.authority !== 'registration-obligation-definition-only' || registry.value_storage_forbidden !== true) {
    throw new Error('REGISTRATION_OBLIGATION_REGISTRY_AUTHORITY_INVALID');
  }
  if (!Array.isArray(registry.obligations) || registry.obligations.length === 0) {
    throw new Error('REGISTRATION_OBLIGATION_REGISTRY_EMPTY');
  }
  const seen = new Set();
  for (const obligation of registry.obligations) {
    const required = ['key','applies_to','applicability','owning_writer','semantics','completion_condition','canonical_contract_refs'];
    for (const field of required) {
      if (!(field in obligation)) throw new Error(`REGISTRATION_OBLIGATION_FIELD_REQUIRED:${obligation.key || 'unknown'}:${field}`);
    }
    if (seen.has(obligation.key)) throw new Error(`REGISTRATION_OBLIGATION_KEY_DUPLICATE:${obligation.key}`);
    seen.add(obligation.key);
    if (!ALLOWED_SCOPES.has(obligation.applies_to)) throw new Error(`REGISTRATION_OBLIGATION_SCOPE_INVALID:${obligation.key}`);
    if (!ALLOWED_SEMANTICS.has(obligation.semantics)) throw new Error(`REGISTRATION_OBLIGATION_SEMANTICS_INVALID:${obligation.key}`);
    if (!Array.isArray(obligation.canonical_contract_refs) || obligation.canonical_contract_refs.length === 0) {
      throw new Error(`REGISTRATION_OBLIGATION_CONTRACT_REF_REQUIRED:${obligation.key}`);
    }
    for (const key of Object.keys(obligation)) {
      if (FORBIDDEN_VALUE_KEYS.has(key)) throw new Error(`REGISTRATION_OBLIGATION_CANONICAL_VALUE_FORBIDDEN:${obligation.key}:${key}`);
    }
  }
  return registry;
}

function loadRegistry() {
  return validateRegistry(JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')));
}

function obligationsFor(scope) {
  if (!ALLOWED_SCOPES.has(scope)) throw new Error(`REGISTRATION_OBLIGATION_SCOPE_INVALID:${scope}`);
  return loadRegistry().obligations.filter((item) => item.applies_to === scope);
}

module.exports = { REGISTRY_PATH, ALLOWED_SCOPES, ALLOWED_SEMANTICS, validateRegistry, loadRegistry, obligationsFor };
