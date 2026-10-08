# YouTube Person Signal quality v4 — second-pass decisions

**Scope:** Following the full v2→v3 raw-title reparse (#2180), this pass reviews the first 650 **new Production v3 rank rows**, still on the same 6,770 distinct registered Channel IDs, 6,011 successful channels and 1,536,512 video titles.

## Observations

High-ranked non-person strings survived the original 208-label audit because they were not in that exact set. Examples include `Pompeii` (v3 rank 122, 25 channels), `Preview` (rank 170, 19), `Knights Templar` (rank 232, 16), `The Holocaust` (rank 319, 12), `Amazon`, `MH370`, `The Colosseum`, and `BTS`. These are places, media metadata, historical events, commercial entities, or groups, not individual humans.

- **New exact non-person decisions:** 87 labels (source: top-650 readback, `youtube-person-signal-quality-rules.v2.json`).
- **New nonhistorical myth/fiction candidates:** 10 (e.g. `Zeus`, `Athena`, `Spider-Man`, `Robin Hood`), routed out of the historical Person ranking without deleting their raw title evidence.
- **Structural guard:** `Chapter N`, `Part N`, `Day N`, `Ep N`, `Panel N` and matching numbered title fragments are rejected at parse time. Future batches cannot restore the same false-positive family just by changing the number.
- **Title repair:** `The Rise of [Name]` extracts the subject for separately validated names; `[Name] for Kids` no longer forms a separate Person entry.
- **Only narrowly determined alternate names:** `Tamerlane` → `Timur`, `Queen Elizabeth I` → `Elizabeth I`, `King Henry VIII` → `Henry VIII`, `Ramesses II` → `Ramses II`, `Martin Luther King` → `Martin Luther King Jr`.

**Not auto-merged**: `Paris` (city / mythic human), `Prince` (performer / title), `Napoleon` vs `Napoleon III`, `Hannibal` vs `Hannibal Barca`, `Cleopatra` vs `Cleopatra VII`, `Mao`, `Shakespeare`, `Oppenheimer`, etc. A surname or honorific is not a trustworthy Person key.

## Data rules

Raw video-title archives, channel ID manifests, previous v2 and v3 snapshots and canonical `atlas_v2.persons` are untouched. Historical rank rows are a **derived view** and will be rebuilt from all archives with `count(distinct channel_id)` per reviewed label, never by summing prior display counts. A new append-only snapshot must retain 6,011 successful channels, 1,536,512 videos and 6,770 registry IDs before publication; version is `reviewed-20261008-v2`, parser `yt-title-person-reviewed-v4`.

This is a **second conservative pass**, not certified human-by-human historical validation of the entire discovery corpus. More unverified and nonsensical raw labels may remain and should be reviewed in subsequent batches before Person registration.
