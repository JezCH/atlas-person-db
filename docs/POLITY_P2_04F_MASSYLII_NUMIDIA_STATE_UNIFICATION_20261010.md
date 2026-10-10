# POLITY-P2-04F — Kingdom of the Massylii → Kingdom of Numidia historical-political identity audit

**2026-10-10 KST | SOURCE-BACKED DECISION TERMINAL `KEEP_SEPARATE` | NO PRODUCTION MUTATION.**

## 1. Bounded authoritative live census

Read-only Vercel Production `https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity`, exact Polity details and Masinissa Person detail (`person_id=7e21b68e-075b-49c1-a4cc-ffe9b163a300`). Vercel identity endpoint reported `production/main` (deployed source SHA `ca42ed47405cb6a96ae071e0b91f2fa85d07c945` at read); publication current: **2523 Authoring = 2523 Runtime**. This is a parity signal, not proof of the source claim.

| Live Polity | UUID | Activity UUID and actual Person | Stored boundary and certainty |
| --- | --- | --- | --- |
| Kingdom of the Massylii (마실리 왕국) | `ec9d77b4-e18e-4495-8232-c51e74b0d683` | Masinissa `7e21b68e-075b-49c1-a4cc-ffe9b163a300`, Activity `aa666fef-cdc2-42ef-9445-74c56ce4694d` | 206–205 BCE, start/end **approximate**, `reviewed`, `well_established` |
| Same | same | Same Person, Activity `ac8bcd9e-20a7-41cf-a2e9-a9797d817dba` | 203–202 BCE, start/end **approximate**, `reviewed`, `well_established` |
| Kingdom of Numidia (누미디아 왕국) | `81ff499c-879e-452f-9893-6618ec580825` | Same Person, Activity `01fdc710-556e-426a-8902-ac9e06470472` | 202–148 BCE, start **uncertain**, end **exact**, `reviewed`, `likely` |

All are `rules` / `reign` / `King` on a common Person UUID, **not competing same-year independent sovereign offices**. The two Massylii activities each have **two** Source links (Livy/Oxford and Encyclopedia of Ancient History/Oxford respectively), and Numidia has **two** (Oxford Classical Dictionary and BICS 2025). The distinct split of the Massylian reign itself is historically intentional, not a data duplicate.

BCE API years are numeric `-206`, `-205`, `-203`, `-202`, `-148`; preserve source calendar `unspecified_historical` and precision. The two adjacent records share a year boundary `202 BCE` without asserting a simultaneous pair of independent 202 BCE states.

## 2. Identity and institutional history

### Massylii before unification
Prior to the unified kingdom, eastern **Massylii** and western **Masaesyli** were distinct federations/kingdoms. The family of king Gala/Gaia ruled the eastern group, while Syphax ruled the western. The ancient terminology `Numidia` may describe the **wider region/peoples even before political unification**, so identical geographic terms are not proof of one continuous centralized state.

### Interrupted Masinissa monarchy
John F. Lazenby's *Oxford Classical Dictionary* entry records that Masinissa recovered the patrimonial kingship after his father's death and was subsequently dispossessed by Syphax. After Scipio's arrival in 204 BCE, military victory over Syphax in 203 restored his authority. The split between 206–205 BCE and 203–202 BCE thus retains a meaningful **interruption**; merging all Massylii Activity into a fictitious uninterrupted reign would erase this historical episode.

### Wider Numidian Kingdom
The capture of Syphax and subsequent Roman–Carthaginian settlement allowed Masinissa to annex western territories and establish political authority over a much wider area. Thomas Biggs's peer-reviewed 2025 *Numidia and Rome* explicitly describes the `around 202 BCE` integration of formerly local Massylii and Masaesyli groupings into a Numidian state. The introduction to the 2025 BICS special issue likewise speaks of a Numidian kingdom forged in 202 BCE. The start is approximate: do **not** impose exact sovereignty day, assume all western regions changed allegiance simultaneously, or describe this as a purely Roman creation lacking Numidian agency (see Virginie Bridoux 2025).

The resulting kingdom is a historically new **operational political scope** with enlarged territory and population, but the ruler and the dynastic core persisted. This makes the case analogous to a stage-based territorial/administrative succession, not one man's simultaneous rule of two independent states. The term `Kingdom of the Massylii` is a conventional political descriptor, with earlier institutional formalization not documented to the precision of a modern constitutional state.

## 3. Final disposition

**`KEEP_SEPARATE`** existing two Polity identities as **sequential operational phases**:
- Massylii, eastern patrimonial kingship, interrupted and restored;
- unified Numidia, incorporating the rival western polity and expanding royal jurisdiction around 202 BCE.

This **does not deny political/dynastic continuity**, and it does not require conflating the two ethnic groupings with a timeless formal country.

**No correction to Person, Polity, Activity, Source, notes, role, dates, certainty, Runtime, spatial binding, Place or P14 Geometry.** No destructive retirement/deletion; all 3 Activity IDs and 6 Source links remain intact. This review alone can close as `status=terminal_status=KEEP_SEPARATE`, `reviewed_decision=keep_both`, `suggested_action=keep_both`, `locked=true`. There is no structural mismatch requiring a writer transaction.

Review ledger after this scoped no-write classification: **75 total / 55 terminal / 20 `REVIEW_REQUIRED`** (historical family pending 8). Next independently selectable seed: `buyid-fars-family`. Oman and Liberia remain separately approval-/repair-gated.

## 4. Sources

1. John F. Lazenby, “Masinissa,” *Oxford Classical Dictionary*, Oxford UP, 2016: https://academic.oup.com/edited-volume/61673/chapter-abstract/549655097
2. Thomas Biggs, “Numidia and Rome,” *Bulletin of the Institute of Classical Studies* 68(2), 2025, 129–161, DOI 10.1093/bics/qbaf022: https://academic.oup.com/bics/article/68/2/129/8313572
3. Jona Lendering, “Massinissa,” Livius: https://www.livius.org/articles/person/massinissa/
4. Jona Lendering, “Syphax,” Livius: https://www.livius.org/articles/person/syphax/
5. Virginie Bridoux, “The Kingdoms of Numidia and Rome (218–41 Bce),” *Bulletin of the Institute of Classical Studies* 68(2), 2025: https://academic.oup.com/bics/article-abstract/68/2/162/8363926
6. Livy, *Ab urbe condita* 29.30, first Massylian throne recovery (already linked to Activity): https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.02.0144%3Abook%3D29%3Achapter%3D30

