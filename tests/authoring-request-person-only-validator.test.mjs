import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function fixture() {
  return {
    schema:'atlas-human-person-authoring/v1',
    review_status:'approved',
    request_id:'validator:test:person-only:v1',
    person:{
      canonical_name_en:'Validator Example',
      display_name_ko:'검증 예시',
      person_type:'historical',
      historicity:'historical',
      life_status:'deceased',
      life_status_checked_at:'2026-09-30',
      life_status_basis:'historical_certainty'
    },
    external_references:{
      namuwiki:{
        status:'not_found',
        checked_at:'2026-09-30',
        review_reason:'no_exact_document'
      }
    },
    timeline_disposition:{
      disposition:'chronology_unresolved',
      reason:'No defensible person-specific Activity interval is available.',
      basis_code:'reviewed_test_basis',
      traditional_year:null,
      traditional_year_alternative:null,
      review_evidence:{source:'test'}
    },
    representative_domain:'knowledge',
    sources:[{
      source_type:'academic_reference',
      title:'Validator test source',
      canonical_url:'https://example.org/person-only-validator',
      citation_text:'Validator test source',
      locator:'test'
    }]
  };
}

function runValidator(file) {
  return spawnSync(process.execPath,['scripts/validate-authoring-request-files.mjs',file],{
    cwd:process.cwd(),
    encoding:'utf8'
  });
}

test('registration validator accepts person-only non-timeline authoring and rejects timeline disposition', () => {
  const file='authoring/requests/__test-person-only-validator.json';
  try {
    fs.writeFileSync(file,JSON.stringify(fixture(),null,2)+'\n');
    const valid=runValidator(file);
    assert.equal(valid.status,0,valid.stderr || valid.stdout);
    assert.match(valid.stdout,/Validated 1 authoring request file/);

    const invalid=fixture();
    invalid.timeline_disposition={disposition:'timeline',reason:null};
    fs.writeFileSync(file,JSON.stringify(invalid,null,2)+'\n');
    const blocked=runValidator(file);
    assert.notEqual(blocked.status,0);
    assert.match(blocked.stderr,/reviewed non-timeline disposition/);
  } finally {
    try { fs.unlinkSync(file); } catch {}
  }
});
