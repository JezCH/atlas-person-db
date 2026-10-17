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

## 2026-10-17 actual public publisher source recheck

The three individually source-verified original IDs were re-checked on public YouTube web search without any YouTube Data API credentials. The exact original `-5Lg5mk74NA` (“Salvador Dali brief biography and his artwork. Great for kids and esl”) appears as a YouTube-indexed publication by **Inma**, published **2016-04-14**. Publisher description: “Vídeo sobre: Dali”. The independent course slide at https://www.slideserve.com/pmoeller/asdan-bronze-silver-award-module-11-expressive-arts-a-powerpoint-ppt-presentation includes the **same YouTube watch ID**. Both are source-ID/title corroboration, not a video transcript or separate Channel ID proof. Neither original `UCesJHHdqSw_9gC0aMod9IKw` nor the actual video's primary focus has been reverified by official `snippet.channelId` or playback.

The two other original IDs, `-13y_Jm-pzI` and `-1CalygxBrM`, did not yield independently verifiable exact-ID publisher results in the examined web index. Their Video ID remains historically attested by the immutable original archive request. **No index result does not mean the YouTube video was deleted**; status stays pending verification. General articles about Dele Giwa and a *different* Meriwether Lewis video were explicitly NOT substituted for the original Video IDs.

`audits/youtube-b024-first-12-public-publisher-metadata-20261017.json` preserves all three statuses, exact immutable source ID/channel/title/cues and evidence URLs. The Python check `validate_public_publisher_metadata` and its regression test fail closed against forged official API calls, fabricated `Channel ID` matches, watched content, and positive Person credit. The existing YouTube official metadata collector remains the next necessary source for the **original ID trio**, with timestamped transcript/playback evidence required after that. These indexed descriptions are **not** compatible with, and must not be converted into, the official `atlas-youtube-description-enrichment-result/v1` API metadata schema.
