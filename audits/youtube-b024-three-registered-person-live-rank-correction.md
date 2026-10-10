# 2026-10-11 — Three proven already-REGISTERED historical Persons leaked into the ONE unregistered YouTube ranking

## Entire original mission, unchanged
Expand global independent history YouTube original Channel/Video IDs; discover real historically significant individuals independently of atlas_v2 registered-Person extraction names; verify actual individual-video content rather than incidental title mentions; unite only source-verified same-Person multilingual nameforms by ORIGINAL Channel-ID and Video-ID unions; check current registered Persons+aliases LAST; publish **ONE** accurate unregistered historical Person rank to the actual Production UI with live readback. No separate registered leaderboard, no auto-registration, no source deletion and no fabricating biographies from title cues.

## Concrete genuine Production defect found using the complete LIVE 8,713 candidate rows
Previously independently source-reviewed 36 priority B024 nameforms and compared a snapshot of 2,145 current Person identity records. That source-based review marked 16 nameforms **already registered** (11 exact normalized and 5 manually reviewed same-Person aliases). Rechecked all 16 against the **current public v5 Production discovery 8,713** rows and discovered that THREE of the 5 manually reviewed aliases are **still present in the purported UNREGISTERED ranking**:

| Raw title candidate | Current Production rank | Current Production title channels | Already registered Person | Actual registered UUID |
|---|---:|---:|---|---|
| Imam Bukhari | 714 | 8 | Al-Bukhari | `8de13ce6-1d9d-4627-9c15-bc4fbd7d533c` |
| King Leonidas | 842 | 8 | Leonidas I | `2dc2d224-5ee3-5583-a3af-75d928fb240f` |
| Imam Malik | 2,333 | 5 | Malik ibn Anas | `5bbd6c53-dbdd-436a-b306-15ac077caf31` |

READ-ONLY public current Person identity API independently confirmed all three UUIDs and their canonical registered names. Original ZIP B024 SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946` preserves original source and the independently source-derived exact-video review: Imam Bukhari original 17 channel IDs/22 video IDs, Imam Malik 25/39, King Leonidas 29/30 (all **title mentions, not certified individual-focused biographies**). The v5 Production *filtered* title cues 8,5,8 are a DIFFERENT source-extractor population, so we do not replace them or sum those numbers.

Other 13 of the source-reviewed 16 registered-nameforms are NOT currently visible as live v5 candidates; source-first 15 potential unregistered histories remain topic/identity review, not automatically newly registered Persons.

## Real change in LIVE authoritative discovery path
Add three exact *source-reviewed* historical nameforms to `server/atlas-reviewed-person-registration-aliases.js` as `canonical_key` mappings; they are resolved dynamically by the existing authoritative `PERSON_NAMES_SQL` to live current `atlas_v2.persons`/ `atlas_v2.person_names` Person IDs at runtime. Thus the **existing registered last-stage exclusion**, rather than a disconnected post hoc list or raw DB deletion, removes those three names when and only when the canonical target exists and is unique. A raw name matching multiple registered people remains identity-homonym REVIEW, not wrongly auto-discarded.

- `audits/youtube-b024-live-three-registered-person-alias-leaks.json`: exact live v5 snapshot, alias/source original archive SHA, live rank/channel count, recorded actual canonical UUID/name, full provenance and no source-video content certification.
- `tests/atlas-youtube-b024-registered-alias-leak-correction.test.mjs`: checks ALL three mappings agree with earlier source-first independently reviewed registered UUID evidence, exact SQL aliases generated, existing single discovery registered-last-stage filter excludes exactly three, retains truly new candidate and preserves same-name multi-Person collision for review.

**Expected** after Production deploy: v5 >=3 count **8,713→8,710**, >=5 **2,691→2,688**, >=10 remains 476; identity nameforms `Imam Bukhari`, `Imam Malik`, `King Leonidas` absent from ALL paginated live rows. Current raw snapshot SHA/corpus totals intentionally unchanged. Do not call expected values completed until POST-MERGE live readback.

## STILL REMAINING for complete user goal
The current app calls its title-candidate list an unregistered historical-Person discovery signal, but no comprehensive actual video subjecthood evidence has been published. Fix full 8,713→5,965 original-ID identity/living/registered exclusion with current source and proper content validation; do not claim entire 8,710 remaining are confirmed unregistered histories. Obtain actual video transcripts/description rights where possible, assess and source-union actual person-focused videos, and publish one certified unregistered ranking via governed manual writer with actual changed Prod snapshot when evidence is sufficient. Confirm Batch025 original source SHA before ingest.
