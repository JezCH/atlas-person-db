# ATLAS Direct Person–Polity Relation Review v1

> Status: STAGE 2 HISTORICAL AUDIT ONLY
>
> Production DB mutation: **none**
>
> Purpose: close the 14-row `DIRECT_RELATION_REVIEW` queue produced by `RELATION_BACKFILL_READINESS_V1_2026-08-12.md` using source-backed, row-specific historical review.

## 1. Method

The Relation vocabulary remains:

```text
rules
governs
serves
active_in
opposes
claims_rule
```

This review does **not** ask whether an office title resembles one of those words. It asks what the current Person–Polity Activity actually means.

For each row:

1. preserve the current Polity only where the prior Polity audit already allows it;
2. distinguish sovereign/supreme polity identity (`rules`) from top governmental authority (`governs`);
3. use `serves` for official service without top-level government control;
4. refuse a Relation backfill where the current row itself must first be split/relinked;
5. refuse a Relation backfill where scholarship does not justify a stable political-authority interpretation.

The source states the historical evidence. The ATLAS Relation value is a **modeling conclusion derived from that evidence**, not a quotation or terminology claim about the source.

## 2. Final result

| Activity UUID | Person / Polity | Reviewed action | Relation | Reason |
|---|---|---|---|---|
| `85896e61-c810-590e-bf3c-9240168d2953` | Pericles / Athens | `BACKFILL_RELATION` | `governs` | Dominant democratic political/military leadership, not monarchy. |
| `580bc3b3-c93d-57ee-8276-aed42a625b10` | Marquess Lie of Han / Han | `BACKFILL_RELATION` | `rules` | Monarch/ruler of Han in the reviewed 399–387 BCE interval. |
| `2f18a41d-6f4e-541d-b549-32ec505e8c53` | Boudica / Iceni | `HISTORICAL_RESEARCH_FIRST` | — | Modern scholarship explicitly treats her political authority as ambiguous. |
| `eaa40098-26b0-5425-8daf-83f85207da3f` | Dong Zhuo / Eastern Han | `BACKFILL_RELATION` | `governs` | Controlled the Han court and imperial succession without becoming Han emperor. |
| `b0e51c35-a02a-568a-969e-4e9207b2c787` | Theodora / Byzantine Empire | `BACKFILL_RELATION` | `governs` | Augusta and imperial administrative partner, but not the sole sovereign emperor identity. |
| `226e8667-d437-5ae7-8284-77a365371260` | Eleanor of Aquitaine / Duchy of Aquitaine | `STRUCTURAL_CORRECTION_FIRST` | — | One 1137–1204 row flattens materially different authority phases. |
| `250ee5a9-4227-52c7-915a-233b5bdb3ddf` | Liu Futong / Red Turban Song | `BACKFILL_RELATION` | `governs` | Senior minister/chancellor; Han Lin'er was installed as emperor while effective government authority concentrated in Liu. |
| `7e6d042a-78a2-54b0-9d27-efcab3043282` | Owain Glyndŵr / Principality of Wales | `BACKFILL_RELATION` | `rules` | He assumed the princely title and built claimant-state institutions/diplomacy. Claim/effective-control extent remains Territory semantics. |
| `76007cca-bbf3-5e04-87f7-a362cd2f93eb` | Henry the Navigator / Kingdom of Portugal | `BACKFILL_RELATION` | `serves` | Prince and major office-holder/patron within Portuguese crown structures, not Portuguese sovereign. |
| `627ed16c-1fa9-5047-8e0c-bc3c552fb5c7` | Catherine de' Medici / Kingdom of France | `STRUCTURAL_CORRECTION_FIRST` | — | Consort/adviser phases and regency/government phases cannot share one Relation. |
| `34ed5d1e-b93b-5955-b5e9-2edbc4ffaf8d` | Nzinga Mbande / Kingdom of Ndongo | `STRUCTURAL_CORRECTION_FIRST` | — | Legitimacy, claim, effective authority, and later political base require phase-aware modeling. |
| `48cca2d5-adf6-51e6-9fa3-a1f463f1d2be` | Simon Bolivar / Peru | `BACKFILL_RELATION` | `governs` | Congress/constitutional authority placed supreme dictatorial governmental power in Bolívar; not sovereign ownership of Peru. |
| `7a89364b-dacf-5798-9a6d-dd312cbbee4d` | Mahatma Gandhi / British Raj | `STRUCTURAL_CORRECTION_FIRST` | — | The row crosses the 1947 end of British rule and post-independence activity in India. |
| `5be7f060-46d1-58f9-ad7c-3b03458c198a` | Tecumseh / Tecumseh's Confederacy | `BACKFILL_RELATION` | `governs` | He organized and politically led the intertribal confederacy; monarchic `rules` would overstate its political form. |

