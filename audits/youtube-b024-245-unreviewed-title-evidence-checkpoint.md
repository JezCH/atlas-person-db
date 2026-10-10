# YouTube B024: 245 unreviewed raw-name title-evidence checkpoint

## Purpose (single objective; do not diverge)

Broaden independently sourced history-focused YouTube channels and original videos; identify real named historical Persons across full video titles and multilingual forms; verify individual video subjecthood; review true same-Person original Video-ID/Channel-ID alias unions; only **last** exclude registered atlas_v2 Persons and publish **ONE unregistered historical Person ranked discovery list**. No registered-UUID leaderboard and no automatic Person registrations.

## Immutable corpus audit completed on 2026-10-10

- Exact original Batch008–024 ZIP `sha256:8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`.
- **10,127 distinct original Channel IDs and 2,230,031 original video rows**. Raw-name reference snapshot `yt-20261009T111844Z-10127ch-rebuild-v4` is from the same original corpus, but distinct from the currently published Production snapshot.
- Source review #2380 divided 347 additional labels into 74 reviewed nonperson labels, 28 held identity/context labels, and **245 UNREVIEWED_PERSONHOOD raw labels**. Neither 245 distinct Persons nor 245 unregistered Persons is proven.
- The **245** unreviewed raw labels are found in **10,126 distinct original video IDs across 2,636 distinct original Channel IDs** (IDs unioned *across all labels*, never summed).
- Revisited ALL original 2.23m videos and verified each candidate's original Channel-ID and Video-ID sets **exactly** against the previous #2378 original-ID recount.
- Each candidate has **review-only** title cue buckets: biographical life/deeds/question, name-heading topic cue, name-heading unresolved, creative work/music/TV drama, multi-person/event and incidental mention. Same-person homonyms and registered Persons are NOT removed here; they must pass subsequent evidence and exclusion gates.
- Punctuation/diacritic/zero-width handling avoids false title misses such as `Kim Jong Un / Kim Jong-un`, `Mary Queen / Mary, Queen of Scots`, `Carter G Woodson / Carter G. Woodson`; joint titles and creative works are flagged instead of auto-crediting one Person.

## Source-title evidence examples — NOT production or verified person-centered ranks

| Raw label (may already be registered) | Distinct title-mention channels | Distinct channels with biography / Person-topic syntax cues |
|---|---:|---:|
| Emmett Till | 32 | 12 |
| Booker T Washington | 62 | 10 |
| Imam Bukhari | 17 | 9 |
| Carter G Woodson | 33 | 7 |
| Khudiram Bose | 11 | 6 |
| Meriwether Lewis | 17 | 6 |
| Simon Kimbangu | 8 | 4 |
| Herbert Chitepo | 5 | 4 |

The right-hand column is a **source title syntax review count**, not a confirmed number of videos centrally about that person. It intentionally excludes evident multi-person and creative works. The same person may occur under another raw label; do not add separately aggregated columns.

The preceding 107 title-only analysis on an independent set of 18 reviewed historical name-form groups is an imperfect calibration control, **not** watched-video ground truth and not representative of the entire YouTube population. Any shortcut using heading count × a presumed precision fraction is forbidden.

## Deliverables and safety boundaries

- `scripts/youtube-b024-unreviewed-title-evidence.py`: per-label original source-ID reading, full-population/ZIP SHA/source-snapshot/exact-video-set fail-closed checks, deterministic stratum examples, raw review-only bucket sets. Accepts local preserved source ZIP + #2378 recount + #2380 review outputs; does not touch Production.
- `tests/test_youtube_b024_unreviewed_title_evidence.py`: fixture-based source-ID, nonperson quarantine, punctuation, accented spellings, Unicode zero-width, multi-person, creative work, SHA and source snapshot failure checks.
- Local current-turn complete evidence `/mnt/data/youtube-b024-245-title-topic-evidence.json` (all 245 with each category's original Channel IDs, Video IDs and source title examples); concise original-ID review queue `/mnt/data/youtube-b024-245-review-queue.json`; explanation `/mnt/data/youtube-b024-245-title-topic-report.md`.

## Next acceptance order

1. Review all candidate labels for **real-person identity**, distinguish historical versus living, fictional, deity, geographical and ambiguous names. Do **not** use the registered Person table as a generation lexicon.
2. Verify individual original videos are actually about the historical individual using titles/descriptions/content where available; reject incidental name mentions, music performances, fiction and joint-focus cases from single-Person channel credit.
3. Resolve multilingual/orthographic/title/short-name forms to the same Person only after independent original-ID evidence; use true original ID **unions**, never aggregated sums.
4. Expand original corpus with verified Batch025 source if available. Production `source_state.next_batch=batch025` only indicates the next planned batch, not a verified archive.
5. **Only last**, exclude already registered People and publish ONE ranked unregistered historical-Person candidate stream by genuine distinct independent channels. No auto-registration; governance remains user-approved.
