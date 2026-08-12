# Stage 2 Structural Polity Relation Interval Research — 2026-08-12

> Status: BASELINE-INDEPENDENT INTERVAL MODEL CLOSED / PRODUCTION UUID BINDING PENDING

A Person Activity never defines a Polity→Polity relation interval. Each structural relation has its own source-backed boundaries. Production subject/object UUIDs remain null until Baseline A v2.

## Canada → United Kingdom

`Dominion of Canada -> dominion_of -> United Kingdom`

- start: **1867-07-01**, day/exact/Gregorian;
- inclusive end: **1931-12-10**, day/exact/Gregorian;
- autonomy milestone: **1931-12-11**, Statute of Westminster.

ATLAS defines `dominion_of` here as the pre-Statute dependency/subordination relation, not as a generic historical label meaning “a country once called a Dominion.” Canada's later Canada-specific constitutional-amendment dependence is not overloaded into this relation.

Sources: Government of Canada constitutional/statutory material and the Statute of Westminster analysis linked in the machine research file.

## British Raj → United Kingdom

`British Raj -> colonial_dependency_of -> United Kingdom`

- start: **1858-11-01**, day/exact/Gregorian — Queen's Proclamation at Allahabad announced transfer of the government of India from the East India Company to the Crown;
- inclusive end: **1947-08-14**, day/exact/Gregorian;
- independence milestone: **1947-08-15**.

The British Library archival catalogue supplies the exact 1 November 1858 proclamation date; UK Parliament supplies the 15 August 1947 independence boundary.

## RSFSR → Soviet Union

`Soviet Russia / RSFSR -> constituent_of -> Soviet Union`

- start: **1922-12-30**, day/exact/Gregorian;
- inclusive end: **1991-12-25**, day/exact/Gregorian;
- Union cessation milestone: **1991-12-26**.

The 26 December declaration states that the USSR ceased to exist as a state and subject of international law. Under inclusive ATLAS interval semantics the constituent relation therefore ends on 25 December. The RSFSR/Russian Federation name transition does not itself force a new Polity UUID.

## Ying Bu's Huainan phase → Western Han

`Huainan political actor under Ying Bu -> vassal_of -> Western Han`

- start: **203 BCE**, year precision/exact-at-year-level;
- end: **196 BCE**, year precision/exact-at-year-level;
- month/day deliberately omitted.

The *Shiji* records Ying Bu's enfeoffment as King of Huainan in Han year 4, seventh month; reviewed chronology places that event in 203 BCE. His rebellion against Han is in 196 BCE. ATLAS therefore has enough evidence to close the year-level vassal interval while refusing to fabricate a Gregorian month/day.

This assertion is intentionally scoped to **Ying Bu's Huainan political actor**. It does not silently decide whether every later Han Kingdom of Huainan must share the same UUID.

## Result

| Relation | Historical interval model | Remaining dependency |
|---|---|---|
| Canada `dominion_of` UK | 1867-07-01 → 1931-12-10 | Baseline A v2 UUID binding |
| British Raj `colonial_dependency_of` UK | 1858-11-01 → 1947-08-14 | Baseline A v2 UUID binding |
| RSFSR `constituent_of` USSR | 1922-12-30 → 1991-12-25 | Baseline A v2 UUID binding |
| Ying Bu Huainan `vassal_of` Western Han | 203 BCE → 196 BCE, year precision | reviewed Huainan live identity + Baseline A v2 UUID binding |

The historical interval research is closed. `ATLAS-RQ-0214` remains pending because Production UUID/source binding is a live-state task, not because these four interval models still need generic research.
