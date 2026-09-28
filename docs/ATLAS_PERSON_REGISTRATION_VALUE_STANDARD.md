# ATLAS Person Historical Footprint Count Standard

> **Status:** Canonical  
> **Version:** 3.0  
> **Standard ID:** `ATLAS-PHFC-3.0`  
> **Scope:** Historical Person factual-footprint counting / candidate comparison / legacy re-evaluation  
> **Authority:** This file is the single active authority for ATLAS Person historical-footprint counting.  
> **Supersedes:** `ATLAS-PRV-2.4` and all earlier qualitative registration-value scoring, grading, tiering, or judgment-based systems. Older results remain audit evidence only.

---

## 0. Purpose

ATLAS needs a common way to summarize how much **source-backed historical structure is directly connected to a Person** without asking the evaluator to decide whether that Person is “great”, “important”, “good”, “bad”, “better”, “worse”, or “more valuable”.

This standard therefore does **not** assign historical worth.

It performs a factual count:

```text
verify fixed evidence conditions
→ mark each condition 0/1 or count a fixed unit
→ sum the verified counts
→ output one numeric TOTAL
```

The same rule applies to every historical Person regardless of profession, role, domain, office, ideology, reputation, moral evaluation, or type of historical activity.

The evaluator must never substitute an overall impression for a counted fact.

---

## 1. Hard gates before counting

Do not finalize a count until the review basis is sufficient.

Required gates:

- **IDENTITY** — the historical Person identity is sufficiently resolved.
- **HISTORICITY** — historicity / legendary / mythical disposition is reviewed.
- **DUPLICATE** — canonical duplicate/reuse status is reviewed.
- **SOURCE** — reliable evidence exists for every counted claim.
- **LIFE STATUS** — new canonical Person creation follows the living-person exclusion policy.

If an item cannot be established from reliable evidence, mark that item **UNRESOLVED** during research.

Do not turn missing evidence into a negative factual claim.

A final TOTAL is emitted only from the verified items. If unresolved items could materially change the result, preserve the verified subtotal and mark the review **HOLD** rather than guessing.

---

## 2. Canonical formula

```text
TOTAL = O + R + T + D + P + G + L
```

| Code | Count | Max | What is counted |
|---|---|---:|---|
| **O** | Direct Object Classes | **6** | fixed classes of historical objects directly linked to the Person |
| **R** | Direct Relation Families | **6** | fixed families of directly sourced Person→object relations |
| **T** | Historical Transition Types | **6** | fixed types of directly sourced historical state change |
| **D** | Activity Domains | **6** | distinct ATLAS domains with directly sourced activity |
| **P** | Persistence Checkpoints | **6** | fixed post-activity time checkpoints with sourced continuation/reception |
| **G** | Geographic Reception | **6** | distinct external UN M49 subregions with sourced reception/adoption |
| **L** | Later Linked Entities | **6** | distinct later entities explicitly linked by sources to the Person or their output |
|  | **TOTAL** | **42** | simple sum; no hidden weighting |

There is no qualitative weighting, no evaluator-assigned intensity score, and no derived grade or tier.

---

# 3. Counting rules

## 3.1 O — Direct Object Classes /6

Award **1 point per class** when at least one reliable source directly links the Person to an object in that class.

Count each class at most once.

1. **Polity / Government / Regime**
2. **Historical Event / Conflict / Expedition**
3. **Institution / Organization**
4. **Work / Text / Artwork / Composition / Corpus**
5. **Law / Treaty / Standard / Doctrine / Formal System**
6. **Technology / Discovery / Infrastructure / Route / Material Innovation**

Examples:

- ten books still count as **one Work class point**;
- twenty battles still count as **one Event/Conflict class point**;
- ruling three polities still counts as **one Polity class point**.

O counts object classes, not quantity or prestige.

---

## 3.2 R — Direct Relation Families /6

Award **1 point per relation family** when a reliable source explicitly establishes at least one relation in that family.

