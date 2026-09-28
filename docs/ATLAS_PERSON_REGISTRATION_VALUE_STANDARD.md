# ATLAS Person Historical Fact Count Standard

> **Status:** Canonical  
> **Version:** 3.1  
> **Standard ID:** `ATLAS-PHFC-3.1`  
> **Scope:** Historical Person source-backed fact counting / candidate research / legacy recount  
> **Authority:** This file is the single active authority for ATLAS Person historical fact counting.  
> **Supersedes:** `ATLAS-PHFC-3.0`, `ATLAS-PRV-2.4`, and all earlier qualitative scoring, grading, tiering, or judgment-based systems. Older results remain audit evidence only.

---

## 0. Purpose

ATLAS does **not** ask an evaluator to decide how great, important, good, bad, irreplaceable, prestigious, or politically valuable a Person is.

ATLAS asks a narrower database question:

> **Which predefined source-backed historical coverage cells are verified for this Person?**

The procedure is:

```text
collect source-backed factual claims
→ classify claims into fixed coverage cells
→ mark verified cells
→ count the verified cells
→ output the arithmetic total
```

The same procedure applies regardless of occupation, office, ideology, reputation, field, or historical role.

The output is a **fact-coverage count**, not a value judgment.

---

## 1. Hard gates and cell states

Before finalizing a review, resolve:

- **IDENTITY** — the historical Person identity.
- **HISTORICITY** — historical / legendary / mythical disposition.
- **DUPLICATE** — canonical duplicate/reuse status.
- **SOURCE** — reliable evidence for every positive cell.
- **LIFE STATUS** — new canonical Person creation follows the living-person exclusion policy.

Every coverage cell has exactly one state:

- **1 = VERIFIED** — at least one reliable source satisfies the exact cell rule.
- **0 = REVIEWED_NOT_ESTABLISHED** — the cell was actually checked and no qualifying fact was established from the reviewed evidence.
- **? = UNRESOLVED** — research is incomplete, evidence conflicts, or classification cannot yet be resolved.

Never silently convert `?` to `0`.

The numeric count always reports the number of **VERIFIED** cells. If unresolved cells remain, output their count separately.

---

## 2. Canonical formula

```text
VERIFIED_TOTAL = E + R + T + D + G + S
```

| Code | Coverage group | Max | Count rule |
|---|---|---:|---|
| **E** | Direct Entity Classes | **6** | one point per verified direct historical-object class |
| **R** | Direct Relation Families | **6** | one point per verified direct relation family |
| **T** | Historical Transition Classes | **6** | one point per verified direct transition class |
| **D** | ATLAS Activity Domains | **6** | number of distinct verified activity domains, capped at 6 |
| **G** | External Geographic Reception | **6** | number of distinct external UN M49 country/area units with verified reception, capped at 6 |
| **S** | Successor-Link Classes | **6** | one point per verified downstream entity class |
|  | **VERIFIED_TOTAL** | **36** | arithmetic sum only |

There is:

- no qualitative weighting;
- no “importance” intensity;
- no irreplaceability judgment;
- no grade or tier;
- no role-specific formula;
- no political/non-political branch.

---

# 3. E — Direct Entity Classes /6

Award **1** for each class for which a reliable source directly connects the Person to at least one qualifying object.

Each class is binary and counts at most once.

1. **Polity / Government / Regime**
2. **Historical Event / Conflict / Expedition**
3. **Institution / Organization**
4. **Work / Text / Artwork / Composition / Corpus**
5. **Law / Treaty / Standard / Doctrine / Formal System**
6. **Technology / Discovery / Infrastructure / Route / Material Innovation**

Examples:

- one book and twenty books both satisfy the **Work** cell once;
- one battle and fifty battles both satisfy the **Event/Conflict** cell once;
- ruling one polity or several polities satisfies the **Polity** cell once.

E measures class coverage only.

---

# 4. R — Direct Relation Families /6

Award **1** for each relation family when a reliable source explicitly establishes at least one qualifying Person→object relation.

Each family is binary and counts at most once.

1. **formal authority** — rule / govern / reign / hold a formal office
2. **command or formal service** — command / serve / administer a named military or institutional structure
3. **create or author** — create / found / build / author / compose / produce a named object
4. **discover or invent** — discover / invent / engineer / formulate a named discovery, technology, or formal intellectual object
5. **reform or codify** — reform / legislate / enact / codify / standardize a named institution, law, or formal system
6. **transmit, explore, or negotiate** — teach / transmit / translate / explore / conduct a documented diplomatic negotiation