Outcome:

- exact Relation backfill newly ready: **9**
- structural correction first: **4**
- historical research first: **1**
- unresolved direct Relation queue: **0**
- new Relation enum required: **0**

## 3. Pericles — Athens → `governs`

### Evidence

Vincent Azoulay's *Pericles of Athens* analyzes Pericles' power through the elected `strategos` office and concludes that his military command and political success allowed him to dominate Athenian political life for roughly two decades. A separate chapter explicitly rejects the idea of a literal “Periclean monarchy”: Pericles operated within a democratic order whose demos retained and expanded power.

Sources:

- Vincent Azoulay, **The Bases of Periclean Power: The Stratēgos**, Princeton University Press / Oxford Academic, 2014: https://academic.oup.com/princeton-scholarship-online/book/15983/chapter/170930400
- Vincent Azoulay, **The Individual and Democracy: The Place of the “Great Man”**, Princeton University Press / Oxford Academic, 2014: https://academic.oup.com/princeton-scholarship-online/book/15983/chapter/170934955

### ATLAS conclusion

```text
relation_type = governs
```

`rules` would incorrectly convert dominant democratic leadership into monarchic/supreme polity identity. `serves` would understate the reviewed level of political control.

## 4. Marquess Lie of Han — Han → `rules`

### Evidence

Chinese Text Project's historical-person entry identifies Han Qǔ / Marquess Lie as ruler of Han from 399 to 387 BCE and identifies him as a monarch of the Warring States Han polity.

Source:

- Chinese Text Project, **韓烈侯 / Marquess Lie of Han**: https://ctext.org/datawiki.pl?if=gb&remap=gb&res=938588

### ATLAS conclusion

```text
relation_type = rules
```

This is a straightforward monarch–Polity relationship under the existing reviewed chronology.

## 5. Boudica — Iceni → `HISTORICAL_RESEARCH_FIRST`

### Evidence

Caitlin Gillespie's Oxford study explicitly notes that Dio's use of a queen term carries Roman political implications that may be inaccurate and states that Boudica's political authority is ambiguous. The evidence securely supports leadership of the revolt, but it does not justify automatically converting the current `Queen and revolt leader` role into a stable sovereign relation to the Iceni.

Source:

- Caitlin C. Gillespie, **Wife, Queen, Roman?**, in *Boudica: Warrior Woman of Roman Britain*, Oxford University Press, 2018: https://academic.oup.com/book/9968/chapter-abstract/157325497

### ATLAS conclusion

No Relation backfill yet.

```text
reviewed_action = HISTORICAL_RESEARCH_FIRST
```

This is a deliberate historical-uncertainty state, not missing-data failure.

## 6. Dong Zhuo — Eastern Han → `governs`

### Evidence

The *Hou Han Shu* biography preserved by Chinese Text Project describes Dong Zhuo threatening the high officials, forcing the deposition of the young emperor, and enthroning the Prince of Chenliu as Emperor Xian. The evidence is one of coercive control over the Han court and succession, not a claim that Dong himself became Han emperor.

Source:

- *Hou Han Shu*, **Biographies of Dong Zhuo**, Chinese Text Project: https://ctext.org/hou-han-shu/dong-zhuo-lie-zhuan

