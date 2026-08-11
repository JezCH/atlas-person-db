# ATLAS Polity Semantic Audit — Wave 5

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: polity identity continuity, partitions, federal unions, and state-form/name changes.

## 1. Why this wave exists

A chronological label change is not enough to create a new Polity UUID.

Conversely, institutional continuity is not enough to collapse two genuinely distinct political actors into one UUID.

For ATLAS, three questions must be answered separately:

1. Did the underlying political actor continue?
2. Did a new parallel/parent/successor political actor appear?
3. Did only the official title, conventional name, state form, ruler title, or historiographic label change?

This wave confirms that future Polity modelling needs temporal naming/state-form semantics and explicit inter-polity relationships before destructive identity merges are allowed.

## 2. Roman Empire / Eastern Roman / Byzantine — 395 is not a simple succession event

Frozen Hypatia rows:

- `8d5d7cbd-1622-44ae-9a08-6444efcbb7c7` — Hypatia -> Roman Empire, 393–395, Mathematician, philosopher and astronomer
- `88a782ac-eec9-4bed-b240-a23779e34c42` — Hypatia -> Byzantine Empire, 395–415, same role

### Decision: `IDENTITY_MODEL_RESEARCH` + future `RELATION_FIX`

The current rows encode 395 as if one Polity identity simply stopped and another unrelated `Byzantine Empire` began. That is historically unsafe.

Cambridge scholarship is explicit that after Theodosius I's death in 395 the eastern and western parts had separate imperial governments/rulers, while the two parts were still constitutionally conceived as an undivided Roman Empire. Modern scholarship also stresses the long underlying continuity of the Roman polity and that the inhabitants/state elites of what historians call the Byzantine Empire identified as Roman.

Therefore ATLAS should **not** model 395 as:

`Roman Empire dies -> Byzantine Empire is born`

Possible map-level models include:

- one Roman imperial identity with time-indexed eastern/western administrative-authority layers;
- an overarching Roman identity plus parallel `Eastern Roman` and `Western Roman` political-authority children after 395;
- separate map-level East/West Polities linked by an explicit partition/continuity relation to the Roman imperial parent.

The audit does not yet choose among these because that choice affects the entire Late Roman / Byzantine territorial dataset, not only Hypatia.

For Hypatia specifically, the relation is `active_in`, not `rules`. Her intellectual activity did not itself undergo a political-office transition in 395. Therefore splitting her personal activity solely to mirror a historiographic label boundary is suspect.

### Provisional correction rule

Do not merge/delete either Polity UUID yet. First define the Roman partition/continuity model. Then re-author Hypatia's political-context relation without implying that 395 created a wholly new civilization-state.

Confidence: very high that current simple-successor semantics are wrong; medium on final Polity hierarchy implementation.

## 3. Tsardom of Russia -> Russian Empire, 1721 — state-form/name continuity

Frozen Peter I rows:

- `32e33450-e22a-4a5e-b4d2-b64eaa0b62a6` — Peter I -> Tsardom of Russia, 1682–1721, Tsar
- `203f8649-582e-4bdf-8a30-ad5084fe3303` — Peter I -> Russian Empire, 1721–1725, Emperor

### Decision: `SAME_POLITY_NAME_STATE_FORM_RESEARCH`

Cambridge's *A Concise History of Russia* describes Peter as transforming the traditional Russian tsardom by changing the structure and form of the state. The 1721 imperial proclamation was a major title/state-form event under the same ruler and political apparatus, not an obvious conquest or sovereign replacement by a new political actor.

For ATLAS the likely final model is:

- one continuing Russian Polity identity;
- temporal preferred/conventional names/state forms: `Tsardom of Russia` -> `Russian Empire`;
- Peter's Person–Polity activity remains split at 1721 because his **Role** changes `Tsar -> Emperor`;
- both activity rows should eventually point to the same underlying Polity UUID;
- map Territory History should continue across 1721 rather than treating it as automatic territorial-state extinction/rebirth.

No UUID consolidation is allowed until temporal polity-name/state-form support exists and all references to both current Polity identities are inventoried.

Confidence: high.

## 4. Soviet Russia / RSFSR -> USSR — NOT a simple name change

Frozen Lenin rows:

- `cdba7185-9bfd-451c-872b-561a4c083a3c` — Vladimir Lenin -> Soviet Russia, 1917–1922, Chairman of the Council of People's Commissars
- `98ed2c28-eae7-41b3-b63d-5fb86dbd5270` — Vladimir Lenin -> USSR, 1922–1924, Chairman of the Council of People's Commissars

### Decision: `PARALLEL_PARENT_CHILD` + `SPLIT/OVERLAP_RESEARCH`

