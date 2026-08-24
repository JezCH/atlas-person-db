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

-- Deliberately no blanket data rewrite here. Legacy `opposes` rows are not
-- semantically uniform: some store an actual opponent polity, while others
-- use the person's own territorial polity and mean opposition to its regime.
-- Existing rows must therefore be moved/relinked by reviewed, identity-bound
-- correction operations rather than by relation-code-only migration.

COMMIT;
