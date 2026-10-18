# Video-content-verified unregistered historical Person list — mandatory last-stage registry bridge (2026-10-18)

## Single immutable end goal

The ONLY authorized end product is **one** ranked list of **unregistered, real historical individuals** in the existing ATLAS production DB/API/UI, sourced from independently collected YouTube Channel/Video IDs. A video is credited to a Person only after separately reviewed **actual video playback or timestamped transcript evidence**, correct original/current `Video ID + Channel ID` parity, individually resolved historical identity and vetted multilingual alias ID-set **union**. Exclude a full *current* ATLAS registered Person and its reviewed name aliases **LAST**, then follow explicit release governance with actual public DB/API/UI readback. The existing title-matched `atlas_v2.youtube_person_signals` counts are **NOT** Person-focused video credits. Never auto-register, delete original videos or invent subjects from titles.

## Missing integration discovered

The original `scripts/youtube-source-video-content-evidence-gate.py` on [PR #2522](https://github.com/JezCH/atlas-person-db/pull/2522) already produces a source-ID-grounded, read-only `atlas-youtube-content-verified-original-id-candidate-gate/v1` after inspecting candidate reviewed actual-video evidence. It explicitly says **`registered_person_exclusion_completed=false`** and **`production_ranking_publishable=false`**. Separately, the existing [PR #2505](https://github.com/JezCH/atlas-person-db/pull/2505) single live discovery UI/read-service still ranks **title-only** candidates and screens existing Persons. Previously there was **no deterministic bridge** that takes *solely content-certified actual original videos*, reconciles manually unresolved identities, unions their actual Channel/Video IDs and then invokes complete registered-Person exclusion LAST. A future operator could mistakenly treat the title-only list as the verified target, or mistake CI-green title-grammar/alias counters as witnessed biography content.

## Read-only bridge implemented

New `scripts/youtube-content-verified-unregistered-preview.cjs` accepts exactly THREE independent input artifacts (all mandatory):

1. `--content-gate` — exact output of the **Python original-video content evidence gate** with existing human-review contracts and source ZIP SHA `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`. Never accept a `youtube_person_signals` title snapshot, arbitrary raw source labels, or a PubSub/YouTube publisher description in its place.
2. `--identity-holds` — reviewed B024 **four identity HOLDs** on [PR #2505](https://github.com/JezCH/atlas-person-db/pull/2505), path `audits/youtube-v5-source-reviewed-identity-context-holds.json`, protecting Marcos father/son, Saint Benedict, St Patrick and St Valentine. A new canonical name containing any held original alias remains a HOLD, not an unregistered Person.
3. `--persons` — a full **ATLAS Person identity-projection** export (`ok:true, mode:list, projection:identity, persons>=2000`) from a separately authorized full current Production read. Include each Person's canonical key, Korean/English/display names and name variants. Exclude already registered Persons **LAST** using the same `server/atlas-reviewed-person-registration-aliases.js` lookup as the existing single discovery service. An absent, empty, incomplete, duplicated or malformed Person registry **fails closed**; a name mapped to multiple Person UUIDs is held for homonym review. A reviewed registered alias whose canonical Person is not found in the supplied export is an unresolved HOLD, not falsely unregistered.

The bridge recomputes **real sets of unique original Video IDs and Channel IDs** from the source video's explicit review provenance, checks video IDs are never credited to two unrelated people, checks one raw source name is never split across different Person identities, and rejects fake summary counts, duplicate aliases, duplicate source IDs, short invalid videos/channels, and unsupported review methods. Real source-confirmed **3 distinct channels** are required for ranked preview inclusion (not 3 title mentions). Fewer than 3 reviewed channels remain below threshold. Historical-identity, living-name, and reviewed non-Person HOLDs are resolved before the full registered-Person exclusion LAST.

```sh
# After first running the Python original-ID content gate, with genuine reviewed
# video/timestamped transcript decisions, and obtaining the full current Person
# identity readback through a separately authorized Production read:
node scripts/youtube-content-verified-unregistered-preview.cjs \
  --content-gate /tmp/yt-reviewed-content-gate.json \
  --identity-holds audits/youtube-v5-source-reviewed-identity-context-holds.json \
  --persons /tmp/atlas-current-person-identity.json \
  --output /tmp/yt-verified-unregistered-preview.json
```

**Integration dependency:** The four-HOLD manifest is preserved on draft #2505 while this read-only bridge is on draft #2522. The command is intentionally **not enabled to bypass missing #2505 source** on a standalone branch. Full integration is needed after reviewed PR governance and the missing historical video evidence. Do not merge conflicting write paths independently without reviewing them. No credentials, DB or live external data are generated/used by the bridge.

## Non-publication hard stop

The result is **ONE** `rank_candidates` preview, `atlas-youtube-verified-content-unregistered-preview/v1`, but carries `publication_authorized=false`, `production_writes=0`, `current_production_registry_readback_witnessed=false`, and `registered_person_screen_proven_current=false` **regardless of whether the synthetic tests create preview entries**. An offline JSON export is not independent proof of how current Production looks. Final deployment requires separately witnessed current registry, actual video proofs and release approval, not this script's output. The explicit `registered_person_last_stage_runtime_acceptance_pending=true` prevents treating this stage as finished.

At present the project has **ZERO genuinely watched/timestamped original B024 Person-video certifications** and **ZERO verified unpublished historical Person rankings deployed**, so a real proof input from #2513 is still blocked until exact original YouTube snippet channel checks and actual footage/captions are obtained.

## Evidence tests and remaining work

`tests/atlas-youtube-content-verified-unregistered-preview.test.mjs` uses **strictly synthetic** 2,000-row Person registry fixtures and human-video fixtures (NOT real watched videos), testing: zero video proofs → zero rank, exact-channel union dedup, reviewed `Napoleon→Napoleon I` and Emmett Till registration exclusions, Marcos/Patrick HOLD persistence, source alias multilingual union, threshold with 2 channels, video credited twice, alias assigned to two people, incomplete registry, forged totals/reviews, multi-UUID homonym HOLD and edited source hold manifest. These are regression tests **of the filtering mechanics**, not certification of any B024 video or a claim that 2,000 genuine Production Persons were fetched.

Exact next sequence: review the **same three** immutable original B024 video IDs Dele Giwa `-13y_Jm-pzI`, Meriwether Lewis `-1CalygxBrM`, Salvador Dalí `-5Lg5mk74NA` via the authorized official one-batch manual API operation on [#2513](https://github.com/JezCH/atlas-person-db/pull/2513) (still unmerged), demand current YouTube `snippet.channelId` matches archived origin and timestamped playback/transcript to certify actual individual centrality. Continue the other 865 title grammar discrepancies only where original IDs support fixes, retain independent 33 sample audit canonical [#2525](https://github.com/JezCH/atlas-person-db/pull/2525) and #2495 live title-only counts as diagnostics. Then reviewed multilingual same-Person original ID set-union, live Person registry exclusion LAST, and one governed Production UI/API/DB public acceptance.

**No Production writes, no new source registrations/deletions, no extra or published ranking, no Vercel Hobby 402/quota bypass.**
