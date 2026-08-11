# ATLAS Polity Semantic Audit — Stage 2 Row Normalization

> Status: AUDIT NORMALIZATION ONLY — NO PRODUCTION DB MUTATION
>
> Purpose: convert already-reviewed Wave 13 narrative findings into explicit current-Activity row verdicts so the machine-readable master ledger can cover every current Production UUID without inventing default decisions.
>
> This document does **not** introduce new historical conclusions. The basis for every row below is `POLITY_SEMANTIC_AUDIT_WAVE13_LIVE_RECONCILIATION_2026-08-11.md`, together with the earlier continuity/layered-authority Waves cited there.

| Current Activity UUID | Person | Current Polity | Period | Decision | Normalized basis |
|---|---|---|---:|---|---|
| `aa5f6b18-e362-5421-9547-5ed0161d3cb8` | Hypatia | Roman Empire | 393–395 | `COMPETING_CONTINUITY_MODEL` | This short Roman phase belongs to the older artificial 395 split model; Wave 13 prefers constitutional Roman continuity rather than automatic polity death in 395. |
| `c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa` | Hypatia | Roman Empire | 393–415 | `KEEP_POLITY+CONTINUITY_REVIEW` | Wave 13 states this full Roman row is closer to the Wave 5 continuity conclusion; final Roman/Byzantine identity policy still governs. |
| `3f0af453-7e55-5bf0-a8d8-6092788e28a6` | Hypatia | Byzantine Empire | 395–415 | `COMPETING_CONTINUITY_MODEL` | This row is the other half of the older 395 hard-transition interpretation and must not coexist indefinitely with the full Roman continuity row. |
| `7bd5741a-6b37-5b33-9512-40741e01b179` | Toyotomi Hideyoshi | Japan | 1582–1598 | `COMPETING_SEMANTIC_ROW+SPLIT+RESEARCH` | Wave 13 finds this newer Japan alternative competes with Toyotomi Regime while 1582–1598 itself is too coarse; nationwide consolidation was not complete from 1582. |
| `7c315e1c-90c3-5199-a292-8f68ba69d4b2` | Tokugawa Ieyasu | Tokugawa Shogunate | 1603–1605 | `KEEP_PHASE+RESEARCH_LAYERED_AUTHORITY` | Formal shogunal tenure is a defensible phase, but final Japan/bakufu/domain authority hierarchy remains unresolved. |
| `79dc9310-cd56-5bed-9a35-fe5361bdf0b6` | Tokugawa Ieyasu | Tokugawa Shogunate | 1603–1616 | `DUPLICATE_OVERLAP_ALTERNATIVE+RESEARCH_LAYERED_AUTHORITY` | Wave 13 identifies this row as the compressed alternative overlapping the cleaner 1603–1605 formal plus 1605–1616 retired-de-facto split. |
| `400c78d5-a7e1-5ddb-83ef-91e0193db0f8` | Tokugawa Ieyasu | Tokugawa Shogunate | 1605–1616 | `KEEP_PHASE+RESEARCH_LAYERED_AUTHORITY` | Retired but de facto authority is a defensible second phase; final polity hierarchy still requires the Japan/bakuhan model. |
| `57cdefa5-9a5d-533c-b229-47e398f1d07a` | Peter I | Tsardom of Russia | 1682–1721 | `KEEP_POLITY+CONTINUITY_REVIEW` | This captures the pre-1721 state-form/title phase; Wave 13 treats 1721 primarily as a continuity/state-form question, not automatic polity death. |
| `eda26b64-2f59-5f15-954a-73404ceed064` | Peter I | Russian Empire | 1682–1725 | `BACK_PROJECTION+COMPETING_ROW+CONTINUITY_REVIEW` | Wave 13 explicitly identifies this as the later Russian Empire label back-projected over the whole reign and competing with the 1682–1721 / 1721–1725 split. |
| `9ec53325-3a97-58a8-a7e7-81a496a47e57` | Peter I | Russian Empire | 1721–1725 | `KEEP_POLITY+CONTINUITY_REVIEW` | This is the defensible post-1721 state-form/title phase while polity identity continuity remains a separate R2 decision. |
| `a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7` | Maria I of Portugal | Kingdom of Portugal | 1777–1815 | `KEEP_POLITY+CONTINUITY_REVIEW` | This row matches the 1815 state-form transition boundary used by the competing model. |
| `fefe572f-95f7-5913-86ed-304c7c2ca679` | Maria I of Portugal | Kingdom of Portugal | 1777–1816 | `COMPETING_CONTINUITY_ALTERNATIVE` | Wave 13 identifies this as the overlapping alternative that ignores the 1815 United Kingdom state-form transition. |
| `25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89` | Maria I of Portugal | United Kingdom of Portugal, Brazil and the Algarves | 1815–1816 | `KEEP_POLITY+CONTINUITY_REVIEW` | The 1815–1816 state-form is historically real; whether it is a new Polity UUID or temporal state form belongs to R2 continuity policy. |
| `953a4cac-b59d-58ed-a2e4-4b4e2aa058d8` | Haile Selassie I | Ethiopian Empire | 1930–1936 | `SPLIT_CONTROL_VS_LEGAL_REIGN_RESEARCH` | Wave 13 says 1930–1936 may encode effective rule before occupation, but current public period basis does not distinguish it from legal reign. |
| `62963919-b3d1-5f25-a399-24a33d5e8779` | Haile Selassie I | Ethiopian Empire | 1930–1974 | `SPLIT_CONTROL_VS_LEGAL_REIGN_RESEARCH` | This may encode the legal/international reign through exile, but current period semantics do not yet prove that interpretation. |
| `5045bbb3-a494-5d94-893b-28ee8b98c0d0` | Haile Selassie I | Ethiopian Empire | 1941–1974 | `SPLIT_CONTROL_VS_LEGAL_REIGN_RESEARCH` | This may encode restored effective rule after occupation; the legal-reign/effective-control distinction must be represented explicitly before reconciliation. |

Explicitly normalized current UUIDs: **16**.

## Safety rule

- No row above is an authorization to mutate Production.
- `KEEP_*` means the row is defensible within the cited interpretation, not that competing rows may be deleted yet.
- `COMPETING_*`, `CONTINUITY_*`, `RESEARCH_*`, and `LAYERED_AUTHORITY` remain blocked until their corresponding Stage 2 semantic decision is resolved.
- The master-ledger generator must fail rather than substitute a generic decision if any current UUID remains unresolved.
