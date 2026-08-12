# Baseline A v2 intake and identity handoff — 2026-08-12

## Purpose

Production Train 1 must end with enough read-only evidence to begin Stage 2 without another ad-hoc Production query or a second Vercel deployment. Baseline A v1 captured the full Activity table but could miss unreferenced Person/Polity identities and did not preserve the complete name/source catalogs needed for deterministic rebinding. Baseline A v2 closes that gap.

## One-snapshot contract

On the same exact deployed `main` SHA that executes R0/R1, one `REPEATABLE READ READ ONLY` transaction captures:

- every `person_politics_v2` Activity row;
- every Person and all Person names;
- every Polity and all Polity names, preserving the live `name_type` value verbatim;
- every Role and Role name;
- every Period Basis and localized name;
- every normalized Source.

The digest is computed over `{ rows, counts, catalogs }`. This means changing an unused Polity, a name classification, or a Source changes the Baseline A digest even when no Activity row changed.

## Authority boundary

Baseline A v2 is authoritative for **what UUID-bearing rows exist in Production at that exact SHA**. It is not authority for historical interpretation.

Names and `canonical_key` values can nominate candidates for reviewed binding, but they never bind UUIDs automatically. Existing `polity_names.name_type` is raw live inventory and is mapped to the Stage 2 semantic name kinds only after Baseline A validation.

The intake cannot authorize correction v2, semantic-key activation, Person merge, or any Production mutation.

## Deterministic handoff

```text
Train 1 R0/R1 on exact SHA
  → Baseline A v2 full identity snapshot
  → digest/catalog/FK/metadata verification
  → atlas-stage2-baseline-a-intake/v2
  → fresh integration branch from updated main
  → fresh master ledger + work queues
  → reviewed Person/Polity/name-kind bindings
  → correction v2 / Stage 2 backfill
```

The old 346-row ledger and old stacked-branch UUID targets never regain mutation authority.
