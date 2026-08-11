# Stage 2 Modern Dependent / Union Polity Decisions — 2026-08-12

## Status

**SOURCE-BACKED AUDIT ONLY — NO PRODUCTION MUTATION**

This decision record closes the structural model behind four current `polity_relation_model` Activity rows: Wilfrid Laurier, Mahatma Gandhi, and Vladimir Lenin (two rows).

The core ATLAS rule is:

> A polity can be territorially real and internally self-governing while still being constitutionally dependent on another polity. Dependency is modeled as a Polity-to-Polity relation; it is not a reason to erase the dependent Polity or relink every Person to the imperial/union parent.

---

## 1. Dominion of Canada — Wilfrid Laurier

### Source facts

The Constitution Act, 1867 created the provinces as “One Dominion under the Name of Canada” under the Crown of the United Kingdom. Parks Canada describes Confederation as creating the Dominion of Canada, a **self-governing country within the British Empire**, while Britain controlled Canada's relations with other countries during Laurier's period. The Statute of Westminster later formalized broad legislative autonomy for the Dominions in 1931.

Sources:

- Department of Justice Canada, *Constitution Act, 1867*.  
  https://laws-lois.justice.gc.ca/eng/Const/page-1.html
- Parks Canada, *The Political Life of Sir Wilfrid Laurier*.  
  https://parks.canada.ca/lhn-nhs/on/laurier/culture/natcul7
- Department of Justice Canada, *Statute of Westminster, 1931 — Enactment No. 17*.  
  https://justice.canada.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t171.html

### ATLAS decision

`Dominion of Canada` remains a valid territory-owning Polity.

Laurier's current Activity:

- `e497159b-6eb5-5ca9-85a3-591784d29906`
- Dominion of Canada
- 1896–1911
- Prime Minister

Decision:

- **KEEP Activity**
- Person–Polity Relation = `governs`
- add/research Polity relation `Dominion of Canada -> dominion_of -> United Kingdom`

The exact full historical interval for the structural relation must be researched independently of Laurier's tenure before Production backfill. The current Person row is not used as a shortcut to define the entire constitutional life of the Dominion.

The important semantic point is already closed: Laurier does **not** get relinked to the United Kingdom, and Canadian territory is not erased into an imperial parent.

---

## 2. Gandhi — British Raj to independent India

### Source facts

Government of India / Gandhi Heritage chronology shows that Gandhi returned to India in 1915 and initially conducted local political, social, and satyagraha work. The chronology identifies **24 February 1919** as the Rowlatt Act satyagraha pledge and April 1919 as the first all-India satyagraha/hartal phase. Therefore a blanket `opposes` relation starting in 1915 would be too coarse.

The Indian Independence Act 1947 declares that from **15 August 1947** two independent Dominions, India and Pakistan, were established. Gandhi's official chronology shows continued peace, communal-unity, and political activity in independent India until his assassination on **30 January 1948**.

Sources:

- Gandhi Smriti and Darshan Samiti, Government of India, *Chronology of Mahatma Gandhi*.  
  https://www.gandhismriti.gov.in/more/chronology-mahatma-gandhi
- Gandhi Heritage Portal, Gandhi chronology / Rowlatt Satyagraha chronology.  
  https://www.gandhiheritageportal.org/chronology
- UK Parliament, *Indian Independence Act 1947*, official legislation.  
  https://www.legislation.gov.uk/ukpga/Geo6/10-11/30/enacted

### Current row

- `7a89364b-dacf-5798-9a6d-dd312cbbee4d`
- Mahatma Gandhi
- British Raj
- 1915–1948
- Political leader and independence movement leader

### ATLAS decision

The row must be **retired and replaced**, because it crosses both a relation-semantic transition and the end of the colonial polity.

Reviewed replacement phases:

1. **British Raj · 1915 → 1919-02-23 · `active_in`**
   - early Indian political/social/local satyagraha phase;
   - Role should remain NULL until a historically accurate vocabulary choice is reviewed rather than reusing the later independence-leader label uncritically.

2. **British Raj · 1919-02-24 → 1947-08-14 · `opposes`**
   - source-backed all-India anti-colonial political phase;
   - current independence-movement Role may be reused.

3. **India · 1947-08-15 → 1948-01-30 · `active_in`**
   - Gandhi did not become ruler or government officer of independent India;
   - post-independence Role should stay NULL until an accurate reusable role is reviewed.

Structural relation:

`British Raj -> colonial_dependency_of -> United Kingdom`

for the relevant colonial interval, with the full relation interval researched separately before Production backfill.

This model prevents two opposite errors:

- calling Gandhi an anti-colonial opponent for every day from 1915;
- leaving him attached to a colonial Polity after that Polity's legal end.

