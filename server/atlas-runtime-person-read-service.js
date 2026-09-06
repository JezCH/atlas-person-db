"use strict";

const authoringRead = require("./atlas-person-read-service.js");

const PERSON_READ_SQL = `
select
  p.id, p.person_type, p.historicity,
  coalesce((select jsonb_agg(jsonb_build_object('locale',pn.locale,'name',pn.name,'name_type',pn.name_type,'is_preferred',pn.is_preferred) order by pn.is_preferred desc,pn.locale,pn.name_type,pn.name,pn.id) from atlas_v2.person_names pn where pn.person_id=p.id),'[]'::jsonb) as names,
  coalesce((select jsonb_agg(jsonb_build_object('locale',pd.locale,'content',pd.content) order by pd.locale,pd.id) from atlas_v2.person_descriptions pd where pd.person_id=p.id),'[]'::jsonb) as descriptions,
  coalesce((select jsonb_object_agg(per.provider,jsonb_strip_nulls(jsonb_build_object('status',per.status,'checked_at',per.checked_at::text,'document_title',per.document_title,'url',per.url)) order by per.provider) from atlas_v2.person_external_references per where per.person_id=p.id),'{}'::jsonb) as external_references,
  (select count(*)::int from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id) as activity_count,
  (select min(pp.activity_start) from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id) as first_activity_year,
  (select max(pp.activity_end) from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id and pp.chronology_status<>'ongoing') as last_activity_year
from atlas_v2.persons p
order by p.id`;

const PERSON_DETAIL_SQL = `
select
  p.id, p.person_type, p.historicity,
  coalesce((select jsonb_agg(jsonb_build_object('locale',pn.locale,'name',pn.name,'name_type',pn.name_type,'is_preferred',pn.is_preferred) order by pn.is_preferred desc,pn.locale,pn.name_type,pn.name,pn.id) from atlas_v2.person_names pn where pn.person_id=p.id),'[]'::jsonb) as names,
  coalesce((select jsonb_agg(jsonb_build_object('locale',pd.locale,'content',pd.content) order by pd.locale,pd.id) from atlas_v2.person_descriptions pd where pd.person_id=p.id),'[]'::jsonb) as descriptions,
  coalesce((select jsonb_object_agg(per.provider,jsonb_strip_nulls(jsonb_build_object('status',per.status,'checked_at',per.checked_at::text,'document_title',per.document_title,'url',per.url)) order by per.provider) from atlas_v2.person_external_references per where per.person_id=p.id),'{}'::jsonb) as external_references,
  (select count(*)::int from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id) as activity_count,
  (select min(pp.activity_start) from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id) as first_activity_year,
  (select max(pp.activity_end) from atlas_v2.runtime_person_politics_v1 pp where pp.person_id=p.id and pp.chronology_status<>'ongoing') as last_activity_year
from atlas_v2.persons p
where p.id=$1::uuid
limit 1`;