Count each family at most once.

1. **rule / govern / hold-office**
2. **command / serve / administer / organize**
3. **create / found / build / author / compose**
4. **discover / invent / develop / formulate**
5. **reform / legislate / standardize / codify**
6. **teach / transmit / lead / explore / negotiate / resist**

Do not infer a relation from title, fame, association, chronology, or proximity alone.

A relation must be source-backed and attributable to the Person.

---

## 3.3 T — Historical Transition Types /6

Award **1 point per transition type** when reliable sources directly connect the Person to at least one instance of that transition.

Count each type at most once.

1. **Polity/regime creation, dissolution, succession, or constitutional transformation**
2. **Territorial or control change**
3. **Institutional, administrative, legal, or formal-standard change**
4. **War, revolution, rebellion, or conflict outcome/change**
5. **Formation or transformation of an intellectual, religious, artistic, literary, or social tradition**
6. **Scientific, technological, navigational, infrastructural, or exploratory change**

Do not award a point merely because the Person lived during a transition.

The source must connect the Person to the transition.

---

## 3.4 D — Activity Domains /6

Count the number of distinct ATLAS domains in which reliable evidence establishes direct activity by the Person.

Canonical ATLAS domains:

- governance
- military
- knowledge
- technology
- commerce
- culture
- religion
- exploration

```text
D = min(number of verified distinct domains, 6)
```

This is a count of domain coverage only.

Do not decide that one domain is “more important” than another.

Do not split one activity into multiple domains unless the underlying activities are independently source-supported.

---

## 3.5 P — Persistence Checkpoints /6

P uses fixed chronological checkpoints after the end of the Person's principal activity.

Award **1 point for each checkpoint** at which reliable evidence shows that at least one directly attributable work, institution, law, system, practice, tradition, discovery, or downstream consequence continued to be used, practiced, taught, cited, institutionalized, reproduced, or otherwise demonstrably present.

Checkpoints:

1. **+25 years**
2. **+100 years**
3. **+300 years**
4. **+500 years**
5. **+1000 years**
6. **present day**

Rules:

- A checkpoint counts only if that amount of time has actually elapsed.
- A later checkpoint does not automatically prove an earlier checkpoint; each counted checkpoint needs evidence consistent with continuation or documented reception.
- Mere modern name recognition is insufficient.
- Rediscovery after a documented long discontinuity may count at the later checkpoint where reception is actually evidenced, but does not retroactively fill missing earlier checkpoints.

P intentionally records observed temporal footprint, not timeless merit.

---

## 3.6 G — Geographic Reception /6

Identify the Person's principal original activity subregion.

Then count **distinct UN M49 subregions outside that original subregion** in which reliable sources establish meaningful reception, adoption, institutional use, teaching, imitation, implementation, or direct historical consequence of the Person or their output.

```text
G = min(number of verified external UN M49 subregions, 6)
```

Rules:

- the original activity subregion does not count;
- mere translation, mention, tourism, memorialization, or present-day name recognition does not count unless it demonstrates substantive reception/adoption;
- repeated evidence within the same M49 subregion still counts once;
- geography is determined by the receiving entity/location, not by the source publisher's location.

---

## 3.7 L — Later Linked Entities /6

Count distinct **later** historical entities for which a reliable source explicitly states a direct relation of:

- adoption,
- continuation,
- institutional inheritance,
- implementation,
- explicit intellectual/artistic/technical derivation,
- direct response,
- or documented influence

from the Person or a directly attributable output of that Person.

Eligible later entities include:

- polity/government,
- institution/organization,
- law/standard/system,
- work/corpus,
- movement/tradition/school,
- technology/practice/infrastructure.

```text
L = min(number of verified distinct later entities, 6)
```

Rules:

- chronology alone is not influence;
- similarity alone is not influence;
- “widely influential” without an identifiable later entity is not a countable unit;
- the source must name or otherwise unambiguously identify the downstream relation.

---

# 4. Final output

