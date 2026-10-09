# POLITY-P2-03C — Brazil historical Production snapshot recovery

**Source:** GitHub Actions audit run 37009317620, 2026-10-02 12:52 UTC, artifact 11226928718, archive `atlas-audit-full_stage2_baseline-e9087f665ae62839982d048323a1e30d4150b1bd.zip`.
**Artifact contents:** `audit-inventory-response.json` and `polity-reference-audit-response.json`.
**Read-only source properties:** Polity inventory `read_only` with Authoring and Runtime reference counts, inventory fingerprint `sha256:ec2576f8ee5b7f8c927f115d7ec176fb638a77b188520f8871ba515aae57b4b8`, baseline 2453 Authoring Activity rows. **Dated baseline, not proof of 2026-10-09 Production.**

## Exactly observed Brazil political family

| Existing Polity | UUID | Authoring Activity | Runtime references | Persons |
|---|---|---:|---:|---|
| Empire of Brazil / 브라질 제국 | `efcd0f70-bffe-5464-86e3-b28b3658404b` | 2 | 2 | Pedro I, Pedro II |
| United States of Brazil / 브라질 합중국 | `750bf6be-49e9-4215-95ff-a356ba1831cd` | 1 | 1 | Afonso Pena |
| Brazil / 브라질 | `a8b27d54-b180-4d51-a664-dd40b3eed08f` | 7 | 7 | Vargas, Goulart, Medici, Itamar Franco |

Exactly **10** Authoring Activity rows and 10 Runtime references across three identities in this historical artifact. Other **separately scoped** Brazil-named Polities (State of Brazil, Dutch Brazil, composite Portugal/Brazil/Algarves, Yanomami rights movement) were excluded from these ten and **must not be merged by substring match**.

### Exact Activity inventory, at artifact time

Empire:
- `538c90ab-8752-471c-98be-9b388f6c8d9f`: Pedro I, 1822–1831
- `ae9b7ba9-4c62-508b-b019-2ded901413bc`: Pedro II, 1840–1889

United States of Brazil:
- `7a021719-8a81-4367-9fd1-64e75f996563`: Afonso Pena, 1906–1909

Brazil:
- `e82ebfff-537e-43e0-b1f6-452c1b7cb27c`: Getulio Vargas, 1930–1934
- `b1f52253-fcbf-4ba4-a061-37491658bf38`: Getulio Vargas, 1934–1945
- `ed7c3548-8dd4-479e-94e4-c6a382264a2d`: Getulio Vargas, 1951–1954
- `db3aa305-ff94-460b-a88d-2ed044a4f638`: Joao Goulart, 1961–1964
- `fbd5f4db-fcd1-4782-9b71-56fae2e1e2b7`: Emilio Medici, 1969–1974
- `21feba6a-db22-4ce2-a51e-fdd65f2ca2dd`: Itamar Franco, acting president in 1992
- `52a26a9a-110e-413b-b516-960413cc39e4`: Itamar Franco, 1992–1995

The 1840–1889 Pedro II record must not be interpreted as proof of no imperial power in the 1831–1840 regency: this is the Person Activity sample, **not** a comprehensive regime chronology.

## Historical interpretation and authorization boundary

The 1889-11-15 decree attests a substantive monarchy-to-federal-republic constitutional rupture. Empire of Brazil is **not** an automatically removable variant of republican Brazil. In contrast, the first republican polity's `United States of Brazil` and later `Brazil` names reflect a republican institutional continuum that warrants **one-identity investigation** rather than a regime-rupture assumption in 1967 solely based on the name.

**Do not execute a merge from this historical snapshot.** A fresh current Production UUID/name/Activity/designation/Source and Runtime readback must establish that the artifact inventory is still current, then assess non-destructive designation and Activity transfer. Any retirement/deletion remains explicitly user-approval gated. No activity date/precision invention.

## Status

**P2-03C SNAPSHOT VERIFIED / P2-03 family REVIEW_REQUIRED** pending contemporaneous live Production census and formal identity correction. Next frontier still Brazil.

Source run: https://github.com/JezCH/atlas-person-db/actions/runs/37009317620
