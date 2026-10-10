# YouTube historical-Person discovery — original Video-ID content-evidence gate

**One ultimate target:** world-history YouTube original channel/video population → discover true historical Person candidates independently from atlas_v2 registered names → identify **actual** individual-focused original videos → reviewed multilingual/orthographic same-Person unions using ORIGINAL Channel-ID/Video-ID sets → exclude currently registered Persons **LAST** → publish exactly ONE unregistered historical-Person discovery ranking, with a manual OIDC-gated verified snapshot update. No parallel registered-only ranking or automatic Person registration.

## Verified full-source handoff on 2026-10-10

- Source: immutable Batch008–024 archive ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`, **10,127 unique Channel IDs, 2,230,031 original video title rows**.
- Independent #2398 source evidence `youtube-b024-unreviewed245-title-evidence/v1`: **245 raw-name labels**, NOT 245 certified historical Persons.
- `scripts/youtube-source-video-description-enrich.py prepare` successfully replayed the **full original archive** with per-video, NOT per-aggregate, (video_id, channel_id, title) record joins; produced **10,126 unique source video IDs**, each with its actual original Channel ID, immutable title and candidate raw-name/bucket references. **All** 10,126 original Video IDs found in their original channel files. SHA and 10,127 / 2,230,031 source counts matched.
- Local verified request handoff (3.7 MB): `/mnt/data/youtube-b024-245-original-id-metadata-request.json`. Not embedded in Git to avoid storing per-video duplicates in a repository source file. The upload/artifact mechanism must preserve this exact JSON and sha.
- Original source ZIP only has `video_id`, `channel_id`, `title` — **no description, captions, transcripts or content**. Do not label actual Person-centeredness based on titles.

## Actual video-description collection (not executed without credentials)

Official Google YouTube Data API `videos.list(part=snippet)` accepts up to 50 video IDs per batch and returns `snippet.channelId`, `snippet.title`, `snippet.description`, and `snippet.publishedAt`. A call costs 1 quota unit; 10,126 IDs require at least 203 requests, not counting missing or retry processing (official docs: https://developers.google.com/youtube/v3/docs/videos/list).

Run with an explicitly supplied authorized `YOUTUBE_DATA_API_KEY` in a secure runner's environment (never commit or print the key):

```sh
python3 scripts/youtube-source-video-description-enrich.py prepare \
  --source-evidence <245-evidence.json> \
  --source-zip <original-batch008-024.zip> \
  --output video-request.json

YOUTUBE_DATA_API_KEY=... python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request video-request.json \
  --output video-descriptions-part1.json \
  --max-batches 30

YOUTUBE_DATA_API_KEY=... python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request video-request.json \
  --previous video-descriptions-part1.json \
  --output video-descriptions-part2.json \
  --max-batches 30
```

The metadata collector **fails closed** for missing keys, unrecognized/duplicate video IDs, changed source archive, and resumptions from different source. Channel ID mismatch, unavailable videos, and empty descriptions are **explicit status labels**, not silently retained as verified videos.

## Actual Person-focused source video reviews are separate

`scripts/youtube-source-video-content-evidence-gate.py` requires all inputs: original per-video request, official metadata response, independently source-reviewed historical identity manifest `audits/youtube-b024-source-first-36-final-registered-identity-review.json`, and an explicit human content-review decision ledger. Decisions have exact Video-ID, raw original Person name, independently reviewed historical identity key, verdict, reviewer's identity, review timestamp, original YouTube URL, substantive observation/reason, and 10+ second timestamped content segment. Acceptable proof methods are **VIDEO_PLAYBACK_MANUAL** or **TIMESTAMPED_TRANSCRIPT** with transcript SHA256 and excerpt. A title, description or LLM-based string comparison is **NEVER** approved content evidence; nonavailable or channel-changed videos are not eligible for credit.

The result is original **Video-ID and Channel-ID unions** per reviewed Person identity, with zero fabricated/certified Person-video counts when no playback/transcript reviews exist. All gate outputs are **nonpublishable** until current registration/aliases have been rechecked as the last step, and provenance of the new published snapshot is verified. No DB mutation or automatic rank change is part of these tools.

## Do not claim more than observed

- Real source queue READY and locally fully verified: **10,126 original videos**.
- Actual descriptions fetched in this environment: **0** (no `YOUTUBE_DATA_API_KEY` set).
- Actual independent video playback/transcript reviews: **0** from this tool execution.
- Actual verified Person-centered channel counts published to Production: **0 newly approved**.
- Production v5 discovery signal remains an independently source-generated **TITLE-CANDIDATE** list, not content-verified biographies. The last live title-candidate readback was 8,713 after 409+23 reviewed nonperson exclusions.

### Next acceptance order

1. Provide an authorized Google YouTube Data API key to the runner (or an alternative trustworthy bulk description/transcript source), and collect validated metadata in resumable batches. Distinguish missing/unavailable videos.
2. Stratified actual video-content/transcript review for an unbiased Person-focusedness estimate and explicitly reviewed video rows; require verified individual identity across languages and aliases.
3. Build the whole original corpus-reviewed true Channel-ID unions, apply present-day registered-Person exclusion LAST, then use the existing production OIDC manual publisher to update the single canonical unregistered discovery ranking. Verify LIVE API/UI actual changed snapshot and score distributions.
4. Continue Batch025/001–007 source expansion only after immutable archive hashes and source ID population have been verified.
