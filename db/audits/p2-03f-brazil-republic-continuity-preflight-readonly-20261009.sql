-- POLITY-P2-03F: Brazil exact-identity candidate preflight, REVIEW ONLY.
-- Connected Production execution requires separate authorization.
-- Every statement is a SELECT within a repeatable-read READ ONLY transaction.
-- The result is evidence, not a correction manifest, approval or merge instruction.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- A. Exact 10-Activity preconditions: every expected UUID and its original polity/years.
WITH expected(activity_id,polity_id,year_start,year_end) AS (
  VALUES
  ('538c90ab-8752-471c-98be-9b388f6c8d9f'::uuid,'efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,1822,1831),
  ('ae9b7ba9-4c62-508b-b019-2ded901413bc'::uuid,'efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,1840,1889),
  ('7a021719-8a81-4367-9fd1-64e75f996563'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,1906,1909),
  ('e82ebfff-537e-43e0-b1f6-452c1b7cb27c'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1930,1934),
  ('b1f52253-fcbf-4ba4-a061-37491658bf38'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1934,1945),
  ('ed7c3548-8dd4-479e-94e4-c6a382264a2d'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1951,1954),
  ('db3aa305-ff94-460b-a88d-2ed044a4f638'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1961,1964),
  ('fbd5f4db-fcd1-4782-9b71-56fae2e1e2b7'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1969,1974),
  ('21feba6a-db22-4ce2-a51e-fdd65f2ca2dd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1992,1992),
  ('52a26a9a-110e-413b-b516-960413cc39e4'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid,1992,1995)
)
SELECT e.activity_id::text AS expected_activity_id,
       e.polity_id::text AS expected_polity_id,
       e.year_start AS expected_start_year,e.year_end AS expected_end_year,
       a.polity_id::text AS observed_polity_id,
       a.activity_start AS observed_start_year,a.activity_end AS observed_end_year,
       (a.id IS NOT NULL AND a.polity_id=e.polity_id
        AND a.activity_start=e.year_start AND a.activity_end=e.year_end) AS exact_year_polity_guard_ok,
       to_jsonb(a) AS observed_full_activity_row
FROM expected e
LEFT JOIN atlas_v2.person_politics_v2 a ON a.id=e.activity_id
ORDER BY e.activity_id;

-- B. Newly introduced/extra scoped Activities must also be noticed (never silently ignored).
WITH expected(activity_id) AS (
  VALUES
  ('538c90ab-8752-471c-98be-9b388f6c8d9f'::uuid),
  ('ae9b7ba9-4c62-508b-b019-2ded901413bc'::uuid),
  ('7a021719-8a81-4367-9fd1-64e75f996563'::uuid),
  ('e82ebfff-537e-43e0-b1f6-452c1b7cb27c'::uuid),
  ('b1f52253-fcbf-4ba4-a061-37491658bf38'::uuid),
  ('ed7c3548-8dd4-479e-94e4-c6a382264a2d'::uuid),
  ('db3aa305-ff94-460b-a88d-2ed044a4f638'::uuid),
  ('fbd5f4db-fcd1-4782-9b71-56fae2e1e2b7'::uuid),
  ('21feba6a-db22-4ce2-a51e-fdd65f2ca2dd'::uuid),
  ('52a26a9a-110e-413b-b516-960413cc39e4'::uuid)
)
SELECT a.id::text AS extra_activity_id,a.polity_id::text AS polity_id,
       a.activity_start,a.activity_end,to_jsonb(a) AS actual_row
FROM atlas_v2.person_politics_v2 a
WHERE a.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
  AND NOT EXISTS (SELECT 1 FROM expected e WHERE e.activity_id=a.id)
ORDER BY a.id;

-- C. Full raw scoped Activities and normalized person-source links for equality checks.
SELECT a.polity_id::text AS polity_id,a.id::text AS activity_id,
       md5(to_jsonb(a)::text) AS activity_row_digest,to_jsonb(a) AS activity_row
FROM atlas_v2.person_politics_v2 a
WHERE a.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
ORDER BY a.polity_id::text,a.id;
SELECT a.polity_id::text AS polity_id,ps.person_politics_id::text AS activity_id,
       ps.source_id::text AS source_id,ps.source_locator_key,
       s.source_key,s.source_type,s.title,s.canonical_url,s.citation_text
FROM atlas_v2.person_politics_sources ps
JOIN atlas_v2.person_politics_v2 a ON a.id=ps.person_politics_id
JOIN atlas_v2.sources s ON s.id=ps.source_id
WHERE a.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
ORDER BY a.id,ps.source_id::text,ps.source_locator_key;

-- D. Scoped authoritative identities, aliases, direct primary provenance, descriptions.
SELECT p.id::text AS polity_id,to_jsonb(p) AS polity,
       (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id::text)
          FROM atlas_v2.polity_names n WHERE n.polity_id=p.id) AS names,
       (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id::text)
          FROM atlas_v2.polity_descriptions d WHERE d.polity_id=p.id) AS descriptions
FROM atlas_v2.polities p WHERE p.id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) ORDER BY p.id;
SELECT ps.polity_id::text AS polity_id,ps.source_id::text AS source_id,
       s.source_key,s.source_type,s.title,s.canonical_url,s.citation_text
