# B024 original YouTube metadata handoff — actual schema reconciliation checkpoint

## Full original project objective (single result, in order)

**Original independent world-history YouTube Channel-ID/Video-ID corpus expansion** → source-derived historical Person name discovery (without using ATLAS registered Person DB as extraction lexicon) → verify that a VIDEO actually centers on one real historical individual rather than a work, performance, mythological topic, incidental mention or multi-individual group → safely unite independently reviewed multilingual spelling/aliases using original Channel-ID / Video-ID unions → exclude all ATLAS registered Person identities **LAST** → publish exactly ONE historical **unregistered** Person ranking. Publication via the existing authorized manual OIDC route with live API/UI readback; no automatic registration or parallel registered-Person ranking.

## Critical actual defect found in the previous handoff

The previous turn produced **10,126 verified original video IDs** in a real user-attached JSON file, but that file's schema is `atlas-youtube-video-description-request/v1` with fields `source_archive_sha256`, `raw_name_evidence[].title_cue_bucket`, `requested_unique_video_ids`. The actually merged GitHub collector `scripts/youtube-source-video-description-enrich.py` requires the DISTINCT schema `atlas-youtube-description-enrichment-request/v1` and fields `source_zip_sha256`, `name_cues[].bucket`, `unique_original_video_ids`. Directly passing the previous handoff to the merged `fetch` command **fails** with `UNVERIFIED_ORIGINAL_VIDEO_SOURCE_REQUEST`.

### Corrected and independently verified with actual source, not a blind JSON rename

`scripts/youtube-b024-reconcile-original-video-handoff.py` now reads the real legacy handoff, original 245-label evidence JSON and immutable original ZIP. It uses the **actual merged collector's `prepare()` implementation**, re-opens ALL original per-channel video records, and checks each original video ID, channel ID, title, raw name and title-cue-bucket against the legacy handoff before emitting a directly usable current-schema request. Rejects mismatched name lists, changed source ZIP hash, changed review SHA, misplaced channel ID, edited original title, unknown/duplicated video ID or new source population.

**Local complete B024 real-data replay (2026-10-10):**
- Original ZIP SHA256: `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`.
- Original full population: **10,127 distinct Channel IDs / 2,230,031 original videos**.
- Exact 245-name review evidence SHA256: `2ffae480aa7b77ed6ae3ddf5e88ac9d2a3f1618b41dbf86bcc3ed7070d6b0d1a`.
- Old original-ID handoff SHA256: `20dd630eecfba1442b50861b8d32368c5f00a568e630a0062967b37531037ae7`.
- Reconciled **10,126 UNIQUE original Video IDs** and independently checked actual channel/title/name/bucket tuples. 0 unmatched originals and 0 provenance discrepancies.
- Corrected request stored in this conversation's generated files at `/mnt/data/youtube-b024-10126-original-video-metadata-ready.json` (sha256 `06fe5e584aef1fd0f36231f0e71bc2e594ab654c17f907a8c8cc630cb2a954db`). Local file is NOT added to the repository to avoid large duplicate evidence, but its digest and provenance are pinned here.

### Reproduce from original source

```sh
python3 scripts/youtube-b024-reconcile-original-video-handoff.py \
  --legacy-request <legacy-10126-video-handoff.json> \
  --source-evidence <youtube-b024-245-title-topic-evidence.json> \
  --source-zip <youtube-batch024-source.zip> \
  --output /tmp/youtube-b024-10126-metadata-request.json

# Then, only with a secure authorized YouTube Data API key provisioned
# OUTSIDE the repository and command arguments:
python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request /tmp/youtube-b024-10126-metadata-request.json \
  --output /tmp/youtube-b024-description-part1.json \
  --max-batches 30

# Resumable collection after a successful real key-backed batch:
python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request /tmp/youtube-b024-10126-metadata-request.json \
  --previous /tmp/youtube-b024-description-part1.json \
  --output /tmp/youtube-b024-description-part2.json \
  --max-batches 30
```

Official YouTube Data API `videos.list(part=snippet)` accepts up to 50 IDs/request; **10,126 videos require at least 203 calls**. An empty/mismatched/removed original video remains a status, not a certified Person topic. Metadata descriptions alone do NOT satisfy the separate actual-video playback or timestamped-transcript evidence gate.

**Independent CI coverage:** `tests/test_youtube_b024_handoff_schema_reconciliation.py` tests real source-archive video/channel/title/bucket equality, bad SHA/bad schema/bad ID mismatch, and that the reconciled request is accepted by the *real* merged description collector and resumes correctly using mocked official snippets. `tests/atlas-youtube-b024-metadata-handoff-schema.test.mjs` executes the Python suite in default project CI.

## What has NOT happened

- **No real YouTube descriptions or transcripts** obtained with credentials in this work.
- **No new video playback/transcript-based Person-content approvals**.
- **No new registered Person exclusion across entire candidate corpus**.
- **No new canonical verified-Person ranking snapshot published.** The v5 title-**candidate** Production discovery read-path remains at its previously verified count of 8,713 after source-reviewed nonperson exclusions, unless subsequent independent deployments explicitly change it.

## Next priority

Make the authorized YouTube Data API source available in a secure workflow and actually collect descriptions in resumable batches; obtain verified video/subtitle content and reviewer decisions; reunite actual same-Person alias forms using original Video-ID sets, then registered Person exclusion LAST and manual validated canonical publication. Validate B025 provenance before claiming new original source coverage. Do not repeat this handoff schema problem or mislabel source titles as verified individual-focused videos.
