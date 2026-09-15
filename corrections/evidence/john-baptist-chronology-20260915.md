# John the Baptist chronology correction — prework evidence

Task key: `PERSON-CHRONOLOGY-JOHN-BAPTIST-20260915`

Status: **NON-EXECUTABLE PREWORK / NO PRODUCTION MUTATION**

## Scope

John the Baptist only. This evidence record does not authorize or apply any database mutation.

- Person ID: `9c776333-aa7a-4148-83eb-8d10a36b7175`
- Activity ID: `3d3170f9-7d04-4916-a8d9-1e8f83a4819b`
- Polity ID: `9c8d3c4b-d4f4-42a3-823a-f3c17f44cfee`
- Polity: Tetrarchy of Herod Antipas / 헤롯 안티파스 분봉국
- Relation: `active_in`
- Role: `prophet_and_baptizer` / 예언자·세례자
- Period basis: `religious_activity`

## Current Production observation

The current public read surface reports a single activity rail of `29 -> 29` CE, with both boundaries marked `approximate`, `confidence=likely`, and `chronology_status=reviewed`.

The existing note itself states that the beginning of John's public preaching is placed around 29 CE and that the exact duration and execution chronology are debated. Therefore a one-year `29 -> 29` rail is not a faithful interval representation; it is a representative point that visually collapses an uncertain multi-stage public ministry into one year.

## Reviewed correction target

Subject to an exact-before snapshot and correction-v2 dry-run at execution time, the intended target is:

- `start_year = 29`
- `start_certainty = approximate`
- `end_year = 30`
- `end_certainty = approximate`
- `confidence = likely`
- `chronology_status = reviewed`
- `period_basis = religious_activity` unchanged

The `29 -> 30` rail is an ATLAS conventional approximate interval. It must **not** be described as an exact death chronology. The beginning around 29 CE is directly supported by the Cambridge overview. The end near 30 CE reflects the common early reconstruction compatible with the Synoptic sequence, while the Josephus/Aretas chronology creates a recognized chronological problem and permits later reconstructions.

## Proposed replacement note

John the Baptist was a historical first-century Jewish preacher whose public preaching is commonly placed around 29 CE. Herod Antipas later imprisoned and executed him, but the exact execution chronology is disputed: Josephus independently reports the execution without supplying a precise calendar year, and scholarship notes tension between the New Testament sequence and the chronology surrounding Antipas and Aretas. ATLAS therefore records an approximate c.29–30 CE religious-activity interval as a conventional display range, not as a claim that either boundary is exact.

## Evidence

1. Delbert Burkett, *An Introduction to the New Testament and the Origins of Christianity*, Cambridge University Press, chapter “An overview of early Christian history”. Cambridge states that around 29 CE John began to preach and later was killed by Herod Antipas.
   - https://www.cambridge.org/highereducation/books/an-introduction-to-the-new-testament-and-the-origins-of-christianity/32A6751C4FE08D443DC4BDD934A3C343/an-overview-of-early-christian-history/3622AD35D4A76856568A0C2FF1F155A7
2. Josephus, *Antiquities of the Jews* 18.5.2. Josephus independently reports that Antipas imprisoned John at Machaerus and put him to death; Josephus' narrative does not itself assign John a precise execution year. Any bracketed year in the linked Whiston presentation is editorial, not Josephus' own dating.
   - https://penelope.uchicago.edu/josephus/ant-18.html
3. Jerome Murphy-O'Connor, “John the Baptist and Jesus: History and Hypotheses”, *New Testament Studies*. The article explicitly describes a chronological problem between the chronology implied by Josephus and that of the New Testament, reinforcing that an exact execution year should not be asserted.
   - https://www.cambridge.org/core/journals/new-testament-studies/article/abs/john-the-baptist-and-jesus-history-and-hypotheses/78374820644EDA8340B78334F58D1622

## Execution gate

Do not create an executable correction plan or mutate Production until all of the following are true:

1. Issue #977 shared NONCORE writer has reached a terminal event for the preceding task and this task is legally claimable in queue order.
2. `PERSON-CHRONOLOGY-JOHN-BAPTIST-20260915` has an explicit `LQ_CLAIM`.
3. A fresh exact-before snapshot of Activity `3d3170f9-7d04-4916-a8d9-1e8f83a4819b` has been captured from the governed correction path, including every field required by correction-v2.
4. A `rewrite_activity` correction-v2 plan is generated from that exact-before snapshot; no baseline field is guessed from the public read surface.
5. Correction dry-run passes before apply.
6. Post-apply public read verifies the intended approximate interval and preserves the same Person/Polity/activity identity.

## Out of scope

Jesus of Nazareth currently has a separate potentially over-precise `27 -> 30` activity rail. That requires an independent audit/task and is deliberately not changed by this correction.
