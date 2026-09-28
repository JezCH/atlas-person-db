# ATLAS Person Historical Fact Coverage Count Standard

> **Status:** Canonical
> **Version:** 4.1
> **Standard ID:** `ATLAS-PHFC-4.1`
> **Scope:** Historical Person source-backed factual coverage review / candidate research / legacy recount
> **Authority:** This file is the single active authority for ATLAS Person historical fact coverage counting.
> **Supersedes:** `ATLAS-PHFP-4.0`, `ATLAS-PHFC-3.2`, and all earlier aggregate or qualitative Person systems.

---

## 0. Purpose

ATLAS records the full source-backed factual profile **and** reports one deterministic arithmetic coverage count.

The count answers only:

> **How many predefined factual coverage cells are VERIFIED in this reviewed evidence packet?**

It does not mean greatness, importance, merit, positive impact, moral value, prestige, competence, or political value.

The same schema, evidence rules, arithmetic, and output order apply to every historical Person regardless of occupation, office, ideology, regime, reputation, field, or historical role.

There is no Person-type branch.

---

## 1. Cell states

Every binary cell has exactly one state:

- `1 = VERIFIED`
- `0 = REVIEWED_NOT_ESTABLISHED`
- `? = UNRESOLVED`

Never convert `?` to `0`.

`0` means not established in the reviewed evidence packet, not proof of metaphysical absence.

---

## 2. Canonical count

```text
VERIFIED_COUNT = E_COUNT + R_COUNT + T_COUNT + D_COUNT + G_COUNT + S_COUNT
```

| Group | Raw evidence shape | Count rule | Max |
|---|---|---:|---:|
| E | E1..E6 | number of VERIFIED cells | 6 |
| R | R1..R6 | number of VERIFIED cells | 6 |
| T | T1..T6 | number of VERIFIED cells | 6 |
| D | eight named direct-activity domains | min(VERIFIED domains, 6) | 6 |
| G | explicit external reception country/area set | min(verified external units, 6) | 6 |
| S | S1..S6 | number of VERIFIED cells | 6 |
| **TOTAL** |  | arithmetic sum only | **36** |

The full raw profile is preserved even when D or G exceeds the count cap.

There is no weighting. Every counted unit contributes exactly one.

---

## 3. E — Direct Entity Classes

E1. Polity / Government / Regime  
E2. Historical Event / Conflict / Expedition  
E3. Institution / Organization  
E4. Work / Text / Artwork / Composition / Corpus  
E5. Law / Treaty / Standard / Doctrine / Formal System  
E6. Technology / Discovery / Infrastructure / Route / Material Innovation

A cell is VERIFIED only when a reliable source directly connects the Person to at least one qualifying named or unambiguous object.

---

## 4. R — Direct Relation Families

R1. formal authority — rule / govern / reign / hold formal office  
R2. command or formal service — command / serve / administer a named military or institutional structure  
R3. create or author — create / found / build / author / compose / produce a named object  
R4. discover or invent — discover / invent / engineer a named discovery, invention, technology, or technical design  
R5. reform or codify — reform / legislate / enact / codify / standardize a named institution, law, or formal system  
R6. transmit, explore, or negotiate — teach / transmit / translate / undertake documented exploration / conduct documented diplomatic negotiation

Generic `lead`, generic `resist`, generic `develop`, ceremonial attendance, or mere association do not qualify.

---

## 5. T — Historical Transition Classes

T1. polity/regime transition  
T2. territorial/control transition  
T3. institutional/legal transition  
T4. conflict transition  
T5. named movement/tradition transition  
T6. science/technology/exploration transition

T5 includes named intellectual, religious, artistic, literary, social, and political movements or traditions.

Mere contemporaneity, office-holding during a transition, or eponymous naming is insufficient. The source must connect the Person's action/output to the state change.

---

## 6. D — Direct Activity Domains

Raw domain vocabulary:

- governance
- military
- knowledge
- technology
- commerce
- culture
- religion
- exploration

Each domain is stored as `1 / 0 / ?`.

Direct-activity predicates:

- governance — personally exercise governing authority or administration;
- military — personally serve, command, plan, or conduct military activity;
- knowledge — personally research, teach, theorize, or author scholarly/intellectual work;
- technology — personally invent, design, engineer, or technically develop an object/process/system;
- commerce — personally conduct merchant, entrepreneurial, financial, or commercial operations;
- culture — personally create, perform, author, or produce recognized artistic/literary/cultural work;
- religion — personally found, lead, teach, interpret, or author within a religious tradition/institution;
- exploration — personally undertake or document exploratory travel/expedition as exploration.

Policy, sponsorship, approval, funding, patronage, commissioning, or downstream consequences alone do not create a domain.

```text
D_COUNT = min(number of VERIFIED D domains, 6)
```

