import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ui=fs.readFileSync(new URL('../atlas-admin-identity.js',import.meta.url),'utf8');
const gate=fs.readFileSync(new URL('../atlas-admin-session-gate.js',import.meta.url),'utf8');

test('normal admin registration remains human-readable and UUID-free',()=>{
  assert.match(ui,/const authoringEndpoint = "\/api\/atlas-authoring"/);
  assert.match(ui,/id="humanAuthoringForm"/);
  assert.match(ui,/인물 영문명/);
  assert.match(ui,/정치체 영문명/);
  assert.match(ui,/Person \+ Activity \+ Source 한 번에 등록/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/schema:\s*"atlas-human-authoring\/v1"/);
  assert.doesNotMatch(ui,/id="human[^\"]*Uuid/i);
  assert.doesNotMatch(ui,/new Date\(|Date\.parse\(/);
});

test('Relation and Period Basis choices come from the authenticated live catalog',()=>{
  assert.match(ui,/body\.catalogs\?\.relation_types/);
  assert.match(ui,/body\.catalogs\?\.period_bases/);
  assert.match(ui,/appendCatalogOptions\(relationSelect, relationTypes/);
  assert.match(ui,/appendCatalogOptions\(periodSelect, periodBases\)/);
  assert.doesNotMatch(ui,/<option value="rules">/);
  assert.doesNotMatch(ui,/select\.value\s*=\s*"reign"/);
  assert.doesNotMatch(ui,/periodSelect\.value\s*=\s*"reign"/);
});

test('admin temporal input exposes separate full boundaries without asking for granularity',()=>{
  for (const id of [
    'humanStartYear','humanStartMonth','humanStartDay','humanStartCertainty','humanStartCalendar',
    'humanEndYear','humanEndMonth','humanEndDay','humanEndCertainty','humanEndCalendar'
  ]) assert.match(ui,new RegExp(`id="${id}"`));
  for (const calendar of ['gregorian','julian','unspecified_historical','source_calendar']) assert.match(ui,new RegExp(`value="${calendar}"`));
  assert.match(ui,/\$\{key\}_year/);
  assert.match(ui,/\$\{key\}_month/);
  assert.match(ui,/\$\{key\}_day/);
  assert.match(ui,/\$\{key\}_certainty/);
  assert.match(ui,/\$\{key\}_calendar/);
  assert.match(ui,/\.\.\.boundary\("Start", "시작"\)/);
  assert.match(ui,/\.\.\.boundary\("End", "종료"\)/);
  assert.doesNotMatch(ui,/humanStartGranularity|humanEndGranularity/);
  assert.match(ui,/year === 0/);
  assert.match(ui,/day !== null && month === null/);
  assert.match(ui,/시작 연도 <small>비우면 경계 미상<\/small><input id="humanStartYear" type="number" step="1" \/>/);
  assert.match(ui,/종료 연도 <small>비우면 경계 미상<\/small><input id="humanEndYear" type="number" step="1" \/>/);
  assert.match(ui,/const yearText = value\(`human\$\{prefix\}Year`\)/);
  assert.match(ui,/if \(!yearText\) \{/);
  assert.match(ui,/\[\`\$\{key\}_year\`\]: null/);
  assert.match(ui,/\[\`\$\{key\}_certainty\`\]: null/);
  assert.match(ui,/\[\`\$\{key\}_calendar\`\]: null/);
  assert.match(ui,/연도가 미상이면 월·일도 비워야 합니다/);
});

test('existing entity reuse does not force Korean labels in the browser',()=>{
  assert.match(ui,/id="humanPersonKo" \/>/);
  assert.match(ui,/id="humanPolityKo" \/>/);
  assert.match(ui,/신규 Person 생성 시 필수/);
  assert.match(ui,/신규 Polity 생성 시 필수/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED/);
});

test('Source URL is optional and selects the bibliographic source type without fake URLs',()=>{
  assert.match(ui,/id="humanSourceTitle" required/);
  assert.match(ui,/id="humanSourceUrl" type="url" \/>/);
  assert.match(ui,/sourceUrl \? "web_bibliographic_reference" : "bibliographic_reference"/);
  assert.match(ui,/canonical_url:\s*sourceUrl \|\| null/);
  assert.match(ui,/citation_text:\s*value\("humanSourceCitation"\) \|\| null/);
});

test('normal registration submits one semantic request and session expiry protects the route',()=>{
  assert.match(ui,/person:\s*\{[\s\S]*canonical_name_en:\s*value\("humanPersonEn"\)/);
  assert.match(ui,/polity:\s*\{ canonical_name_en:/);
  assert.match(ui,/relation_type:\s*value\("humanRelation"\)/);
  assert.match(ui,/period_basis:\s*value\("humanPeriodBasis"\)/);
  assert.match(ui,/sources:\s*\[\{/);
  assert.match(gate,/"\/api\/atlas-authoring"/);
});


test('new Person representative-domain review is explicit and canonical-catalog driven',()=>{
  assert.match(ui,/id="humanRepresentativeDomain"/);
  assert.match(ui,/body\.catalogs\?\.representative_domains/);
  assert.match(ui,/body\.catalogs\?\.representative_domain_reviewed_null_allowed === true/);
  assert.match(ui,/populateRepresentativeDomains\(domainSelect, representativeDomains/);
  assert.match(ui,/__reviewed_null__/);
  assert.match(ui,/return \{ representative_domain:null \}/);
  assert.match(ui,/\.\.\.representativeDomainReview\(\)/);
  for (const invented of ['ruler','science','diplomacy']) assert.doesNotMatch(ui,new RegExp(`value="${invented}"`));
  assert.match(ui,/기존 Person 재사용 시 생략/);
});

test('new Polity spatial registration handshake is optional for reuse and canonical-catalog driven',()=>{
  assert.match(ui,/id="humanSpatialDispositionState"/);
  assert.match(ui,/id="humanSpatialDispositionEvidence" disabled/);
  assert.match(ui,/body\.catalogs\?\.spatial_registration_states/);
  assert.match(ui,/populateSpatialStates\(spatialSelect, spatialStates\)/);
  assert.match(ui,/if \(!state\) return null/);
  assert.match(ui,/\.\.\.\(spatialDisposition \? \{ spatial_disposition:spatialDisposition \} : \{\}\)/);
  assert.match(ui,/reviewed_hold/);
  assert.match(ui,/Territory·Geometry·경계·좌표/);
  assert.doesNotMatch(ui,/latitude|longitude|polygon|geometry_payload|territory_record/i);
});

test('Admin explains canonical fail-closed domain and spatial errors',()=>{
  assert.match(ui,/HUMAN_AUTHORING_NEW_PERSON_DOMAIN_REVIEW_REQUIRED/);
  assert.match(ui,/PERSON_DOMAIN_VALUE_UNSUPPORTED/);
  assert.match(ui,/HUMAN_AUTHORING_SPATIAL_DISPOSITION_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_SPATIAL_DISPOSITION_INVALID/);
  assert.match(ui,/HUMAN_AUTHORING_SPATIAL_DISPOSITION_EVIDENCE_REQUIRED/);
});



test('NamuWiki not_found registration requires a terminal detailed review reason',()=>{
  assert.match(ui,/id="humanNamuWikiReviewReason" disabled/);
  assert.match(ui,/value="no_exact_document"/);
  assert.match(ui,/value="related_or_derivative_only"/);
  assert.match(ui,/reviewReason\.required = notFound/);
  assert.match(ui,/review_reason:reviewReason/);
  assert.match(ui,/HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_INVALID/);
  assert.match(ui,/나무위키: 문서 없음 —/);
});

test('canonical registration selects remain width-bounded on mobile layouts',()=>{
  const css=fs.readFileSync(new URL('../atlas-admin-identity.css',import.meta.url),'utf8');
  assert.match(css,/\.identity-form select \{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*min-height:\s*42px/s);
  assert.match(css,/@media \(max-width: 520px\) \{ \.identity-two \{ grid-template-columns: 1fr; \} \}/);
});
