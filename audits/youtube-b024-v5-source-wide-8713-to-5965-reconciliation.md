# 2026-10-11 — Live Production 8,713 ↔ source B024 5,965 exact-name/original-ID crosswalk (read-only)

## Project's ONE complete goal and ordered acceptance (UNCHANGED)
Expand independent world-history YouTube Channel-ID/Video-ID original sources → discover real historical Persons without prefiltering names from atlas_v2 registered Person lexicon → confirm actual VIDEO/topic centred on exactly one historical individual (not incidental mention, book/song/dramatization, event or group) → reconcile aliases/multilingual spelling **only after identity review** using ORIGINAL Channel-ID and Video-ID set unions → exclude current atlas_v2 registered Persons and all reviewed aliases LAST → publish exactly ONE genuinely **UNREGISTERED historical Person ranked discovery feed** via the existing manual governed publisher, then VERIFY LIVE Production API/UI rank and source provenance. No separate registered-UUID leaderboard, no automatic Person registration, no source deletion.

## Actually acquired the complete current Production title-signal reference
On 2026-10-11 re-read the public `/api/atlas-read?__atlas_read_surface=youtube-person-signals&mode=discovery&min_channels=3&limit=1000&offset=N` for offsets 0,1000,...,8000. Verified **all 8,713 unique raw title candidate rows** are from one snapshot `yt-20261010T083657Z-10127ch-rebuild-v5`, ranks consecutive 1..8713 and `distinct_channel_count>=3`. Materialized the entire LIVE read-model snapshot in `audits/youtube-v5-production-8713-title-candidate-reference.json` (not newly published authoritative rank): per raw name its actual live rank, title-signal channel/video counts, parser/snapshot ID, original source hash and original population **10,127 channels / 2,230,031 video rows**. Prior 23+409 reviewed nonperson labels were already excluded by the live API. **Still a TITLE-CANDIDATE population, not verified actual Person-video subjects.**

## Full source evidence (actual independently replayed, different snapshot)
`/mnt/data/youtube-b024-all5965-original-video-ledger.json`, immutable SHA256 `b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c`, has **5,965 independently source-extracted raw-name labels**, 330,327 distinct title-matching original video IDs and 359,250 name/video-occurrence rows. This is source-side `yt-20261009T111844Z-10127ch-rebuild-v4`, same original B024 video ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`, but *NOT* the same extractor, parser version or candidate population as Production v5. The separate whole-title older `5,720` source recall SHA256 `c9939919465af516e94aacbed72b737df376c370d0c8f8a349e69c717ddca1dd`; the additional `245` trusted original label Video-ID/Channel-ID sets remain preserved exactly.

**New script** `scripts/youtube-b024-v5-full-source-reconcile.py` explicitly connects the full pinned Production 8,713 name rows to all 5,965 source rows, **only by exact Unicode NFKC/casefold matching**, preserving every source original Channel-ID and Video-ID set without adding aggregate counts. Reports matched/nonmatched source names, exact-string collisions requiring identity HOLD, source names not present in live v5, differences between independent original counts and live *title signal* counts, and all 865 older matching-rule differences as separate pending reviews. It NEVER uses ATLAS Person names as the source name lexicon, never claims a raw label is a verified historical individual and never publishes an unregistered Person ranking. It MUST NOT silently merge unreviewed spellings based on accent-removal or the substring matching of mononyms.

### 865 serious extraction count discrepancies — actually audited across all older 5,720 names
Of the 5,720 older name labels, **865** have at least one channel/video count difference under the newer casefolded Unicode + longest-overlap name parsing. **33 are HIGH-IMPACT**: changed original channel count by at least 30 or original video count by at least 100.

| Raw source label | Prior title channels | New token title channels | Channel delta | Prior title videos | New title videos |
|---|---:|---:|---:|---:|---:|
| `Q & A` | 2 | 627 | +625 | 2 | 3,056 |
| `Pt 2` | 195 | 402 | +207 | 754 | 1,583 |
| `Let's Talk` | 1 | 172 | +171 | 1 | 433 |
| `John F Kennedy` | 40 | 196 | +156 | 44 | 249 |
| `Qur'an` | 1 | 145 | +144 | 1 | 1,294 |
| `Gobekli Tepe` | 144 | 45 | −99 | 328 | 72 |
| `Elizabeth I` | 195 | 288 | +93 | 468 | 672 |
| `Mary, Queen of Scots` | 64 | 118 | +54 | 139 | 262 |
| `Salvador Dalí` | 103 | 50 | −53 | 175 | 88 |
| `Martin Luther` | 339 | 289 | −50 | 574 | 503 |
| `Ibrahim Traoré` | 197 | 150 | −47 | 1,519 | 960 |
| `Martin Luther King Jr` | 285 | 325 | +40 | 390 | 460 |

These differences are **NOT person-focused improvements**. A naïve name-token parser strips punctuation and can turn a generic word pattern or a nested/ambiguous name into vast numbers of false matches. Conversely Unicode/diacritic/punctuation rules can lose genuine titles. Each must be resolved with original video/title evidence before any count changes. In particular “Q & A”, “Pt 2”, “Qur'an”, “Let's Talk” are NOT Person names and must not become historical ranking rows under new false numeric popularity.

Full 865-row machine-readable discrepancy files ACTUALLY generated locally for user (not committed): 
- `/mnt/data/youtube-b024-865-source-count-differences.json` (per name prior and new counts, risk bands and actual original sample video IDs)
- `/mnt/data/youtube-b024-865-source-count-differences.csv`
- `/mnt/data/youtube-b024-865-source-count-differences-report.md`

## Reproduce crosswalk with current snapshot and source archives
```sh
python3 scripts/youtube-b024-v5-full-source-reconcile.py \
  --production-reference audits/youtube-v5-production-8713-title-candidate-reference.json \
  --source-ledger youtube-b024-all5965-original-video-ledger.json \
  --old-recall youtube-whole-title-recall-b024-reviewed.json \
  --output /tmp/youtube-b024-v5-original-id-crosswalk.json
```
Immutable local files are required. This PR's normal CI runs synthetic source invariants and verifies fail-closed behavior; source ledger's full ~12MB file is a user-attached conversation artifact and is not available in the Git checkout. **Do not report completed matched/nonmatched overlap counts from live v5 until the real full crosswalk is actually executed with both source files and reference.**

## Acceptance status and next work
- Original-source replay, 5,965/330,327 source Video IDs and 245 trusted ID parity: DONE previously.
- Entire current Production v5 raw label list acquired, with ranks/snapshot/candidate counts: DONE **this PR**.
- Machine-readable source→Production strict-name crosswalk computation with all 865 source differences, fail-closed and human-review flags: IMPLEMENTED; the pinned live+local 12MB source pairing should be executed as next integration acceptance.
- Certified live video subject content, actual historical individual Personhood, complete multilingual/homonym alias unions, final exclusion against current registered Persons, and SINGLE UNREGISTERED historical Person rank publication: **NOT DONE**. Do not use raw crosswalk as approved production rank. A new authenticated collection method is still needed for actual descriptions/transcripts.
- Batch025 / missing batches001–007 only after actual immutable original source ZIP and hash verification.

**The full objective remains actual Production of one reliable unregistered historical-Person ranked list, not indefinite source audits or an inflated title hit leaderboard.**