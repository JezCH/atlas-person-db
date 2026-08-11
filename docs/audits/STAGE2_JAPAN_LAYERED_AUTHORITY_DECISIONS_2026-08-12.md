# Stage 2 Japan Layered Authority Decisions — 2026-08-12

## Status

**SOURCE-BACKED AUDIT ONLY — NO PRODUCTION MUTATION**

This decision record resolves the ATLAS modeling question behind the current Kamakura/Tokugawa `polity_relation_model` signals and narrows the remaining Sengoku work. It does not create or modify Production Person, Polity, Governance Context, Territory, or Activity rows.

The governing rule is:

> Governmental authority, higher-order realm identity, local territorial authority, and lineage identity are different semantic layers. ATLAS must not collapse them merely because one historical label is convenient.

---

## 1. Model: Japan, bakufu, and domains

### Source facts

Jeffrey P. Mass describes the Kamakura bakufu as operating inside an enduring imperial-aristocratic framework and characterizes Kamakura government as approximating a dyarchy with two interconnected loci of authority rather than a unitary replacement state.

John Whitney Hall's account of the bakuhan system distinguishes shogunal rule at the national level from daimyo rule at the local level. David L. Howell's recent treatment likewise explains that the Tokugawa shogunate delegated authority to autonomous daimyo domains. Harold Bolitho shows how han exercised the everyday territorial functions of government over most of Japan while remaining under higher Tokugawa authority.

Sources:

- Jeffrey P. Mass, “The Kamakura bakufu,” *The Cambridge History of Japan*, Cambridge University Press.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/kamakura-bakufu/BF02043614072DC18DBFF0EC11BCBAE0
- Ishii Susumu, “The decline of the Kamakura bakufu,” *The Cambridge History of Japan*, Cambridge University Press.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/decline-of-the-kamakura-bakufu/EF1BFC92E54B2CA6DD53CCC63BB3D2E8
- John Whitney Hall, “The bakuhan system,” *The Cambridge History of Japan*, Cambridge University Press.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/bakuhan-system/D926536D7B00DEFD6413A77CA028711B
- David L. Howell, “Regional Authority during the Tokugawa Period,” *The New Cambridge History of Japan*, Cambridge University Press, 2023.  
  https://www.cambridge.org/core/books/abs/new-cambridge-history-of-japan/regional-authority-during-the-tokugawa-period/1D7EDF841214814E9769E4392A31C392
- Harold Bolitho, “The han,” *The Cambridge History of Japan*, Cambridge University Press.  
  https://www.cambridge.org/core/books/cambridge-history-of-japan/han/EFA5733E3D52F21A93D047CD6A59DFC3

### ATLAS modeling inference

For the reviewed data:

- `Japan` is the higher-order realm/Polity context.
- `Kamakura bakufu` and `Tokugawa Shogunate` are **Governance Contexts**, not separate country identities simply because they possessed national governmental authority.
- Source-backed `han` / daimyo domains can be **subordinate Polities** because they exercised territorial government over identifiable jurisdictions.
- A clan/house name such as `Oda Clan` or `Uesugi Clan` is lineage identity and is **not automatically** the correct territorial Polity identity.
- A Person linked to `Japan` through `governs` does not thereby acquire direct-control geometry over every local domain. Runtime national governmental authority and local direct control remain separate layers.

This model is specifically designed to preserve both national bakufu authority and local domain territorial reality without duplicating or fabricating territory.

---

## 2. Hōjō Tokimune

Current Activity:

- `f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd`
- Hōjō Tokimune
- `Kamakura Shogunate`
- 1268–1284
- Shikken

### Decision

**RELINK Activity to Japan + Governance Context = Kamakura bakufu + Relation = `governs`.**

The shikken represented high governmental authority in the Kamakura warrior government. The historical model does not justify turning `Kamakura Shogunate` into a replacement country polygon separate from the Japanese realm.

This resolves the old Japan `polity_relation_model` question for this row. Exact Production relink remains deferred.

---

## 3. Tokugawa Ieyasu

Current rows:

| Activity UUID | Current interval | Role | Decision |
|---|---:|---|---|
| `7c315e1c-90c3-5199-a292-8f68ba69d4b2` | 1603–1605 | Shogun and military commander | **KEEP phase**, relink to Japan + Tokugawa Shogunate Governance Context + `governs` |
| `79dc9310-cd56-5bed-9a35-fe5361bdf0b6` | 1603–1616 | compressed overlap | **RETIRE** after reviewed phases are preserved |
| `400c78d5-a7e1-5ddb-83ef-91e0193db0f8` | 1605–1616 | retired de facto ruler | **KEEP phase**, relink to Japan + Tokugawa Shogunate Governance Context + `governs` |

### Rationale

The bakuhan literature explicitly separates nationwide shogunal authority from autonomous/local daimyo governance. Therefore the correct ATLAS representation is not:

`Tokugawa Ieyasu → Tokugawa Shogunate Polity → Japan-wide direct polygon`

but rather:

`Tokugawa Ieyasu → Japan → governs`

with:

`Japan + time → Governance Context: Tokugawa Shogunate`

and separate domain Polities/Territory Records for direct local territorial administration where sources support them.

The 1603–1616 compressed row duplicates semantic meaning already represented more accurately by the 1603–1605 and 1605–1616 phases and should not survive as a third Activity.

---

## 4. Sengoku lineage labels and territorial authority

### Source facts

Jurgis Elisonas describes sixteenth-century Japan as a splintered realm composed of autonomous domains of warring daimyo. Imatani Akira and Suzanne Gay describe the growth of local warrior territorial authority and note that Sengoku daimyo controlled their own territories. These sources support modeling historically defensible daimyo territorial authorities as Polities, but they do **not** support converting every clan name directly into a Polity UUID.

