# ATLAS Person Historical Fact Coverage Count Standard

> **Status:** Canonical
> **Version:** 4.2
> **Standard ID:** `ATLAS-PHFC-4.2`
> **Scope:** Historical Person source-backed factual coverage review / candidate research / legacy recount
> **Authority:** This file is the single active authority for ATLAS Person historical fact coverage counting.
> **Supersedes:** `ATLAS-PHFC-4.1`, `ATLAS-PHFP-4.0`, `ATLAS-PHFC-3.2`, and all earlier Person scoring/counting systems.

---

## 0. Non-negotiable principle

ATLAS applies **one identical factual-coverage procedure to every historical Person**.

Occupation, public office, ideology, regime, controversy, reputation, field, military role, religious role, political status, or historical role may change which facts are verified. They **never** change:

- the cells reviewed;
- the evidence threshold;
- the arithmetic;
- the output order;
- the meaning of the number.

The count answers only:

> **How many predefined source-backed factual coverage cells are VERIFIED in the closed review packet?**

It does not mean greatness, importance, merit, positive/negative impact, morality, prestige, competence, political value, recommendation, rank, grade, tier, or best/worst judgment.

The counting implementation receives only the factual profile. Person-type metadata is outside the counting input and cannot select another formula.

---

## 1. Cell states and closure

Every binary cell has exactly one state:

- `1 = VERIFIED` — at least one reliable source satisfies the exact cell predicate.
- `0 = REVIEWED_NOT_ESTABLISHED` — the required bounded closure review was completed and no qualifying fact was established.
- `? = UNRESOLVED` — the bounded review is incomplete, evidence conflicts, evidence is inaccessible, or classification remains ambiguous.

Never silently convert `?` to `0`.

A `0` is valid only when its cell ID appears in `ZERO_REVIEW_CLOSED`. The machine validator requires the set of zero-state cells and the closure set to match exactly.

This rule prevents a short or shallow evidence packet from producing artificial zeros.

---

## 2. Canonical arithmetic

```text
VERIFIED_COUNT = E_COUNT + R_COUNT + T_COUNT + D_COUNT + G_COUNT + S_COUNT
```

| Group | Raw evidence shape | Count rule | Max |
|---|---|---:|---:|
| E | E1..E6 | number of VERIFIED cells | 6 |
| R | R1..R6 | number of VERIFIED cells | 6 |
| T | T1..T6 | number of VERIFIED cells | 6 |
| D | eight named direct-activity domains | min(VERIFIED domains, 6) | 6 |
| G | six fixed external-reception modes | number of VERIFIED modes | 6 |
| S | six fixed successor-link classes | number of VERIFIED classes | 6 |
| **TOTAL** |  | arithmetic sum only | **36** |

There is no weighting.

---

## 3. Bounded evidence protocol

Each review uses the same closure procedure.

### Pass A — core synthesis

Review at least one reliable biographical/reference synthesis and, where reasonably available, one independent reliable corroborating source for the Person's principal lifetime activity.

### Pass B — targeted unresolved-cell review

For every cell not established in Pass A, perform one targeted review directed at that exact predicate or fixed class.

For G, review each of the six reception modes separately.

For S, review each of the six successor classes separately.

For D, review each of the eight direct-activity domains separately when not established by the core sources.

### Stop rule

A binary cell stops accumulating evidence as soon as one qualifying example is VERIFIED. Additional examples do not increase its count.

A cell may become `0` only after its targeted closure pass is completed. If the pass cannot be completed or remains ambiguous, the cell stays `?`.

This is a **bounded closure protocol**, not an instruction to search indefinitely.

---

## 4. E — Direct Entity Classes

E1. Polity / Government / Regime  
E2. Historical Event / Conflict / Expedition  
E3. Institution / Organization  
E4. Work / Text / Artwork / Composition / Corpus  
E5. Law / Treaty / Standard / Doctrine / Formal System  
E6. Technology / Discovery / Infrastructure / Route / Material Innovation

VERIFIED requires a reliable source directly connecting the Person to at least one named or unambiguous object in the class.

---