The 1922 Treaty/Declaration did not simply rename the RSFSR. The RSFSR, Ukrainian SSR, Byelorussian SSR and Transcaucasian SFSR entered a new `single union state`, the USSR, while the constituent republics retained their own governments and formal right of secession.

Therefore the robust ATLAS identity model is:

- RSFSR = continuing constituent Polity;
- USSR = new union/federal parent Polity from the union formation;
- relationship = `COMPOSITE_PARENT_CHILD` / federal-union membership, not `SAME_POLITY_NAME_CHANGE`;
- the appearance of USSR must not delete RSFSR from the map/data model.

### Lenin activity problem

The current two rows imply a clean 1922 replacement:

`Soviet Russia ends -> USSR starts`

That is too simple. Historical office data indicate Lenin formally remained chairman of the RSFSR Council of People's Commissars until his death, while a distinct USSR Council of People's Commissars was created later and Lenin was formally appointed its first chairman in 1923, although illness prevented him from functioning actively in that Union office.

Therefore the final activity model will probably need **overlap** rather than substitution:

- RSFSR governmental relation continues after the Union forms;
- a separate USSR-level office/relation begins when the Union government office actually exists;
- exact dates and `active/formal` chronology status must be verified from primary/official administrative records before correction.

The current `1922–1924 USSR Chairman` row should therefore not be accepted as exact merely because the USSR was created in December 1922.

Confidence: very high on RSFSR/USSR separate identities; high that current activity transition is oversimplified; medium on final exact office-date representation pending primary-source audit.

## 5. Identity-continuity taxonomy confirmed

Wave 5 confirms the following categories are necessary in the audit/correction layer:

### `SAME_POLITY_NAME_STATE_FORM`
Same political actor; official title/name/state form changes.

Example candidate:
- Tsardom of Russia -> Russian Empire (1721)

### `PARTITIONED_CONTINUITY`
A wider polity remains a continuity concept while distinct territorial governments/authority centers become map-relevant.

Example:
- Roman imperial east/west after 395

### `NEW_COMPOSITE_PARENT`
Existing Polities continue while a new union/confederated/federal parent Polity is formed.

Example:
- RSFSR + Ukrainian SSR + Byelorussian SSR + Transcaucasian SFSR -> USSR

### `TRUE_SUCCESSOR_POLITY`
A new political actor replaces/conquers/destroys a predecessor; separate UUIDs remain appropriate.

Examples must be established case-by-case; dynastic-state transitions such as Ming/Qing cannot be collapsed merely under a timeless civilization label.

### `PARALLEL_POLITY`
Distinct authorities coexist over overlapping territory or shared rulers.

Examples:
- Spanish Monarchy and Holy Roman Empire under Charles V;
- constituent crowns and a composite monarchy;
- potentially East/West Roman authority layers depending final Roman model.

## 6. Architecture implication

Before Polity-level destructive corrections, ATLAS needs a minimal representation for:

1. temporal Polity names/state forms;
2. Polity-to-Polity relations with time bounds;
3. continuity/succession classification;
4. Person–Polity relation type;
5. chronology status that can distinguish formal office from active exercise of power where evidence requires it.

This is not permission to build a large ontology before the audit is complete. It is a constraint on the correction engine: it must not merge or delete identities that the current schema cannot yet represent faithfully.

## 7. Evidence summary

### Roman / Byzantine continuity

- *The Cambridge Ancient History* describes the post-395 eastern and western parts as still constitutionally undivided even though separate governments nearly came to conflict.
- Cambridge scholarship on later Rome argues for underlying continuity of the Roman Empire across the period conventionally called Byzantine.
- Recent Cambridge work on East Roman identity emphasizes that `Byzantine Empire` is largely a historiographic label and that the polity/state elites understood themselves as Roman.

### Russia 1721

- Cambridge's *A Concise History of Russia* characterizes Peter's reign as a transformation of the structure and form of the existing Russian state/tsardom, supporting continuity rather than automatic sovereign succession at the imperial title change.

### USSR formation

- The 1922 union documents explicitly describe the RSFSR and the other Soviet republics as parties uniting into a new single union state, with separate republican institutions retained.
- Lenin's own 1922 proposal called for a treaty among the RSFSR, Ukraine, Byelorussia and Transcaucasia to form a Union with its own Central Executive Committee and Council of People's Commissars.
- Later office-history references distinguish Lenin's continuing RSFSR chairmanship from his formal appointment to the newly created Union-level Council of People's Commissars in 1923.

## 8. Correction gate

No Production mutation is authorized.

This wave strengthens the gate:

- a Polity merge now requires an explicit identity-continuity verdict;
- a Polity relink must not erase parent/child or parallel authority relationships;
- a name/state-form change should not automatically create a new territorial identity;
- exact Person activity dates must be derived from the relevant office/relation, not merely from a state's headline founding date;
- current Production snapshot reconciliation remains mandatory before any correction manifest is written.
