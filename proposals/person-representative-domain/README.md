# Person Representative Domain — Historical Review Ledger

**Status:** ARCHIVE / IMMUTABLE REVIEW EVIDENCE  
**Active writer:** normal Person registration / targeted canonical correction only

This directory preserves the pre-v2 and migration-era Person representative-domain review manifests that were used to establish the canonical Person Domain v2 state.

These files are **not an execution queue**.

Rules:

- do not replay batch numbers as current work;
- do not use this directory to register a new Person;
- do not create a routine post-registration domain batch;
- do not revive the retired v1 proposal writer;
- legacy `knowledge` values in historical manifests describe the state at review time and are not valid new writes;
- every newly created Person receives representative-domain review inside the normal registration lifecycle;
- current canonical values are exactly:
  `governance / military / science / technology / commerce / culture / religion / exploration`;
- future changes to an existing Person domain require evidence-backed targeted correction, not backlog replay.

The historical JSON files remain preserved for provenance, migration reconstruction, and regression tests.
