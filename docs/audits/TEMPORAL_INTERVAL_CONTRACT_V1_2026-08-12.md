# ATLAS Temporal Interval Contract v1

> Status: STAGE 2 DOMAIN CONTRACT / AUDIT ONLY
>
> Production DB mutation: **none**

## 1. Why a shared temporal contract is required

The current `person_politics_v2` schema stores `activity_start` and `activity_end` as signed integer years. That works for most current rows but cannot represent two historically separate intervals within the same pair of calendar years.

Shigeru Yoshida is the concrete blocking case:

- first premiership: **22 May 1946–24 May 1947**;
- later premierships resume **15 October 1948** and continue through **10 December 1954**.

A single `1946–1954` row invents continuous office-holding across the 1947–1948 gap. Two year-only rows still cannot state the actual boundaries cleanly.

The same temporal problem will eventually affect:

- Person Activities;
- Governance Context periods;
- Polity-to-Polity relations;
- Polity designation/state-form history;
- Territory Records;
- Events and capital changes.

Therefore the solution must be project-wide, not a Yoshida-specific exception.

## 2. Do not use JavaScript Date / Unix time as historical identity

ATLAS covers BCE history, uncertain dates, and multiple historical calendars.

Do not make the canonical historical value depend on:

- Unix epoch timestamps;
- JavaScript `Date`;
- a database `DATE` value that silently assumes a proleptic calendar for all history.

The canonical representation remains explicit historical components.

## 3. Historical year numbering

Keep the existing ATLAS convention:

- BCE years are negative integers;
- CE years are positive integers;
- **year 0 does not exist** in authoring data.

Examples:

```text
52 BCE -> -52
1 BCE  -> -1
1 CE   -> 1
```

This matches the current schema's no-year-zero rule and avoids silently changing all existing chronology semantics.

## 4. Temporal boundary value

Conceptually each start/end boundary has:

```text
year          required when boundary is known
month         optional
 day          optional
granularity   year | month | day
certainty     exact | approximate | uncertain
calendar      gregorian | julian | unspecified_historical | source_calendar
```

Rules:

- `year` must be a non-zero signed historical year in the project range;
- `month` requires granularity `month` or `day`;
- `day` requires `month` and granularity `day`;
- missing month/day are not silently replaced with January 1 / December 31 in Authoring;
- `calendar` describes the source/calendar interpretation, not a promise that ATLAS has converted every historical date to one universal civil calendar;
- uncertain or approximate boundaries remain explicit.

## 5. Shared column convention, not a generic interval table

Do not create one global `temporal_intervals` table that every historical object must join through. That would over-normalize simple queries and make provenance ownership unclear.

Instead, use a shared column/value contract on each temporal entity.

Conceptually:

```text
start_year
start_month
start_day
start_granularity
start_certainty
start_calendar

end_year
end_month
end_day
end_granularity
end_certainty
end_calendar
```

The current Activity columns can be migrated incrementally rather than destructively rewritten in one step. The exact SQL naming is deferred until migration design.

## 6. Interval semantics

ATLAS temporal intervals are **inclusive historical intervals** unless an entity contract explicitly says otherwise.

For a precise office term:

```text
1946-05-22 through 1947-05-24
```

both boundary days are part of the activity.

For a year-only record:

```text
527 through 565
```

this means the evidence supports activity during that year range; it does **not** assert January 1 and December 31 exact boundaries.

This distinction is why granularity must be stored separately from the numeric components.

## 7. Query behavior

### Year-based Runtime

If the user selects a year, a record matches when any supported portion of its interval intersects that year.

A day-precise record does not need to be rounded into fake whole-year boundaries for the map timeline.

### Precise Authoring / future date Runtime

When month/day filters exist, comparison may use the stored boundary precision only when calendar interpretation is compatible.

ATLAS must not silently compare two source-calendar dates as if both were Gregorian without an explicit conversion policy.

## 8. Yoshida reviewed target

The current Activity:

```text
Japan / Prime Minister / 1946–1954
```

should eventually become at least two Activity intervals:

```text
1946-05-22 -> 1947-05-24
1948-10-15 -> 1954-12-10
```

with:

```text
granularity = day
certainty = exact
calendar = gregorian
```

The second interval may later be subdivided if ATLAS chooses to preserve individual cabinet/premiership-number terms, but no such extra split is required merely to fix the current continuous-gap error.

## 9. Precision is not confidence

Do not mix temporal granularity with historical confidence.

Examples:

- exact day in a disputed source -> `granularity=day`, confidence may still be disputed;
- approximate year -> `granularity=year`, `certainty=approximate`;
- well-established year-only reign -> high evidence confidence but still `granularity=year`.

The same principle applies to Territory boundary certainty and evidence confidence: dimensions must remain orthogonal.

## 10. Unknown/open boundaries

Future entities may require unknown or open-ended boundaries. Do not invent a sentinel year such as `9999` or `-10000` to mean unknown.

The eventual schema should distinguish:

- a real known boundary;
- unknown boundary;
- open-ended/current boundary if modern/current data is ever admitted.

The current historical Activity table still requires both years; changing nullability is a separate migration decision and is not required to solve Yoshida.

## 11. Semantic identity impact

The current Activity semantic identity includes start/end year values. Once sub-year precision is implemented, semantic duplicate identity must include the full normalized temporal boundary, not only the year.

Conceptually:

```text
person
+ polity
+ relation_type
+ role
+ period_basis
+ normalized start boundary
+ normalized end boundary
```

Otherwise two distinct terms in the same year could collide.

This must be coordinated with the future `relation_type` migration and duplicate/merge logic.

## 12. Backward compatibility

Existing 346 Activities should remain valid as year-granularity records after migration.

No existing row should gain fabricated month/day values.

Backfill principle:

```text
existing activity_start = Y
-> start_year = Y
-> start_month/day = NULL
-> start_granularity = year
```

and likewise for the end boundary.

This preserves meaning exactly.

## 13. Migration gate

Before Production migration:

1. decide exact SQL column naming and check constraints;
2. define comparison/normalization helpers shared by authoring, planner, DB, and duplicate merge;
3. add `relation_type` to Activity semantic identity at the same semantic-key transition or prove that separate migrations are safer;
4. update content hashing and manifest replay comparison;
5. update normalized read projection without breaking existing year UI;
6. test BCE/no-year-zero behavior;
7. test year-only, month, and day boundaries;
8. test Yoshida as the minimum sub-year acceptance case;
9. test rollback on fresh PostgreSQL.

Until then, Yoshida remains blocked rather than being approximated into false year-only rows.
