-- USER-QUEUE07-20261006
-- User-selected registration queue additions. Replay-safe and non-destructive:
-- existing bound candidates are never unbound or overwritten.

insert into atlas_v2.person_registration_candidates(
  candidate_id,name,representative_domain,priority,review_metadata,person_id
) values
  ('user-20261006-roxana','Roxana','governance',null,'{"review_state":"APPROVED","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"록사나"}'::jsonb,null),
  ('user-20261006-agrippina-the-elder','Agrippina the Elder','governance',null,'{"review_state":"APPROVED","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"대 아그리피나"}'::jsonb,null),
  ('user-20261006-octavia-minor','Octavia Minor','governance',null,'{"review_state":"APPROVED","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"소 옥타비아"}'::jsonb,null),
  ('user-20261006-cornelia-mother-of-the-gracchi','Cornelia, mother of the Gracchi',null,null,'{"review_state":"APPROVED","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"코르넬리아","domain_note":"culture/governance unresolved; do not infer before registration review"}'::jsonb,null),
  ('user-20261006-theano','Theano','science',null,'{"review_state":"HOLD","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"테아노","hold_reason":"Pythagorean identity and attributed works require identity/historicity resolution before registration"}'::jsonb,null),
  ('user-20261006-nitocris','Nitocris','governance',null,'{"review_state":"HOLD","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"니토크리스","hold_reason":"historicity and Egyptian king-list identity remain disputed"}'::jsonb,null),
  ('user-20261006-damocles','Damocles',null,null,'{"review_state":"HOLD","review_checkpoint":"USER-QUEUE07-20261006","origin":"user_selected_chat_20261006","display_name_ko":"다모클레스","hold_reason":"independent historicity and chronology are insufficiently secure; non-timeline disposition likely"}'::jsonb,null)
on conflict(candidate_id) do update
set name=excluded.name,
    representative_domain=excluded.representative_domain,
    priority=excluded.priority,
    review_metadata=excluded.review_metadata,
    updated_at=now()
where atlas_v2.person_registration_candidates.person_id is null;
