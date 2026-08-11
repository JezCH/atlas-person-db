# ATLAS Person–Polity Relation Semantics Contract v1

> Status: STAGE 2 DOMAIN CONTRACT / AUDIT ONLY
>
> Production DB mutation: **none**
>
> Purpose: define the smallest relation vocabulary that prevents Person–Polity links from being misread as personal territorial ownership while remaining compatible with the ATLAS historical-map model.

## 1. Core rule

A Person does not own a Territory record.

```text
Person
  └─ Activity (role + relation + period)
       └─ Polity
            └─ Territory history
```

`Role` and `Relation Type` answer different questions:

- **Role** = what office/status/function the person had.
- **Relation Type** = what the Person–Polity link means politically for ATLAS and how Runtime may interpret it.

Examples:

- Justinian I / Byzantine Empire / Emperor / `rules`
- Winston Churchill / United Kingdom / Prime Minister / `governs`
- Belisarius / Byzantine Empire / General / `serves`
- Jesus / Roman Empire / religious leader / `active_in`
- José Rizal / Captaincy General of the Philippines / nationalist / `opposes`
- a pretender with a non-effective sovereign claim / target polity / claimant / `claims_rule`

The same role string is not globally sufficient to infer history in every future record. This contract therefore separates the **domain vocabulary** from the current-baseline **audit candidate policy**.

## 2. Relation vocabulary

### `rules`

The person is the polity's sovereign/head-of-polity or exercises supreme de facto political authority over it for the represented interval.

Runtime:

- polity territory may be highlighted as the person's ruling-authority context;
- the actual geometry still comes from Polity Territory records, not from Person;
- disputed/occupied/claimed territory remains governed by Territory semantics.

### `governs`

The person exercises top-level executive, regency, or governmental authority but ATLAS should not treat that relationship as the polity's sovereign identity.

Typical uses:

- prime minister / minister-president;
- regent;
- chief minister with government-control authority;
- shogun or comparable head of government after the Polity/Regime model is resolved.

Runtime:

- polity context may be highlighted as governmental authority;
- presentation may distinguish this from sovereign `rules`.

### `serves`

The person performs official, military, diplomatic, administrative, or institutional service for the polity without top-level governing authority.

Runtime:

- the polity is service context;
- never present the polity's territory as the person's own controlled territory merely because this relation exists.

### `active_in`

The person's biographical, religious, intellectual, scientific, court, social, or other activity is associated with the polity, without asserting official service, government, or rule.

Runtime:

- context only;
- no political-authority or personal-territory implication.

This category intentionally absorbs cases such as consorts, thinkers, scientists, and religious figures when the role itself carries the specific human meaning and no additional political relation is justified.

### `opposes`

The person politically or militarily resists the polity.

Runtime:

- opponent/context relation only;
- never invert the target polity's territory into the person's territory;
- if the person simultaneously rules a rebel polity, that should be a separate Activity relation to that polity.

### `claims_rule`

The person claims sovereign rule over the polity, but the claim is not equivalent to accepted/effective control for the whole represented interval.

Runtime:

- claim semantics only;
- direct-control display requires separate Territory evidence;
- a claimant may also have a separate `rules` relation to territory/polity actually controlled.

## 3. Why six types are enough for the current model

The current audit does **not** require relation types such as `consort_of`, `scientist_in`, `general_for`, `diplomat_for`, `rebel_against`, or `regent_for` as separate top-level enums because those meanings already belong in Role and/or split Activity rows.

For example:

```text
Catherine de' Medici
role = Queen consort and regent
```

should not force a compound relation enum. If historical periods differ, the Activity should split:

```text
consort phase -> active_in
regency phase -> governs
```

Likewise:

```text
Boudica -> Iceni -> Queen -> rules
Boudica -> Roman authority -> revolt/opposition role -> opposes
```

is better than a single hybrid relation that tries to encode both directions.

The remaining difficult rows are therefore primarily **row decomposition, polity identity/relink, chronology, or historical-research problems**, not evidence that the relation taxonomy itself needs more categories.

## 4. Current-baseline audit policy