### ATLAS conclusion

```text
relation_type = governs
```

The current Polity remains Eastern Han context while the relation records de facto top governmental control.

## 7. Theodora — Byzantine Empire → `governs`

### Evidence

Diliana Angelova's study of the San Vitale imperial partnership concludes that Theodora, as Augusta, is represented as Justinian's partner in imperial administration, while Justinian leads the army, oversees administration, and handles church affairs. This supports significant governmental authority without requiring ATLAS to represent Theodora as the sole sovereign emperor of the Byzantine polity.

Source:

- Diliana N. Angelova, **Conclusion: Sacredness, Partnership, and Founding in the San Vitale Mosaics**, University of California Press / Oxford Academic, 2015: https://academic.oup.com/california-scholarship-online/book/15965/chapter-abstract/170905891

### ATLAS conclusion

```text
relation_type = governs
```

`governs` is intentionally available for high governmental/imperial authority that should not be collapsed into sovereign `rules`.

## 8. Eleanor of Aquitaine — Duchy of Aquitaine → structural correction first

### Evidence

Jean Flori's study emphasizes that Eleanor's authority cannot be represented by a simple continuous independent-rule model. For 1137–1152 the surviving legal acts relating to Aquitaine were usually joint with Louis VII, who also bore the ducal title. Later phases of Eleanor's life involved materially different conditions of authority, confinement, and governance.

Source:

- Jean Flori, **Duchess of Aquitaine and Normandy**, in *Eleanor of Aquitaine: Queen and Rebel*, Edinburgh University Press / Oxford Academic, 2007: https://academic.oup.com/edinburgh-scholarship-online/book/20614/chapter-abstract/179908476

### ATLAS conclusion

The current single Activity `1137–1204 / Duchess` is not a safe Relation-backfill target.

```text
reviewed_action = STRUCTURAL_CORRECTION_FIRST
```

Split historically meaningful authority phases first, then assign relations to the surviving/replacement Activities.

## 9. Liu Futong — Red Turban Song → `governs`

### Evidence

The *Ming Shi* biography of Han Lin'er records that Han Lin'er was installed as emperor of the Song regime, while Liu Futong held senior government office; after killing Du Zundao, Liu made himself chancellor/Grand Preceptor and the text states that governmental authority became concentrated in him. The *Xu Zizhi Tongjian* likewise records Han Lin'er's enthronement and Liu's high ministerial office.

Sources:

- *Ming Shi*, **Biographies of Guo Zixing and Han Lin'er**, Chinese Text Project: https://ctext.org/wiki.pl?chapter=692556&if=gb
- *Xu Zizhi Tongjian*, vol. 212, Chinese Text Project: https://ctext.org/wiki.pl?chapter=148547&if=gb

### ATLAS conclusion

```text
relation_type = governs
```

Han Lin'er remains the nominal emperor; Liu's reviewed relation is de facto/top governmental control rather than sovereign `rules`.

## 10. Owain Glyndŵr — Principality of Wales → `rules`

### Evidence

The Dictionary of Welsh Biography records Glyndŵr's assumption of the title Prince of Wales and the royal arms of Gwynedd, and identifies the political programme of a national parliament, independent Welsh church, and diplomatic relations.

Source:

- Thomas Jones Pierce, **OWAIN GLYNDWR (c. 1354–1416), 'Prince of Wales'**, Dictionary of Welsh Biography: https://biography.wales/article/s-OWAI-GLY-1354.html

### ATLAS conclusion

```text
relation_type = rules
```

The current Polity is the claimant Welsh principality itself. Whether a particular area was claimed, effectively controlled, or contested is a separate Territory Record question and must not be encoded by downgrading the Person–Polity relation.

## 11. Henry the Navigator — Kingdom of Portugal → `serves`

### Evidence

Cambridge scholarship describes Prince Henry as a vital but not unique figure in Portuguese expansion and identifies his institutional position as governor of the military Order of Christ, from which he sponsored exploration. Other modern scholarship likewise treats him as an infante/prince and major office-holder within the Portuguese monarchy, not as the sovereign king of Portugal.