---

## 3. Lenin — RSFSR and USSR are simultaneous levels, not replacement identity

### Source facts

The Soviet government formed in November 1917 with Lenin as chairman of the Council of People's Commissars. The treaty of **30 December 1922** formed the USSR from the RSFSR and other Soviet republics.

The 1924 USSR Constitution did not treat the union republics as erased predecessor states. It reserved specified powers to the Union while preserving union-republic state power outside those competences, territorial-consent guarantees, and a formal right of withdrawal.

The Presidential Library records that on **6 July 1923** the first USSR Council of People's Commissars was elected with Lenin as its chairman. The Great Russian Encyclopedia separately lists Lenin as chairman of the RSFSR Sovnarkom in **1917–1924** and the USSR Sovnarkom in **1923–1924**.

Sources:

- Russian State Archive Lenin portal, decree forming the Soviet government, 26 October / 8 November 1917.  
  https://lenin.rusarchives.ru/dokumenty/dekret-ob-obrazovanii-rabochego-i-krestyanskogo-pravitelstva-prinyatyy-na-vtorom-sezde
- Electronic Library of Historical Documents, *Treaty on the Formation of the USSR*, 30 December 1922.  
  https://docs.historyrussia.org/ru/nodes/342350-dogovor-ob-obrazovanii-soyuza-sovetskih-sotsialisticheskih-respublik-30-dekabrya-1922-g
- Electronic Library of Historical Documents, *Constitution of the USSR*, 31 January 1924.  
  https://docs.historyrussia.org/nodes/342397
- B. N. Yeltsin Presidential Library, first USSR government, 6 July 1923.  
  https://www.prlib.ru/history/619364
- Great Russian Encyclopedia, Lenin entry.  
  https://bigenc.ru/t/statesmen

### ATLAS model

`Soviet Russia / RSFSR` remains a constituent territorial Polity after the USSR is formed.

`Soviet Union` is the new union-level Polity.

Structural relation from the union boundary:

`Soviet Russia -> constituent_of -> Soviet Union`

Use temporal official-name/designation records for names such as `Russian SFSR`; do not infer that the stable constituent Polity identity disappeared because the Union was created.

### Current Activity decisions

#### RSFSR row

- `df9c8cb3-bbf4-5037-930c-342962a3b7d0`
- Soviet Russia
- 1917–1922
- Chairman of the Council of People's Commissars

Decision:

- **KEEP**
- Relation = `governs`
- correct the office interval to **1917-11-08 → 1924-01-21 Gregorian** (26 October Old Style / 8 November New Style start)

#### USSR row

- `e05c0337-8048-5695-901f-36c8fe2c6c1c`
- Soviet Union
- 1922–1924
- Chairman of the Council of People's Commissars

Decision:

- **KEEP but correct the start**
- Relation = `governs`
- interval **1923-07-06 → 1924-01-21**

The two Activities legitimately overlap because they refer to different levels of the Soviet political structure.

Lenin's severe illness meant he could not effectively perform the newly created USSR chairmanship. That fact belongs in evidence/chronology metadata; it does not erase the formal office identity or create a new relation vocabulary solely for one incapacitated officeholder.

---

## 4. Machine-readable gate

`scripts/build-modern-dependent-polity-decisions.mjs` binds these decisions to the exact four current Activity UUIDs and checks current Person, Polity, interval, Role, and `polity_relation_model` dependency against the live 346-row ledger.

Expected result:

- reviewed current Activity rows: **4**
- structural-relation model rows resolved in this cluster: **4**
- unresolved structural model rows in this cluster: **0**
- Gandhi replacement phases: **3**
- Lenin simultaneous constituent/union offices: supported
- newly identified exact temporal correction groups: **2**
- new Polity identity required: **false**

## 5. Production boundary

Nothing is applied here.

Before Production:

- resolve exact current Polity UUIDs for `United Kingdom` and `India` rather than name-match writes;
- determine full source-backed intervals for Canada/UK and British Raj/UK structural relations;
- create source-linked `dominion_of`, `colonial_dependency_of`, and `constituent_of` assertions;
- apply Gandhi's three Activity phases with reviewed Role-null policy;
- apply Lenin's exact sub-year office intervals;
- apply only through the Stage 2 semantic-key/replay/merge cutover and exact deployed-SHA verification path.

## Conclusion

This cluster confirms a core ATLAS rule:

> **Dependency, federation, and empire are relations between political entities; they are not excuses to collapse every territorial polity into one parent identity.**

The same model can represent Laurier's autonomous Dominion, Gandhi's changing relation across colonial independence, and Lenin's simultaneous constituent-republic and union-level offices without falsifying territory or chronology.
