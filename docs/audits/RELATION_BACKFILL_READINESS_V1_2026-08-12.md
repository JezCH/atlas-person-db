# ATLAS Relation Backfill Readiness v1

> Status: STAGE 2 AUDIT / MIGRATION PLANNING ONLY
>
> Production DB mutation: **none**

## Purpose

The conservative Relation Semantics audit intentionally left **66 of 346 current Activity rows** as `REVIEW_REQUIRED` rather than guessing from ambiguous role labels.

That does **not** mean all 66 need a relation decision on their current UUID before ATLAS can proceed.

Many of those current rows are already scheduled to be split, relinked, retired, merged, or historically re-researched. Assigning a mandatory relation to the obsolete current row would harden data that is known to be structurally wrong.

This audit therefore answers a different question:

> **Which current Activity UUIDs should actually receive a Relation Type backfill, and which must be corrected/reconciled first?**

## Result

The 66 conservative review rows are explicitly partitioned as follows.

| Disposition | Rows | Meaning |
|---|---:|---|
| `REVIEWED_RELATION_READY` | **5** | Existing reviewed evidence already supports an exact relation for the current row. |
| `DIRECT_RELATION_REVIEW` | **14** | Current Polity/Activity is sufficiently stable that relation semantics should now be decided directly. |
| `STRUCTURAL_CORRECTION_FIRST` | **31** | Current row must be split, relinked, retired, or have its target authority resolved before relation backfill. |
| `IDENTITY_RECONCILIATION_FIRST` | **6** | Duplicate Person/Polity/weak-identity reconciliation determines which Activity survives. |
| `HISTORICAL_RESEARCH_FIRST` | **10** | Polity/historicity/authority interpretation is still too uncertain to harden the relation. |

Total: **66**.

Therefore **47 current rows must not be force-backfilled** merely to satisfy a future NOT NULL constraint.

## Five reviewed current-row relations already ready

### Muhammad — Medinan Polity — 622–632

```text
relation_type = rules
```

Wave 11 explicitly concluded `KEEP + RELATION_RULES`: the post-Hijra Medinan political/judicial community is modeled as a Polity under Muhammad's political authority. Territory remains a separate evolving Polity record.

### Gajah Mada — Majapahit Empire — 1331–1364

```text
relation_type = serves
```

Wave 15C explicitly states that Gajah Mada **serves as Mahapatih rather than ruling Majapahit as monarch**.

### Tun Perak — Malacca Sultanate — 1456–1498

```text
relation_type = serves
```

Wave 15C explicitly states that Tun Perak **serves as Bendahara**.

### Satuq Bughra Khan — Qarakhanid Khanate — 915–955

```text
relation_type = rules
```

The reviewed Wave 8 relation finding is `rules` for the khan relation and no later audit contradicts that semantic interpretation.

### Nurhaci — Later Jin — 1616–1626

```text
relation_type = rules
```

Wave 15D explicitly validates Later Jin as a territorial **state/ruler relation** for Nurhaci.

## Why Catherine the Great is not included in the five

Her Russian Empire relation is substantively ruler semantics, but the current audit simultaneously has a probable duplicate Person identity (`Catherine II` / `Catherine the Great`). The correct migration sequence is:

```text
Person identity reconciliation
-> determine surviving/coalesced Activity UUID
-> apply reviewed ruler relation to the survivor
```

Do not backfill a relation onto a row that may be coalesced away just to increase a coverage number.

The same principle applies to Hiawatha alias rows, Edward Teach weak/duplicate polity rows, and Sayyida al-Hurra's duplicate-person review.

## Structural correction first — why 31 rows are not relation blockers

This group includes:

- late-Han regional-authority rows that need the correct regional Polity/authority target;
- Gallic/Gaul synthetic or insufficient Polity targets;
- Muhammad's invalid pre-622 Medina back-projection, which should be retired rather than semantically decorated;
- Rurik / Kievan Rus target-polity correction;
- Settlement of Iceland / Maori / Jiaozhi resistance rows outside the Polity model;
- Ibn Battuta / Machiavelli / Lafayette / Aung San Suu Kyi rows requiring temporal or semantic splitting;
- Chiang Kai-shek territorial-context split;
- Fang Guozhen and Bolad Temur regional-authority targets;
- other rows whose current UUID does not represent the final Activity that should survive.

For these, the relation belongs on the **replacement/surviving Activity**, not necessarily on the current row.

## Historical research first — why 10 rows remain deliberately open

These include cases such as:

- Dido, whose Person historicity is still explicitly under review;
- tribal/confederacy authority cases;
- Shi Xie/Jiaozhou;
- Leftraru/Mapuche;
- Oda/Uesugi authority identity;
- Sacagawea/Lemhi Shoshone;
- Sitting Bull/Lakota;
- Poundmaker/Cree;
- Tecumseh's parallel Shawnee/confederacy authority interpretation.

A new catch-all relation enum would not solve these historical questions.

## Direct Relation Review queue — 14 rows

Only these current rows now remain worth resolving directly before final Relation backfill:

- Pericles / Athens;
- Marquess Lie of Han / Han;
- Boudica / Iceni;
- Dong Zhuo / Eastern Han;
- Theodora / Byzantine Empire;
- Eleanor of Aquitaine / Duchy of Aquitaine;
- Liu Futong / Red Turban Song;
- Owain Glyndŵr / Principality of Wales;
- Henry the Navigator / Kingdom of Portugal;
- Catherine de' Medici / Kingdom of France;
- Nzinga Mbande / Kingdom of Ndongo;
- Simon Bolívar / Peru;
- Mahatma Gandhi / British Raj;
- Tecumseh / Tecumseh's Confederacy.

Several of these will themselves resolve to **Activity splitting** rather than one relation value. That is acceptable and preferable to a lossy backfill.

## Migration consequence

The relation migration must be phased:

```text
1. Add relation_type_id as nullable.
2. Apply reviewed structural corrections / retire obsolete rows.
3. Reconcile duplicate identities.
4. Complete the remaining historical and direct relation reviews.
5. Backfill Relation Type on surviving Activities only.
6. Cut over semantic identity / hashes / replay / merge logic.
7. Only then consider NOT NULL enforcement for new/end-state Activities.
```

There must be **no generic default relation** for existing rows.

## CI contract

`scripts/build-relation-backfill-readiness.mjs` consumes the generated 346-row relation audit and fails if:

- the conservative review set is no longer exactly 66 rows without a reviewed update;
- any of the 66 UUIDs is unclassified or classified twice;
- a reviewed-ready UUID changes Person/Polity binding;
- the expected disposition counts drift silently.

The purpose is not to freeze history forever. It is to force every future data change to update the reviewed migration plan intentionally rather than silently changing what will be backfilled.
