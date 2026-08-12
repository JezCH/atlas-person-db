# Stage 2 pre-Vercel domain closure — 2026-08-12

## Result

All remaining **Baseline-A-independent Stage 2 model decisions** are now either resolved or converted into explicit historical uncertainty. There is no longer an undifferentiated “research later” bucket that can silently change semantics after Production Train 1.

The machine authority for this closure is `research/pre-vercel/stage2-pre-vercel-domain-closure.v1.json`.

## What “closed” means

Closed does not mean every date and polygon is known. It means one of the following is true:

1. the Person/Polity/Relation/Governance model is resolved and only live UUID rebinding remains;
2. a source-backed political actor exists but its historical name is unknown, so an explicitly non-historical editorial catalog label is used;
3. People/Event context is routed out of Person–Polity Activity;
4. available sources do not justify greater temporal precision, so the uncertainty is stored or made a P8 Runtime-readiness gate instead of being fabricated;
5. Territory/Geometry is a P14 authoring task and is not automatically a Person semantic-cutover blocker.

## Important closures

- Oda Nobunaga and Uesugi Kenshin: source-backed territorial political actors; clan names are not promoted to Polities. Editorial labels solve catalog disambiguation without inventing a historical state-name.
- Hideyoshi: `Toyotomi Regime` remains Governance Context. The coarse 1582–1598 Japan row is split at year-level 1590; pre-1590 expanding authority is distinct from post-1590 governance of Japan.
- Chinese regional six: each now has an explicit phase model. Lü Bu's Yan and Xu territorial authorities are separate Polity identities because an intervening loss/displacement breaks political-actor continuity. Fang Guozhen's political actor remains continuous while superior relations vary independently.
- Sacagawea, Tecumseh, and Leftraru use the new People/Event boundary instead of ethnic/event data being coerced into political authority.
- Poundmaker is separated into service under Red Pheasant and rule of his own band from 1878.
- Sitting Bull's political actor is retained, but the source-backed “1850s” leadership start is not collapsed to an invented single year. That becomes an explicit P8 readiness decision after live rebinding.
- British Raj, Canada, RSFSR/USSR and Ying Bu/Huainan structural relation intervals now have reviewed temporal models; Production UUIDs still wait for Baseline A v2.

## Remaining work after this closure

The remaining Stage 2 work is no longer pre-Vercel historical-model research. It is live-state work:

- one exact-SHA Production Train 1;
- Baseline A v2 intake;
- fresh ledger/work queues from updated `main`;
- reviewed live Person/Polity/name-kind bindings;
- additive P5 schema and correction v2;
- historical backfill and P8 gate;
- P9 semantic-key v2 cutover;
- P10 duplicate revalidation and physical Person merge;
- Baseline B and legacy retirement.

P14 Territory/Geometry remains a separate map-authoring stream and is not used as an excuse to invent Person Activity semantics.
