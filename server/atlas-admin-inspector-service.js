"use strict";

const SUPPORTED_KINDS = Object.freeze([
  "person",
  "activity",
  "polity",
  "role",
  "period_basis",
  "relation_type",
  "source"
]);

const PERSON_INSPECT_SQL = `
select
  p.id,
  p.canonical_key,
  p.person_type,
  p.historicity,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pn.id,
      'locale', pn.locale,
      'name', pn.name,
      'name_type', pn.name_type,
      'is_preferred', pn.is_preferred
    ) order by pn.is_preferred desc, pn.locale, pn.name_type, pn.name, pn.id)
    from atlas_v2.person_names pn
    where pn.person_id = p.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'locale', pd.locale,
      'content', pd.content
    ) order by pd.locale, pd.id)
    from atlas_v2.person_descriptions pd
    where pd.person_id = p.id
  ), '[]'::jsonb) as descriptions,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'source_key', s.source_key,
      'source_type', s.source_type,
      'title', s.title,
      'canonical_url', s.canonical_url,
      'citation_text', s.citation_text,
      'sha256', s.sha256,
      'bytes', s.bytes
    ) order by s.source_key, s.id)
    from atlas_v2.person_sources ps
    join atlas_v2.sources s on s.id = ps.source_id
    where ps.person_id = p.id
  ), '[]'::jsonb) as sources,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pp.id,
      'polity_id', pp.polity_id,
      'relation_type_id', pp.relation_type_id,
      'role_id', pp.role_id,
      'period_basis_id', pp.period_basis_id,
      'activity_start', pp.activity_start,
      'activity_start_month', pp.activity_start_month,
      'activity_start_day', pp.activity_start_day,
      'activity_start_granularity', pp.activity_start_granularity,
      'activity_start_certainty', pp.activity_start_certainty,
      'activity_start_calendar', pp.activity_start_calendar,
      'activity_end', pp.activity_end,
      'activity_end_month', pp.activity_end_month,
      'activity_end_day', pp.activity_end_day,
      'activity_end_granularity', pp.activity_end_granularity,
      'activity_end_certainty', pp.activity_end_certainty,
      'activity_end_calendar', pp.activity_end_calendar,
      'confidence', pp.confidence,
      'chronology_status', pp.chronology_status
    ) order by pp.activity_start, pp.activity_end, pp.id)
    from atlas_v2.person_politics_v2 pp
    where pp.person_id = p.id
  ), '[]'::jsonb) as activities
from atlas_v2.persons p
where p.id = $1::uuid
limit 1
`;

const ACTIVITY_INSPECT_SQL = `
select
  pp.id,
  pp.person_id,
  pp.polity_id,
  pp.relation_type_id,
  pp.role_id,
  pp.period_basis_id,
  pp.activity_start,
  pp.activity_start_month,
  pp.activity_start_day,
  pp.activity_start_granularity,
  pp.activity_start_certainty,
  pp.activity_start_calendar,
  pp.activity_end,
  pp.activity_end_month,
  pp.activity_end_day,
  pp.activity_end_granularity,
  pp.activity_end_certainty,
  pp.activity_end_calendar,
  pp.confidence,
  pp.chronology_status,
  pp.legacy_source_key,
  pp.notes,
  pp.source_locator,
  pp.content_hash,
  jsonb_build_object(
    'id', p.id,
    'canonical_key', p.canonical_key,
    'person_type', p.person_type,
    'historicity', p.historicity
  ) as person,
  jsonb_build_object(
    'id', po.id,
    'canonical_key', po.canonical_key,
    'polity_type', po.polity_type,
    'historicity', po.historicity
  ) as polity,
  jsonb_build_object(
    'id', prt.id,
    'code', prt.code,
    'category', prt.category,
    'is_active', prt.is_active
  ) as relation_type,
  case when r.id is null then null else jsonb_build_object(
    'id', r.id,
    'code', r.code,
    'category', r.category,
    'source_label', r.source_label,
    'is_active', r.is_active
  ) end as role,
  jsonb_build_object(
    'id', pb.id,
    'code', pb.code,
    'is_active', pb.is_active
  ) as period_basis,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'source_id', s.id,
      'source_key', s.source_key,
      'source_type', s.source_type,
      'title', s.title,
      'canonical_url', s.canonical_url,
      'citation_text', s.citation_text,
      'sha256', s.sha256,
      'bytes', s.bytes,
      'source_locator_key', pps.source_locator_key
    ) order by s.source_key, pps.source_locator_key, s.id)
    from atlas_v2.person_politics_sources pps
    join atlas_v2.sources s on s.id = pps.source_id
    where pps.person_politics_id = pp.id
  ), '[]'::jsonb) as sources,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', cc.id,
      'claim_type', cc.claim_type,
      'start_year', cc.start_year,
      'end_year', cc.end_year
    ) order by cc.claim_type, cc.id)
    from atlas_v2.chronology_claims cc
    where cc.person_politics_id = pp.id
  ), '[]'::jsonb) as chronology_claims,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', rd.id,
      'locale', rd.locale,
      'content', rd.content
    ) order by rd.locale, rd.id)
    from atlas_v2.relationship_descriptions rd
    where rd.person_politics_id = pp.id
  ), '[]'::jsonb) as descriptions
from atlas_v2.person_politics_v2 pp
join atlas_v2.persons p on p.id = pp.person_id
join atlas_v2.polities po on po.id = pp.polity_id
join atlas_v2.person_polity_relation_types prt on prt.id = pp.relation_type_id
left join atlas_v2.roles r on r.id = pp.role_id
join atlas_v2.period_bases pb on pb.id = pp.period_basis_id
where pp.id = $1::uuid
limit 1
`;

