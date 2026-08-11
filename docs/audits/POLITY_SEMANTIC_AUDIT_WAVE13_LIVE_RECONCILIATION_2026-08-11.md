# ATLAS Polity Semantic Audit — Wave 13: Current Production Reconciliation

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> This wave changes the audit baseline from the stale 2026-08-05 frozen export to a freshly captured normalized Production read.

## 1. Fresh Production evidence

Read-only workflow:

- workflow: `ATLAS Audit Live Snapshot`
- run: `31488115457`
- workflow head SHA: `7f0a77d3ece726276b49a99a048414b3fb7c31da`
- source endpoint: public same-origin normalized `GET /api/atlas-read`
- source marker required by job: `v2-direct`
- artifact: `atlas-audit-live-reconciliation`
- artifact id: `9099915140`
- artifact digest: `sha256:ba42014564af661fe49414f9d1892c38d5a43eb0b823623d7451be5fd2f9d0f3`

Snapshot counts:

- **346 current Activity rows**
- **301 distinct canonical person names** in the public projection
- **212 distinct canonical polity names**
- **146 distinct role labels**

This supersedes the earlier 309-row frozen file as the target baseline for eventual correction. The frozen audit remains useful as historical decision evidence, but correction manifests must target the current 346-row state and current relationship UUIDs.

## 2. Why the baseline pivot is mandatory

The current Production data is not simply the old snapshot plus 37 new rows.

Observed drift includes:

- relationship UUIDs changed for many pre-existing semantic rows;
- some labels were renamed (`Later Han -> Eastern Han`, `Egyptian New Kingdom -> New Kingdom of Egypt`, etc.);
- some alternative relations were added without old ones necessarily disappearing;
- some persons now have multiple overlapping Activity rows for the same polity/context;
- current public read count (346) differs from both the 2026-08-05 309-row audit and the 2026-08-10 349-row inventory reports.

Therefore no correction may target a frozen UUID directly without live reconciliation.

## 3. Prior audit -> current mapping experiment

The reconciliation job parsed the existing Wave documents and compared them to current Production by Person + Polity + period.

Initial machine mapping:

- current rows: **346**
- audit table rows successfully parsed by the first parser: **183**
- current exact Person+Polity+period matches: **170**
- same Person+Polity but period drift: **3**
- same Person but polity/semantic drift: **20**
- currently unmapped by that first parser: **153**

These numbers are navigation aids, not final coverage counts: the parser intentionally needs improvement for single-year/irregular tables, and a semantic drift may represent an intentional newer correction or a new error.

## 4. Exact semantic duplicate surface groups in current public read

Using the public semantic projection:

`Person + Polity + activity_start + activity_end + Role + period_basis`

there are **6 exact duplicate surface groups / 12 rows**.

Important: because the public read omits Person/Polity UUIDs, this does not yet prove whether each pair shares the same normalized identity UUID or represents duplicate Person/Polity identities. The normalized duplicate/merge system must inspect underlying UUIDs before any deletion.

### 4.1 Wu Zetian — Wu Zhou

- `75a124e8-df55-5247-aa48-dc9d7934c10e`
- `da809f25-40ff-5c27-b10b-88d4acc4070d`
- 690–705
- Emperor
- reign

Decision: `DATA_DUPLICATE_REVIEW`

### 4.2 Sejong the Great — Joseon

- `4263e4d0-a0a0-5803-a61b-85a57322db7e`
- `d1e0a5a6-31a1-5691-8d05-570dccdcad18`
- 1418–1450
- King
- reign

Decision: `DATA_DUPLICATE_REVIEW`

### 4.3 Mehmed II — Ottoman Empire

- `25ce2112-9b21-55dd-88d1-029153fc1a5a`
- `b0d35acc-9705-5b80-96bb-02616df72bcc`
- 1451–1481
- Sultan
- reign

Decision: `DATA_DUPLICATE_REVIEW`

### 4.4 Charles V — Holy Roman Empire

- `16ebebde-e4e4-553d-a520-00da68a276d2`
- `d641eec9-2770-5099-8017-8ec3bcc9244e`
- 1519–1556
- Holy Roman Emperor
- reign