## 5. R — Direct Relation Families

R1. formal authority — rule / govern / reign / hold formal office  
R2. command or formal service — command / serve / administer a named military or institutional structure  
R3. create or author — create / found / build / author / compose / produce a named object  
R4. discover or invent — personally discover / invent / engineer a named discovery, invention, technology, or technical design  
R5. reform or codify — reform / legislate / enact / codify / standardize a named institution, law, or formal system  
R6. transmit, explore, or negotiate — teach / transmit / translate / undertake documented exploration / conduct documented diplomatic negotiation

Generic `lead`, generic `resist`, generic `develop`, ceremonial attendance, passive association, or a source that merely places the Person near the object does not qualify.

A ceremonial signature alone does not automatically satisfy R5; the source must establish an enactment, reform, legislative, codifying, or standardizing role.

---

## 6. T — Historical Transition Classes

T1. polity/regime transition  
T2. territorial/control transition  
T3. institutional/legal transition  
T4. conflict transition  
T5. named movement/tradition transition  
T6. science/technology/exploration transition

T5 includes named intellectual, religious, artistic, literary, social, and political movements or traditions.

Mere contemporaneity, office-holding during a transition, eponymous naming, or broad association is insufficient. The source must connect the Person's action/output to formation, termination, or documented transformation.

---

## 7. D — Direct Activity Domains

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

- **governance** — personally exercise governing authority or administration;
- **military** — personally serve, command, plan, or conduct military activity;
- **knowledge** — personally research, teach, theorize, or author scholarly/intellectual work;
- **technology** — personally invent, design, engineer, or technically develop an object/process/system;
- **commerce** — personally conduct sustained merchant, entrepreneurial, financial, or commercial operations;
- **culture** — personally create, perform, author, or produce recognized artistic/literary/cultural work;
- **religion** — personally found, lead, teach, interpret, or author within a religious tradition/institution;
- **exploration** — personally undertake or document exploratory travel/expedition as exploration.

Policy, sponsorship, approval, funding, patronage, commissioning, or downstream consequences alone do not create a domain.

Political propaganda/instruction alone does not create `knowledge` unless the evidence independently establishes scholarly/intellectual/educational activity.

Incidental sale of one's own work alone does not create `commerce` unless the evidence establishes sustained commercial or entrepreneurial activity.

Military invasion alone does not create `exploration`.

```text
D_COUNT = min(number of VERIFIED D domains, 6)
```

All eight raw D states are still preserved.

---

## 8. G — Fixed External Geographic Reception Modes

v4.2 **does not count countries**. Country-counting was too sensitive to research depth.

### 8.1 ORIGIN_SET

Preserve every present-day UN M49 country/area unit containing source-backed locations of the Person's own direct lifetime activity.

### 8.2 Six fixed G cells

Every qualifying G example must occur in at least one present-day UN M49 country/area unit outside `ORIGIN_SET`.

G1. **institutional adoption/use** — a named government, school, university, church, organization, military, professional body, or other institution formally adopts or uses the Person's output/practice/doctrine.

G2. **formal teaching/curriculum/canon** — documented curriculum, syllabus, formal instruction, examination canon, or comparable structured teaching reception.

G3. **documented imitation/derivation** — a named external creator, work, institution, practice, or school is explicitly documented as imitating or deriving from the Person or their output.

G4. **operative implementation/application** — a law, standard, technique, technology, method, doctrine, administrative system, or practice is documented as implemented or operationally applied.

G5. **named movement/tradition/community reception** — a named movement, school, tradition, religious community, artistic current, literary current, political current, or social movement explicitly receives the Person or their output.

G6. **documented circulation/reception** — reliable evidence documents sustained external readership, performance, exhibition, publication reception, translation reception, broadcast reception, or comparable cultural/intellectual circulation. Mere availability, a single translation, tourism, commemoration, museum display, or generic name recognition is insufficient.

### 8.3 Geographic evidence storage

Each G cell stores the verified external country/area units supporting that mode.

One country may support multiple distinct G modes when separate predicates are genuinely satisfied.

A VERIFIED G cell requires at least one verified external unit.