const POLITY_INSPECT_SQL = `
select
  p.id,
  p.canonical_key,
  p.polity_type,
  p.historicity,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pn.id,
      'locale', pn.locale,
      'name', pn.name,
      'name_type', pn.name_type,
      'is_preferred', pn.is_preferred
    ) order by pn.is_preferred desc, pn.locale, pn.name_type, pn.name, pn.id)
    from atlas_v2.polity_names pn
    where pn.polity_id = p.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pd.id,
      'locale', pd.locale,
      'content', pd.content
    ) order by pd.locale, pd.id)
    from atlas_v2.polity_descriptions pd
    where pd.polity_id = p.id
  ), '[]'::jsonb) as descriptions,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id,
      'source_key', s.source_key,
      'source_type', s.source_type,
      'title', s.title,
      'canonical_url', s.canonical_url,
      'citation_text', s.citation_text,
      'sha256', s.sha256,
      'bytes', s.bytes
    ) order by s.source_key, s.id)
    from atlas_v2.polity_sources ps
    join atlas_v2.sources s on s.id = ps.source_id
    where ps.polity_id = p.id
  ), '[]'::jsonb) as sources,
  coalesce((
    select jsonb_agg(pp.id order by pp.activity_start, pp.activity_end, pp.id)
    from atlas_v2.person_politics_v2 pp
    where pp.polity_id = p.id
  ), '[]'::jsonb) as activity_ids
from atlas_v2.polities p
where p.id = $1::uuid
limit 1
`;

const ROLE_INSPECT_SQL = `
select
  r.id,
  r.code,
  r.category,
  r.source_label,
  r.is_active,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', rn.id,
      'locale', rn.locale,
      'name', rn.name,
      'is_preferred', rn.is_preferred
    ) order by rn.is_preferred desc, rn.locale, rn.name, rn.id)
    from atlas_v2.role_names rn
    where rn.role_id = r.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(pp.id order by pp.activity_start, pp.activity_end, pp.id)
    from atlas_v2.person_politics_v2 pp
    where pp.role_id = r.id
  ), '[]'::jsonb) as activity_ids
from atlas_v2.roles r
where r.id = $1::uuid
limit 1
`;

const PERIOD_BASIS_INSPECT_SQL = `
select
  pb.id,
  pb.code,
  pb.is_active,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pbn.id,
      'locale', pbn.locale,
      'name', pbn.name,
      'is_preferred', pbn.is_preferred
    ) order by pbn.is_preferred desc, pbn.locale, pbn.name, pbn.id)
    from atlas_v2.period_basis_names pbn
    where pbn.period_basis_id = pb.id
  ), '[]'::jsonb) as names,
  coalesce((
    select jsonb_agg(pp.id order by pp.activity_start, pp.activity_end, pp.id)
    from atlas_v2.person_politics_v2 pp
    where pp.period_basis_id = pb.id
  ), '[]'::jsonb) as activity_ids
from atlas_v2.period_bases pb
where pb.id = $1::uuid
limit 1
`;

const RELATION_TYPE_INSPECT_SQL = `
select
  rt.id,
  rt.code,
  rt.category,
  rt.is_active,
  coalesce((
    select jsonb_agg(pp.id order by pp.activity_start, pp.activity_end, pp.id)
    from atlas_v2.person_politics_v2 pp
    where pp.relation_type_id = rt.id
  ), '[]'::jsonb) as activity_ids
from atlas_v2.person_polity_relation_types rt
where rt.id = $1::uuid
limit 1
`;

const SOURCE_INSPECT_SQL = `
select
  s.id,
  s.source_key,
  s.source_type,
  s.title,
  s.canonical_url,
  s.citation_text,
  s.sha256,
  s.bytes,
  coalesce((
    select jsonb_agg(ps.person_id order by ps.person_id)
    from atlas_v2.person_sources ps
    where ps.source_id = s.id
  ), '[]'::jsonb) as person_ids,
  coalesce((
    select jsonb_agg(ps.polity_id order by ps.polity_id)
    from atlas_v2.polity_sources ps
    where ps.source_id = s.id
  ), '[]'::jsonb) as polity_ids,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'activity_id', pps.person_politics_id,
      'source_locator_key', pps.source_locator_key
    ) order by pps.person_politics_id, pps.source_locator_key)
    from atlas_v2.person_politics_sources pps
    where pps.source_id = s.id
  ), '[]'::jsonb) as activity_links
from atlas_v2.sources s
where s.id = $1::uuid
limit 1
`;

const SQL_BY_KIND = Object.freeze({
  person: PERSON_INSPECT_SQL,
  activity: ACTIVITY_INSPECT_SQL,
  polity: POLITY_INSPECT_SQL,
  role: ROLE_INSPECT_SQL,
  period_basis: PERIOD_BASIS_INSPECT_SQL,
  relation_type: RELATION_TYPE_INSPECT_SQL,
  source: SOURCE_INSPECT_SQL
});

async function readAdminObject({ client, kind, id } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const sql = SQL_BY_KIND[kind];
  if (!sql) throw new Error("ADMIN_INSPECTOR_KIND_UNSUPPORTED");
  const result = await client.query(sql, [id]);
  if (result.rowCount === 0 || !(result.rows || []).length) return null;
  return Object.freeze({ kind, object: Object.freeze(result.rows[0]) });
}

module.exports = Object.freeze({
  SUPPORTED_KINDS,
  SQL_BY_KIND,
  PERSON_INSPECT_SQL,
  ACTIVITY_INSPECT_SQL,
  POLITY_INSPECT_SQL,
  ROLE_INSPECT_SQL,
  PERIOD_BASIS_INSPECT_SQL,
  RELATION_TYPE_INSPECT_SQL,
  SOURCE_INSPECT_SQL,
  readAdminObject
});
