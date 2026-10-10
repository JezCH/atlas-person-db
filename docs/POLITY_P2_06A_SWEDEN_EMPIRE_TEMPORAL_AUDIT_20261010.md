# POLITY-P2-06A — Sweden: Swedish Empire is a historical great-power era, not a separately constituted Swedish sovereign state

**2026-10-10 KST | source-backed historical identity judgment + actual public Production census | current disposition: REVIEW_REQUIRED / repair preflight pending.**

## Global acceptance gate (unchanged)

The full #1895 Polity program requires exact correct historical identities, continuity, provenance, temporal labels and Person Activity authoring/runtime display, not merely seed closure counts. Current seed register: **75 total / 59 terminal / 16 pending**, with **1** unresolved temporal designation (Sweden). After all seeds are judged and repaired, independently rediscover all current Production Polities/Activities/Designations/Sources and resolve new actionable findings, plus Japan/Place/France/Oman/Liberia/Indonesia approval/authority gates. No destructive retirement/delete without explicit user approval. P14 territorial geometry remains out of scope.

## Direct live public Production baseline (observed, not inferred)

Read via connected Vercel production HTTP endpoint `https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity` on 2026-10-10. The endpoint returned **1,158** total normalized Polity rows. Swedish-name/canonical-key candidate census found **exactly two**:

| Existing exact UUID | Name | Public activities | Observation |
| --- | --- | ---: | --- |
| `93613017-b4c4-5f82-8e96-3ce6b2d3a61e` | Sweden / 스웨덴 | **15** | Continuous national identity in present dataset, from Erik Segersäll 970–995 through Olof Palme 1982–1986; every public Activity designation EN/KO presently null |
| `a47f57af-8ac2-4724-81b0-43074c64f84c` | Sweden–Norway / 스웨덴-노르웨이 연합 | **3** | Distinct normalized political-union identity, 1818–1892 public Activity coverage; do not merge with national Sweden |

**No separate `Swedish Empire` named normalized Polity** in all 1,158 public rows. Four representative Sweden canonical Activity records fully in the commonly cited great-power window:

| Person | Existing Activity UUID | Years | Public `polity_designation_name_en/ko` |
| --- | --- | --- | --- |
| Gustavus II Adolphus / 구스타브 2세 아돌프 | `e889c50c-3a9b-4b30-90ab-0822ad5dffd6` | 1611–1632 | null / null |
| Queen Christina / 크리스티나 여왕 | `daf85f20-db1f-50c2-aff1-86830290da8e` | 1632–1654 | null / null |
| Charles XI / 칼 11세 | `931c792b-5039-4637-b418-4d04264b7b54` | 1660–1697 | null / null |
| Charles XII / 칼 12세 | `b5a7fcfe-47ee-4332-9110-443c0d0a40be` | 1697–1718 | null / null |

Other public Sweden Activities (pre-1611 or after-1718) must remain intact. The Sweden–Norway union's three Activities must remain separate.

**IMPORTANT: null public labels are NOT proof of zero internal `polity_designations` rows.** As confirmed earlier by the Russia audit, the common resolver returns null if designation rows lack fully containing ranges or have unresolved/conflicting preferred names; an authenticated table/source-bundle exact-before read is required before any write.

## Primary historical distinction and periodization

- Swedish History Museum (`historiska.se`), *When Sweden became Sweden* traces an enduring Swedish kingdom and lists Gustav II Adolf, Christina and later Swedish monarchs as Kings/Queens of Sweden; no separate emperor sovereign transition or formal empire-title assumption is established by that source: https://historiska.se/en/explore-history/history-hub/when-sweden-became-sweden/
- Danish professional encyclopedia **Lex**, Jürgen Beyer (2025), *Stormagtstiden*, explicitly identifies `stormaktstiden` as a **traditional periodization of Swedish history**, 1611–1718, from Gustav II Adolf's accession to Charles XII's death; an 1877 use of the historiographic term is described: https://lex.dk/Stormagtstiden
- Swedish educational history synthesis SO-rummet, `Stormakten Sverige 1611–1718`, explicitly models the 1611–1718 greatness era; the Great Northern War continued to 1721 and territorial losses were finalized after Charles XII's death. Thus **1718's king-death periodization must not be silently confused with 1721 peace treaty/territorial endpoint**: https://www.so-rummet.se/kategorier/historia/nya-tiden/stormaktstidens-sverige
- Another widely used *Swedish Empire* convention extends the imperial great-power territorial period through 1721 and the Peace of Nystad, rather than marking every account's cultural-political age in 1718; the existing reader must distinguish source-specific histographic periodization from a constitutional state/title date. Secondary convention: https://en.wikipedia.org/wiki/Swedish_Empire
- Swedish crown was still **kingdom**, rulers were kings and queens; do NOT fabricate an actual `Emperor of Sweden` role, new Sweden sovereign state, official constitutional empire title, or exact-day state-form boundary in 1611/1718/1721.

