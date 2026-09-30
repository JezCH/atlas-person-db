"use strict";
const NON_TIMELINE_SCHEMA="atlas-non-timeline-persons/v1";
async function readNonTimelinePersons(client){const r=await client.query(`
select p.id::text as person_id,p.canonical_key as person_name,coalesce(kn.name,p.canonical_key) as display_name_ko,
p.historicity,ptd.disposition as timeline_disposition,ptd.reason,ptd.basis_code,ptd.traditional_year,ptd.traditional_year_alternative,
coalesce(ptd.review_evidence->'legacy_record'->>'politic_name','') as politic_name,
coalesce(ptd.review_evidence->'legacy_record'->>'politic_display_name_ko','') as politic_display_name_ko,
coalesce(ptd.review_evidence->'legacy_record'->>'historicity_display_ko',p.historicity) as historicity_display_ko,
coalesce(ptd.review_evidence->'legacy_record'->>'role_ko','') as role_ko,
coalesce(ptd.review_evidence->'legacy_record'->>'map_policy','') as map_policy
from atlas_v2.person_timeline_dispositions ptd join atlas_v2.persons p on p.id=ptd.person_id
left join lateral(select name from atlas_v2.person_names where person_id=p.id and locale='ko' and is_preferred=true order by id limit 1)kn on true
where ptd.disposition<>'timeline' order by p.canonical_key,p.id`);return Object.freeze(r.rows.map(x=>Object.freeze({...x})))}
module.exports=Object.freeze({NON_TIMELINE_SCHEMA,readNonTimelinePersons});
