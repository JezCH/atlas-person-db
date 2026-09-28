-- CORE v2 Unit 4: durable Polity retirement / redirect registry.
--
-- This registry is the canonical no-resurrection surface. retired_polity_id is
-- intentionally not a foreign key to atlas_v2.polities because the source row
-- is deleted by retirement. survivor_polity_id remains a live canonical Polity
-- reference when a reviewed same-identity merge has an explicit survivor.

CREATE TABLE IF NOT EXISTS atlas_v2.polity_identity_retirements (
  retired_polity_id uuid PRIMARY KEY,
  survivor_polity_id uuid NULL,
  canonical_key text NOT NULL CHECK (btrim(canonical_key) <> ''),
  polity_type text NOT NULL CHECK (btrim(polity_type) <> ''),
  historicity text NOT NULL CHECK (btrim(historicity) <> ''),
  review_reason text NOT NULL CHECK (btrim(review_reason) <> ''),
  source_request_id text NOT NULL CHECK (btrim(source_request_id) <> ''),
  source_case_id text NOT NULL CHECK (btrim(source_case_id) <> ''),
  retired_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT polity_identity_retirements_not_self
    CHECK (survivor_polity_id IS NULL OR survivor_polity_id <> retired_polity_id),
  CONSTRAINT polity_identity_retirements_survivor_fkey
    FOREIGN KEY (survivor_polity_id)
    REFERENCES atlas_v2.polities(id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_polity_identity_retirements_canonical_key
  ON atlas_v2.polity_identity_retirements(canonical_key);

CREATE INDEX IF NOT EXISTS idx_polity_identity_retirements_survivor
  ON atlas_v2.polity_identity_retirements(survivor_polity_id)
  WHERE survivor_polity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS atlas_v2.polity_identity_retirement_names (
  retired_polity_id uuid NOT NULL
    REFERENCES atlas_v2.polity_identity_retirements(retired_polity_id)
    ON DELETE CASCADE,
  locale text NOT NULL CHECK (btrim(locale) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  is_preferred boolean NOT NULL DEFAULT false,
  PRIMARY KEY (retired_polity_id, locale, name)
);

CREATE INDEX IF NOT EXISTS idx_polity_identity_retirement_names_lookup
  ON atlas_v2.polity_identity_retirement_names(locale, name);

-- Backfill all historical governed Polity retirements that predate this
-- canonical registry. Historical snapshots did not encode a survivor UUID, so
-- they become durable tombstones (survivor_polity_id = NULL). New reviewed
-- retirements may write an explicit survivor redirect transactionally.
DO $$
BEGIN
  IF to_regclass('atlas_v2.correction_manifest_runs') IS NOT NULL THEN
    EXECUTE $backfill$
      WITH retired AS (
        SELECT
          cmr.request_id,
          cmr.applied_at,
          op,
          lower(op->'removed_polity'->>'id')::uuid AS retired_polity_id
        FROM atlas_v2.correction_manifest_runs cmr
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(cmr.result_snapshot->'operations') = 'array'
              THEN cmr.result_snapshot->'operations'
            ELSE '[]'::jsonb
          END
        ) op
        WHERE cmr.result_snapshot->>'schema' = 'atlas-correction-polity-retirement/v1'
          AND (op->'removed_polity'->>'id') IS NOT NULL
      )
      INSERT INTO atlas_v2.polity_identity_retirements(
        retired_polity_id,
        survivor_polity_id,
        canonical_key,
        polity_type,
        historicity,
        review_reason,
        source_request_id,
        source_case_id,
        retired_at
      )
      SELECT
        retired_polity_id,
        NULL::uuid,
        op->'removed_polity'->>'canonical_key',
        op->'removed_polity'->>'polity_type',
        op->'removed_polity'->>'historicity',
        COALESCE(NULLIF(op->>'review_reason',''), 'LEGACY_CORRECTION_RETIREMENT_BACKFILL'),
        request_id,
        COALESCE(NULLIF(op->>'case_id',''), 'legacy-retirement:' || retired_polity_id::text),
        applied_at
      FROM retired
      WHERE COALESCE(op->'removed_polity'->>'canonical_key','') <> ''
        AND COALESCE(op->'removed_polity'->>'polity_type','') <> ''
        AND COALESCE(op->'removed_polity'->>'historicity','') <> ''
      ON CONFLICT (retired_polity_id) DO NOTHING
    $backfill$;

    EXECUTE $backfill_names$
      WITH retired AS (
        SELECT
          lower(op->'removed_polity'->>'id')::uuid AS retired_polity_id,
          op
        FROM atlas_v2.correction_manifest_runs cmr
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(cmr.result_snapshot->'operations') = 'array'
              THEN cmr.result_snapshot->'operations'
            ELSE '[]'::jsonb
          END
        ) op
        WHERE cmr.result_snapshot->>'schema' = 'atlas-correction-polity-retirement/v1'
          AND (op->'removed_polity'->>'id') IS NOT NULL
      ),
      names AS (
        SELECT
          retired.retired_polity_id,
          n->>'locale' AS locale,
          n->>'name' AS name,
          COALESCE((n->>'is_preferred')::boolean, false) AS is_preferred
        FROM retired
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(retired.op->'preferred_names') = 'array'
              THEN retired.op->'preferred_names'
            ELSE '[]'::jsonb
          END
        ) n
      )
      INSERT INTO atlas_v2.polity_identity_retirement_names(
        retired_polity_id,
        locale,
        name,
        is_preferred
      )
      SELECT retired_polity_id, locale, name, is_preferred
      FROM names
      WHERE COALESCE(locale,'') <> ''
        AND COALESCE(name,'') <> ''
        AND EXISTS (
          SELECT 1
          FROM atlas_v2.polity_identity_retirements r
          WHERE r.retired_polity_id = names.retired_polity_id
        )
      ON CONFLICT (retired_polity_id, locale, name) DO NOTHING
    $backfill_names$;
  END IF;
END
$$;
