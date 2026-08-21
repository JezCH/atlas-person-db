BEGIN;

CREATE OR REPLACE FUNCTION atlas_v2.project_authoring_namuwiki_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ref jsonb;
  ref_status text;
  ref_checked_at date;
  ref_document_title text;
  ref_url text;
BEGIN
  IF NEW.person_id IS NULL OR NEW.result_snapshot IS NULL THEN
    RETURN NEW;
  END IF;

  ref := NEW.result_snapshot->'external_references'->'namuwiki';
  IF jsonb_typeof(ref) <> 'object' THEN
    RETURN NEW;
  END IF;

  ref_status := ref->>'status';
  IF ref_status NOT IN ('linked', 'not_found') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(ref->>'checked_at', '') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN NEW;
  END IF;
  ref_checked_at := (ref->>'checked_at')::date;

  IF ref_status = 'linked' THEN
    ref_document_title := NULLIF(btrim(ref->>'document_title'), '');
    ref_url := NULLIF(btrim(ref->>'url'), '');
    IF ref_document_title IS NULL OR ref_url IS NULL THEN
      RETURN NEW;
    END IF;
  ELSE
    ref_document_title := NULL;
    ref_url := NULL;
  END IF;

  INSERT INTO atlas_v2.person_external_references(
    person_id,
    provider,
    status,
    checked_at,
    document_title,
    url
  ) VALUES (
    NEW.person_id,
    'namuwiki',
    ref_status,
    ref_checked_at,
    ref_document_title,
    ref_url
  )
  ON CONFLICT (person_id, provider) DO UPDATE
  SET status = EXCLUDED.status,
      checked_at = EXCLUDED.checked_at,
      document_title = EXCLUDED.document_title,
      url = EXCLUDED.url,
      updated_at = now()
  WHERE EXCLUDED.checked_at > atlas_v2.person_external_references.checked_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS authoring_manifest_runs_project_namuwiki
  ON atlas_v2.authoring_manifest_runs;

CREATE TRIGGER authoring_manifest_runs_project_namuwiki
AFTER INSERT ON atlas_v2.authoring_manifest_runs
FOR EACH ROW
EXECUTE FUNCTION atlas_v2.project_authoring_namuwiki_reference();

-- Backfill reviewed authoring decisions that were committed after the normalized
-- Person-reference table was introduced but before ledger projection existed.
WITH latest_namuwiki AS (
  SELECT DISTINCT ON (amr.person_id)
    amr.person_id,
    amr.result_snapshot->'external_references'->'namuwiki' AS ref
  FROM atlas_v2.authoring_manifest_runs amr
  WHERE amr.person_id IS NOT NULL
    AND jsonb_typeof(amr.result_snapshot->'external_references'->'namuwiki') = 'object'
    AND (amr.result_snapshot->'external_references'->'namuwiki'->>'status') IN ('linked', 'not_found')
  ORDER BY amr.person_id, amr.applied_at DESC, amr.request_id DESC
), valid_namuwiki AS (
  SELECT
    person_id,
    ref->>'status' AS status,
    (ref->>'checked_at')::date AS checked_at,
    CASE WHEN ref->>'status' = 'linked' THEN NULLIF(btrim(ref->>'document_title'), '') ELSE NULL END AS document_title,
    CASE WHEN ref->>'status' = 'linked' THEN NULLIF(btrim(ref->>'url'), '') ELSE NULL END AS url
  FROM latest_namuwiki
  WHERE COALESCE(ref->>'checked_at', '') ~ '^\d{4}-\d{2}-\d{2}$'
)
INSERT INTO atlas_v2.person_external_references(
  person_id,
  provider,
  status,
  checked_at,
  document_title,
  url
)
SELECT
  person_id,
  'namuwiki',
  status,
  checked_at,
  document_title,
  url
FROM valid_namuwiki
WHERE status = 'not_found'
   OR (status = 'linked' AND document_title IS NOT NULL AND url IS NOT NULL)
ON CONFLICT (person_id, provider) DO UPDATE
SET status = EXCLUDED.status,
    checked_at = EXCLUDED.checked_at,
    document_title = EXCLUDED.document_title,
    url = EXCLUDED.url,
    updated_at = now()
WHERE EXCLUDED.checked_at > atlas_v2.person_external_references.checked_at;

COMMIT;