---

## 7. G — Geographic Reception

### 7.1 ORIGIN_SET

Preserve every present-day UN M49 country/area unit containing source-backed locations of the Person's own direct lifetime activity.

### 7.2 EXTERNAL_RECEPTION_SET

Preserve every country/area outside `ORIGIN_SET` where reliable evidence establishes at least one of:

- formal adoption;
- institutional use;
- curriculum or formal teaching;
- documented imitation;
- implementation;
- legally or technically operative use;
- a named movement/tradition explicitly receiving the Person or their output.

Mere translation, publication availability, tourism, commemoration, museum display, name recognition, or generic unsourced influence is insufficient.

```text
G_COUNT = min(number of verified EXTERNAL_RECEPTION_SET units, 6)
```

Do not truncate the stored set when more than six units are verified.

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

One source-backed assertion may verify cells in different groups when each group encodes a different factual property.

Example:

```text
Person → codified → named law
```

may support E5, R5, and T3.

Within one exact cell, repeated evidence never adds more than one VERIFIED state.

---

## 10. Canonical output-first contract

Every completed or partial review must begin with this count block:

```text
E_COUNT x/6
R_COUNT x/6
T_COUNT x/6
D_COUNT x/6
G_COUNT x/6
S_COUNT x/6
VERIFIED_COUNT x/36
UNRESOLVED y
STATUS COMPLETE|HOLD
```

The count block is followed by the raw profile:

```text
E E1=<1|0|?> ... E6=<1|0|?>
R R1=<1|0|?> ... R6=<1|0|?>
T T1=<1|0|?> ... T6=<1|0|?>
D governance=<1|0|?> military=<1|0|?> knowledge=<1|0|?> technology=<1|0|?> commerce=<1|0|?> culture=<1|0|?> religion=<1|0|?> exploration=<1|0|?>
G_ORIGIN [...]
G_EXTERNAL [...]
G_UNRESOLVED [...]
S S1=<1|0|?> ... S6=<1|0|?>
```

Rules:

- no prose before the count block;
- `VERIFIED_COUNT` is calculated by code, never trusted from caller input;
- `UNRESOLVED` counts unresolved cells plus unresolved geographic claims;
- `STATUS COMPLETE` only when unresolved count is zero; otherwise `HOLD`;
- raw profile must agree with all displayed counts;
- no role, office, ideology, regime, controversy, or political status changes the schema or arithmetic;
- the count must never be renamed or interpreted as importance, merit, greatness, value, rank, tier, grade, best/worst, or recommendation.

---

## 11. Machine implementation authority

`server/person-fact-count-output.mjs` is the implementation authority.

It must expose:

- `formatPersonFactCountResult()`
- `validatePersonFactCountOutput()`
- `assertPersonFactCountOutput()`
- `normalizePersonFactProfile()`

The formatter derives all six group counts, `VERIFIED_COUNT`, unresolved count, and COMPLETE/HOLD from the raw factual profile.

The validator rejects:

- prose before the count block;
- missing or reordered count lines;
- caller-supplied arithmetic mismatch;
- count/profile mismatch;
- malformed 1/0/? cells;
- geographic overlap between origin and external reception;
- incorrect unresolved count;
- incorrect COMPLETE/HOLD state.

`tests/person-fact-count-output.test.mjs` permanently verifies these invariants.

---

## 12. No role-based exceptions

The identical procedure applies to every historical Person.

A role changes which facts are established. It does not change what is counted or how the count is rendered.

---

## 13. Durable review record

```text
standard: ATLAS-PHFC-4.1
person_id / candidate identity

E1..E6: state + evidence
R1..R6: state + evidence
T1..T6: state + evidence
D.<domain>: state + evidence
G.origin_set
G.external_reception_set + evidence
G.unresolved_claims
S1..S6: state + evidence

E_COUNT
R_COUNT
T_COUNT
D_COUNT
G_COUNT
S_COUNT
VERIFIED_COUNT
unresolved_count
status: COMPLETE|HOLD
sources
reviewed_at
```

The numeric fields are reproducible derived data, not human-entered judgments.

---

## 14. Legacy cutover

Historical only:

- `ATLAS-PHFP-4.0`;
- `ATLAS-PHFC-3.2` and earlier PHFC;
- `ATLAS-PRV-2.4` and earlier PRV;
- SSS–C grading;
- Lite H/R/U/F;
- earlier Coverage Test variants;
- SCI/OFI/MCG/DRS;
- ad-hoc importance or prestige judgments.

Do not numerically convert legacy outputs. Re-review source-backed facts into the v4.1 raw profile and let the formatter derive the count.

---

## 15. Canonical rule

> **Verify facts first, preserve the raw profile, then report the deterministic arithmetic coverage count.**
