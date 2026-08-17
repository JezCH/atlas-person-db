# Multi-Polity Sovereign Activity Split — 2026-08-17

## Decision

ATLAS Person–Polity Activities follow a single-polity scope.

- Role expresses office/title, not polity scope.
- If one person simultaneously holds a sovereign office over multiple **distinct modeled Polities**, each Person–Polity relation is represented by a separate Activity.
- Concurrent Activities may overlap completely when the offices are simultaneous.
- A reviewed composite polity remains valid when that composite is itself the political authority being modeled. This rule does not mechanically explode every union, empire, confederation, or composite monarchy.
- Historical accuracy has priority over completeness. Cases that require unresolved polity identity or office chronology are not split speculatively.

This decision is consistent with the existing Cnut the Great and Charles V patterns, where separate Polities already have separate Activities.

## Approved corrections

### Christian IV

Current reviewed Activity:

- Activity: `b3328785-0b69-47f1-bfe2-b9d2a07e725f`
- Current Polity: Denmark–Norway
- Role: King
- Relation: rules
- Period: 1588–1648
- Existing normalized sources: 2

Reviewed correction:

- Denmark / King / rules / 1588–1648 — preserve the existing Activity UUID.
- Norway / King / rules / 1588–1648 — create a new Activity UUID.
- Preserve and copy the existing normalized source links.
- The full overlap is intentional because the Danish and Norwegian crowns are simultaneous distinct Person–Polity relations.

Evidence is the already-approved Nordic authoring request and its successful Production authoring evidence.

### Oscar II

Current reviewed Activity:

- Activity: `3829e15f-a41d-4368-8c50-f0843c3d51a2`
- Current Polity: Sweden–Norway
- Role: King
- Relation: rules
- Period: 1872–1905-10-26
- Existing normalized sources: 3

Reviewed correction:

- Sweden / King / rules / 1872–1907 — preserve the existing Activity UUID and extend the Swedish reign to the reviewed source-supported end year.
- Norway / King / rules / 1872–1905-10-26 — create a new Activity UUID.
- Preserve and copy the existing normalized source links.
- The overlap is intentional; the Swedish reign continues after the Norwegian crown ended.

The approved source set explicitly distinguishes King of Sweden 1872–1907 from King of Norway 1872–1905 and records the formal Norwegian renunciation on 26 October 1905.

### Christian X

The existing Denmark Activity remains valid:

- Denmark / King / rules / 1912–1947-04-20.

A second reviewed human-authoring request adds:

- Iceland / King / rules / 1918–1944.

The existing Danish Royal House material explicitly gives Christian X as King of Iceland 1918–1944. `Iceland` is created as a separate Polity rather than embedding the polity in Role or treating Denmark as a primary substitute.

The old Denmark Activity note will be rewritten only after the Iceland Activity is confirmed in Production, so an independent authoring failure cannot leave a false cross-reference.

## Deferred cases

The following are **not** mechanically changed by this batch:

- Margaret I / Kalmar Union — union-level authority and formal/de facto offices require separate case review.
- Maria Theresa / Habsburg Monarchy — composite-monarchy and crown-title modeling requires dedicated review.
- Tiglath-Pileser III / Babylonian crown — requires the correct Babylonian Polity identity first.
- Pyrrhus / Macedonian kingship — interrupted and disputed chronology requires dedicated review.
- Henry VIII and Elizabeth I / Ireland — requires reviewed Ireland Polity identity and exact office interval before authoring.

These remain research/identity tasks rather than being guessed from title strings.

## Runtime invariant

For an Activity that represents sovereign rule, the displayed structure should be:

`Person → one Polity → relation=rules → Role → Period`

not:

`Person → composite convenience label → Role containing polity scope`.

This is an Activity modeling rule, not a mandate to destroy historically meaningful composite Polities.