**Identity judgment:** `Swedish Empire` / `Stormaktstiden` is an *era/imperial sphere descriptor of the Swedish kingdom*, not a new normalized sovereign identity. Preserve Sweden UUID `93613017-b4c4-5f82-8e96-3ce6b2d3a61e` and Sweden–Norway union UUID independently. A source-backed historical **temporal label** may be suitable if the canonical designation type/reader can model a historiographic period without asserting that the country officially changed its constitutional state-form to an Empire. A bare `state_form=Swedish Empire` invented on Russia's imperial-title analogy is **not automatically authorized**.

## Implementation and Production authority checkpoint

- PR [#2411](https://github.com/JezCH/atlas-person-db/pull/2411), merged SHA `ed9d972f351f4a79707a27812cbdda2201b38f9e`, implements optional audited `include_sweden_details` in `server/atlas-polity-reference-audit-handler.js` and an exact Production OIDC read-only workflow `.github/workflows/atlas-polity-sweden-p2-06-audit.yml`, with candidate discovery, regression tests, governed Source/Designation/Identity/Governance/Authoring/Runtime bundles. CI **success** prior to merge.
- At this report time, the connected Vercel Production deployment listing still reports the prior main deployment `caa38e029441ddc907ea75505a52cb3288e82996`, not the Swedish handler commit; GitHub main has additionally advanced to `c0ac63bfc8f576c709537e56c091ed3b5fb48215` due an unrelated UI lane. The dedicated audit run `38036944271` was therefore awaiting its exact same-SHA deployed handler. A passing PR CI or public read does **not** establish the authenticated database designation/source state.
- **No Sweden Production designation/source/Person/Polity data mutation, retirement, merger, calendar day rewrite, or Runtime publication** is claimed by P2-06A. Since internal preflight has not completed, `sweden-temporal-designation` **remains REVIEW_REQUIRED**; ledger **75 / 59 / 16** is unchanged.

## Bounded next actionable unit — POLITY-P2-06B

1. Reconcile a **current main** deployment SHA with a trusted **same-SHA** protected OIDC read-only audit without downgrading Production to a stale commit. Repeat source-backed exact Polity and designation bundles for the Sweden UUID and Sweden–Norway only.
2. Distinguish whether designation rows exist but fail resolver, whether source records already provide Swedish historical era semantics, and permitted `designation_type` values. Do not infer table absence from all-null public Activity labels. Verify four early-modern Activity source links and boundary granularities.
3. Decide historical era naming/display contract separately from Russia's *formal emperor title*. Prefer documented `Swedish Empire (Great Power Era)` / `스웨덴 제국(강대국 시대)` with explicit historical-period meaning, if the normalized model can support that without falsely asserting constitutional renaming. Distinguish 1611–1718 historiography from 1721 diplomatic territorial conclusion. Year precision must remain year precision where that is all the sources warrant.
4. If a non-destructive source-preserving canonical designation assertion/rewrite is appropriate, prepare reviewed exact-before manifest, dry-run+apply via existing canonical writer, compile, verify public Polity+Person views for four monarchs and outside-window controls (pre-1611, post-1718, union), then close this seed **only after actual Production Runtime proof**.
5. If correct historical display cannot be modeled with the existing semantic type, preserve `REVIEW_REQUIRED` with exact model contract blocker rather than inventing a `state_form` claim or silently labeling a monarch Emperor.