Removed from v3.0:

- generic `lead`;
- generic `resist`;
- unconstrained `develop`.

Those terms were too broad and allowed classification by impression.

A source must establish the relation to a **named or otherwise unambiguously identified object**.

---

# 5. T — Historical Transition Classes /6

Award **1** for each transition class when a reliable source directly connects the Person to at least one qualifying state change.

Each class is binary and counts at most once.

1. **Polity/regime transition** — creation, dissolution, succession, constitutional or regime-form change
2. **Territorial/control transition** — acquisition, loss, transfer, occupation, independence, or other documented control change
3. **Institutional/legal transition** — creation, abolition, restructuring, codification, or formal-standard change
4. **Conflict transition** — documented war, revolution, rebellion, campaign, or settlement outcome/change
5. **Tradition/movement transition** — formation or documented transformation of a named intellectual, religious, artistic, literary, or social tradition
6. **Science/technology/exploration transition** — documented scientific, technological, navigational, infrastructural, or exploratory change

Mere presence during a transition does not count.

The source must connect the Person's action/output to the state change.

---

# 6. D — ATLAS Activity Domains /6

Use the canonical ATLAS domain vocabulary:

- governance
- military
- knowledge
- technology
- commerce
- culture
- religion
- exploration

Count a domain only when a reliable source establishes a **direct activity**, not merely a consequence of another activity.

```text
D = min(number of verified distinct domains, 6)
```

Rules:

- policy affecting education does not by itself make the Person active in `knowledge`;
- policy affecting religion does not by itself make the Person active in `religion`;
- governing trade policy does not by itself make the Person active in `commerce`;
- a domain requires evidence of direct participation in that domain's activity.

This prevents a governing career from being mechanically split into every policy field it touched.

---

# 7. G — External Geographic Reception /6

v3.0 used UN M49 **subregions**, which was too coarse. v3.1 uses UN M49 **country/area units**.

## 7.1 Origin set

First build an `ORIGIN_SET` from present-day UN M49 country/area units containing source-backed locations of the Person's own direct activity during their lifetime.

Do not choose one “principal” origin by judgment.

All verified direct-activity areas belong to the origin set.

## 7.2 External reception

Then count distinct UN M49 country/area units **outside `ORIGIN_SET`** for which a reliable source explicitly establishes at least one of:

- formal adoption;
- institutional use;
- curriculum or formal teaching;
- documented imitation;
- implementation;
- legally or technically operative use;
- a named movement/tradition explicitly receiving the Person or their output.

```text
G = min(number of verified external country/area units, 6)
```

The following alone do **not** qualify:

- mere translation;
- mere publication availability;
- tourism;
- commemoration;
- museum display;
- name recognition;
- an unsourced claim that the Person was “influential”.

The receiving country/area is determined by the receiving historical entity or institution, not by the publisher of the source.

---

# 8. S — Successor-Link Classes /6

v3.0 counted individual later entities and therefore rewarded research volume. v3.1 instead counts **fixed downstream entity classes**.

A downstream relation must occur after the Person's own verified activity and must be explicitly source-backed.

Award **1** for each downstream class with at least one qualifying successor/reception relation:

1. **later polity / government / regime**
2. **later institution / organization**
3. **later law / treaty / standard / formal system**
4. **later work / text / artwork / corpus**
5. **later movement / religion / school / tradition**
6. **later technology / practice / infrastructure**

Qualifying relation types:

- adoption;
- continuation;
- institutional inheritance;
- implementation;
- explicit derivation;
- explicit response;
- explicit documented influence.

Non-qualifying:

- chronology alone;
- superficial similarity;
- generic “influence” without an identifiable downstream entity;
- later commemoration that does not establish a historical relation.

Each class counts once no matter how many downstream examples are found.

This removes the v3.0 incentive to collect dozens of named successor entities merely to raise the count.

---

# 9. No age-based persistence axis

v3.0 used `+25 / +100 / +300 / +500 / +1000 / present` persistence checkpoints.

That rule is retired.

Reason:

- a Person who lived recently could not possibly satisfy the longer elapsed-time checkpoints;
- an ancient Person had more opportunities to fill the axis solely because more time had passed;
- the metric therefore mixed historical coverage with age of the subject.

v3.1 contains **no elapsed-time score**.

