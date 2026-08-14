# P7 Charles de Gaulle — French Republic / Fifth Republic Governance Decision

> Status: REVIEWED BRANCH-ONLY DECISION / NO PRODUCTION MUTATION  
> Baseline: Baseline A v2 (`ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`)  
> Activity: `4ac4c38c-6d8b-55ce-b999-b0639e67eb22`

## Baseline A

- Person: Charles de Gaulle (`4e43bb75-d0a5-50b3-afc2-72d9cb42f73a`)
- current Polity: French Fifth Republic (`524642ff-33fb-52f3-8623-e4a877b1997a`)
- role: President (`2f9e499f-050f-51ba-b2b7-1cc2935e5126`)
- period basis: term (`e78bcf72-81e3-5db8-a76a-8c2ca9c6d745`)
- current interval: 1959–1969, year-only legacy precision
- original Source: `pending-records-supplement.json:48`, Source UUID `55efaae0-3d24-5462-9d30-bc813ea7de0a`

The reviewed Governance Context contract already classifies the Fifth Republic as a `constitutional_regime`, not as the Person Activity's map-level Polity.

## Reviewed model

`Charles de Gaulle -> French Republic -> governs`

and separately:

`French Republic -> French Fifth Republic Governance Context`

This avoids treating a constitutional regime as a replacement country identity while preserving the regime label as reusable time-aware metadata. Person owns no Territory/Geometry.

A new literal `French Republic` Polity is authored because Baseline A contains no higher-order France/French Republic Polity suitable for this reviewed binding. It is not runtime-resolved by name.

## Chronology

Official Élysée material records the presidential transfer of powers to de Gaulle on **8 January 1959**. The Élysée biography records the failed referendum on 27 April 1969 and de Gaulle's resignation the following day, **28 April 1969**.

Therefore the Activity is refined from year-only 1959–1969 to:

- start: 1959-01-08, exact Gregorian day
- end: 1969-04-28, exact Gregorian day

No unsupported time of day is added.

## Governance interval

The Constitution of 4 October 1958 establishes the constitutional framework identified as the Fifth Republic. The Governance Context assertion therefore begins on **1958-10-04** and has an open end in this dataset. A null end means no end boundary is asserted by this package; it is not a claim that the regime can never end.

## Source authority

- Élysée, “L'investiture de Charles de Gaulle” — 8 January 1959 transfer of presidential powers.
- Élysée, “Charles de Gaulle” — resignation on 28 April 1969.
- Conseil constitutionnel, Constitution of 4 October 1958 — constitutional framework and France as a Republic.

## Execution decision

One atomic Correction v2 manifest must:

1. preserve Activity UUID `4ac4c38c-6d8b-55ce-b999-b0639e67eb22`;
2. relink from the old French Fifth Republic Polity to literal French Republic Polity `b138f5e4-ff83-40f6-bdb1-83b08c0256cb`;
3. set relation to `governs` (`67a57b37-1853-5f2a-b7ab-e6b2d32b56b6`);
4. refine the exact term to 1959-01-08 through 1969-04-28;
5. preserve the repository Source and add both Élysée Sources;
6. author literal French Fifth Republic Governance Context `078c50b9-4a15-46b4-9181-567cf07ee838`;
7. assert the constitutional-regime Governance period from 1958-10-04 with open end and Conseil constitutionnel provenance;
8. leave the old Fifth Republic Polity identity physically intact for later controlled cleanup;
9. perform no Person merge or Territory/Geometry mutation.
