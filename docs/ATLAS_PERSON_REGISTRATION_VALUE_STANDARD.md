# ATLAS Person Historical Fact Profile Standard

> **Status:** Canonical
> **Version:** 4.0
> **Standard ID:** `ATLAS-PHFP-4.0`
> **Scope:** Historical Person source-backed factual profiling / candidate research / legacy re-review
> **Authority:** This file is the single active authority for ATLAS Person historical factual profiling.
> **Supersedes:** `ATLAS-PHFC-3.2`, `ATLAS-PHFC-3.1`, `ATLAS-PHFC-3.0`, `ATLAS-PRV-2.4`, and every earlier aggregate scoring, grading, tiering, or judgment system. Older outputs remain audit evidence only.

---

## 0. Purpose

ATLAS records a source-backed historical fact profile. It does **not** collapse that profile into one scalar score.

The canonical procedure is:

```text
collect source-backed factual claims
→ classify claims into fixed factual dimensions
→ preserve each cell as VERIFIED / REVIEWED_NOT_ESTABLISHED / UNRESOLVED
→ preserve geographic reception as explicit source-backed sets
→ emit the factual profile
→ explain evidence after the profile
```

The exact same procedure applies to every historical Person regardless of occupation, office, ideology, regime, reputation, field, or historical role.

There is no Person-type branch.

---

## 1. Cell states

Every binary profile cell has exactly one state:

- `1 = VERIFIED` — at least one reliable source satisfies the exact rule.
- `0 = REVIEWED_NOT_ESTABLISHED` — the cell was actually reviewed and no qualifying fact was established from the reviewed evidence.
- `? = UNRESOLVED` — research is incomplete, evidence conflicts, or classification cannot yet be resolved.

Never silently convert `?` to `0`.

A `0` is a review result for the evidence packet, not a metaphysical claim that the fact never existed.

---

## 2. Profile dimensions

The active profile contains five fixed binary groups plus explicit geographic sets:

| Code | Dimension | Shape |
|---|---|---|
| **E** | Direct Entity Classes | 6 binary cells |
| **R** | Direct Relation Families | 6 binary cells |
| **T** | Historical Transition Classes | 6 binary cells |
| **D** | ATLAS Activity Domains | 8 named binary cells |
| **G** | Geographic Reception | explicit origin + external reception sets |
| **S** | Successor-Link Classes | 6 binary cells |

There is **no aggregate total**, no `/36`, no overall numeric score, no weighted sum, and no hidden scalar derived from the profile.

The profile is the output.

---

## 3. E — Direct Entity Classes

E1. Polity / Government / Regime
E2. Historical Event / Conflict / Expedition
E3. Institution / Organization
E4. Work / Text / Artwork / Composition / Corpus
E5. Law / Treaty / Standard / Doctrine / Formal System
E6. Technology / Discovery / Infrastructure / Route / Material Innovation

A class is VERIFIED when a reliable source directly connects the Person to at least one qualifying named or unambiguous object in that class.

---

## 4. R — Direct Relation Families

R1. formal authority — rule / govern / reign / hold formal office
R2. command or formal service — command / serve / administer a named military or institutional structure
R3. create or author — create / found / build / author / compose / produce a named object
R4. discover or invent — discover / invent / engineer a named discovery, invention, technology, or technical design
R5. reform or codify — reform / legislate / enact / codify / standardize a named institution, law, or formal system
R6. transmit, explore, or negotiate — teach / transmit / translate / undertake documented exploration / conduct documented diplomatic negotiation

Generic `lead`, generic `resist`, generic `develop`, ceremonial attendance, or mere association do not satisfy a relation cell.

---

## 5. T — Historical Transition Classes

T1. polity/regime transition
T2. territorial/control transition
T3. institutional/legal transition
T4. conflict transition
T5. named movement/tradition transition
T6. science/technology/exploration transition

T5 includes named intellectual, religious, artistic, literary, social, and political movements or traditions. The source must connect the Person's action or output to formation or documented transformation; mere eponymous naming or contemporaneity does not count.

For every T cell, mere presence during a transition is insufficient. The source must connect the Person's action/output to the state change.

---

## 6. D — Direct Activity Domains

The canonical domain vocabulary is:

- governance
- military
- knowledge
- technology
- commerce
- culture
- religion
- exploration

Each domain is a separate `1 / 0 / ?` cell. There is no cap and no domain subtotal.

A domain requires direct source-backed activity:

- governance — personally exercise governing authority or administration;
- military — personally serve, command, plan, or conduct military activity;
- knowledge — personally research, teach, theorize, or author scholarly/intellectual work;
- technology — personally invent, design, engineer, or technically develop an object/process/system;
- commerce — personally conduct merchant, entrepreneurial, financial, or commercial operations;
- culture — personally create, perform, author, or produce recognized artistic/literary/cultural work;
- religion — personally found, lead, teach, interpret, or author within a religious tradition/institution;
- exploration — personally undertake or document exploratory travel/expedition as exploration.

Policy, sponsorship, approval, funding, patronage, commissioning, or consequences in a field do not by themselves create a direct activity-domain cell.

---

## 7. G — Geographic Reception

Geographic reception is preserved as evidence-bearing sets, not converted into a score.

### 7.1 ORIGIN_SET

Build `ORIGIN_SET` from present-day UN M49 country/area units containing source-backed locations of the Person's own direct lifetime activity.

Do not choose a single principal origin by judgment.