Sources:

- Jurgis Elisonas, “Christianity and the daimyo,” *The Cambridge History of Japan*.  
  https://www.cambridge.org/core/books/cambridge-history-of-japan/christianity-and-the-daimyo/0F552561428FD4A7A75075EC42C6D5BC
- Imatani Akira and Suzanne Gay, “Muromachi local government: shugo and kokujin,” *The Cambridge History of Japan*.  
  https://www.cambridge.org/core/books/cambridge-history-of-japan/muromachi-local-government-shugo-and-kokujin/2C7AE60F634305049BE5683C5155B229

### Oda Nobunaga

Current row:

- `2b566bc6-600a-5a75-bf32-60fe3e558bcd`
- `Oda Clan`
- 1568–1582

Decision:

**Do not keep `Oda Clan` merely as a lineage Polity, and do not blindly relink the full 1568–1582 interval to all Japan.**

The remaining task is to research the source-backed political-territorial authority created by Nobunaga and reconstruct its time-changing control. No invented `Oda State` label is authorized by this decision record.

### Uesugi Kenshin

Current row:

- `110c080c-b891-50a7-950c-1c80d3ef75b8`
- `Uesugi Clan`
- 1548–1578

Decision:

**Replace the lineage label only after the actual territorial daimyo authority is source-backed.**

The historical sources justify the existence of autonomous Sengoku territorial authority in principle; they do not by themselves prove the exact canonical identity, territorial intervals, or geometry for Kenshin's authority. This remains targeted research rather than a string-relabel operation.

---

## 5. Toyotomi Hideyoshi and the 1590 threshold

### Source facts

Asao Naohiro and Bernard Susser describe the sixteenth-century unification as a process rather than an instantaneous Japan-wide polity state from 1582. A recent peer-reviewed study by Minzhao Wang, Austin Michael Mitchell, and Weiwen Yin states that Hideyoshi continued Nobunaga's unification and by 1590 had effectively subdued all provinces; it treats his cadastral surveys as a core mechanism of centralized state-building.

Sources:

- Asao Naohiro and Bernard Susser, “The sixteenth-century unification,” *The Cambridge History of Japan*.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/sixteenthcentury-unification/0C30DC47EA85258875CFB8F4AE5DA821
- Minzhao Wang, Austin Michael Mitchell, and Weiwen Yin, “Foreign faith and rising state: An examination of state-building dynamics in late 16th-century Japan,” *Political Science Research and Methods* (2025).  
  https://www.cambridge.org/core/journals/political-science-research-and-methods/article/foreign-faith-and-rising-state-an-examination-of-statebuilding-dynamics-in-late-16thcentury-japan/566C0575FE9C7FAE53079ED1BB302C17

### Current rows

- `61bf1687-9815-5844-9f98-02a558470b51` — Toyotomi Regime, 1582–1598
- `7bd5741a-6b37-5b33-9512-40741e01b179` — Japan, 1582–1598

### Decision

`Toyotomi Regime` is a **Governance Context**, not a territory-owning Polity identity.

The full 1582–1598 `Japan` Activity is also too coarse. It back-projects national governmental authority into a period when unification was still actively being achieved.

The reviewed model is therefore:

- **pre-1590**: expanding Hideyoshi political/territorial authority; exact Polity/territory reconstruction still required;
- **1590–1598**: `Japan` becomes a defensible higher-order Person–Polity governmental context for Hideyoshi, with `Toyotomi Regime` as Governance Context and Relation `governs`;
- direct-control and subordinate-domain geometry must still come from Territory/Polity relations, not from the Person Activity alone.

This is a historical split requirement, not permission to fabricate a pre-1590 Polity name or geometry.

---

## 6. Machine-readable result

`scripts/build-japan-layered-authority-decisions.mjs` binds the model to eight exact current Activity UUIDs and verifies each current Person, Polity, and interval against the live 346-row master ledger.

Expected result:

- reviewed Japan rows: **8**
- old Japan `polity_relation_model` rows: **4**
- old Japan layered-authority rows historically resolved: **4 / 4**
- unresolved old Japan layered-authority model rows: **0**
- remaining Sengoku territorial/split research rows: **4**

The remaining four are intentionally not counted as resolved because the missing work is substantive historical territory/authority reconstruction for Oda, Uesugi, and pre-1590 Hideyoshi phases.

---

## 7. Production boundary

Nothing here authorizes a Production write.

Before application:

- resolve/reuse the exact `Japan` Polity UUID;
- create/reuse Governance Context identities for Kamakura bakufu and Tokugawa Shogunate only through the reviewed Stage 2 authoring path;
- inspect all references before retiring any pseudo-Polity identity;
- create source-linked correction manifests for Hōjō and Tokugawa rows;
- complete Oda/Uesugi/pre-1590 Hideyoshi territorial research before choosing replacement Polity UUIDs;
- keep Territory control type distinct from higher-order governmental authority;
- apply only after Stage 2 Production schema and semantic-key/replay/merge cutover are ready.

## Conclusion

The Japan problem is not solved by choosing one label for every era. The durable ATLAS model is layered:

`Japan (higher-order Polity)`

`+ time-dependent bakufu/regime (Governance Context)`

`+ source-backed daimyo domains (subordinate territorial Polities)`

`+ Person–Polity relation semantics`

`+ separate Territory Records`

This preserves both national political authority and local direct territorial control without converting governments or family lineages into fake country polygons.