Sources:

- **Europe and the East**, *The New Cambridge Modern History*, Cambridge University Press: https://www.cambridge.org/core/books/abs/new-cambridge-modern-history/europe-and-the-east/1AC5C924D0696D41E0A397E781F5CAFA
- **Wine and Portugal: A Brief History**, *European Review*, Cambridge University Press: https://www.cambridge.org/core/journals/european-review/article/wine-and-portugal-a-brief-history/1D8A780317C586A218C446F31FBCE780

### ATLAS conclusion

```text
relation_type = serves
```

His specific princely, Order, patronage, and exploration roles remain in Role/other entities; `serves` prevents the Portuguese kingdom's territory from being rendered as Henry's personal territory.

## 12. Catherine de' Medici — Kingdom of France → structural correction first

### Evidence

Oxford Bibliographies states that Catherine never ruled France in her own right, but served as regent for Charles IX and remained a senior adviser, with particularly strong authority during his minority. The *English Historical Review* documents the 1560–63 regency and her control over offices, benefices, and finances.

Sources:

- Katherine Crawford, **Catherine de' Medici**, Oxford Bibliographies, updated 2025: https://academic.oup.com/reference/62416/reference-article-abstract/555920637
- **Perilous Performances: Gender and Regency in Early Modern France**, *The English Historical Review*: https://academic.oup.com/ehr/article-abstract/CXXI/490/300/458523

### ATLAS conclusion

The current compound `Queen consort and regent / 1547–1589` Activity must be split before Relation backfill.

```text
reviewed_action = STRUCTURAL_CORRECTION_FIRST
```

A consort/adviser phase and a regency/government phase do not share one relation type.

## 13. Nzinga Mbande — Kingdom of Ndongo → structural correction first

### Evidence

John Thornton's *Journal of African History* study rejects a simplistic legitimacy model: succession in Ndongo drew on conflicting precedents, and Nzinga established legitimacy through historical precedent and control of chief military officials. Thornton's later history treats her struggle for Ndongo as a changing political and military process. This supports real ruling authority, but also confirms that legitimacy, claim, effective authority, and later political bases cannot be flattened into one undifferentiated `Queen regnant and claimant / 1624–1663` relation.

Sources:

- John K. Thornton, **Legitimacy and Political Power: Queen Njinga, 1624–1663**, *The Journal of African History* 32(1), 1991: https://www.cambridge.org/core/journals/journal-of-african-history/article/abs/legitimacy-and-political-power-queen-njinga-162416631/0A8C82A9E8B34BBF94A7CA12D4A819D1
- John K. Thornton, **Queen Njinga's Struggle for Ndongo**, in *A History of West Central Africa to 1850*, Cambridge University Press, 2020: https://www.cambridge.org/core/books/history-of-west-central-africa-to-1850/queen-njingas-struggle-for-ndongo/1C9A81A7BA46ADD0FF917CD44BF38F1A

### ATLAS conclusion

```text
reviewed_action = STRUCTURAL_CORRECTION_FIRST
```

The replacement model must distinguish the relevant Ndongo/Matamba authority phases and Territory claim/effective-control semantics before assigning one or more Person Relations.

## 14. Simón Bolívar — Peru → `governs`

### Evidence

Oxford scholarship describes Bolívar's Peruvian dictatorship as beginning on 10 February 1824 and later developing into a constituent dictatorship; the relevant political order delegated extraordinary/supreme authority to him. Bolívar's own political writings also distinguish supreme/dictatorial office from popular/national sovereignty.

Sources:

- **Constituent Dictatorship: A Latin American Tradition**, *The Oxford Handbook of Constituent Power*, Oxford University Press, 2026: https://academic.oup.com/edited-volume/62370/chapter-abstract/554751385
- Simón Bolívar / David Bushnell (ed.), **The Angostura Address**, in *El Libertador: Writings of Simón Bolívar*, Oxford University Press, 2003: https://academic.oup.com/book/48662/chapter/420654311