Temporal continuation is represented only through source-backed downstream relations in **S**, regardless of whether the Person lived 50, 500, or 2,000 years ago.

---

# 10. Cross-group evidence reuse

A single source-backed historical assertion may legitimately verify more than one group because the groups encode **different properties** of the historical graph.

Example:

```text
Person → codified → named law
```

may verify:

- E: Law/Formal System class;
- R: reform/codify relation family;
- T: institutional/legal transition.

This is **intentional**.

Therefore:

> `VERIFIED_TOTAL` is a count of covered predefined cells, **not a count of unique historical events or unique source sentences**.

Within a single group, however, the same fact can never produce more than one count for the same cell.

This rule removes the ambiguity present in v3.0 about “double counting”.

---

# 11. Final output

Required output:

```text
E x/6
R x/6
T x/6
D x/6
G x/6
S x/6
VERIFIED_TOTAL x/36
UNRESOLVED y
```

If `UNRESOLVED = 0`, the review is complete.

If `UNRESOLVED > 0`, the numeric verified subtotal is still reported, but the record status remains `HOLD`.

**Never omit `VERIFIED_TOTAL`.**

The total is arithmetic only.

Do not replace it with:

- high/low;
- important/unimportant;
- major/minor;
- S/A/B/C;
- stars;
- prestige bands;
- best/worst;
- any other evaluative label.

---

# 12. Anti-judgment rule

Forbidden operations:

- estimate “how important” the Person was;
- assign historical greatness;
- score irreplaceability;
- assess positive versus negative impact;
- increase a count because the Person is famous;
- decrease a count because the Person is controversial;
- change rules because a resulting total “feels wrong”.

Permitted operations:

- verify a named source-backed relation;
- classify the relation into a predefined cell;
- verify a documented transition;
- verify a direct activity domain;
- identify a receiving UN M49 country/area;
- identify a source-backed downstream entity class;
- count the resulting verified cells.

If reviewers disagree, the disagreement must be reducible to a concrete factual or classification question.

---

# 13. No role-based exceptions

The exact same fact-count procedure applies to every historical Person.

Examples include:

- ruler;
- officeholder;
- military commander;
- religious leader;
- scholar;
- scientist;
- inventor;
- artist;
- writer;
- musician;
- merchant;
- explorer.

No occupation, office, ideology, regime, or political status changes the formula.

A role may change which facts exist. It does not change how the facts are counted.

---

# 14. Review record

A durable record should preserve:

```text
standard: ATLAS-PHFC-3.1
person_id / candidate identity

E:
  six cell states + evidence
R:
  six cell states + evidence
T:
  six cell states + evidence
D:
  verified domains + unresolved domains + evidence
G:
  origin_set
  verified external country/area units
  unresolved geographic claims
  evidence
S:
  six downstream-class states + evidence

verified_total: 0..36
unresolved_count
status: COMPLETE|HOLD
evidence/source references
reviewed_at
```

Every positive cell must trace to at least one source-backed claim.

A `0` means **reviewed but not established in the evidence packet**, not metaphysical proof that the fact never existed.

---

# 15. Use in roster work

PHFC 3.1 is a factual coverage instrument.

It does not itself define:

- an inclusion cutoff;
- a grade;
- a prestige tier;
- a moral judgment;
- a political judgment;
- a best/worst ranking.

If a separate ATLAS workflow uses the numeric count as one operational input, that workflow must state its rule explicitly.

The PHFC meaning remains:

> **number of predefined historical coverage cells verified from evidence.**

---

# 16. Legacy cutover

The following are historical only:

- `ATLAS-PHFC-3.0`;
- `ATLAS-PRV-2.4` and earlier PRV systems;
- SSS–C grading;
- Lite H/R/U/F;
- earlier Coverage Test variants;
- SCI/OFI/MCG/DRS experiments;
- ad-hoc importance or prestige judgments.

Do not convert an old result numerically into PHFC 3.1.

Recount from source-backed facts.

---

# 17. Canonical summary

```text
E 6 — direct entity-class coverage
R 6 — direct relation-family coverage
T 6 — historical transition-class coverage
D 6 — direct activity-domain coverage
G 6 — external country/area reception coverage
S 6 — downstream successor-class coverage
--------------------------------------------
 36 — VERIFIED coverage cells
```

Core rule:

> **Do not judge the Person. Verify the predefined historical cells, count the verified cells, and output the arithmetic total.**
