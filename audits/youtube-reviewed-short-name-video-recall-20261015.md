# YouTube original-video coverage: reviewed single-name biography cues (2026-10-15)

## Scope
Correct an evidenced blind spot in the independent original-Video-ID title
signal extractor: a reviewed mononym such as **Picasso** in "**The Life of
Picasso**" or "**Who Was Picasso?**" is dropped by the two-token open-vocabulary
cue extractor, even though "**Pablo Picasso: Biography**" is recognized.
This loses existing original video IDs before per-Person union.

## Bounded fix
- Source **only** the one-word name forms in the existing immutable
  \`audits/youtube-b024-v5-reviewed-alias-nameforms.json\` review, with its
  matching Batch008–024 ZIP artifact digest. No registered Person registry
  drives source candidate generation.
- For those reviewed forms, recognize explicit biography/person-led title
  constructions (life/biography/story/death/legacy of NAME; who was/is NAME).
  Preserve the original \`(channel_id, video_id)\` evidence and deduplicate it;
  run existing reviewed multi-name original-ID union normally. Never add
  already aggregated alias counts.
- Exclude unreviewed one-word names such as **Diana** and the previously held
  **Pelé/Pele** semantic ambiguity. A title cue is review-only, NOT certified
  actual video person-centeredness.
- The source manifest's original SHA is a hard precondition. Missing reviewed
  inputs do not silently admit one-word names.
- Focused original-video fixture asserts 3 newly recognized Picasso video IDs,
  6 distinct union IDs, 3 independent channels, zero Diana leakage and digest
  mismatch refusal.

## Remaining system-level blockers (not fixed by this unit)
The 2026-10-11 current read-only v5 crosswalk in PR #2495: 8,616 Production
title labels vs 5,965 independent source labels; 5,138 exact matches,
3,478 live-only, 827 source-only, and 4,868 matched labels with discordant
title counts. A distinct 865 legacy matching-rule discrepancies (33 severe)
require per-original-video review. The v5 publisher's >=3-channel raw-label
threshold can exclude two individually subthreshold aliases whose **combined**
verified original channels exceed the threshold; this requires a separate
atomic eligibility/union fix, NOT fabricated aggregate counts.

## Evidence and limits
This branch runs **local, deterministic test fixtures only**. The full
original Batch008–024 ZIP and ~12MB exact source-ID ledger are not in Git.
No real-corpus video-count delta, verified historical personhood, per-video
content approval, Production snapshot publication, Vercel deployment or
manual Person registration is claimed. To measure recovered real Video IDs,
replay the identical reviewed, digest-verified archived video corpus with
the existing publisher's authenticated governance once available. Keep
current original ID evidence immutable; do not crawl, use Vercel Sandbox,
or retry HTTP 402.