### 7.2 EXTERNAL_RECEPTION_SET

Record each country/area unit outside `ORIGIN_SET` where a reliable source explicitly establishes at least one of:

- formal adoption;
- institutional use;
- curriculum or formal teaching;
- documented imitation;
- implementation;
- legally or technically operative use;
- a named movement/tradition explicitly receiving the Person or their output.

Do not use a fixed maximum. Preserve every verified unit relevant to the reviewed evidence packet.

The following alone do not qualify: mere translation, mere publication availability, tourism, commemoration, museum display, name recognition, or generic unsourced "influence".

Unresolved geographic claims remain explicit in `G_UNRESOLVED`.

---

## 8. S — Successor-Link Classes

S1. later polity / government / regime
S2. later institution / organization
S3. later law / treaty / standard / formal system
S4. later work / text / artwork / corpus
S5. later movement / religion / school / tradition
S6. later technology / practice / infrastructure

Qualifying relations include adoption, continuation, institutional inheritance, implementation, explicit derivation, explicit response, or explicit documented influence.

Chronology alone, superficial similarity, generic influence without an identifiable downstream entity, and mere commemoration do not qualify.

---

## 9. Cross-dimension evidence reuse

A source-backed assertion may verify more than one dimension when the dimensions encode different factual properties.

Example:

```text
Person → codified → named law
```

may support E5, R5, and T3.

This is not score double-counting because v4.0 has no aggregate score.

Within one exact cell, repeated evidence never creates additional state.

---

## 10. Canonical output-first contract

Every completed or partial review must begin with this profile block before explanatory prose:

```text
E E1=<1|0|?> E2=<1|0|?> E3=<1|0|?> E4=<1|0|?> E5=<1|0|?> E6=<1|0|?>
R R1=<1|0|?> R2=<1|0|?> R3=<1|0|?> R4=<1|0|?> R5=<1|0|?> R6=<1|0|?>
T T1=<1|0|?> T2=<1|0|?> T3=<1|0|?> T4=<1|0|?> T5=<1|0|?> T6=<1|0|?>
D governance=<1|0|?> military=<1|0|?> knowledge=<1|0|?> technology=<1|0|?> commerce=<1|0|?> culture=<1|0|?> religion=<1|0|?> exploration=<1|0|?>
G ORIGIN_SET=[...] EXTERNAL_RECEPTION_SET=[...] G_UNRESOLVED=[...]
S S1=<1|0|?> S2=<1|0|?> S3=<1|0|?> S4=<1|0|?> S5=<1|0|?> S6=<1|0|?>
UNRESOLVED=[cell ids / geographic claims]
STATUS=<COMPLETE|HOLD>
```

Rules:

- no prose before the block;
- no aggregate total line;
- no `VERIFIED_TOTAL`;
- no `/36`;
- no ranking, grade, tier, prestige band, best/worst label, or other scalar summary;
- identical output schema for every Person;
- `STATUS=COMPLETE` only when no `?` cell and no unresolved geographic claim remains;
- otherwise `STATUS=HOLD`.

---

## 11. Machine implementation authority

The machine contract is enforced by:

- `server/person-fact-profile-output.mjs`
  - `formatPersonFactProfile()`
  - `validatePersonFactProfileOutput()`
  - `assertPersonFactProfileOutput()`
- `server/person-fact-count-output.mjs` is retained only as a compatibility import path and re-exports the v4.0 profile API. It contains no aggregate-total implementation.
- `scripts/verify-person-fact-profile-output.mjs` validates a rendered profile from file or stdin.
- `scripts/verify-person-fact-count-output.mjs` is retained as a compatibility CLI wrapper and delegates to the v4.0 profile validator.
- `tests/person-fact-count-output.test.mjs` permanently verifies:
  - profile-first output;
  - exact cell-state shape;
  - no scalar aggregate;
  - no `VERIFIED_TOTAL`;
  - no `/36`;
  - consistent COMPLETE/HOLD state.

Any code path that emits a historical Person profile must use the canonical formatter/validator.

---

## 12. No role-based exceptions

The same factual profile procedure applies to rulers, officeholders, military commanders, religious leaders, scholars, scientists, inventors, artists, writers, musicians, merchants, explorers, and every other historical Person.

A Person's role changes which facts are established. It never changes the schema, evidence standard, or output contract.

---

## 13. Review record

A durable record preserves:

```text
standard: ATLAS-PHFP-4.0
person_id / candidate identity

E1..E6: state + evidence
R1..R6: state + evidence
T1..T6: state + evidence
D.<domain>: state + evidence
G.origin_set
G.external_reception_set + evidence
G.unresolved_claims
S1..S6: state + evidence

unresolved_cells
status: COMPLETE|HOLD
sources
reviewed_at
```

No `verified_total`, overall score, rank, grade, tier, or scalar registration value is stored.

---

## 14. Legacy cutover

Historical only:

- `ATLAS-PHFC-3.2` and earlier PHFC;
- `ATLAS-PRV-2.4` and earlier PRV;
- SSS–C grading;
- Lite H/R/U/F;
- earlier Coverage Test variants;
- SCI/OFI/MCG/DRS experiments;
- ad-hoc importance or prestige judgments.

Do not numerically convert old totals into v4.0.

Re-review the source-backed facts into the v4.0 profile.

---

## 15. Canonical rule

> **Do not reduce a Person to one number. Verify the same factual dimensions for everyone, preserve the cell states and evidence, and output the profile.**
