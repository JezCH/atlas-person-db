-- P2-03B Brazil bounded, read-only Production audit.
-- Run against CONNECTED Production. NO writes, migrations, or implicit identity merges.
-- Do not treat authoring request names as verified Production Polity IDs.
-- Each SELECT is independent and uses only tables confirmed in db/schema/atlas_v2.current.sql.
BEGIN READ ONLY;

-- 1. Find all exact and relevant localized/alias names; preserve distinct UUIDs.
SELECT p.id AS polity_id, p.canonical_key, p.polity_type, p.historicity,
       n.locale, n.name, n.name_type, n.is_preferred
FROM atlas_v2.polities p
JOIN atlas_v2.polity_names n ON n.polity_id = p.id
WHERE p.id IN (
  SELECT polity_id FROM atlas_v2.polity_names
  WHERE name ILIKE '%Brazil%' OR name ILIKE '%Brasil%' OR name LIKE '%브라질%'
) OR p.canonical_key ILIKE '%brazil%' OR p.canonical_key ILIKE '%brasil%'
ORDER BY p.canonical_key, p.id, n.locale, n.name_type, n.name;

-- 2. Recheck connected Authoring cardinality and exact Activity UUIDs.
SELECT a.id AS activity_id, a.person_id, a.polity_id, p.canonical_key,
       a.role_id, a.period_basis_id, a.activity_start, a.activity_end,
       a.confidence, a.chronology_status, a.legacy_source_key,
       a.content_hash, a.notes
FROM atlas_v2.person_politics_v2 a
JOIN atlas_v2.polities p ON p.id = a.polity_id
WHERE a.polity_id IN (
  SELECT DISTINCT n.polity_id FROM atlas_v2.polity_names n
  WHERE n.name ILIKE '%Brazil%' OR n.name ILIKE '%Brasil%' OR n.name LIKE '%브라질%'
) OR p.canonical_key ILIKE '%brazil%' OR p.canonical_key ILIKE '%brasil%'
ORDER BY p.canonical_key, a.activity_start, a.activity_end, a.person_id, a.id;

-- 3. Count distinct actual persons and Activities by authoritative Polity ID.
SELECT a.polity_id, p.canonical_key, count(*) AS activity_count,
       count(DISTINCT a.person_id) AS person_count,
       min(a.activity_start) AS earliest_activity_start,
       max(a.activity_end) AS latest_activity_end
FROM atlas_v2.person_politics_v2 a
JOIN atlas_v2.polities p ON p.id = a.polity_id
WHERE a.polity_id IN (
  SELECT DISTINCT n.polity_id FROM atlas_v2.polity_names n
  WHERE n.name ILIKE '%Brazil%' OR n.name ILIKE '%Brasil%' OR n.name LIKE '%브라질%'
) OR p.canonical_key ILIKE '%brazil%' OR p.canonical_key ILIKE '%brasil%'
GROUP BY a.polity_id, p.canonical_key
ORDER BY p.canonical_key, a.polity_id;

-- 4. Discover current live designation/source/relation schemas rather than guessing columns.
SELECT table_name, column_name, data_type, ordinal_position
FROM information_schema.columns
WHERE table_schema = 'atlas_v2'
  AND (
    table_name LIKE 'polity_designation%'
    OR table_name LIKE 'polity_identity_relation%'
    OR table_name IN ('polity_sources', 'polity_relations',
                      'person_politics_sources', 'person_politics_source_links')
  )
ORDER BY table_name, ordinal_position;

-- 5. Global count and reproducible Activity fingerprint input per scoped Polity,
-- avoiding hidden date-precision or source mutation; export raw Activities before changes.
SELECT a.polity_id, p.canonical_key,
       md5(string_agg(
         a.id::text || ':' || a.person_id::text || ':' ||
         coalesce(a.role_id::text, 'NULL') || ':' || a.period_basis_id::text || ':' ||
         a.activity_start::text || ':' || a.activity_end::text || ':' ||
         coalesce(a.content_hash, 'NULL'),
         E'\n' ORDER BY a.id
       )) AS activity_scope_digest
FROM atlas_v2.person_politics_v2 a
JOIN atlas_v2.polities p ON p.id=a.polity_id
WHERE a.polity_id IN (
  SELECT DISTINCT n.polity_id FROM atlas_v2.polity_names n
  WHERE n.name ILIKE '%Brazil%' OR n.name ILIKE '%Brasil%' OR n.name LIKE '%브라질%'
) OR p.canonical_key ILIKE '%brazil%' OR p.canonical_key ILIKE '%brasil%'
GROUP BY a.polity_id,p.canonical_key
ORDER BY p.canonical_key;

COMMIT;
