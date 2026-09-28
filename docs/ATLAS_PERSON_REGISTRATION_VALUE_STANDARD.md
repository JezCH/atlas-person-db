# ATLAS Person Registration Value Standard

> **Status:** Canonical  
> **Version:** 2.4  
> **Standard ID:** `ATLAS-PRV-2.4`  
> **Scope:** Historical Person registration-value scoring / legacy re-evaluation  
> **Authority:** This file is the single active authority for ATLAS Person registration-value scoring.  
> **Supersedes:** all prior registration-value scoring and tier/grade experiments. Historical records using older systems remain audit evidence only.

---

## 0. Purpose

ATLAS uses one common scoring rule to answer:

> **How much historical explanatory value does this Person add to ATLAS?**

This is a project registration-value measurement, not a moral judgment, popularity ranking, political endorsement, assessment of personal worth, or honor system.

The score measures source-backed historical consequence, irreplaceability, persistence, breadth, and geographic diffusion.

The output of this standard is:

```text
C / U / P / B / G
→ TOTAL 0..30
```

There is **no derived grade, tier, class, rank label, or letter category**.

---

## 1. Hard gates before scoring

Do not score a candidate until the minimum review basis is sufficient.

Required gates:

- **IDENTITY** — the historical Person identity is sufficiently resolved.
- **HISTORICITY** — historicity / legendary / mythical disposition is reviewed.
- **DUPLICATE** — Production duplicate/reuse status is reviewed.
- **SOURCE** — reliable evidence exists for the claims used in the score.
- **LIFE STATUS** — new canonical Person creation follows the living-person exclusion policy.

If the evidence is insufficient for a defensible axis score, use **VERIFY / HOLD**.

**Missing evidence is not a reason to assign a low score.**

---

## 2. Canonical formula

```text
TOTAL = C + U + P + B + G
```

| Axis | Name | Max | Meaning |
|---|---|---:|---|
| **C** | Consequence | **10** | scale of direct historical consequences attributable to the Person |
| **U** | Unreplaceability | **9** | explanatory loss if this Person is removed or replaced |
| **P** | Persistence | **5** | duration of the Person's verified historical consequences / tradition |
| **B** | Breadth | **2** | substantial results in genuinely independent historical fields |
| **G** | Geographic Diffusion | **4** | independent reception / adoption outside the original activity sphere |
|  | **TOTAL** | **30** | simple sum; no hidden weighting |

No popularity, pageview, citation-count, language-edition-count, fame, or contemporary recognizability axis exists.

The TOTAL is a continuous project score from **0 to 30**. The standard defines **no categorical interpretation bands**.

---

# 3. Axis rules

## 3.1 C — Consequence /10

**Question:** What changed in history because of the Person's directly attributable actions, works, discoveries, institutions, systems, or traditions?

Judge consequences, not celebrity.

### Anchors

- **0** — no meaningful historical consequence established.
- **1–2** — narrow, local, short-lived, or peripheral consequence.
- **3–4** — clear consequence within a limited institution, locality, episode, or specialist field.
- **5–6** — substantial consequence in a state, major institution, national tradition, or established field.
- **7–8** — major consequence for a civilization-scale tradition, major historical transition, or globally important field.
- **9** — very large structural consequence across major institutions, regions, or later historical development.
- **10** — foundational or transformative consequence whose effects became part of long-run historical structure.

Use an odd score when the evidence clearly falls between adjacent even anchor descriptions.

### C exclusions

Do not inflate C because the Person:

- held a prestigious title;
- participated in many events without changing their outcome;
- produced many works of ordinary consequence;
- became famous much later;
- is strongly represented in modern popular culture.

---

## 3.2 U — Unreplaceability /9

**Question:** If this Person were removed from the historical explanation, how much unique explanatory structure would be lost?

U protects a Person who transformed one field so deeply that broad multi-field activity is unnecessary.

### Anchors

- **0** — almost entirely replaceable by other Persons already explaining the same structure.
- **1–2** — limited individual distinctiveness; little explanatory loss.
- **3–4** — meaningful individual contribution, but the historical structure remains well explained without this Person.
- **5–6** — strong unique role; removal creates a clear gap in an important episode, work, institution, or tradition.
- **7** — exceptionally distinctive; replacement loses a major part of the explanation.
- **8** — the Person directly changed the grammar, standard, paradigm, or canonical form of a major field/tradition; very few substitutes exist.
- **9** — removing the Person creates a structural hole that cannot be repaired by substituting another comparable Person; the Person is a canonical historical anchor for that transition or tradition.

### U exclusions

U is not:

- mere originality;
- being first by a technicality;
- fame;
- being the best-known member of a collaborative process;
- retrospective symbolism without corresponding direct historical anchoring.

Where independent co-discovery, collective authorship, institutional teamwork, or parallel development materially reduces individual indispensability, reflect that in U.

---

## 3.3 P — Persistence /5

**Question:** For how long did independently verifiable consequences, use, reception, institutional practice, or tradition persist after the Person's own activity?

P measures historical persistence, **not how long the Person remained famous**.

- **0** — no meaningful post-activity persistence established.
- **1** — mainly immediate / near-contemporary aftermath.
- **2** — multi-generational persistence.
- **3** — persisted for roughly a century or became a durable later reference.
- **4** — persisted across several centuries or multiple major historical periods.
- **5** — exceptionally long continuity into modern or contemporary historical structures, practice, canon, institutions, or scholarship.

Modern rediscovery after a long discontinuity does not automatically equal continuous P=5. Record the strongest defensible persistence actually supported.

---

## 3.4 B — Breadth /2

**Question:** Did the Person produce substantial, independently important historical results in more than one genuinely separate field?