const ACTIVITY_DETAIL_SQL = `
select
  pp.id,pp.person_id,pp.polity_id,pp.relation_type_id,pp.role_id,pp.period_basis_id,
  pp.activity_start,pp.activity_start_month,pp.activity_start_day,pp.activity_start_granularity,pp.activity_start_certainty,pp.activity_start_calendar,
  pp.activity_end,pp.activity_end_month,pp.activity_end_day,pp.activity_end_granularity,pp.activity_end_certainty,pp.activity_end_calendar,
  pp.confidence,pp.chronology_status,pp.source_locator->>'ongoing_as_of' as ongoing_as_of,pp.notes,
  prt.code as relation_type_code,prt.category as relation_type_category,
  pen.name as polity_name_en,pko.name as polity_name_ko,
  r.code as role_code,r.category as role_category,r.source_label as role_source_label,
  ren.name as role_name_en,rko.name as role_name_ko,
  pb.code as period_basis_code,pben.name as period_basis_name_en,pbko.name as period_basis_name_ko
from atlas_v2.runtime_person_politics_v1 pp
join atlas_v2.person_polity_relation_types prt on prt.id=pp.relation_type_id
left join atlas_v2.polity_names pen on pen.polity_id=pp.polity_id and pen.locale='en' and pen.is_preferred=true
left join atlas_v2.polity_names pko on pko.polity_id=pp.polity_id and pko.locale='ko' and pko.is_preferred=true
left join atlas_v2.roles r on r.id=pp.role_id
left join atlas_v2.role_names ren on ren.role_id=pp.role_id and ren.locale='en' and ren.is_preferred=true
left join atlas_v2.role_names rko on rko.role_id=pp.role_id and rko.locale='ko' and rko.is_preferred=true
join atlas_v2.period_bases pb on pb.id=pp.period_basis_id
left join atlas_v2.period_basis_names pben on pben.period_basis_id=pp.period_basis_id and pben.locale='en' and pben.is_preferred=true
left join atlas_v2.period_basis_names pbko on pbko.period_basis_id=pp.period_basis_id and pbko.locale='ko' and pbko.is_preferred=true
where pp.person_id=$1::uuid
order by pp.activity_start,pp.activity_end nulls last,pp.polity_id,pp.id`;

const PERSON_SOURCE_SQL = authoringRead.PERSON_SOURCE_SQL;

const ACTIVITY_SOURCE_SQL = `
select
  pp.id as person_politics_id,
  src->>'source_locator_key' as source_locator_key,
  src->>'source_type' as source_type,
  src->>'title' as title,
  nullif(src->>'canonical_url','') as canonical_url,
  src->>'citation_text' as citation_text
from atlas_v2.runtime_person_politics_v1 pp
cross join lateral jsonb_array_elements(coalesce(pp.provenance_snapshot->'normalized_sources','[]'::jsonb)) src
where pp.person_id=$1::uuid
order by pp.id,src->>'title',src->>'source_locator_key',src->>'source_id'`;

async function readPersons({ client }={}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const result=await client.query(PERSON_READ_SQL);
  const persons=(result.rows||[]).map(authoringRead.projectPerson).sort((left,right)=>{
    if (left.first_activity_year==null && right.first_activity_year!=null) return 1;
    if (left.first_activity_year!=null && right.first_activity_year==null) return -1;
    if (left.first_activity_year!=null && right.first_activity_year!=null && left.first_activity_year!==right.first_activity_year) return left.first_activity_year-right.first_activity_year;
    return String(left.display_name||left.canonical_name_en||left.id).localeCompare(String(right.display_name||right.canonical_name_en||right.id),"ko");
  });
  return Object.freeze({persons:Object.freeze(persons),summary:authoringRead.buildSummary(persons)});
}

async function readPersonDetail({ client, personId }={}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const personResult=await client.query(PERSON_DETAIL_SQL,[personId]);
  if (personResult.rowCount===0 || !(personResult.rows||[]).length) return null;
  const activityResult=await client.query(ACTIVITY_DETAIL_SQL,[personId]);
  const personSourceResult=await client.query(PERSON_SOURCE_SQL,[personId]);
  const activitySourceResult=await client.query(ACTIVITY_SOURCE_SQL,[personId]);
  const base=authoringRead.projectPerson(personResult.rows[0]);
  const activities=authoringRead.attachActivitySources(
    Object.freeze((activityResult.rows||[]).map(authoringRead.projectActivity)),
    activitySourceResult.rows||[]
  );
  const sources=Object.freeze((personSourceResult.rows||[]).map((row)=>authoringRead.projectSource(row)));
  return Object.freeze({...base,sources,activities});
}

module.exports=Object.freeze({
  PERSON_READ_SQL,PERSON_DETAIL_SQL,ACTIVITY_DETAIL_SQL,PERSON_SOURCE_SQL,ACTIVITY_SOURCE_SQL,
  readPersons,readPersonDetail
});
