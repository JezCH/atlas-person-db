# ATLAS Polity Semantic Audit — Stage 2 Resolution Plan

> Status: DESIGN / RESEARCH — NO PRODUCTION DB MUTATION

## Stage 1 result

A live UUID coverage gate verified **346 / 346 current Production Activity relationships** have explicit semantic audit coverage. Stage 2 now resolves the flagged findings into correction-ready, source-backed change sets.

## Resolution order

### R0 — Data reconciliation before historical rewrites

Resolve current duplicate/competing rows before changing historical semantics.

Priority:
- 6 exact surface duplicate groups / 12 rows;
- competing alternative rows for Tokugawa, Hideyoshi, Peter I, Franklin, Haile Selassie, Hypatia, Maria I, Kublai, Hiawatha, Yongle, Nzinga, Edward Teach, Mao and others documented in Wave 13.

Required evidence:
- `activity_id`
- `person_id`
- `polity_id`
- `role_id`
- `period_basis_id`
- preferred/canonical identity names
- child-reference counts/sources where relevant

Public read is insufficient because it does not expose all normalized identity UUIDs. Do not delete/merge from display strings alone.

### R1 — High-confidence semantic corrections

Resolve cases where the current object type or chronology is already strongly established:
- Charles de Gaulle: Fifth Republic regime vs France/French Republic polity;
- Shu-Han pre-221 back-projection;
- Cao Cao pre-220 Cao Wei back-projection;
- Rurik pre-882 Kievan Rus' back-projection;
- Muhammad 610–632 `Medina` row split at Hijra;
- Benjamin Franklin pre-1776 United States back-projection;
- Gandhi British Raj row crossing 15 Aug 1947;
- Yoshida continuous 1946–1954 premiership;
- Bismarck Prussian office wrongly ending 1871;
- Aung San Suu Kyi 1988–2021 row conflating opposition era with State Counsellor office.

### R2 — Polity identity continuity/name model

Resolve whether rows represent one continuing polity, a new polity, a new parent polity, or only a temporal name/state form:
- Roman Empire / later `Byzantine Empire`;
- Tsardom of Russia / Russian Empire;
- Yuan / Northern Yuan;
- RSFSR / USSR;
- New Kingdom of Egypt;
- Swedish Empire;
- Old Babylonian period / Babylonian kingdom;
- Empire of Japan / Japan;
- early Ottoman beylik / later Ottoman Empire.

No UUID merge/split until each case receives an explicit continuity category.

### R3 — Layered sovereignty / territorial authority

Resolve cases where legal sovereignty and effective territorial authority coexist:
- Kamakura/Tokugawa bakufu, imperial court and daimyo domains;
- late Eastern Han and regional warlords/provincial authorities;
- colonial/dependent jurisdictions;
- claimant/provisional governments;
- Haile Selassie legal reign vs 1936–1941 effective control.

These cases must be designed together with future Polity-to-Polity relations and Territory control semantics; do not force them into a modern unitary-state model.

### R4 — Relation / biography decomposition

Resolve valid polity rows whose Person relation is not simple rule:
- generals/ministers (`serves`);
- intellectual/religious figures (`active_in`);
- reformers/rebels (`opposes`);
- de facto controllers/regents;
- long mobile biographies requiring Person–Place/Event context instead of one homeland Polity.

## Secure normalized inventory requirement

Before R0 can produce destructive actions, obtain a read-only server-side normalized inventory of flagged rows. Security requirements:

- Supabase/PostgreSQL credential stays in Vercel/server environment;
- GitHub Actions receives no DB URL;
- no browser DB credential;
- exact repository/workflow/ref/SHA trust boundary if GitHub OIDC is used;
- endpoint/action is read-only by contract;
- response is bounded to reviewed flagged Activity UUIDs or an equivalent safe inventory surface;
- capture artifact digest and row counts;
- temporary diagnostic surface removed after durable evidence is archived.

Prefer extending/reusing the existing OIDC/server trust machinery rather than introducing a second database access path.

## Correction manifest requirements

After R0–R4 decisions are source-resolved, implement a dedicated reviewed correction contract rather than overloading new-authoring v2.

Candidate operations:
- `relink_activity`
- `update_activity`
- `split_activity`
- `reclassify_or_rename_polity` only when identity continuity is resolved
- `retire_orphaned_identity` only after reference inventory proves safety

Every correction must carry:
- stable request/change-set id;
- exact target Activity UUID(s);
- expected before-state / identity UUIDs;
- reviewed after-state;
- decision/evidence reference;
- idempotency hash;
- dry-run result;
- bounded transactional apply;
- post-apply UUID/map-semantic verification.

## Apply policy

- no global text replacement;
- no automatic mutation of `RESEARCH` rows;
- no polity delete merely because no current Person row points to it;
- no correction from public display names alone;
- historical change sets should be bounded by coherent semantic domains;
- immediately before apply, fetch a fresh live before-state and fail closed on drift.

Stage 2 completion means every flagged current row is either correction-ready with source evidence or explicitly deferred, and the required safe correction engine/dry-run contract has been proven. It does not require speculative scholarly questions to be forced to a conclusion.
