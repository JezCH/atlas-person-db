-- ATLAS Stage 2 native Activity provenance compatibility — REHEARSAL ONLY
--
-- Current Baseline A Activities all came from legacy import records and therefore
-- carry a non-null unique legacy_source_key. Correction v2 can create genuinely
-- new Activity fragments. Those rows must preserve/copy normalized Source links,
-- but they do not have a truthful legacy import source key.
--
-- Fabricating a legacy_source_key for a Stage 2-native fragment would turn a
-- technical compatibility column into false provenance. The safe transition is
-- to make the legacy key nullable while retaining the existing UNIQUE constraint:
-- existing imported rows keep their exact values, while new normalized rows use
-- NULL and rely on normalized Source links plus Correction v2 audit evidence.
--
-- This is a backward-compatible constraint relaxation. It does not mutate any
-- Activity row and is not registered as a standalone Production mutation path.

BEGIN;

ALTER TABLE atlas_v2.person_politics_v2
  ALTER COLUMN legacy_source_key DROP NOT NULL;

ALTER TABLE atlas_v2.person_politics_v2
  ADD CONSTRAINT person_politics_v2_legacy_source_key_nonblank_check
  CHECK (legacy_source_key IS NULL OR length(btrim(legacy_source_key)) > 0);

COMMIT;
