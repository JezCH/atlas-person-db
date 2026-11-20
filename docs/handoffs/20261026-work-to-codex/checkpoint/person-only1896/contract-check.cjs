const a=require('node:assert/strict');
const {personOnlyPayload}=require('./atlas-admin-person-only-payload.cjs');
const {normalizeHumanPersonAuthoringRequest:normalize}=require(require('node:path').join(process.env.ATLAS_REPO_ROOT || require('node:path').join(__dirname,'..','atlas'),'server/atlas-human-authoring-service.js'));
const input={request_id:'fixture:adapter',person:{canonical_name_en:'Fixture',display_name_ko:'검증',representative_domain:'science',life_status:'deceased',life_status_checked_at:'2026-10-25',life_status_basis:'historical_certainty'},sources:[{title:'Fixture reference',canonical_url:'https://example.org/fixture'}],external_references:{namuwiki:{status:'not_found',checked_at:'2026-10-25',review_reason:'no_exact_document'}}};
const disposition={disposition:'chronology_unresolved',reason:'Fixture only'};
const p=personOnlyPayload(input,disposition);
a.equal(normalize(p).representative_domain,'science');
for(const [edit,code] of [[p=>p.person.display_name_ko='',/PERSON_KO_REQUIRED/],[p=>p.timeline_disposition.reason='',/EXCLUSION_REASON_REQUIRED/],[p=>p.timeline_disposition.disposition='invented',/DISPOSITION_UNSUPPORTED/],[p=>p.person.life_status='living',/LIVING_EXCLUDED/]]){const x=structuredClone(p);edit(x);a.throws(()=>normalize(x),code);}
console.log('5 server contract cases PASS; '+process.version);
