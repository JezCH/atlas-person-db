# Stage 2 Structural Polity Relation Interval Research — 2026-08-12

> Status: BASELINE-INDEPENDENT HISTORICAL RESEARCH / NO PRODUCTION MUTATION
>
> Purpose: close as much of `ATLAS-RQ-0214` as possible before Baseline A without pretending that identity UUIDs or disputed transition dates are already known.

## Core rule

A structural Polity relation must not inherit its interval from a Person's Activity merely because that Person happens to be the case that exposed the relation. The relation is an assertion between two Polity identities and therefore needs its own temporal boundary, evidence and provenance.

This research pack also distinguishes three different states that older planning notes tended to blur:

1. **historical relation semantics resolved** — we know what kind of relation existed;
2. **historical interval resolved** — we have defensible start/end boundaries at the precision supported by evidence;
3. **Production binding resolved** — the exact surviving subject/object Polity UUIDs have been rebound against Baseline A.

Only the first two can be completed before Baseline A. Production binding always waits.

## 1. Dominion of Canada → United Kingdom

### Sources

The Constitution Act, 1867 establishes that the provinces would form one Dominion under the name Canada and that the union date would be appointed by proclamation. Government of Canada constitutional material identifies Confederation as beginning on **1 July 1867**.

The Statute of Westminster is dated **11 December 1931**. It gave Dominion parliaments full extraterritorial legislative power and provided that future UK Acts would not extend to a Dominion without that Dominion's request and consent. Government of Canada material treats the Statute as a major legal-autonomy boundary, while also emphasizing that Canada's constitutional-amendment dependence on the UK was deliberately retained until later patriation.

Sources:

- https://laws-lois.justice.gc.ca/eng/Const/page-1.html
- https://justice.canada.ca/eng/rp-pr/csj-sjc/constitution/lawreg-loireg/p1t171.html
- https://www.canada.ca/en/intergovernmental-affairs/services/federation/statute-westminster.html
- https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html

### ATLAS decision

`Dominion of Canada -> dominion_of -> United Kingdom` remains the reviewed structural relation for the dependency/autonomy phase that exposed the Laurier case.

- start boundary: **1867-07-01**, day precision, exact, Gregorian;
- legal-autonomy transition milestone: **1931-12-11**, day precision, exact, Gregorian;
- under ATLAS inclusive-interval semantics, a dependency-form `dominion_of` interval may end **1931-12-10** if the relation code is defined specifically as legal subordination/dependency to the UK.

However, **this end is not yet authorized as a Production relation interval**. The reason is semantic rather than chronological: Canada retained a separate constitutional-amendment dependency after 1931. ATLAS must not overload `dominion_of` to mean both pre-1931 legislative/external subordination and every residual constitutional tie.

Therefore:

- relation semantics: resolved;
- start boundary: resolved;
- 1931 transition date: resolved;
- final `dominion_of` end boundary: **model-qualified candidate**, pending confirmation that this code means the dependency phase rather than a generic historic Dominion label;
- post-1931 constitutional tie: do not invent a new relation type unless a real Runtime/query use case requires it.

## 2. British Raj → United Kingdom

### Sources

The 1858 transfer from East India Company government to Crown government is the correct structural beginning of the British Raj model. UK parliamentary records explicitly describe the policy of transferring the government of the Company's territories to the Crown, and later parliamentary material refers to the Queen's Proclamation of **1 November 1858**.

For the end boundary, official Indian parliamentary and Ministry of Defence material identifies **15 August 1947** as the independence boundary and the date on which the Indian Independence Act took effect.

Sources:

- https://hansard.parliament.uk/Commons/1858-06-17/debates/37564106-0039-4b5f-9af3-805464f7a721/GovernmentOfIndia
- https://hansard.parliament.uk/commons/1876-03-14/debates/de81705a-fc01-40b2-826f-cdfcab9af31e/TheRoyalStyleAndTitle
- https://eparlib.sansad.in/handle/123456789/760007
- https://www.rashtraparv.mod.gov.in/about-rashtraparv

### ATLAS decision

`British Raj -> colonial_dependency_of -> United Kingdom` is structurally resolved.