`scripts/build-relation-semantics-audit.mjs` applies a deliberately conservative exact-role policy to the reviewed 346-Activity baseline.

Important restrictions:

1. It is **audit-only** and writes no DB data.
2. It uses exact current role labels, not substring/keyword inference.
3. It is **not** a future automatic classifier.
4. Ambiguous or overloaded roles become `REVIEW_REQUIRED`.
5. Existing historical `relation_hint` values are treated as evidence only, not authority.
6. The script fails closed when the reviewed 346-row baseline or relation-dependency baseline drifts.

## 5. Baseline validation result

On the reviewed 346-Activity Production baseline:

- total Activity rows: **346**
- candidate relation rows from conservative exact-role policy: **280**
- review-required rows: **66**
- rows already flagged as requiring relation semantics in the master ledger: **154**
  - candidate relation possible now: **129**
  - still review-required: **25**

Candidate distribution:

| Relation | Candidate rows |
|---|---:|
| `rules` | 222 |
| `governs` | 23 |
| `serves` | 12 |
| `active_in` | 20 |
| `opposes` | 3 |
| `claims_rule` | 0 auto-assigned |

`claims_rule` is intentionally never inferred by the baseline role policy. It requires explicit historical review because a claim/control distinction is too important to infer from a generic title.

## 6. Existing relation-hint conflicts

The audit intentionally checks prior `relation_hint` values rather than trusting them. It currently detects **7** direct conflicts where a prior hint disagrees with the conservative relation contract candidate.

Notable examples include:

- Charlemagne: prior `serves` hint conflicts with ruler semantics.
- Victoria: prior `serves` hint conflicts with sovereign queen semantics.
- Enomoto Takeaki: prior `serves` hint conflicts with presidency of the Republic of Ezo.
- Eleanor Roosevelt: prior `rules` hint conflicts with diplomatic/service semantics.
- Indira Gandhi: prior `rules` hints conflict with head-of-government `governs` semantics.

This is why earlier relation hints must not be copied into a future database column without a dedicated audit.

## 7. Review-required classes

Rows left unresolved by the conservative policy are concentrated in categories where a role string alone is unsafe:

- warlords and regional authorities;
- chiefs/chieftains and tribal/confederacy identity cases;
- claimant/rebel combinations;
- governor rows whose Polity scope may not match the governed territory;
- mixed consort/regent rows;
- mixed politician/writer/diplomat intervals that require splitting;
- current rows whose Polity itself is wrong or outside the Polity model;
- historical cases where effective/de facto authority needs source review.

Examples include Sun Jian, Dong Zhuo, Ma Teng, Pericles, Theodora, Muhammad, Catherine de' Medici, Owain Glyndŵr, Mahatma Gandhi, Aung San Suu Kyi, and several tribal/confederacy cases.

These should be resolved by row-specific historical review and, where required, Activity splitting or Polity relinking. They should **not** be solved by adding vague catch-all relation types.

## 8. Schema implication

This contract is enough to justify a future `relation_type` field, but **this branch does not yet migrate the Production schema**.

Before schema migration, Stage 2 should complete:

1. review of the remaining relation-dependent 25 rows;
2. decision on whether `relation_type` becomes part of Activity semantic identity;
3. exact backfill plan for all current Activities;
4. read/write/authoring/merge contract changes;
5. migration and rollback tests on clean PostgreSQL.

The default design assumption is that Relation Type is a core Activity semantic dimension and therefore should eventually participate in duplicate/identity comparison. That assumption must be proven against merge and replay behavior before implementation.

## 9. Runtime rule

The Runtime map must never infer personal territory from a Person–Polity association alone.

```text
rules       -> ruling-authority map context allowed
governs     -> governmental-authority context allowed
serves      -> context only
active_in   -> context only
opposes     -> opponent context only
claims_rule -> claim context only
```

Territory geometry and control status remain owned by Polity Territory records.

## 10. Safety principle

Relation semantics must preserve the ATLAS governing principle:

> Historical accuracy is more important than data completeness. Unknown or compound cases remain unresolved until the system can represent them without distortion.
