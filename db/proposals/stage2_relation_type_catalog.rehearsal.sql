-- ATLAS Stage 2 reviewed Relation Type UUID catalog — REHEARSAL ONLY
-- Exact UUIDs are identity. Codes are semantic labels and must not substitute
-- for UUID binding in Correction v2 execution manifests.
-- Do not apply to Production from this proposal.

BEGIN;

INSERT INTO atlas_v2.person_polity_relation_types(id,code,category,is_active) VALUES
  ('7ca4de8f-01d4-542c-acc1-a06848c6742c','rules','authority',true),
  ('67a57b37-1853-5f2a-b7ab-e6b2d32b56b6','governs','authority',true),
  ('0fc4827f-8543-52f7-9e9a-3173b0c698a7','serves','service',true),
  ('f33d2789-2e65-50c1-af3e-91335bcbd3ca','active_in','activity',true),
  ('5d2d3af6-6e53-5af1-8423-f76c2263afe4','opposes','conflict',true),
  ('fcc652d6-8cf5-5348-9375-60b35f6e0b8c','claims_rule','claim',true);

INSERT INTO atlas_v2.polity_relation_types(id,code,category,is_active) VALUES
  ('b4982965-848a-5a2b-b690-daba1d092d02','vassal_of','dependency',true),
  ('375da950-65bc-5b81-a338-6c705f515120','nominally_subordinate_to','dependency',true),
  ('c56b821b-8b21-580b-b40d-c5c87e5b26d9','dominion_of','dependency',true),
  ('def2c060-302b-5dc7-be8c-28e8bbe3ebfb','constituent_of','constitutional_membership',true),
  ('4b67c9db-aafb-50e1-ae05-141e4d4e8e30','colonial_dependency_of','dependency',true);

COMMIT;