B is a **small bonus axis**, never a primary route to a high total score.

- **0** — one principal historical field, including its normal subfields and professional activities.
- **1** — substantial historical results in **two genuinely independent fields**.
- **2** — substantial historical results in **three or more genuinely independent fields**; reserved for rare polymathic cases.

### Anti-splitting rule

Do not manufacture B by splitting one field into routine components.

Examples that normally remain **B=0**:

- composition + performance + music theory within one musical career;
- politics + administration + diplomacy within one governing career;
- painting + drawing within one visual-art career;
- writing several genres within one literary career;
- many battles within one military career.

Breadth counts only when each field has its **own substantial historical consequence**.

---

## 3.5 G — Geographic Diffusion /4

**Question:** Outside the Person's original activity sphere, how broadly was the Person's work, system, tradition, or consequence independently received, adopted, taught, imitated, institutionalized, or incorporated?

G measures historical diffusion, **not present-day name recognition**.

- **0** — essentially confined to the original local/activity sphere.
- **1** — meaningful diffusion into one additional neighboring or closely connected historical/cultural sphere.
- **2** — independent reception across multiple regions within a larger civilization zone, or one major external civilization sphere.
- **3** — broad multi-regional / multi-civilizational reception with durable evidence.
- **4** — genuinely global or near-global historical diffusion across multiple independent cultural regions.

Translation alone is insufficient if it did not amount to meaningful historical reception.

---

# 4. TOTAL

The final score is the simple sum of the five reviewed axes.

```text
0 <= TOTAL <= 30
```

TOTAL is retained as a numeric measurement only.

Mandatory rules:

- do not convert TOTAL into a letter, word, medal, star count, tier, band, class, or rank label;
- do not create hidden or UI-only categorical cutoffs;
- do not use an old categorical label as a proxy for a numeric score;
- if a task needs an inclusion cutoff, state that cutoff explicitly for that task as a numeric rule; it does not become part of this standard.

---

# 5. Mandatory operating rules

## 5.1 Score axes independently, then sum

Required order:

```text
review evidence
→ score C / U / P / B / G independently
→ sum TOTAL
```

Forbidden:

```text
choose a desired overall status
→ reverse-engineer axis scores to reach it
```

## 5.2 Fame is not an axis

Modern fame, school-curriculum familiarity, media presence, search traffic, pageviews, Wikipedia size, number of portraits, and name recognition do not directly score.

They may be clues for research, never substitutes for C/U/P/G evidence.

## 5.3 One-field greatness is not penalized

A Person can receive a very high TOTAL with **B=0**.

Breadth is only a small bonus; deep consequence and irreplaceability dominate.

## 5.4 Persistence and diffusion must be substantive

Do not award high P/G merely because the Person is still discussed today or translated widely.

Look for independently evidenced continuation, use, adoption, institutionalization, canon formation, or downstream historical effects.

## 5.5 Uncertainty fails closed

If a material score depends on unresolved attribution, disputed authorship, unclear direct influence, uncertain chronology, or weak evidence:

- mark the axis/score **VERIFY / HOLD**;
- identify the unresolved point;
- do not solve uncertainty by choosing a convenient midpoint.

## 5.6 Same rule for new and legacy Persons

New candidates and existing legacy Persons use the same v2.4 standard when they are scored or re-scored.

Older categorical or differently weighted results may remain as historical audit evidence but are not active authority.

---

# 6. Review record

A durable reviewed scoring record should preserve at least:

```text
standard: ATLAS-PRV-2.4
person_id / candidate identity
C: 0..10
U: 0..9
P: 0..5
B: 0..2
G: 0..4
total: 0..30
status: APPROVED|VERIFY|HOLD
axis_rationales
evidence/source references
reviewed_at
```

TOTAL may be calculated rather than stored, but if materialized it must equal the deterministic sum of the five axis values.

This document does **not** by itself require a new Production schema column. Storage belongs to the canonical candidate/review lifecycle defined by CORE.

---

# 7. Versioning and change control

v2.4 is the canonical baseline.

v2.4 intentionally removes the discrete categorical grading layer from v2.3. The five axes and 30-point total remain the active measurement model.

Do **not** revise the formula because one individual result feels too high or too low.

A new version is justified only when repeated application across a broad mixed sample demonstrates a **systematic structural error**, such as:

- the same class of Persons is repeatedly over- or under-measured;
- one axis consistently duplicates another;
- a score definition produces repeatable ambiguity across reviewers;
- the weighting systematically collapses meaningful distinctions.

Required change path:

```text
document repeated failure pattern
→ test proposed correction on a mixed calibration set
→ verify that the correction fixes the pattern without creating a new systematic distortion
→ publish a new numbered version
→ update binding requirement references
```

Never silently mutate v2.4 semantics while keeping the same version.

---

# 8. Legacy rules

Prior Lite, Coverage Test, SCI/OFI/MCG/DRS experiments, 54-point counting models, categorical grading systems, and ad-hoc project classifications are **non-authoritative historical experiments** after this cutover.

They may be consulted only as audit/research history.

When they conflict with this file:

> **ATLAS-PRV-2.4 wins.**

No legacy categorical result may be automatically converted into a v2.4 TOTAL. Re-score the five axes from evidence when a current value is needed.

---

# 9. Canonical summary

```text
C 10 — historical consequence
U  9 — irreplaceability
P  5 — persistence
B  2 — independent-field breadth
G  4 — geographic diffusion
-------------------------------
   30 total
```

**Canonical output = five axis scores + numeric TOTAL only.**

Core rule:

> **Historical explanatory value is measured by how much historical structure a Person changed, how irreplaceable their role was, and how long and how far those consequences persisted.**