A `0` or `?` G cell stores no verified unit.

```text
G_COUNT = number of VERIFIED G1..G6 cells
```

Researching a seventh country cannot increase G_COUNT after the relevant mode is already VERIFIED.

---

## 9. S — Successor-Link Classes

S1. later polity / government / regime  
S2. later institution / organization  
S3. later law / treaty / standard / formal system  
S4. later work / text / artwork / corpus  
S5. later movement / religion / school / tradition  
S6. later technology / practice / infrastructure

A class is VERIFIED by one named downstream entity plus a reliable source explicitly establishing adoption, continuation, institutional inheritance, implementation, derivation, response, or documented influence tied to the Person or a named output/action of the Person.

Do **not** count:

- chronology alone;
- superficial similarity;
- generic "influence";
- mere commemoration;
- a biography or work merely about the Person;
- continuation of the same polity/institution after the Person without a source-backed person-specific inheritance relation;
- reaction to a broad era, war, regime, or ideology unless the source explicitly ties the downstream entity to the Person or their named output/action.

Once one qualifying downstream entity verifies an S class, additional examples in that same class do not increase the count.

---

## 10. Cross-dimension evidence reuse

One source-backed assertion may verify different cells when they encode different factual properties.

Example:

```text
Person → codified → named law
```

may support E5, R5, and T3.

Within the same exact cell, repeated evidence never adds more than one.

---

## 11. Canonical output-first contract

Every completed or partial review begins with:

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
G G1=<1|0|?> ... G6=<1|0|?>
G_ORIGIN [...]
G_UNITS {"G1":[...],"G2":[...],"G3":[...],"G4":[...],"G5":[...],"G6":[...]}
S S1=<1|0|?> ... S6=<1|0|?>
ZERO_REVIEW_CLOSED [...]
```

Rules:

- no prose before the count block;
- `VERIFIED_COUNT` is machine-derived, never trusted from caller input;
- `UNRESOLVED` is the number of `?` decision cells;
- `STATUS COMPLETE` only when unresolved count is zero;
- every zero-state cell must appear in `ZERO_REVIEW_CLOSED`, and no nonzero cell may appear there;
- raw profile must agree with all counts;
- no role, office, ideology, regime, controversy, or political status changes the schema, closure protocol, arithmetic, or output;
- the count must never be renamed or interpreted as importance, merit, greatness, value, rank, tier, grade, best/worst, or recommendation.

---

## 12. Machine implementation authority

`server/person-fact-count-output.mjs` is the implementation authority.

It must:

- accept factual-profile input only, not Person-type metadata;
- validate exact E/R/T/D/G/S shapes;
- require exact zero-review closure;
- derive G_COUNT from fixed G modes rather than country count;
- derive all group counts and `VERIFIED_COUNT`;
- reject count/profile mismatch, geographic-origin overlap, missing closure, extra closure, malformed states, and incorrect HOLD/COMPLETE.

`tests/person-fact-count-output.test.mjs` permanently verifies these invariants, including a role-metadata non-branch test.

---

## 13. Durable review record

```text
standard: ATLAS-PHFC-4.2
person_id / candidate identity

E1..E6: state + evidence
R1..R6: state + evidence
T1..T6: state + evidence
D.<domain>: state + evidence
G.origin_set
G1..G6: state + external units + evidence
S1..S6: state + downstream entity + evidence

ZERO_REVIEW_CLOSED
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

- `ATLAS-PHFC-4.1` country-count G;
- `ATLAS-PHFP-4.0`;
- `ATLAS-PHFC-3.2` and earlier PHFC;
- `ATLAS-PRV-2.4` and earlier PRV;
- SSS–C grading;
- Lite H/R/U/F;
- earlier Coverage Test variants;
- SCI/OFI/MCG/DRS;
- ad-hoc importance or prestige judgments.

Do not numerically convert old outputs.

Re-review source-backed facts under v4.2 and let the formatter derive the count.

---

## 15. Canonical rule

> **Same factual cells, same bounded review, same arithmetic, every Person. Verify facts first; count only closed, source-backed coverage.**
