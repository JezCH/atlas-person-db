# P7 Hōjō Tokimune — Japan / Kamakura Governance Decision

> Status: REVIEWED BRANCH-ONLY DECISION / NO PRODUCTION MUTATION  
> Baseline: Baseline A v2 (`ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`)  
> Activity: `f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd`

## Exact Baseline A row

- Person: Hōjō Tokimune (`11fbeb26-a0e2-5abc-b6aa-e4010ff52e62`)
- current Polity: Kamakura Shogunate (`53943675-7711-5053-9f2e-f149f727aa54`)
- role: Shikken (`59da6758-27f3-5aaa-9f47-9fdae6777cba`)
- interval: 1268–1284
- period basis: term
- existing normalized repository Source: `pending-records-supplement-3.json`, Source UUID `7f21dc19-2215-57ca-ad50-aab379abf450`

## Reviewed model

The durable Stage 2 model separates the higher-order political realm from the government through which it was administered:

`Hōjō Tokimune -> Japan -> governs`

with:

`Japan + reviewed time interval -> Governance Context: Kamakura bakufu`

The `Kamakura Shogunate` label must therefore not remain the target Polity merely because the bakufu exercised major governmental authority. The bakufu is represented as a Governance Context. This does not assign national or local Territory geometry to Hōjō Tokimune.

This is consistent with the current Governance Context contract, which explicitly reviews `Japan -> Kamakura bakufu / shogunate` as a government-layer example.

## Historical source

Jeffrey P. Mass, “The Kamakura bakufu,” *The Cambridge History of Japan*, Cambridge University Press.

Reviewed URL:

`https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/kamakura-bakufu/BF02043614072DC18DBFF0EC11BCBAE0`

The source supports modeling the Kamakura bakufu inside the continuing Japanese political framework rather than as a replacement country identity.

## Temporal safety

This correction does **not** attempt to settle the historiographically broader start/end dates of the Kamakura bakufu.

For this execution package, the Governance assertion is deliberately limited to the minimum interval required to cover the reviewed Hōjō Activity:

- from: 1268, year precision
- to: 1284, year precision

Those boundaries mean “Kamakura governance is reviewed as applicable throughout this Activity.” They do not mean “the bakufu began in 1268” or “the bakufu ended in 1284.”

No month or day is fabricated.

## Execution decision

One atomic Correction v2 manifest must:

1. preserve the existing Activity UUID;
2. relink its Polity from Kamakura Shogunate to Japan (`e029b047-544a-52c7-8897-4e494ac72af4`);
3. set Person–Polity relation to `governs` (`67a57b37-1853-5f2a-b7ab-e6b2d32b56b6`);
4. preserve the original normalized Source and add the reviewed Mass Source to the Activity;
5. assert a literal Kamakura bakufu Governance Context period for Japan covering 1268–1284;
6. provenance-link that Governance assertion to both the original term record and the Mass institutional source;
7. leave the old Kamakura Shogunate Polity identity physically intact for later controlled cleanup;
8. perform no Territory/Geometry mutation and no Person merge.

The P8 `governance_context` blocker may be closed only after this exact package passes PostgreSQL dry-run, apply, exact replay, and atomic postcondition verification.
