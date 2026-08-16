# Mobile era/year width adjustment

This change only tightens the Person table on mobile viewports.

- <= 760px: era band 46px -> 42px, activity-year column 132px -> 120px.
- <= 520px: era band 42px -> 36px, activity-year column 126px -> 112px.
- The identity, activity relation, and activity-count columns are otherwise unchanged.
- Mobile activity-year text is kept on one line.

No database, API, Person, Activity, or authoring semantics are changed.