The required final output is:

```text
O / R / T / D / P / G / L → TOTAL /42
```

Example format:

```text
O 4
R 3
T 2
D 2
P 5
G 4
L 6
TOTAL 26/42
```

The TOTAL is the arithmetic sum of verified counts.

**The TOTAL must be output when the review is complete.**

Do not replace the TOTAL with prose such as “high”, “low”, “major”, “minor”, “important”, “top-tier”, “S”, “A”, stars, medals, bands, or other evaluative labels.

Do not sort Persons into a best-to-worst ranking as part of this standard.

---

# 5. Anti-judgment rules

The following questions are forbidden as scoring operations:

- “How great was this Person?”
- “How important was this Person?”
- “How irreplaceable was this Person?”
- “Was this Person good or bad?”
- “Was the Person's impact positive or negative?”
- “Does this Person feel like a high scorer?”
- “Which Person deserves the higher grade?”

The permitted questions are factual:

- Is there a sourced direct relation?
- Which fixed relation family is it?
- Which fixed object class is it?
- Which fixed transition type is documented?
- Which ATLAS domain is evidenced?
- At which fixed time checkpoints is continuation/reception evidenced?
- In which external M49 subregions is reception evidenced?
- Which later entity is explicitly linked by a source?

If two reviewers use the same evidence set, disagreement should be traceable to **classification of a concrete claim**, not to an overall impression of the Person.

---

# 6. No role-based exceptions

This standard applies identically to all eligible historical Persons.

Occupation or role does not create a special scoring path.

Examples of roles that receive the same factual-count procedure include:

- ruler,
- officeholder,
- military commander,
- religious leader,
- scholar,
- scientist,
- inventor,
- artist,
- writer,
- musician,
- merchant,
- explorer.

A Person's role changes which facts may be found; it does not change the counting rule.

---

# 7. Review record

A durable review should preserve:

```text
standard: ATLAS-PHFC-3.0
person_id / candidate identity

O:
  verified classes + evidence
R:
  verified relation families + evidence
T:
  verified transition types + evidence
D:
  verified domains + evidence
P:
  verified checkpoints + evidence
G:
  verified external M49 subregions + evidence
L:
  verified later entities + evidence

total: 0..42
status: COMPLETE|HOLD
unresolved_items
evidence/source references
reviewed_at
```

Every counted point must be recoverable to at least one source-backed factual claim.

The project may store the detailed checklist, the derived TOTAL, or both. If TOTAL is materialized, it must equal the simple arithmetic sum.

---

# 8. Comparison and registration use

The count may be used as one factual input when ATLAS reviews roster coverage or candidate research priority.

This standard itself does **not** define:

- a minimum inclusion cutoff;
- a “good/bad” interpretation;
- a grade;
- a prestige tier;
- a moral or political judgment;
- a best/worst ranking.

If a separate task needs a numeric operational cutoff, that task must state it explicitly and must not silently redefine the meaning of the PHFC count.

---

# 9. Legacy cutover

The following are non-authoritative after this cutover:

- `ATLAS-PRV-2.4` C/U/P/B/G qualitative scoring;
- `ATLAS-PRV-2.3` and its SSS–C grading;
- Lite H/R/U/F;
- earlier Coverage Test variants;
- SCI/OFI/MCG/DRS experiments;
- ad-hoc prestige or importance judgments.

Legacy records remain audit evidence only.

Do not convert an old qualitative score directly into PHFC 3.0.

Recount from source-backed facts.

---

# 10. Canonical summary

```text
O 6 — direct object classes
R 6 — direct relation families
T 6 — historical transition types
D 6 — activity domains
P 6 — persistence checkpoints
G 6 — external M49 reception subregions
L 6 — explicitly linked later entities
-----------------------------------------
 42 — verified factual count
```

Core rule:

> **ATLAS does not ask the evaluator how important a Person is. It counts which predefined, source-backed historical facts are present and outputs their arithmetic total.**
