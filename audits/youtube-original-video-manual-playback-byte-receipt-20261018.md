# B024 — original-video manual-playback BYTE receipt (2026-10-18)

## Narrow correction to existing DRAFT PR #2522

This is the second half of the evidence forgery bug: even after the actual transcript-byte SHA fix, `VIDEO_PLAYBACK_MANUAL` previously accepted a reviewer name, 25+ character reason, invented 10+ second observation interval and source URL **without reading any content-evidence bytes**. A fabricated manual playback claim could be counted as `PERSON_PRIMARY_CONTENT_CONFIRMED` and passed to the one-ranking read-only preview.

**Correction in-place:** manual positives MUST include `decision.manual_playback_sha256` and `--playback-evidence-dir`. The Python source content gate reads only the original 11-character `<Video ID>.json` from this explicitly supplied directory (<=100 kB); computes SHA256 from the actual UTF-8 JSON bytes; verifies exact original Video ID, archived Channel ID, original title, source snapshot, full original ZIP digest, exact YouTube URL, explicit named reviewer, subject identity and timezone-aware capture time no later than review; validates non-overlapping finite timed observations with actual >=10-second union overlap with the reviewed content interval. Invalid/missing source-bound receipts fail closed. Both canonical people[].content_review_provenance[] and the downstream JS ranking preview require the verified byte digest and capture fields for manual reviews. The transcript mode retains its independent existing source-byte validation. Negative reviews do not require positive playback receipts.

### Evidence format — SYNTHETIC FORMAT EXAMPLE ONLY, NOT A VIDEO CERTIFICATION

The request's exact archived Channel ID/title, snapshot and ZIP digest must be read from the original source request, not guessed from the display name.

```json
{
  "schema": "atlas-youtube-original-video-manual-playback-evidence/v1",
  "video_id": "AbCdEfGhI12",
  "original_channel_id": "UCAAAAAAAAAAAAAAAAAAAAAA",
  "original_title": "Synthetic example of an individual's historical life",
  "source_snapshot_id": "synthetic-test-source",
  "source_zip_sha256": "8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946",
  "source_url": "https://www.youtube.com/watch?v=AbCdEfGhI12",
  "capture_method": "MANUAL_VIDEO_PLAYBACK",
  "person_identity_for_review": "Example Historical Person",
  "captured_by": "authenticated human observer",
  "captured_at": "2026-10-18T12:00:00Z",
  "observations": [
    {
      "start_seconds": 30,
      "end_seconds": 45,
      "observed_evidence": "Synthetic account of the explicitly observed primary historical individual focus."
    }
  ]
}
```

For any actual original video, save the complete record at `<playback-evidence-dir>/<exact 11-character original Video ID>.json`, hash the **actual bytes** of that file (SHA256), and place that exact digest in the corresponding review decision's `manual_playback_sha256`. Provide `--playback-evidence-dir` to the existing `scripts/youtube-source-video-content-evidence-gate.py` alongside the mandatory request/metadata/identities/decisions/output arguments. This is a separate evidence folder from `--transcript-evidence-dir`, so both modes may process an original ID without path collisions.

## Fundamental provenance boundary — do not falsely upgrade evidence

A SHA-matching manually authored JSON record proves that the claimed review and stored receipt have the same bytes. **It does not cryptographically prove a real person watched YouTube nor that the words/timecodes match YouTube's source media.** A malicious operator could author fake JSON and its correct digest, just as with transcript evidence. Preserve an independently reviewable actual source video/playback capture provenance and human-witness check before any positive content certification; no title/description text, arbitrary JSON file, or synthetic test can substitute for original video inspection. The current Python checker verifies structural/byte fidelity, not YouTube-origin authenticity. Downstream preview remains permanently nonpublishing without separately governed live verification.

### Tests and operational nonclaims

Focused tests add real synthetic on-disk manual receipt bytes, missing-artifact/digest mismatch, incorrect original Video ID/Channel ID/source/subject/witness/method, capture after review, and <10s observed overlap/invalid clock tests. The JS preview rejects manual reviews with missing capture provenance, while allowing synthetic fixtures only for mechanical tests. Current original Batch024 genuinely watched / source-authenticated video count is **0**. No original archive deletion, automatic Person registration, production writes, merge, YouTube Data API call, Vercel quota bypass or public ranking is carried out by this correction.

**One final ATLAS product goal remains:** actual original history video contents, independently discovered historical people, reviewed same-Person original Video/Channel ID SET unions, current registered ATLAS Person/aliases LAST, and precisely one real authorized unregistered historical Person ranking in the existing DB/API/UI with public readback.

**Next real source action:** #2513's exact three original Video IDs (`-13y_Jm-pzI` Dele Giwa, `-1CalygxBrM` Meriwether Lewis, `-5Lg5mk74NA` Salvador Dalí) need independently obtained official live `videos.list(snippet)` Channel-ID metadata and actually witnessed video/caption content. The existing #2513 main-only manual GitHub workflow requires approved integration and authorized `YOUTUBE_DATA_API_KEY`. Official `captions.download` cannot be used to freely fetch arbitrary third-party videos by a standard API key; obtain authorized public-player transcript or witnessed video playback instead. Do not confuse three different Persons' videos with three distinct channels for one Person.