FROM atlas_v2.polity_sources ps JOIN atlas_v2.sources s ON s.id=ps.source_id
WHERE ps.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) ORDER BY ps.polity_id,ps.source_id;

-- E. Do not assume temporal name intervals or relations; inspect all actual linked rows.
SELECT pd.polity_id::text AS polity_id,to_jsonb(pd) AS designation,
       (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id::text)
          FROM atlas_v2.polity_designation_names n WHERE n.polity_designation_id=pd.id) AS names,
       (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.source_id::text)
          FROM atlas_v2.polity_designation_sources l WHERE l.polity_designation_id=pd.id) AS source_links
FROM atlas_v2.polity_designations pd WHERE pd.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) ORDER BY pd.id;
SELECT to_jsonb(pir) AS identity_relation,
       rt.code AS relation_type,
       (SELECT jsonb_agg(to_jsonb(l) ORDER BY l.source_id::text)
          FROM atlas_v2.polity_identity_relation_sources l WHERE l.polity_identity_relation_id=pir.id) AS source_links
FROM atlas_v2.polity_identity_relations pir
JOIN atlas_v2.polity_identity_relation_types rt ON rt.id=pir.relation_type_id
WHERE pir.predecessor_polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) OR pir.successor_polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
ORDER BY pir.id;
SELECT to_jsonb(gp) AS governance_period
FROM atlas_v2.polity_governance_periods gp WHERE gp.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) ORDER BY gp.id;

-- F. Existing retired-polity redirects or other consumers can block safe realignment.
SELECT to_jsonb(r) AS polity_retirement
FROM atlas_v2.polity_identity_retirements r
WHERE r.retired_polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid) OR r.survivor_polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
ORDER BY r.retired_polity_id;

-- G. Runtime copies (full rows) and scoped reference-count digest.
SELECT r.polity_id::text AS polity_id,to_jsonb(r) AS runtime_activity_row
FROM atlas_v2.runtime_person_politics_v1 r
WHERE r.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
ORDER BY r.polity_id,r.id;
SELECT a.polity_id::text AS polity_id,COUNT(*)::int AS authoring_rows,
       md5(coalesce(string_agg(to_jsonb(a)::text,'|' ORDER BY a.id::text),'')) AS authoring_digest
FROM atlas_v2.person_politics_v2 a WHERE a.polity_id IN ('efcd0f70-bffe-5464-86e3-b28b3658404b'::uuid,'750bf6be-49e9-4215-95ff-a356ba1831cd'::uuid,'a8b27d54-b180-4d51-a664-dd40b3eed08f'::uuid)
GROUP BY a.polity_id ORDER BY a.polity_id;

-- H. Schema read to catch other polity link surfaces before any proposed re-link.
SELECT c.table_name,c.column_name,c.data_type
FROM information_schema.columns c
WHERE c.table_schema='atlas_v2'
  AND (c.column_name IN ('polity_id','predecessor_polity_id','successor_polity_id',
                          'retired_polity_id','survivor_polity_id'))
ORDER BY c.table_name,c.column_name;

-- I. Primary-source catalog collision/existence check by literal official URLs.
SELECT id::text,source_key,source_type,title,canonical_url,citation_text
FROM atlas_v2.sources
WHERE canonical_url IN (
  'https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-1-15-novembro-1889-532625-publicacaooriginal-14906-pe.html',
  'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao91.htm',
  'https://legis.senado.gov.br/norma/579492/publicacao/15675026',
  'https://www2.camara.leg.br/legin/fed/consti/1960-1969/constituicao-1967-24-janeiro-1967-365194-publicacaooriginal-1-pl.html',
  'https://www2.camara.leg.br/legin/fed/emecon/1960-1969/emendaconstitucional-1-17-outubro-1969-364989-publicacaooriginal-1-pl.html',
  'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm'
)
ORDER BY canonical_url,source_key,id;

COMMIT;
