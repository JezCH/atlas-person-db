# Batch024 — three exact original Video IDs, read-only official snippet fetch (2026-10-18)

## Immutable end goal

Independently sourced history YouTube original Channel/Video IDs → certify a **real historical Person** is the main topic of a specifically watched video or timestamped transcript (not a title/description mention) → join reviewed multilingual names of the *same* human by original Video ID and Channel ID **SET UNION**, never summing raw-name counts → screen **currently registered ATLAS Persons and known aliases LAST**, keeping homonym and identity HOLDs → publish **precisely ONE** historical **UNREGISTERED** Person source-backed ranking in existing DB/API/UI and verify real deployed readback. Do not auto-register Persons, delete original source, build an alternate registered-person UUID ranking, invent a watched video or deploy without authorization.

## One exact action now executable after governed integration

The full original Batch008–024 corpus ZIP was already SHA256-verified and read in PR #2513: 10,127 archived channels / 2,230,031 Video-ID rows / original ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`. **All 12 title-triage video ID, archived Channel ID and title triples matched 12/12.** The existing video content queue contains exactly THREE plausible individual-focused *titles*, **not watched biographies**:

| Historical Person title-cue | Original Video ID | SHA-bound original Channel ID | Original title |
|---|---|---|---|
| Dele Giwa | `-13y_Jm-pzI` | `UC7OkutZc6qzX44IK0HEDLJA` | Who Killed Dele Giwa? |
| Meriwether Lewis | `-1CalygxBrM` | `UCjD2hhUF5R8G9oAjOzQo26w` | Was Meriwether Lewis Murdered? The Shocking DNA Evidence Revealed |
| Salvador Dalí | `-5Lg5mk74NA` | `UCesJHHdqSw_9gC0aMod9IKw` | Salvador Dali brief biography and his artwork. Great for kids and esl |

The complete three-video official snippet request resides at `audits/youtube-b024-first-12-metadata-review-request.json` (PR #2513), tied to `audits/youtube-b024-first-12-original-zip-direct-replay-20261018.json`. The built-in `scripts/youtube-source-video-description-enrich.py` already handles official `videos.list(part=snippet)` and provides exactly the required `snippet.channelId`. No untrusted scraped search title, *another* Meriwether Lewis video ID, or public oEmbed author display name may replace the archived source ID. Public Google/YouTube search indexed the exact Dalí video with uploader **Inma** and publication date 2016-04-14; this is **not** independent `snippet.channelId` verification nor actual video-content certification. The other two original Video IDs were not independently confirmed in search results; do not infer deletion.

### Safe new entrypoint

`scripts/youtube-b024-first3-official-metadata.py` is **offline by default**. It checks the committed actual original ZIP replay report against its archived 12 source triples, and the three requested exact original IDs/channels/titles; creates a source-bound readiness report with **0 external calls**.

```bash
python3 scripts/youtube-b024-first3-official-metadata.py \
  --output /tmp/yt-b024-three-offline-preflight.json
```

A one-time **explicit** `--fetch` sends exactly ONE YouTube Data API `videos.list(snippet)` batch for precisely these three immutable Video IDs, **only if a genuine authorized `YOUTUBE_DATA_API_KEY` is available**. The script does not print the key or descriptions in logs; it never calls Vercel, Supabase, ATLAS or any publishing endpoint. Entire three-video snippet evidence stays in local files/artifacts.

```bash
# Supply an authorized key as an environment secret, NEVER as a CLI argument
python3 scripts/youtube-b024-first3-official-metadata.py --fetch \
  --output /tmp/yt-b024-three-current-channel-status.json \
  --metadata-output /tmp/yt-b024-three-official-snippets.json
```

The `--fetch` review result distinguishes:
- `MATCHED_ARCHIVED_CHANNEL`: current official video `snippet.channelId` equals archived original `UC...`; **not** proof the video is actually focused on the Person.
- `CHANNEL_MISMATCH_HOLD`: original video ID and current `snippet.channelId` disagree; requires manual source/identity correction, **zero** Person credit.
- `NOT_FOUND_OR_UNAVAILABLE_HOLD`: API response omits ID; not evidence of historical source deletion, **zero** Person credit.

The official metadata source title, publisher description digest, result counts and ID/channel bindings are validated; any bad API ID, duplicate, unknown ID, status mismatch or attempted automatic Person approval fails closed. Every status document retains `actual_video_playback_or_timestamped_transcript_reviews=0`, `person_primary_content_certifications=0`, `publication_authorized=false`, `production_writes=0`.

### GitHub Actions manual, read-only execution (when authorized)

New `.github/workflows/youtube-b024-first3-official-metadata.yml` has:
- `pull_request` → **offline-only** no secrets, no YouTube metadata requests, source contracts/tests.
- `workflow_dispatch` → **main-branch-only**, manual, requires an authorized GitHub Actions secret named `YOUTUBE_DATA_API_KEY`. Because GitHub requires dispatch workflows to already exist on the default branch, **this draft PR does NOT make a manual run executable on main until a governed merge**. This is intentional; no blind merge, automatic API call or paid quota use.
- Repository permissions `contents: read` only, no OIDC / write credentials / Production environment, one API batch and 14-day evidence artifact retention. The public Actions job summary shows only original IDs and safe channel match/HOLD statuses; full public publisher descriptions are stored in the 14-day original-evidence artifact.

### Acceptance status and next exact gate

The code is designed to be tested with **six deterministic offline/fake-YouTube API tests** (matching all three, one mismatch, one unavailable, forged metadata, duplicate API IDs, network error, no secret). **These test fixtures are synthetic; they do NOT establish even one real current YouTube Channel ID.** No actual API request, watched segment, timestamped transcript, Person registration audit, or Production rank write has been executed by creating this draft PR.

After manual official API fetch, review the returned 3 exact original videos' actual primary individual focus by at least the existing timestamped playback/transcript human-review evidence contract in `scripts/youtube-source-video-content-evidence-gate.py` (enhanced by PR #2522); do not convert a snippet description into watched proof. Respect PR #2505 original-ID source-name alias unions/four HOLDs, PR #2525 canonical source replay, PR #2495 historic title-only crosswalk. Complete last-stage current registered-Person exact aliases and **ONE** governed ranked Production UI readback when runtime service quota is restored.

**No Production write, no merge/deploy, zero genuine watched historical biographies certified, and zero updated unregistered ranking claimed.**
