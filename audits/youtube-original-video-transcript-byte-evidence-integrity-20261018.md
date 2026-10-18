# B024 original-Video-ID transcript BYTE proof gate — 2026-10-18

## Why this exact bounded unit exists

**ONE end goal:** independently collect original YouTube history Channel/Video IDs, find actual historical Persons without taking Person names from the registered ATLAS table, verify an individual is actually the CENTER of an original video through real viewed footage or its timestamped transcript, and union VERIFIED original Video/Channel ID sets across one reviewed historical Person's multilingual name variants. Then screen the CURRENT ATLAS registered Person/aliases **LAST**, and publish exactly ONE authorized historically unregistered Person rank through the EXISTING DB/API/UI with independent runtime readback. Do not fabricate source content, delete archive originals, auto-register Persons, create a registered-person ranking, or substitute raw title-name counts.

In [draft #2522](https://github.com/JezCH/atlas-person-db/pull/2522), the earlier `TIMESTAMPED_TRANSCRIPT` code only checked whether `transcript_sha256` looked like 64 hexadecimal characters and `transcript_excerpt` was at least 25 characters. A fake `"a"*64` and made-up passage could then count as an actual Person-focused video if the remaining manually supplied review fields were filled. This is a **real integrity bug in the video approval contract**, not a hypothetical title-parser difference.

## New fail-closed evidence contract

The existing `scripts/youtube-source-video-content-evidence-gate.py` now requires `--transcript-evidence-dir` for **any POSITIVE** `TIMESTAMPED_TRANSCRIPT` decision. That folder must contain the actual UTF-8 original-video **`<11-character-video_id>.json`** (up to 2MB). User-supplied arbitrary file names/paths inside decisions are never trusted.

The SHA-256 is recomputed from **exact actual bytes of the file** and must equal `decision.transcript_sha256`. The JSON file is parsed and bound to the original archive/video review:
- `schema: atlas-youtube-original-video-transcript-evidence/v1`;
- original archived `video_id`, `original_channel_id`, `original_title`, `source_snapshot_id`, immutable `source_zip_sha256`, exact `source_url: https://www.youtube.com/watch?v=<video_id>`;
- actual recorded `capture_method: YOUTUBE_CAPTION_TRACK` or `MANUAL_VIDEO_PLAYBACK_TRANSCRIPTION`, human `captured_by`, timezone-aware `captured_at` at or before the later explicit human review time, and `caption_language`;
- ordered, nonoverlapping `segments[]` of finite nonnegative `start_seconds`, `end_seconds`, and nonempty `text`;
- **>=10 seconds of actual timed cue overlap inside the original video content review's explicit `content_segment`**. This is union-duration coverage of the physical caption cues, not merely a 10+ second requested window; a 2-second cue inside a 30-second requested period does not count;
- `transcript_excerpt` must appear in the text of **those intersecting cues**, after case/whitespace normalization, not somewhere else in an unrelated segment.

Example **FORMAT ONLY — fabricated synthetic test, NOT a sourced historical video**:

```json
{
  "schema": "atlas-youtube-original-video-transcript-evidence/v1",
  "video_id": "AbCdEfGhI12",
  "original_channel_id": "UCAAAAAAAAAAAAAAAAAAAAAA",
  "original_title": "Synthetic example: a historical person's life",
  "source_snapshot_id": "synthetic-test-source",
  "source_zip_sha256": "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946",
  "source_url": "https://www.youtube.com/watch?v=AbCdEfGhI12",
  "capture_method": "YOUTUBE_CAPTION_TRACK",
  "captured_by": "test fixture author",
  "captured_at": "2026-10-09T12:00:00Z",
  "caption_language": "en",
  "segments": [
    {"start_seconds": 30, "end_seconds": 42, "text": "A synthetic biographical history"},
    {"start_seconds": 42, "end_seconds": 60, "text": "of the named individual for a deterministic test."}
  ]
}
```

The `decisions` JSON supplies `evidence_method: TIMESTAMPED_TRANSCRIPT`, `transcript_sha256` (SHA-256 of this complete UTF-8 JSON file's **exact bytes**), and a `transcript_excerpt` that exactly occurs in `segments` overlapping the reviewed `content_segment` time. A data producer must first get **ACTUAL original-video caption/transcript bytes** and verify the source independently. Hashing a description, manually invented text, or a fabricated local JSON file is NOT evidence that YouTube ever served these captions. We cannot cryptographically establish that provenance solely from a claimed human capture receipt; the manual source authentication, human reviewer identity, historical context and video-content centrality are still separate non-automated proof gates.

The Python gate propagates real `transcript_evidence_sha256`, `transcript_capture_method`, `transcript_captured_at`, `transcript_caption_language` into `people[].content_review_provenance[]`. The read-only video-only registered-Person-LAST preview `scripts/youtube-content-verified-unregistered-preview.cjs` now refuses to count a purported transcript review missing those byte-check verification fields. The preview still **always** reports `publication_authorized=false`, current registry readback not witnessed and `production_writes=0`, even when synthetic tests create candidates.

## Verification and uncompleted data work

- `tests/test_youtube_video_description_content_gate.py` now includes 6 Python tests: a real synthetic UTF-8 JSON file is read, hashed and its cue timestamps/excerpt matched. Explicit negative tests reject claimed hashes with no bytes, changed bytes with original hash, a wrong original Video ID / Channel ID / title / source ZIP / source snapshot / YouTube URL, fake capture methods, a capture after review, excerpt absent from matched time cues, overlapping time cues, and less than ten seconds of actually timecoded evidence.
- `tests/atlas-youtube-video-description-content-gate.test.mjs` enforces 6 Python tests; `tests/atlas-youtube-content-verified-unregistered-preview.test.mjs` adds the offline transcript-provenance handoff test. All examples are **SYNTHETIC**, not proof of 1 actual B024 video.
- Actual historical B024 positive video-content certifications remain **0**, the exact source-bound first three official-snippet queue [draft #2513](https://github.com/JezCH/atlas-person-db/pull/2513) remains unexecuted pending authorized API access, and [#2505](https://github.com/JezCH/atlas-person-db/pull/2505) contains four reviewed identity HOLDs and source alias union. [#2525](https://github.com/JezCH/atlas-person-db/pull/2525) is the surviving original-ZIP high-33 source audit; the 865 legacy source-grammar differences and 4,868 source/live title-only crosswalk are not actual confirmed video biographies.
- No merge, ATLAS writes, Vercel Hobby 402 workaround, original data deletion, Person registration, or deployed new list. Later production publishing requires real externally authenticated caption/video source, approved historical individual, current registered Persons LAST, and one governed public DB/API/UI acceptance.

### CLI

```sh
python3 scripts/youtube-source-video-content-evidence-gate.py \
  --request /tmp/original-video-id-request.json \
  --metadata /tmp/youtube-official-source-snippets.json \
  --identities /tmp/source-first-reviewed-same-person.json \
  --decisions /tmp/manual-original-video-content-review-decisions.json \
  --transcript-evidence-dir /tmp/source-verified-captions/ \
  --output /tmp/source-content-gate.json
```

No caption evidence folder is required for strictly negative judgments or already independently reviewed `VIDEO_PLAYBACK_MANUAL` decisions. Positive `TIMESTAMPED_TRANSCRIPT` decisions cannot proceed without it.