Decision: `DATA_DUPLICATE_REVIEW`

### 4.5 Simon Bolivar — Gran Colombia

- `05d7091a-5cfc-5ec0-9aa3-32461925e7c7`
- `caa526f9-220d-540c-93ea-d889f6d9b8cb`
- 1819–1830
- President and liberator
- term

Decision: `DATA_DUPLICATE_REVIEW`

### 4.6 Otto von Bismarck — German Empire

- `1ff585a7-c481-5d38-98ff-38381c81d961`
- `a8946a02-9235-5985-b882-0c7d60b555dd`
- 1871–1890
- Chancellor
- term

Decision: `DATA_DUPLICATE_REVIEW`

## 5. Overlapping or competing current records requiring reconciliation

These are not necessarily exact duplicates. They may encode a useful role distinction, a failed replacement, or an invalid overlap.

### Tokugawa Ieyasu — three Tokugawa Shogunate rows

Current:

1. `7c315e1c-90c3-5199-a292-8f68ba69d4b2` — 1603–1605 — Shogun and military commander — `reign`
2. `79dc9310-cd56-5bed-9a35-fe5361bdf0b6` — 1603–1616 — Shogun and retired de facto ruler — `de_facto_rule`
3. `400c78d5-a7e1-5ddb-83ef-91e0193db0f8` — 1605–1616 — Retired shogun and de facto ruler — `de_facto_rule`

Diagnosis:
- rows 1 + 3 form a defensible formal-reign / retired-de-facto split;
- row 2 overlaps and appears to compress those two phases again;
- separate historical issue remains: whether `Tokugawa Shogunate` is the correct Polity identity or a government/regime layer in the eventual Japan/bakuhan model.

Decision: `DUPLICATE/OVERLAP_RECONCILIATION` + existing Japan hierarchy `RESEARCH`.

### Toyotomi Hideyoshi — Toyotomi Regime + Japan coexist

- `61bf1687-9815-5844-9f98-02a558470b51` — Toyotomi Regime — 1582–1598
- `7bd5741a-6b37-5b33-9512-40741e01b179` — Japan — 1582–1598

Both carry effectively the same broad Hideyoshi rule period.

Diagnosis:
- this looks like a newer alternative semantic row added without retiring the old one;
- earlier audit already concluded 1582–1598 itself is too coarse because nationwide consolidation was incomplete until 1590;
- do not choose either row as final merely because one says Japan.

Decision: `COMPETING_SEMANTIC_ROWS` + `SPLIT/RESEARCH`.

### Peter I — three Russia rows

Current:

- `57cdefa5-9a5d-533c-b229-47e398f1d07a` — Tsardom of Russia 1682–1721 — Tsar
- `eda26b64-2f59-5f15-954a-73404ceed064` — Russian Empire 1682–1725 — Tsar and emperor
- `9ec53325-3a97-58a8-a7e7-81a496a47e57` — Russian Empire 1721–1725 — Emperor

Diagnosis:
- row 1 + row 3 correctly express the formal title/state-form boundary if separate temporal labels are retained;
- row 2 back-projects Russian Empire to 1682 and duplicates the entire career using the later label;
- Wave 5 already concluded 1721 is better modeled as continuity/state-form/name transition rather than automatic polity death/birth.

Decision: `REMOVE/RECONCILE_BACK_PROJECTED_ALTERNATIVE` after identity continuity design.

### Benjamin Franklin — overlapping United States rows

- `5f8351b5-6a9e-56f4-b2d8-afbe83d42ef5` — Province of Pennsylvania 1757–1776
- `2a749964-c057-5671-bdaa-8388099b871d` — United States 1757–1790
- `8bcf4f15-65a5-5ce6-8ba3-e538fd0dca49` — United States 1776–1790

Diagnosis:
- United States beginning in 1757 is an obvious back-projection;
- Province of Pennsylvania to 1776 + United States from 1776 is structurally much closer to the political transition, though Franklin's actual diplomatic/residential activity still requires role/place nuance.

