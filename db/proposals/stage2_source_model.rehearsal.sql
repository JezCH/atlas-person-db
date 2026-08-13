-- ATLAS Stage 2 Source model extension — REHEARSAL ONLY
--
-- Current Baseline A sources are materialized repository datasets and require
-- sha256/bytes. Stage 2 also needs normalized bibliographic references for
-- reviewed historical assertions. Those references must never receive fake
-- content hashes or byte counts merely to satisfy the legacy ingestion shape.
--
-- This is not registered in any Production migration runner.

BEGIN;

ALTER TABLE atlas_v2.sources
  ADD COLUMN canonical_url text,
  ADD COLUMN citation_text text;

ALTER TABLE atlas_v2.sources ALTER COLUMN sha256 DROP NOT NULL;
ALTER TABLE atlas_v2.sources ALTER COLUMN bytes DROP NOT NULL;

ALTER TABLE atlas_v2.sources
  ADD CONSTRAINT sources_content_materialization_pair_check
    CHECK ((sha256 IS NULL) = (bytes IS NULL)),
  ADD CONSTRAINT sources_bytes_nonnegative_check
    CHECK (bytes IS NULL OR bytes >= 0),
  ADD CONSTRAINT sources_canonical_url_nonblank_check
    CHECK (canonical_url IS NULL OR length(btrim(canonical_url)) > 0),
  ADD CONSTRAINT sources_citation_text_nonblank_check
    CHECK (citation_text IS NULL OR length(btrim(citation_text)) > 0),
  ADD CONSTRAINT sources_evidence_identity_material_check
    CHECK (
      sha256 IS NOT NULL
      OR canonical_url IS NOT NULL
      OR citation_text IS NOT NULL
    );

COMMIT;
