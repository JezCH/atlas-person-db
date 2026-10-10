# POLITY-P2-04D — Gorkha Kingdom → Kingdom of Nepal, 1743–1775

**2026-10-10 KST — scoped Production review COMPLETE; `KEEP_SEPARATE` as historically distinct polity phases / SAME Shah sovereignty lineage; no Production mutation.**

## 1. Exact fresh Production read-only authority

Read-only queried live service `https://atlas-person-db.vercel.app/api/atlas-read`, using the `polity` surface for exact two Polity UUIDs, the `person` surface for two related Persons, and separate `runtime-identity` and `runtime-publication` endpoints. Runtime identified Vercel Production `main`, commit `58073cc63a58d1c0967a24341271da2d8bb24849`, at audit time. Publication: **Authoring 2,523 = Runtime 2,523; current=true**.

| Existing Polity UUID (preserve) | Existing name | Current observed Person–Polity Activity |
| --- | --- | --- |
| `0eec74a4-a2a4-43f3-b347-54370b94da14` | Gorkha Kingdom / 고르카 왕국 | Prithvi Narayan Shah `654b123a-dc72-4900-a404-751ae3c9f22d` King/rules/reign `b76ee400-deeb-4e5e-a961-58c773e93ad4`, **1743–1768**, both year granularity, reviewed/well-established, 2 Cambridge source links |
| `7518462f-9769-413f-a245-cc3825b45d17` | Kingdom of Nepal / 네팔 왕국 | **Same** Prithvi Narayan Shah, King/rules/reign `3c267e73-5b4e-40cd-9c86-965381d58a84`, **1768–1775**, both year granularity, reviewed/well-established, 2 Cambridge source links |

The Nepal Polity also has **two separately preserved Tribhuvan reign segments**, Person `fc22be63-7d0b-40bc-b352-eeba85fc3193`: Activity `b6dabe02-86d2-44c4-8461-fbc918a89cb4`, 1911 (year) → 1950-11-07 (day); and Activity `32c6bf60-8019-42ec-992d-94c69d419035`, 1951-02-18 (day) → 1955-03-13 (day). These model a real 1950–1951 deposition/exile interruption, **not** a duplicate and not a reason to revise the Gorkha/1768 founding classification. No edits here.

No overlapping *different* 1768 sovereign offices are claimed: Prithvi's two year-resolution Activities are **successive political-territorial phases of one personal reign**, not proof that he relinquished power and started a new, independent reign in 1768.

## 2. Historical judgment — differentiable jurisdiction, continuous dynasty

- Prithvi Narayan Shah succeeded as King of **Gorkha in 1743** and expanded from that small territorial base through conquest. Existing Activity notes and Cambridge *A History of Nepal* historical chronology explicitly identify the Gorkhali accession and a conquest series culminating in Kathmandu **1768**, with other Kathmandu Valley conquests continuing across **1768–1769**.
- The official **Embassy of Nepal in Doha** history describes Gorkha as one of the independent principalities before Prithvi's conquests and makes the important administrative distinction: instead of merely attaching conquered Kathmandu to a government remaining in Gorkha, he **moved the seat to Kathmandu and established the dynasty governing unified Nepal**, described there as **1769–2008**. That 1769 expression is a broader unification/capital transition, not a contradiction that licenses replacing the particular Kathmandu entry of September 1768.
- Scholarly context confirms this is a continuity-and-transformation sequence: John Whelpton, *A History of Nepal* (Cambridge 2005), treats **1743–1885** as one arc of Gorkhali expansion; Axel Michaels, *Nepal: A History from the Earliest Times to the Present* (Oxford 2024), titles its chapter **“From Gorkha to Nepal: The Śāha Monarchy, 1768/69–1846”**, and characterizes modern Nepal's emergence as **“the state of Nepal or Gorkha, as it was initially called”**. The Shah government, monarch and state-building project are continuous, **not two unrelated sovereign dynasties**.
- The 1768/1769 event also changes territorial, administrative and political representation on the atlas: a pre-conquest **Gorkha-based kingdom** versus the **Kathmandu-centered, expanding unified Nepal kingdom**. This is enough to retain **two named canonical *historical phase* Polity identities** under the project's existing period-polity model without inventing a new accession to a different dynasty or a simultaneous separate crown.

**Decision:** `KEEP_SEPARATE` / `keep_both` as **distinct Gorkha territorial regime and unified Kathmandu-centered Nepal phase**; `locked=true` for this source-backed existing model. **Continuity is mandatory explanatory metadata:** same Shah dynasty, same Prithvi ruler, the formation of unified Nepal **through conquest and state expansion**. This is **not** a claim of an external sovereignty rupture like Liberia's 1847 independence or a claim that both governments coexisted separately after conquest. Preserve Gorkha as the historically meaningful earlier identity rather than retroactively relabeling his entire 1743–1768 rule as “King of Nepal”; preserve his 1768–1775 Nepal phase rather than treating Kathmandu as perpetually governed by a petty Gorkha polity.

**Date caution:** Annual 1768 switch in existing Activities is a reviewed **modeling boundary**, not an independently attested exact day for official “Kingdom of Nepal” sovereign-name proclamation. Some official sources use **1769** for the completed valley conquest/unified Nepal phase. Do not fabricate exact month/day changes or falsely present 1768–1769 as a neatly instantaneous transformation. A future detailed designation chronology can preserve these different historical events and certainties.

## 3. Bounded execution result

- Canonical registry seed `gorkha-nepal`: old `REVIEW_REQUIRED` → terminal `KEEP_SEPARATE` with the two exact Polity UUIDs, two Prithvi Activity UUIDs, clear Shah continuity and primary/source references.
- The source-of-truth review ledger advances **75 total / 54 terminal / 21 REVIEW_REQUIRED** (historical-family pending **9**); no other 75-seed disposition changed.
- No **Production** Person/Activity/Polity write, correction, merge/retirement, Source manipulation, title rewrite, Runtime compile, or deployment. Exact existing Tribhuvan 1950–1951 discontinuity, year-granularity 1768 transition and all source links remain untouched.
- Next **independent** historical-family review seed: `chuzan-ryukyu`. Previous Liberia canonical repair, Oman/France/Japan approvals and Place target-attestation blockers **remain OPEN**.

## 4. Research/provenance references

1. Actual Production Prithvi Person details, existing sources `A History of Nepal — John Whelpton, Cambridge University Press`: https://www.cambridge.org/core/books/abs/history-of-nepal/unification-and-sanskritisation-1743-1885/DAEF862FA8F8FA958A092FEA357440D0
2. Existing Cambridge book chronology, *A History of Nepal — Key Events*, dated 1743 accession and 1768–1769 valley conquests: https://assets.cambridge.org/052180/4701/frontmatter/0521804701_frontmatter.pdf
3. Government of Nepal, **Embassy of Nepal, Doha**, *The History of Nepal*: https://qa.nepalembassy.gov.np/pages/the-history-of-nepal-20/ (search-index excerpt checked 2026-10-10; full page request timed out; do not claim a full document inspection)
4. Axel Michaels (2024), Oxford University Press, *From Gorkha to Nepal: The Śāha Monarchy, 1768/69–1846*: https://academic.oup.com/book/56088/chapter-abstract/442704231 (publisher synopsis reviewed, chapter full text access restricted)
5. Satish Kumar (1962), *The Nepalese Monarchy from 1769 to 1951*, International Studies: https://journals.sagepub.com/doi/10.1177/002088176200400103 (abstract/bibliographic material cross-check)

**One-work-unit boundary:** source-backed current registry disposition and regression guard only. No separate family review was started after this judgment.
