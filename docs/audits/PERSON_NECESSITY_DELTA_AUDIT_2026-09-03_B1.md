# ATLAS Person necessity delta audit — 2026-09-03 — Batch 1

Production baseline: `bbaaf33c2d9845832a527d79329443b5d6ff8968`

## Scope

The previous full-population necessity audit covered **788 Persons** on 2026-08-27. Current Production contains **1,552 Persons**, leaving **764 new Persons** that were not covered by that audit.

This batch audits the first high-risk slice: **35 newly added Persons whose role text resembles a local/subordinate administrative office** (governor, viceroy, commissioner, administrator, burgomaster, rector, director-general and similar).

The stricter 2026-09-03 policy is used: sparse polity coverage alone no longer guarantees KEEP.

## Result

- Audited in this batch: **35**
- KEEP: **34**
- REVIEW: **1**
- DELETE_CANDIDATE_PENDING_USER_APPROVAL: **0**
- Production deletions: **0**
- Remaining new Persons for later batches: **729**

No Person in this batch currently meets the deletion-candidate threshold.

## Why most local-looking offices remain KEEP

The role label alone was misleading in many cases.

The batch includes:
- heads of distinct or short-lived polities (Ragusa, West Indies Federation, State of Deseret, Republic of Yucatán, State of Muskogee);
- de facto autonomous regional regimes (Yunnan, Xinjiang, Qinghai, Guangdong);
- foundational/transformative colonial figures (Mendoza, Coen, Johan Maurits, Stuyvesant, Mem de Sá, Clive);
- national constitutional or state-formation figures (Elmira Gordon, Petliura, Roberts, Lavalleja);
- major historical actors whose significance clearly exceeds the office label (Oppenheimer, Roland, Kishi, Wullenwever, Yamada Nagamasa).

Svalbard remains covered by the project's distinct remote-territory rule. The Governor of Svalbard is the Norwegian government's highest representative on the archipelago, so Odd Olsen Ingerø is not treated like an ordinary mainland local governor.

## REVIEW — Honma Yoshihisa

`80e57198-43e4-4d0d-a130-2218489b357d` — Honma Yoshihisa / 혼마 요시히사

Current Production records a c.1185 representative point for an “early Honma governor tradition of Sado.” The record itself already admits that secure Honma entry is later.

Sado City's official historical landscape plan states that **after the Jōkyū War of 1221**, Sado came under Kamakura rule, the Ōsaragi branch of the Hōjō was appointed shugo, and the Honma clan entered Sado as shugo deputies before extending control across the island.

Therefore:
- this is **not** a deletion candidate;
- the current 1185 Timeline point is not considered closed;
- clan-level post-1221 evidence must not be converted directly into a replacement year for **Honma Yoshihisa the individual**;
- individual identity and chronology require a focused source review before any correction.

## Manually checked external evidence

- Sado City historical landscape plan: https://www.city.sado.niigata.jp/uploaded/attachment/15259.pdf
- Governor of Svalbard official role description: https://www.sysselmesteren.no/en/the-governor-of-svalbard/
- Encyclopedia Virginia governor chronology: https://encyclopediavirginia.org/entries/governors-of-virginia/
- Deutsche Biographie on Jürgen Wullenwever: https://www.deutsche-biographie.de/sfz86242.html

Machine-readable decisions: `PERSON_NECESSITY_DELTA_AUDIT_2026-09-03_B1.json`.

## Next batch

Continue with the remaining **729** new Persons, prioritizing:
1. local rulers / dukes / counts / daimyō / clan heads where the polity may be only a family or subordinate fief;
2. institutional and party heads whose Activity may not justify Person-level inclusion by itself;
3. low-confidence / tradition-only historical Persons;
4. crowded-polity additions where representation is already dense.

Deletion governance remains unchanged: no hard delete without exact user approval.
