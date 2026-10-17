# YouTube B024 reviewed alias threshold parity — 2026-10-15

## One end-state, no detour

Use independent original global-history Channel IDs and Video IDs to discover
real unregistered historical Persons, distinguish homonyms, confirm each actual
video's Person-centeredness, and consolidate verified multilingual/orthographic
aliases by **sets of original IDs**. Only then apply up-to-date registered-Person
exclusions and publish **ONE** governed unregistered-Person ranked discovery
surface. Do not create a second leaderboard or auto-register Persons.

## Specific missed case fixed here

Previously `reviewed_source_alias_unions` rejected any reviewed alias that had
fewer than three independent source channels, before calculating the reviewed
union of original Channel IDs/Video IDs. The live discovery SQL also only
selects raw candidates individually passing the >=3 gate and rejects reviewed
aliases absent from those rows. A reviewed person with forms found in
{UC1,UC2} and {UC2,UC3} therefore disappeared even though the true source
union is **three distinct channels, four distinct original videos**.

Now the source publisher computes the exact reviewed union from the original
ID sets BEFORE per-label eligibility filtering. Unpublished one- or two-channel
alias counts remain inside the source-digest-pinned reviewed union evidence.
The read service accepts a missing source label **only if that verified
manifest reports <3 channels**; an absent >=3 alias or mismatched present
count is a hard error. A reviewed union itself must have >=3 distinct channels.
The UI candidate rank and registered-Person exclusion apply to the resulting
single synthetic Person name once. No sum of source aggregates; no automatic
unreviewed short-name or homonym union.

The deterministic three-channel / four-video fixture exercises source
extraction -> unique original-ID union -> raw >=3 exclusion -> merged
candidate rank -> registered-Person suppression and negative mismatch tests.
Existing six-v4 and five-v5 accepted reviewed-union contracts retain their
historic source-specific evidence and remain unmodified.

## Status and separate previously identified omissions

- PR #2504 (original isolated patch, now integrated into the current PR):
  embedded reviewed one-word biography cues and single-spaced dash subtitles.
  The current branch includes those exact code changes, both original
  regression tests and this threshold unit. Its revised cross-feature fixture
  checks two source-review single-word videos plus a dash-delimited long name,
  both individually <3 channels, forming exactly one 3-channel original-ID
  union. One verified integrated PR is authoritative, not two competing
  publisher versions.
- PR #2495 (previously executed but open): 8,616 current v5 title labels vs
  5,965 original source labels; 5,138 shared exact strings; 3,478 live-only;
  827 original-only; **4,868** same-name title-count discrepancies.
- Source matching grammar drift: older 5,720 names -> **865** source-side
  differences, **33** high-risk, kept for original Video-ID adjudication.
- PR #2477 (previously implemented but open): four source-review identity
  HOLDs (Marcos, Benedict, Patrick, Valentine) plus reviewed alias exclusions.
  Do not merge HOLDs into one Person or redo this review as new work.
- Actual per-video content verification still remains open. As established
  in the existing manifest, four public publisher descriptions for two
  channels were reviewed, **no** video playback/timestamped transcript
  certification. Do not treat 330,327 matched title-video IDs as videos
  actually centered on Persons.
- The B024 original ZIP (10,127 original channels / 2,230,031 video records,
  SHA256 8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946),
  full 5,965-name original-ID ledger and older 865-delta samples are NOT
  available inside this Git checkout; no real-corpus count improvement claimed.
- Vercel 402 remains an independent deployment block. No production writer,
  publication, crawl, Sandbox, deletion or unapproved auto-registration.

## Next precise unit

Use the **existing** source-ledger and reviewed video/topic evidentiary
decisions, not a fresh aggregate-name crosswalk, to adjudicate a small
batch of high-impact 865 source grammar drifts by original Video ID;
separate legitimate missing videos from generic false positives. When
original archive access and guarded auth permit, replay only the exact
source SHA, verify how many unique Video IDs the two independent extractor
fixes recovered, and publish the canonical single reviewed historical-
unregistered Person discovery feed only after video-centeredness and
registered-Person filters pass. No extrapolating fixture counts to corpus.
