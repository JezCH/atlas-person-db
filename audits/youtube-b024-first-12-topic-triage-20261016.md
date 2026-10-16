# B024 original-video title-topic review — 12 actual source IDs (2026-10-16)

## Whole project target (unchanged)

Independent historical YouTube sources -> review real historical Person identity -> verify **actual original video** is principally about that individual (not merely a title mention, their poem, another relative, a TV dramatization or two people) -> join same-Person multilingual aliases by original distinct Channel-ID and Video-ID *sets* -> compare registered atlas_v2 Persons **LAST** -> publish ONE verified unregistered historical-Person ranking in the existing UI. No alternate registered rankings, false title-as-biography counts or auto registration.

## Actual work completed in this unit

Read Project Library `youtube-b024-10126-original-video-metadata-ready.json` previously generated from the Batch008–024 immutable `sha256:8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946` archive (10,127 source channels, 2,230,031 source videos, 245 independent name labels, 10,126 original title-candidate videos). Matched each of 12 `video_id`, `original_channel_id`, unmodified original title and `name_cues` exactly. None overlaps the prior 107 stratified source title sample (checked exact Video ID search); four existing independent published description reviews were not duplicated.

- **8 clearly nonprimary by TITLE:** `--9AzmhXCmA` (Quran/Ramadan topic, Imam Ali as context), `--VVfZZIoKI` (Allah lesson with multiple figures / animation), `-1MZzLt2F08` (Jacques Cousteau's grandson and recycling), `-1agiPOVU7A` and `-686Bq00bvY` (the speaker is Alan Hirsch or Karina Kreminski; “Joseph Hill” is just the suffix of Graham Joseph Hill), `-5IzMeI-Gck` (murder of Kim Jong Un's brother), `-5hbh0-wOzc` (performance/reading of Kazi Nazrul Islam's poem), `-6G6CZT7h4k` (Gandhi vs Martin Luther King Jr staged rap battle, independently labeled as such at https://www.watchmojo.com/articles/top-10-epic-rap-battles-of-history-topx-ep-18).
- **1 mixed-focus HOLD:** `-1QJB982UL8` – headline Maulana Fazal versus father's political journey. No unilateral alias or Person credit.
- **3 plausible individual-focus *titles*, NOT verified videos:** `-13y_Jm-pzI` Dele Giwa; `-1CalygxBrM` Meriwether Lewis; `-5Lg5mk74NA` Salvador Dali. The actual original Channel IDs and titles for all three have been materialized into `audits/youtube-b024-first-12-metadata-review-request.json`, a **ready-to-run 3-video/one-batch** input to existing official metadata collector (no new 203-request crawl). Registered-Person exclusion still pending.

The title judgments are *not* playback, transcript or approved Content proof. **Zero verified person-centered videos** and **zero rank changes**. Source original IDs/titles are immutable and not deleted. The Python validator `scripts/youtube-b024-first-12-topic-triage.py` produces the same three-video request and can validate all twelve against the full 10,126 source request with `--parent-request` whenever authorized raw bytes are available. The regression test rejects a changed original Channel ID, Video ID, title, source name cue, duplicate ID, forged content approval or wrong original archive SHA. It also verifies the selected exact three-Video ID input. The raw parent was visible in Project file **read** but cannot be materialized in the CI checkout; the checkpoint marks no full-parent replay in this run.

## Next executable step

With properly authorized `YOUTUBE_DATA_API_KEY` provided securely to an offline GitHub runner, not Vercel:

```bash
python3 scripts/youtube-source-video-description-enrich.py fetch \
  --request audits/youtube-b024-first-12-metadata-review-request.json \
  --output /tmp/youtube-b024-first-12-video-metadata.json --max-batches 1
```

Then review source descriptions, locate and verify 10+ seconds of actual video playback or timestamped transcript, decide positive content only when evidenced, and preserve unique Channel IDs per true same-Person group. An external description alone cannot certify a Person-centered video. No credentials were used, no metadata API fetched, no Vercel, no Production modification. Further original source wide count disparities: 865 grammar differences (33 high-risk) require exact 12MB source-Video ID ledger, not available in the present session. Existing #2495 live-vs-source 4,868 count gaps and #2505 title parser/alias corrections remain separate scopes; do not repeat executed crosswalk.
