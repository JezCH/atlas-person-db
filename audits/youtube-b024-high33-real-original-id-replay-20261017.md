# 2026-10-17 B024 — 33 high-impact discrepancies, actual ORIGINAL Video-ID replay

## Single final objective (unaltered)

Discover real historical **Persons not currently registered in ATLAS** from an independently collected multinational YouTube history Channel-ID / Video-ID corpus, without registering-name-based source generation. Require evidence the actual source video principally concerns ONE historical person (not a brief title mention, a historical work, stage production, an event, an individual named after someone else, a fictional character or mixed subjects). Merge independently reviewed multilingual same-person labels by **set union of original Channel IDs / Video IDs**, exclude up-to-date `atlas_v2` registered Persons and reviewed aliases **LAST**, then publish precisely ONE verifiable unregistered historical-Person ranking to Production API/UI. No registered-person leaderboard, automatic registration, source deletion or title-as-biography count inflation.

## The previously inaccessible originals were actually recovered

- Retrieved *original retained GitHub Actions artifact* [run #37921755392](https://github.com/JezCH/atlas-person-db/actions/runs/37921755392), artifact **11613130249** `youtube-cumulative-batch024-validated`, by the connected GitHub download action. Local ZIP SHA256 **`8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`**, EXACT expected immutable B024 digest; not an invented proxy.
- Python opened all **10,127 distinct original per-channel `.ndjson.gz` archive members** and exactly **2,230,031 original video rows** with original item `channel_id` bound to its archive member name. None of the 164 targeted original sample Video IDs was missing or duplicated in the source ZIP. Existing retained artifact expires Jan 7, 2027; do not rely on it indefinitely for ongoing source availability.
- Independently reopened existing Project Library original 5,965-name ID ledger `youtube-b024-all5965-original-video-ledger.json` (SHA256 from prior full audit `b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c`) and older-recall differences `youtube-b024-865-source-count-differences.json`. **Each of the 33 high-impact rows exactly matched the ledger's original channel and Video ID counts; each cited sample ID belonged to the corresponding exact source name entry.** This verifies historic data joins, NOT Person identities or watched biographies.
- All 33 groups' 5 cited real Video-ID examples were retrieved by original ZIP member scan: **165 name/video example occurrences, 164 distinct original Video IDs, 146 distinct original Channel IDs**. The one overlapping Video ID is `-YFLVaoppvo`, shared in the archived `Martin Luther` and `Martin Luther King Jr` name-level sample lists. SHA256 of all 164 unique original `video_id<TAB>channel_id<TAB>title` sorted by Video ID: **`d19bbdccf6263c7878b24e9c80825e6cc5b72eb936a28dc6fbc1bf0ff74660a1`**.
- Full original sample output was also saved as `youtube-b024-high33-164-original-video-examples.json` (locally available, ~35 KiB). The audit manifest `audits/youtube-b024-high33-real-original-id-crosscheck-20261017.json` preserves all 33 names, old/new precise aggregate counts, original sample ID lists and guarded lexical disposition. The script `scripts/youtube-b024-verify-high33-original-video-ids.py` performs **replay against the original ZIP** and emits the actual full titles and Channel IDs, optionally SHA-checking the original 5965-name ledger. CI uses synthetic miniature ZIP fixtures; it does not substitute those for actual B024 source execution.

## Why correcting aggregates is not sufficient

Original titles demonstrably reveal four distinct error pathways:

1. **Fifteen non-single-Person labels** among these 33 (place, format, astronomical object, historical site/event, band, disease, multi-person conjunction). For example `Q & A` recounted **627 channels**, `Pt 2` **402**, `3I/Atlas` **52** — zero of these is a historical individual. The updated read-side nonperson set in unmerged PR #2505 already covers `Pt 2` and `3I/Atlas`; do not duplicate or auto-publish those source-only aggregate counts.
2. **Two multiple-referent HOLDs:** `John F Kennedy` includes source Video ID `-l3SKRDABZU` (“John F. Kennedy Jr.'s Carefree Summer Moment”), which concerns a DIFFERENT man from president JFK; `St George` spans **Saint George Preca**, the **St. George New York neighborhood**, **writer Harper St. George**, and **St. George's Day**. An exact name substring is not source individual attribution.
3. **One previously reviewed living-person label:** `Ibrahim Traoré`. A video's mention of this contemporary person does not place them on a deceased/historical-unregistered Person ranked list. This review status is time-sensitive and needs the existing living-review time window respected.
4. **Fifteen plausible historical-person *name labels*, still unverified videos.** Even these contain concrete false-topic examples: `Martin Luther` matched the shared Video ID `-YFLVaoppvo` whose full title is about **Martin Luther King Day** rather than the Reformation leader; `Robert E Lee` matches a **1912 ragtime song**; `Niccolo Machiavelli` matches `The Prince` audiobook; `Salvador Dalí` has titles about artworks and opera; `Catherine de' Medici` appears in a profile of her granddaughter. Other source videos have strong biography-like titles, but **no original video playback/transcript was performed**; classification remains title-level only.

These are bounded high-variance **LEXICAL/source-ID triage statuses**. They are NOT yet 15 verified historical Persons, nor approval to remove an identity from canonical records. Original Video ID/Channel ID evidence remains immutable.

## Precision limits and next work

- Historic **865** source-recall count mismatches across 5,720 old name forms were already known; 33 high-impact are now verified **against the full original ZIP** at representative per-ID level and exactly rejoined to their source ledger counts. This audit does **not** claim that all **865** Video-ID differences were individually reclassified, or recompute all **5,965** original name/token matches from scratch.
- The five representative Video IDs for each name are taken directly from the preexisting critical difference manifest, NOT a random sample of all 330,327 name-matched Video IDs; no precision rate or new biography channel count is inferred. `164` is the deduplicated Video-ID count of these **165** examples, not all videos involved in the 33 aggregate differences.
- All legacy old vs new counts remain non-authoritative title occurrence diagnostics; no synthetic automatic same-Person union. 2026-10-11 Production 8,616 title candidates are a DIFFERENT title-parser snapshot. No Production reads/writes, Vercel Sandbox, extra registered Person ranking, deploy or merge in this PR.
- Real next gate: source-preserving *per-video title/identity HOLD* adjudication followed by **official metadata `snippet.channelId`**, actual video playback/timestamped transcript, reviewer credit, same-Person exact original ID unions and final current registered-Person exclusion. Existing exact three Video-ID metadata queue in #2513 may proceed in parallel with prioritized higher-value historical titles verified here; #2522 guards metadata credit. Do NOT claim real Person-content verification or publication from this title audit. #2318 remains open.

### Offline source replay

The actual ZIP is available by downloading the immutable GitHub Actions artifact above. The original full 5965-name ID ledger is available in the user's Library. If a local copy of the raw ledger is available:

```sh
python3 scripts/youtube-b024-verify-high33-original-video-ids.py \
  --original-zip /path/to/youtube-b024-original.zip \
  --ledger /path/to/youtube-b024-all5965-original-video-ledger.json \
  --output /tmp/youtube-b024-high33-real-titles.json
```

Without `--ledger`, the script still checks the full original ZIP SHA, 10,127 Channel IDs, 2,230,031 videos, all 164 original sample Video IDs and their expected title/channel TSV fingerprint, but **does not** claim to independently validate all 33 source ledger counts in that particular execution.

**No source deletion, no registration, 0 playback-certified original videos, 0 final unregistered Person ranks, no Production writes.**
