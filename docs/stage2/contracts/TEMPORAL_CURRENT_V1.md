# ATLAS Stage 2 Temporal Contract — Current v1

> Status: BASELINE-INDEPENDENT DOMAIN CONTRACT / NO PRODUCTION MUTATION

## Historical boundary

Canonical historical time is explicit components, not JavaScript `Date`, Unix time, or a silently proleptic SQL date.

```text
year          non-zero signed historical year
month         optional
day           optional
granularity   year | month | day
certainty     exact | approximate | uncertain
calendar      gregorian | julian | unspecified_historical | source_calendar
```

BCE years are negative, CE years positive, and authoring year 0 is invalid. Missing month/day are never silently filled.

## Shared interval language

Every temporal Stage 2 assertion uses the same boundary shape:

- Person Activities
- Governance periods
- Polity relations
- Polity designations/state forms
- Polity identity transitions
- future Territory records/events where the map project adopts the same contract.

Intervals are inclusive historical intervals unless an entity contract explicitly defines another rule.

## Unresolved boundary is a first-class Authoring state

Historical accuracy outranks database convenience. For new Stage 2 assertion families, a whole start or end boundary may remain unresolved when the evidence does not justify one.

Two states are valid:

1. the entire boundary tuple is NULL/unresolved;
2. `year` is known and the remaining fields form one coherent year/month/day tuple.

A **partial tuple** such as `year=1800, month=5, granularity=NULL` is invalid. The system must not promote it to a fake month-precise date, and it must not force an arbitrary year merely to satisfy a NOT NULL column.

Person Activity keeps its already-existing required year endpoints during the additive transition; its new detail columns may remain all NULL until reviewed backfill. This is compatible with the same rule: no invented lower precision.

## Precision is not confidence

Granularity/certainty and evidence confidence are separate dimensions. An exact day can be disputed evidence; a well-established reign can still only be known to year precision.

## Backward compatibility

Existing year-only Activity data migrates without fabricated precision:

```text
Y -> year=Y, month=NULL, day=NULL, granularity=year
```

During the additive Stage 2 phase, Activity detail columns may remain all NULL until reviewed backfill. Once any detail metadata is supplied, the tuple must be coherent.

## Semantic identity

Full interpreted start/end boundaries are part of Activity semantic-key v2. Certainty is not identity. Calendar is identity because identical numeric components under different calendars can identify different intended historical boundaries.

A row with an unresolved Relation Type or unresolved required Activity boundary interpretation is not semantic-key-v2-ready; it remains Authoring/migration state rather than receiving guessed values.

## Minimum acceptance cases

- BCE / no-year-zero validation
- year/month/day shapes
- wholly unresolved new-assertion boundaries remain representable
- partial boundary tuples are rejected
- Yoshida's 1946-05-22→1947-05-24 and 1948-10-15→1954-12-10 discontinuous terms
- Russia 1721, Portugal 1815, Gandhi 1947, Lenin 1917/1923 precise transitions
- no fake month/day backfill for existing year-only Activities.

## Baseline dependency

The temporal language is baseline-independent. Exact surviving Activity bindings and historical corrections wait for Baseline A; Production columns are introduced additively in P5 and become semantic-key authority only in the coherent P9 cutover.
