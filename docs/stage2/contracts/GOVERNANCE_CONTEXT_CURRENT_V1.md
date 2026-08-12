# ATLAS Stage 2 Governance Context Contract — Current v1

> Status: BASELINE-INDEPENDENT DOMAIN CONTRACT / NO PRODUCTION MUTATION
>
> Supersedes stale planning language in the old stacked Stage 2 audit while preserving its reviewed domain decisions.

## Core rule

A **Polity** is the map-level historical political actor. A **Governance Context** is the government, constitutional regime, or governing order through which that Polity is administered during a temporal interval.

```text
Polity
  ├─ Territory History
  └─ Governance History
       └─ Governance Context

Person
  └─ Activity -> Polity
       └─ Relation Type
```

Governance Context does not own Territory geometry. Person does not own Territory geometry.

## Shared identity, not repeated Activity text

Governance Context is a reusable entity because the same government/regime can span multiple office-holders and Activities.

Conceptual shape:

```text
governance_contexts
  id UUID
  canonical_key
  governance_type
  historicity

governance_context_names
  governance_context_id
  locale
  name
  name_type
  is_preferred

polity_governance_periods
  id UUID
  polity_id
  governance_context_id
  temporal interval
  confidence / review state
  provenance
```

Initial governance types stay deliberately small:

- `government`
- `constitutional_regime`
- `governing_regime`

Do not turn dynasty, house, clan, party, ministry, ideology, revolt, event, or ethnicity into Governance Context merely because it is convenient.

## Reviewed examples

- France / French Republic -> French Fifth Republic (`constitutional_regime`)
- Japan -> Tokugawa Shogunate (`government`)
- Japan -> Kamakura bakufu / shogunate (`government`)
- Tibet -> Ganden Phodrang (`government`)
- unified Japan under Hideyoshi -> Toyotomi Regime (`governing_regime`) where the reviewed phase applies

The Japan examples no longer mean that the domain model itself is unresolved. The reviewed Stage 2 direction is broader Japan as the map-level Polity where historically justified, with bakufu/regime preserved as Governance Context and lower-level domains/authorities represented separately when evidence requires them. Sengoku territorial reconstruction remains a Territory/history problem, not a reason to collapse government and Polity.

## Person Activity link

Governance is primarily derived from `Polity + time`. A mandatory Governance FK on every Activity is forbidden because it would duplicate derivable history and falsely imply one exclusive government layer everywhere.

A future optional Activity -> Governance Context assertion is allowed only when simultaneous governance layers make the Person's office affiliation genuinely ambiguous from Polity + time alone.

## Runtime

Runtime resolves:

```text
selected year
-> Polity Territory
-> reviewed Governance Context for that interval
-> Person Activity + Relation Type
```

The governance label is metadata/layer context. It does not create an extra country polygon.

## Authoring

Authoring may preserve:

- unknown or approximate governance boundaries;
- overlapping governance contexts;
- disputed classification;
- source conflicts;
- governance known while an exact territorial reconstruction remains unresolved.

No placeholder Polity or geometry is created to make Runtime simpler.

## Production dependency

This contract is baseline-independent and may be carried forward before Baseline A. Actual `polity_id` bindings, governance-period assertions, exact intervals, source joins, and Production writes must be rebound to Baseline A and executed only in the Stage 2 Production train.