BEGIN;

ALTER TABLE atlas_v2.person_politics_v2
  ALTER COLUMN polity_id DROP NOT NULL,
  ALTER COLUMN relation_type_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS atlas_v2.person_politics_context_polities (
  person_politics_id uuid NOT NULL,
  polity_id uuid NOT NULL,
  relation_type_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_politics_context_polities_pkey
    PRIMARY KEY (person_politics_id, polity_id, relation_type_id),
  CONSTRAINT person_politics_context_polities_activity_fkey
    FOREIGN KEY (person_politics_id)
    REFERENCES atlas_v2.person_politics_v2(id)
    ON DELETE CASCADE,
  CONSTRAINT person_politics_context_polities_polity_fkey
    FOREIGN KEY (polity_id)
    REFERENCES atlas_v2.polities(id),
  CONSTRAINT person_politics_context_polities_relation_type_fkey
    FOREIGN KEY (relation_type_id)
    REFERENCES atlas_v2.person_polity_relation_types(id)
);

CREATE INDEX IF NOT EXISTS idx_person_politics_context_polities_polity
  ON atlas_v2.person_politics_context_polities(polity_id, person_politics_id);

CREATE INDEX IF NOT EXISTS idx_person_politics_context_polities_relation
  ON atlas_v2.person_politics_context_polities(relation_type_id, person_politics_id);

-- A conflict target is context, not the person's own polity. Preserve every
-- existing `opposes` binding in the dedicated context table before clearing
-- the primary Person→Polity slot. The Activity, chronology, role, notes and
-- provenance remain on person_politics_v2 unchanged.
INSERT INTO atlas_v2.person_politics_context_polities(
  person_politics_id,
  polity_id,
  relation_type_id
)
SELECT pp.id, pp.polity_id, pp.relation_type_id
  FROM atlas_v2.person_politics_v2 pp
  JOIN atlas_v2.person_polity_relation_types rt
    ON rt.id = pp.relation_type_id
 WHERE rt.code = 'opposes'
   AND pp.polity_id IS NOT NULL
ON CONFLICT (person_politics_id, polity_id, relation_type_id) DO NOTHING;

UPDATE atlas_v2.person_politics_v2 pp
   SET polity_id = NULL,
       relation_type_id = NULL
  FROM atlas_v2.person_polity_relation_types rt
 WHERE rt.id = pp.relation_type_id
   AND rt.code = 'opposes'
   AND pp.polity_id IS NOT NULL;

COMMIT;