### ATLAS conclusion

```text
relation_type = governs
```

ATLAS records supreme governmental authority without treating the republican Polity as the personal sovereign property of Bolívar.

## 15. Mahatma Gandhi — British Raj → structural correction first

### Evidence

The Gandhi Heritage Portal records the Quit India resolution in 1942 and Gandhi's imprisonment, then records his activities around and after 15 August 1947. Government of India Gandhi Smriti chronology records that India was partitioned and granted independence in 1947, followed by Gandhi's anti-riot, refugee, communal-unity, and fasting activity through January 1948.

Sources:

- Gandhi Heritage Portal, chronology including Quit India and 1947–48 activity: https://www.gandhiheritageportal.org/eventcontentdetail/OA%3D%3D/NzQxOQ%3D%3D
- Gandhi Smriti and Darshan Samiti, Government of India, **Chronology of Mahatma Gandhi**: https://www.gandhismriti.gov.in/more/chronology-mahatma-gandhi
- Gandhi Smriti and Darshan Samiti, Government of India, **Last 144 Days**: https://www.gandhismriti.gov.in/last-144-days

### ATLAS conclusion

The current `British Raj / 1915–1948` Activity is structurally false across the end of British rule.

```text
reviewed_action = STRUCTURAL_CORRECTION_FIRST
```

At minimum, the reviewed replacement must separate:

```text
pre-independence British Raj -> opposition/anti-colonial relation by reviewed interval
post-independence India -> post-colonial political/social activity context
```

The exact post-independence Relation should be assigned to the replacement Activity rather than guessed onto the current British Raj row.

## 16. Tecumseh — Tecumseh's Confederacy → `governs`

### Evidence

The U.S. National Park Service states that Tecumseh formed a confederacy of native tribes and represented many Native interests; Harrison recorded the unusual obedience and respect of Tecumseh's followers. A separate NPS account describes Tecumseh taking control of the political aspects of the coalition while Tenskwatawa remained the religious leader.

Sources:

- U.S. National Park Service, **Summer 1811: Tecumseh attempts to negotiate with white American settlers**: https://www.nps.gov/articles/tecumseh.htm
- U.S. National Park Service, **Ranger Greg's War of 1812 Blog**: https://www.nps.gov/gois/learn/news/ranger-greg.htm
- U.S. National Park Service, **Tecumseh**: https://www.nps.gov/people/tecumseh.htm

### ATLAS conclusion

```text
relation_type = governs
```

`governs` captures political leadership of an intertribal confederacy without imposing a monarchic sovereign form that the evidence does not justify.

## 17. Migration consequence

Combining this review with the prior readiness audit, the original 66 conservative review rows become:

```text
14 reviewed Relation-ready
35 structural-correction-first
6 identity-reconciliation-first
11 historical-research-first
0 direct-relation-review remaining
```

Those **14 reviewed Relation-ready** are:

### Previously ready (5)

```text
Muhammad -> rules
Gajah Mada -> serves
Tun Perak -> serves
Satuq Bughra Khan -> rules
Nurhaci -> rules
```

### Closed in this review (9)

```text
Pericles -> governs
Marquess Lie of Han -> rules
Dong Zhuo -> governs
Theodora -> governs
Liu Futong -> governs
Owain Glyndŵr -> rules
Henry the Navigator -> serves
Simón Bolívar / Peru -> governs
Tecumseh -> governs
```

No additional top-level Relation enum was required.

## 18. Safety rule

Do not interpret `BACKFILL_RELATION` as authorization to write Production now.

The Production sequence remains:

```text
add nullable relation schema
-> apply reviewed structural corrections / retire obsolete rows
-> reconcile duplicate identities
-> finish historical research
-> backfill relation on surviving Activities
-> semantic-key/hash/replay/merge cutover
-> only then enforce end-state required Relation semantics
```

Rows known to be structurally wrong must not receive a cosmetic Relation value merely to improve coverage statistics.