Decision: `REMOVE/RECONCILE_BACK_PROJECTED_ALTERNATIVE` for 1757–1790 U.S. row.

### Haile Selassie I — three overlapping reign rows

- `953a4cac-b59d-58ed-a2e4-4b4e2aa058d8` — 1930–1936
- `62963919-b3d1-5f25-a399-24a33d5e8779` — 1930–1974
- `5045bbb3-a494-5d94-893b-28ee8b98c0d0` — 1941–1974

Diagnosis:
- Ethiopia was occupied by Fascist Italy 1936–1941 while Haile Selassie remained the internationally recognized/exiled emperor; effective-control and legal-claim/reign semantics differ;
- a single 1930–1974 reign row plus separate 1930–36 and 1941–74 effective-rule rows may be intentional multi-basis modeling only if period basis/relations distinguish them. Current public projection shows all three as `reign`, so it is ambiguous/duplicative.

Decision: `SPLIT_CONTROL_VS_LEGAL_REIGN_RESEARCH` + duplicate reconciliation.

### Hypatia — overlapping Roman/Byzantine alternatives

- `aa5f6b18-e362-5421-9547-5ed0161d3cb8` — Roman Empire 393–395
- `c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa` — Roman Empire 393–415
- `3f0af453-7e55-5bf0-a8d8-6092788e28a6` — Byzantine Empire 395–415

Diagnosis:
- row 393–415 Roman is already closer to the constitutional-continuity conclusion from Wave 5;
- the split Roman 393–395 + Byzantine 395–415 pair reflects the older artificial 395 state transition;
- current Production contains both interpretations simultaneously.

Decision: `COMPETING_CONTINUITY_MODELS`; do not delete until the Roman/Byzantine identity constitution is finalized.

### Maria I of Portugal — competing Portugal chronology

- `a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7` — Kingdom of Portugal 1777–1815
- `fefe572f-95f7-5913-86ed-304c7c2ca679` — Kingdom of Portugal 1777–1816
- `25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89` — United Kingdom of Portugal, Brazil and Algarves 1815–1816

The 1777–1816 Portugal row overlaps the 1815 state-form transition alternative.

Decision: `CONTINUITY/ALTERNATIVE_ROW_RECONCILIATION`.

## 6. Additional current duplicates/parallel alternatives found by surface scan

The reconciliation also surfaced current cases requiring later exact normalized-ID inspection, including:

- Kublai Khan: Yuan 1260–1294 alternative overlapping Yuan 1271–1294 + Mongol Empire rows;
- Mao Zedong: two PRC 1949–1976 de-facto leadership variants with different role labels;
- Catherine II / Catherine the Great person-name duplication remains relevant to Phase 9 identity review;
- Yongle Emperor: both `Ming dynasty` and `Ming Dynasty` current rows;
- Cnut: individual crowns plus `North Sea Empire` aggregate label;
- Nzinga: Ndongo, Matamba and combined `Kingdoms of Ndongo and Matamba` aggregate row;
- Simon Bolivar: duplicate Gran Colombia rows plus separate Peru/Bolivia offices;
- Bismarck: duplicate German Empire row plus historically necessary overlapping Prussian office.

These must be distinguished as:
- true duplicate;
- legitimate simultaneous Polity relation;
- aggregate/composite derived view;
- competing correction alternative;
- role/period split.

## 7. New correction safety rule

Before semantic correction manifests are written, the current dataset needs a **Reconciliation Pass 0**:

1. resolve exact duplicate Person/relationship surfaces using underlying normalized UUIDs and existing Phase 9 evidence;
2. identify newer alternative rows that were added without retiring predecessor rows;
3. distinguish intentional multi-period/multi-relation modeling from accidental overlap;
4. only then apply historical Polity corrections.

Otherwise a historically correct relink could leave a stale competing row in Production and the map would still be wrong.

## 8. Baseline status

From this Wave onward:

- **current Production baseline = 346 Activity rows**
- old frozen 309-row audit = historical evidence only
- correction target = current relationship UUIDs
- full current audit completion criterion = **346/346 current rows accounted for**, followed by a last pre-apply drift check.

No Production mutation is authorized by this document.
