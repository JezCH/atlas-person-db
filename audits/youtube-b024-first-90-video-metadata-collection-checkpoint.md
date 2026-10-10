# B024 historical Person VIDEO-focusedness: first 90 metadata reviews (2026-10-10)

## One complete project objective — unchanged
Expand independent world-history YouTube Channel-ID/Video-ID originals → extract historical Person candidates independently of atlas_v2 registered-Person names → verify that original videos actually centre on **one** historical Person rather than a work, music performance, portrayal, mythological topic, group, incidental mention or multiple people → safely merge verified multilingual/orthographic true same-Person Channel/Video-ID unions → exclude atlas_v2 registered Person identities LAST → publish ONE accurate unregistered historical-Person discovery ranking in the live UI. Never create a registered-Person leaderboard, delete historical sources or automatically register candidate Persons.

## Real next unit: avoid fetching 10,126 videos blindly
- Existing verified full archive: immutable Batch008–024 ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`, **10,127 distinct original channel IDs / 2,230,031 source video rows**.
- The actual *current collector-compatible* **10,126** original ID/channel/title request (previous #2433) has SHA256 `06fe5e584aef1fd0f36231f0e71bc2e594ab654c17f907a8c8cc630cb2a954db`. Its original name lexicon came from independent source titles, NOT the registered Person DB.
- Select the 15 initial source-prioritized historical identity REVIEW groups from #2404, including both `Chhatrapati Shivaji Maharaj` and `Shivaji Maharaj` as one individual. Keep original title cues from ONLY `BIOGRAPHICAL_TITLE_CUE_REVIEW` or `POST_NAME_BIOGRAPHY_CUE_REVIEW` (distinct from a generic name-heading).
- **Actual exact original source ID tally: 90 different video IDs across 82 unique original Channel IDs, 15 distinct Person-identity REVIEW groups.** The original ID sorted-set SHA256 is `e0889583b5d71a9559a1d2aae455d7c1e33f624b2499db1c7bfb4f3f83e4f4f0`. These remain only title-derived review candidates, **0 actual video content subjects approved** and **0 final ATLAS-unregistered identities confirmed**.
- This first collection is just **2 official Google videos.list(snippet) API calls** in 50-video batches (50 + 40), instead of 203 calls for 10,126 videos. A high-signal low-cost first review tranche, not an estimate of full-corpus precision.
- The fully source-checked actual **collector-compatible request** was produced at `/mnt/data/youtube-b024-first-biography-metadata-tranche.json` (original output SHA256 `39cfb7f36867599f815f237d44726c691b6788f48a0a0e3347ef5715858d4734`). It is an attached downloadable conversation artifact and NOT installed as a GitHub source file.
- Source-stable Python selector: `scripts/youtube-b024-select-first-biography-metadata-tranche.py`; checks parent 10,126 source SHA, full population, source SHA, exact 90-source Video-ID fingerprint and original Channel IDs.
- The actual official collector `scripts/youtube-source-video-description-enrich.py` has been hardened to atomically save `--output` after **EVERY successful 50-video API batch**, not only at end: if subsequent API call fails, completed metadata is preserved for `--previous` resume. Previously saved records are now rechecked against immutable parent original Channel ID/title, source snapshot/digest, description SHA256, honest empty/not-found/channel-mismatch status and forced `person_video_content_verified=false`. No previously collected metadata is trusted by caller assertion alone.
- `tests/test_youtube_b024_first_metadata_tranche.py` and its Node CI wrapper assert source-first identity selection, 50+10 mock API failure and checkpoint/resume, bad resume record/description tampering, and preservation of no-content-approved state. Does NOT pretend mocked descriptions are actual evidence.

## Run after secure credentials are provided outside the chat/repository

```sh
python3 scripts/youtube-b024-select-first-biography-metadata-tranche.py \
  --request <collector-compatible-10126-video-request.json> \
  --output /tmp/biography-first-90.json

# Only if YOUTUBE_DATA_API_KEY is securely configured in the execution environment.
python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request /tmp/biography-first-90.json \
  --output /tmp/biography-first-90-metadata.json \
  --max-batches 2

# If a network/HTTP failure happens after first success, --output already contains 50 results:
python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request /tmp/biography-first-90.json \
  --previous /tmp/biography-first-90-metadata.json \
  --output /tmp/biography-first-90-metadata.json \
  --max-batches 2
```

Actual original title examples show WHY even strong cue is not proof: Emmett Till videos include **Bob Dylan's song** and assorted interviews; C. S. Lewis includes a TV film; Booker T. Washington includes an audiobook. Such videos must be reviewed as **creative works, media adaptations or subject-focused content**, never automatically credited merely because of biographical syntax. No data/Person DB/rank publication happens from this script.

## Acceptance / remaining gates
1. Secure metadata source credentials or independent connected source; perform real official metadata queries (0 completed by this PR).
2. Obtain timestamped actual video playback or transcript evidence and explicit reviewed content decisions for the tranche, beyond title and description.
3. Expand across additional historically credible candidates and then full 8,713 current live raw name-signal universe without using the existing atlas_v2 registry as generation lexicon.
4. Confirm true same-Person aliases by original Video/Channel ID unions, registered atlas_v2 exclusion LAST, manual canonical publication and live UI readback.
5. Verify missing B001–007 and new B025 original sources before expanding 10,127 / 2,230,031 numbers.

**Do not report 90 certified videos or 82 historical-Person channels: those are only ORIGINAL provenance of an evidence collection PRIORITY tranche.**
