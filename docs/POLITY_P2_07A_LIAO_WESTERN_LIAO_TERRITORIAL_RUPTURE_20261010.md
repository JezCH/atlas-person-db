# POLITY-P2-07A — Liao Dynasty → Western Liao / Qara Khitai

**Decision: KEEP_SEPARATE / terminal review seed `liao-western-liao` | 2026-10-10 (KST)**

This is one independent no-canonical-write territorial/operational-rupture audit while the Sweden historiographic-period source audit is correctly blocked by its same-SHA Production deployment prerequisite. It is NOT a substitute for the full-Production discovery/cross-table audit required to close parent #1895.

## Exact public Production observation (not inferred state duration)

The live Vercel Production `/api/atlas-read?__atlas_read_surface=polity` census included both exact normalized identities, with no separately named Qara Khitai Polity in the public-name match. Polity `detail` queries and representative Person `detail` queries returned:

| Live record | Liao Dynasty / 요나라 | Western Liao / 서요 |
|---|---|---|
| Polity UUID | `c7414968-29fc-5749-bfda-bf4dab331dd8` | `60d35355-b385-55d4-8d5c-f9b27cad29a3` |
| Runtime Polity Activity count | 4 | 1 |
| Runtime distinct Person count | 4 | 1 |
| Registered Activity coverage only | 916–1031 | 1124–1143 |
| Representative Person UUID | Liao Taizu `7ae7c200-ac84-5011-90b5-a08d0f9bd1eb` | Yelü Dashi `79afe5a3-48ce-4285-9963-6be701d2cad8` |
| Representative Activity UUID | `e9c34843-79c6-53e8-bc71-6a674d3ba9bb` | `81b6ff0d-02da-411d-8c0a-b22036625721` |

Both Person detail responses resolve to **their respective distinct exact Polity UUID**. Liao Taizu 916–926 retains year/exact as recorded; Yelü Dashi 1124–1143 has `start.granularity=year`, `start.certainty=approximate`, and `end.granularity=year`, `end.certainty=exact`. The Yelü Dashi record cites historian **Michal Biran** and explains the specialist concern with the conventional 1124 enthronement chronology. Do NOT silently upgrade 1124 to exact day precision, and do NOT take the first/last *registered* Activity as the entire historical Liao lifespan. Liao Taizu public Activity still cites a legacy repository dataset; this review closes the identity distinction **only**, not a wholesale individual Activity source-quality audit.

## Independent scholarly source and rupture criterion

- [Michal Biran, *The Qara Khitai*, Oxford Research Encyclopedia of Asian History (2020)](https://academic.oup.com/edited-volume/61799/chapter-abstract/546311966): states that the Qara Khitai / Western Liao (1124–1218) was founded by Khitan refugees escaping the conquest of the northern-Chinese Liao dynasty (907–1125), then ruled an empire in Central Asia from approximately the Oxus to Altai, with Balasaghun as the core political center.
- [Biran, Hebrew University research publication entry](https://cris.huji.ac.il/en/publications/the-qara-khitai/): independently identifies the distinct Central Asian imperial structure, Khitan founder exiles and the previous Liao in northern China.
- [István Vásáry, *Qarā Ḵeṭāy*, Encyclopaedia Iranica](https://www.iranicaonline.org/articles/qara-ketay/): follows Yelü Dashi's break from the original emperor's forces in 1124, departure westward, and emergence of a separate western polity. Territorial shift and independent political authority are both demonstrated; dynasty lineage similarity does NOT establish persistence of the same operated sovereign state.

**Decision:** Preserve the predecessor Liao Dynasty and successor/claimant Western Liao / Qara Khitai as **two separate normalized political identities**. Their direct ruling-house heritage merits continuity or historical succession in interpretation, not an identity merge. The scholarly overlap between customary Western Liao 1124 inception and Liao's 1125 fall is not an error requiring an invented calendar boundary; the separate Yelü Dashi authority can overlap with the original dynasty's last years.

## Execution and acceptance

No new Polity/Person/Activity was created; no UUID, source association, Activity chronology, role, designation, or Runtime projection was changed. Closure is appropriate for this *bounded rupture seed* because both normalized Polities already exist, direct runtime links are disjoint and correct, and the scholarship supports independence in territorial center and operative authority. This does not prove underlying individual Activity dates/sources uniformly perfect or all related identities in the full corpus.

Update `atlas-polity-review-registry.js` with exact Liao and Western Liao UUIDs, `reviewed_decision=keep_both`, `status=terminal_status=KEEP_SEPARATE`, `locked=true` and durable source links. Total seed ledger changes **75 / 59 terminal / 16 pending → 75 / 60 terminal / 15 pending**. Remaining groups: historical family **5**, designation (Sweden) **1**, Korean naming collisions **2**, territorial/operational rupture **7**. This is *not* the final completion of #1895. Sweden remains blocked by exact same-SHA audit on Production, with review-only `historiographic_period` blueprint and no mutation; Japan/Place/France and other acceptance/approval blockers remain separate.

**Next independently actionable target:** use the current registry's remaining 15 unresolved seeds, prioritizing a small source-backed already-separated rupture probe without Production code deployment; return to Sweden as soon as a matching trusted Production deployment actually exists. After all seed review and explicit-approval gates, conduct the mandatory new all-Production identity/provenance/temporal/discontinuity census and Authoring → Runtime parity acceptance.