- end boundary: **1947-08-14** inclusive, day precision, exact, Gregorian, because independent India begins on 1947-08-15;
- start boundary candidate: **1858-11-01**, corresponding to the Queen's Proclamation/Crown-government transition;
- start boundary Production approval: **withheld** until the exact primary statutory/proclamation locator is normalized into ATLAS provenance.

The historical date is strongly supported, but ATLAS does not downgrade its source standard merely to turn a candidate into an exact database assertion.

## 3. Soviet Russia / RSFSR → Soviet Union

### Sources

The First Congress of Soviets approved the Declaration and Treaty forming the USSR on **30 December 1922**; the Presidential Library likewise describes the RSFSR, Ukrainian SSR, Byelorussian SSR and Transcaucasian SFSR as uniting into the USSR on that date.

The terminal boundary is legally/historiographically multi-step. Presidential Library materials separately attach significance to the **8 December 1991** Belovezha agreement, the **21 December 1991** Alma-Ata declaration, and the **25 December 1991** renaming of the RSFSR to the Russian Federation. ATLAS must not manufacture a false single-day certainty merely because the schema can store one.

Sources:

- https://docs.historyrussia.org/ru/nodes/106963-i-sezd-sovetov-soyuza-ssr-prinyal-deklaratsiyu-i-dogovor-ob-obrazovanii-sssr-30-dekabrya-1922-g
- https://www.prlib.ru/item/1417130
- https://www.prlib.ru/node/619792
- https://www.prlib.ru/history/619829
- https://www.prlib.ru/history/619842

### ATLAS decision

`Soviet Russia / RSFSR -> constituent_of -> Soviet Union` is structurally resolved.

- start: **1922-12-30**, day precision, exact;
- end: **1991**, year precision, uncertain at the final-day level;
- reason: multi-step Union dissolution means the current evidence set does not justify collapsing the relation's final instant to one universally authoritative day;
- no `1991-12-26` or other exact date is hard-coded simply to satisfy implementation convenience.

A future dedicated Soviet-dissolution chronology review may increase the boundary precision without changing the Polity identities or relation type.

## 4. Kingdom of Huainan → Western Han

### Sources

The *Shiji* biography of Qing Bu/Ying Bu states that in the seventh month of the fourth Han year he was enfeoffed as **King of Huainan**, and later describes his capital and commanderies. The same biography shows his subsequent rebellion. The primary text therefore supports a real dependent kingdom rather than a fiction inferred from the title `King`.

Source:

- https://ctext.org/shiji/qing-bu-lie-zhuan/zh

### ATLAS decision

The structural semantics are resolved:

`Kingdom of Huainan -> vassal_of -> Western Han`

and Ying Bu's Person relation can eventually be `rules` against the Huainan Polity.

The absolute Gregorian/BCE conversion of the initial enfeoffment is **not frozen here**. The primary source gives a regnal-year/month expression; secondary conversions commonly map it around 203 BCE, while the old ATLAS row used 202 BCE. This discrepancy is exactly the kind of case where the project must preserve uncertainty instead of selecting whichever date makes migration easier.

Therefore:

- relation type: resolved;
- existence of the dependent Kingdom of Huainan under Ying Bu: resolved;
- absolute start boundary: unresolved pending chronology normalization;
- end/continuity: requires a Polity-identity decision on whether the same Huainan UUID continues through subsequent Han kings;
- no new Huainan UUID is created before Baseline A identity lookup.

## Result

This closes the **structural-relation meaning** for all four reviewed relation families without conflating it with UUID binding.

| Relation | Semantics | Start | End | Production-ready? |
|---|---|---|---|---|
| Canada `dominion_of` UK | resolved | 1867-07-01 exact | 1931 transition resolved; relation-end model-qualified | no |
| British Raj `colonial_dependency_of` UK | resolved | 1858-11-01 candidate; primary locator pending | 1947-08-14 exact | no |
| RSFSR `constituent_of` USSR | resolved | 1922-12-30 exact | 1991 year-level uncertain | no |
| Huainan `vassal_of` Western Han | resolved | chronology normalization pending | continuity research pending | no |

No row here carries a Production Polity UUID. Baseline A remains mandatory before correction/backfill manifests are generated.
