# B024 exact original Video-ID × Person name HOLD gate — 2026-10-18

## Parent objective and scope

**Single target:** independent original YouTube history Video IDs/Channel IDs → identify real historical Persons without extracting from existing ATLAS Persons → verify ACTUAL individual-focused playback or timestamped transcript → verify reviewed multilingual same-Person identity and take the set union of original Channel/Video IDs → remove current ATLAS registered Persons and reviewed aliases LAST → publish precisely ONE verified unregistered historical-Person rank via existing governed DB/API/UI and verify actual public readback. Never invent source video subjects, add a separate registered-Person rank, auto-register Persons or delete archive rows.

This unit is an **intermediate negative association gate**. It does not turn a title into evidence that a historical Person was the primary topic, and it does **not** remove source channels/videos or alter title-candidate historical counts. It prevents a future purportedly watched-video approval from silently assigning one of **twelve** known title-misattributed original source Video IDs to the wrong historical Person/name.

## Actual source evidence

Using the independent restored and checksum-matched Batch008–024 cumulative original ZIP (10,127 channels; 2,230,031 original video rows; SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`), prior [PR #2529](https://github.com/JezCH/atlas-person-db/pull/2529) recovered **164/164** distinct original Video IDs from the highest-risk 33 raw-label grammar/count deltas. The source-level exact Video ID/Channel ID/title for each of the following has been preserved **verbatim** in `audits/youtube-b024-12-original-video-name-link-title-holds-20261018.json` (no fabricated or current-search-substituted IDs).

| Held original ID | Raw name matched in older title audit | Exact original TITLE reason (not a video-playback claim) |
|---|---|---|
| `-YFLVaoppvo` | Martin Luther | Martin Luther **King Jr. Day** Google Doodle, not the Protestant reformer |
| `-l3SKRDABZU` | John F Kennedy | Title actually names **John F. Kennedy Jr.**, not his father President Kennedy |
| `-jAh4K5gTeQ` | Robert E Lee | Ragtime song *Waiting For The Robert E. Lee*, not the general |
| `2GRWxrNPshM` | Simón Bolívar | **Simón Bolívar Youth Orchestra**, an ensemble, not the South American liberator |
| `0cW1jLqj6YE` | St George | The NYC neighborhood **St. George**, not a saint |
| `0jJVxo-GDhY` | St George | Author **Harper St. George** credited for an audiobook, not a saint |
| `-Y0_OeNhn28` | Catherine de' Medici | The main titled subject is her **granddaughter Isabella Clara Eugenia** |
| `-DoKJhYhMi8` | Elizabeth I | Title focuses **John Story**, with Elizabeth I appearing as context |
| `01Q7k7nsEVU` | Martin Luther King Jr | Title focuses **James Earl Ray**, with King as the named victim |
| `1MHbUKh51ik` | John D Rockefeller | **Autobiography preface / book extract**, not a proven individual biography video |
| `2xfXPG7rAiY` | Niccolo Machiavelli | An edition of ***The Prince***, not a proven profile of Machiavelli |
| `-6G6CZT7h4k` | Martin Luther King Jr | Staged **Gandhi vs Martin Luther King Jr** rap battle/performance |

Some classifications are a different referent with high title-level certainty (JFK Jr, the King Jr holiday, orchestra/neighborhood); others are a work or a video where the author/person appears without title-proof of individual focus. **None of these twelve has been watched or transcript verified in this work unit.** An independently timestamped human content review that contradicts the *title-only* HOLD requires a *new reviewed source correction* of the exact association; silently overriding the manifest is forbidden.

## Enforced behavior / proof

Modified existing [draft PR #2522](https://github.com/JezCH/atlas-person-db/pull/2522), not a duplicate independent PR. `scripts/youtube-source-video-content-evidence-gate.py` loads the source-pinned 12-row negative-link manifest **fail closed**. Every input with one of those exact Video IDs is checked against the **original archived channel and title**. Only the **original (video_id, raw_name)** positive evidence association is blocked; it does not globally ban a historical Person's name, any other video, or other independently reviewed name-cues in the same source. Negative decisions such as incidental mention remain permissible without Person credit. The production gate still demands official snippet matched to the same Channel ID, metadata description checksum, reviewer, actual timestamped video playback/transcript and a separate current registered-person screen. No automated positive assignment is allowed.

`tests/test_youtube_b024_original_video_name_link_holds.py` exercises **all 12 real original Video ID+Channel ID+title+name tuples** using an explicitly synthetic official metadata and claimed playback fixture and expects positive credit refusal every time. It also confirms negative reviews don't add Person videos, both channel and original title tampering fail closed, a different legitimate Martin Luther video is **not** disqualified, and a forged approval/source digest/duplicate-ID manifest is rejected. `tests/atlas-youtube-b024-original-name-link-holds.test.mjs` runs those Python regression tests within full Node CI.

### Still-open critical gates

- The B024 **5,965** historical name forms and 865 grammar/count deltas are source TITLE matches only, not accepted historical Persons. Earlier 33 critical deltas have real 164-video example provenance; the complete older full 12 MB 5,965-label original-video ledger has not been reverified here and the source-wide counts were not recomputed here.
- [#2505](https://github.com/JezCH/atlas-person-db/pull/2505) (source parser/alias union + 18 exact nonperson labels), [#2529](https://github.com/JezCH/atlas-person-db/pull/2529) (real original-ID replay), [#2513](https://github.com/JezCH/atlas-person-db/pull/2513) (12 title-triaged actual videos; 3 IDs for metadata), [#2495](https://github.com/JezCH/atlas-person-db/pull/2495) (8,616-vs-5,965 title-count baseline) remain governed, independent work units. [#2477](https://github.com/JezCH/atlas-person-db/pull/2477) still has reviewed registered-name/HOLD implications; no unapproved merge or deletion.
- **0** actual B024 video playback/transcript-based Person-focus approvals, **0** current-production registered-person final screens for the derived historical source list, **0** new deployed verified unregistered rankings. Vercel Hobby quota/service remains publication-blocked. No sandbox bypass or billable service upgrade.

**Next high-value bounded unit:** review actual original `-YFLVaoppvo` and `-l3SKRDABZU` titles with source-bound official YouTube metadata/channel verification and watched/timestamped footage when possible; only then score real individual-focus sources. Continue source-wide same-Person unions and last current registered-Person exclusions, culminating in ONE production ranking + readback under explicit governed deployment.
