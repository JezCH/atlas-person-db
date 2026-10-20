# YouTube B024: 7 historical same-Person source-identity unions (2026-10-21)

**Work unit:** Follow-up to [Draft PR #2583](https://github.com/JezCH/atlas-person-db/pull/2583), exact 2,241-source-label offline identity audit. Source is the same immutable B024 ZIP SHA256 `8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946`. **No new crawl, video watch, caption authentication, Production registry read, Person registration, or published ranking.**

## Independently reviewed identity groups and original-ID unions

| Historical identity | Wikidata identity | Original source labels | distinct Channel IDs (union) | original Video IDs (union) | avoided duplicate channel tally |
|---|---|---:|---:|---:|---:|
| A. P. J. Abdul Kalam | [Q9513](https://www.wikidata.org/wiki/Q9513) | 2 | 10 | 10 | 0 |
| Frédéric Chopin | [Q1268](https://www.wikidata.org/wiki/Q1268) | 2 | 9 | 10 | 0 |
| Kösem Sultan | [Q61127](https://www.wikidata.org/wiki/Q61127) | 2 | 6 | 7 | 1 |
| Elizabeth Báthory | [Q170846](https://www.wikidata.org/wiki/Q170846) | 2 | 5 | 5 | 0 |
| Mother Teresa | [Q30547](https://www.wikidata.org/wiki/Q30547) | 3 | 33 | 34 | 1 |
| Teresa of Ávila | [Q174880](https://www.wikidata.org/wiki/Q174880) | 2 | 5 | 6 | 1 |
| Zulfikar Ali Bhutto | [Q131355](https://www.wikidata.org/wiki/Q131355) | 2 | 12 | 12 | 0 |

**Verified scope:** 15 original source-name labels now resolved into **7 historical identities** with external Wikidata Person QIDs; 84 distinct original Video IDs, 80 Person-specific channel counts, 3 duplicate channel credits prevented. Preserve every original source label/Video ID; use only union of **original** Channel/Video IDs (never sum pre-aggregated counts). The 7 historical people are **NOT** asserted to be missing from current ATLAS. Source labels alone do **NOT** certify original videos are chiefly about each person.

**Evidence references** (identity correspondence, not video focus):
- **A. P. J. Abdul Kalam**: OFFICIAL_FULL_NAME_AND_EQUIVALENT_INITIAL_PUNCTUATION. <https://www.presidentofindia.gov.in/dr-apj-abdul-kalam-profile> ; <https://www.wikidata.org/wiki/Q9513>
- **Frédéric Chopin**: PRIOR_NORMALIZED_REVIEW_AND_WIKIDATA_SAME_PERSON. <https://www.wikidata.org/wiki/Q1268>
- **Kösem Sultan**: PRIOR_NORMALIZED_REVIEW_AND_WIKIDATA_SAME_PERSON. <https://www.wikidata.org/wiki/Q61127>
- **Elizabeth Báthory**: PRIOR_NORMALIZED_REVIEW_AND_WIKIDATA_SAME_PERSON. <https://www.wikidata.org/wiki/Q170846>
- **Mother Teresa**: SAME_MOTHER_TERESA_CANONIZATION_AND_CALCUTTA_NAME. <https://www.nobelprize.org/prizes/peace/1979/teresa/biographical/> ; <https://press.vatican.va/content/salastampa/en/bollettino/pubblico/2021/09/05/210905a.html> ; <https://www.wikidata.org/wiki/Q30547>
- **Teresa of Ávila**: OFFICIAL_VATICAN_AVILA_ALSO_KNOWN_AS_JESUS. <https://www.vatican.va/content/benedict-xvi/en/audiences/2011/documents/hf_ben-xvi_aud_20110202.html> ; <https://www.wikidata.org/wiki/Q174880>
- **Zulfikar Ali Bhutto**: EXACT_WIKIDATA_PRIMARY_AND_ALIAS_MATCH. <https://www.wikidata.org/wiki/Q131355>

## Protected non-merges

- **Mother Teresa (Q30547) is not Teresa of Ávila (Q174880).** The former has `Mother Teresa / Mother Teresa of Calcutta / Saint Teresa of Calcutta`; the latter has `Saint Teresa of Ávila / Saint Teresa of Jesus`. Vatican sources affirm both name families; never merge on token `Teresa`.
- `Kylian Mbappé / Kylian Mbappe` remains under existing `HOLD_LIVING_PERSON` normalized-source review. It is **not** a deceased historic Person discovery. Neither source name is deleted or unioned into the 7 historical groups.
- Short names like `Saint Teresa`, `Queen Elizabeth`, `Muhammad Ali`, `Saint Paul`, `Saint Francis` stay unmerged without subject-context identity proofs. Existing ambiguous identity holds remain authoritative.

## Exact numerical state transition (research units only)

- Previous 2168 unresolved **source labels** from offline #2583 → 7 reviewed groups touching 15 labels replace their own 15 labels with 7 canonical review units: **2160 remaining research units**, NOT 2,160 confirmed historical Persons.
- Previously 852 unresolved labels had ≥3 original independent channel IDs. Those 7 groups contained 13 independently ≥3-channel source labels; the canonical groups contribute 7 instead: **846 canonical research units** with ≥3 channels within this exact seven-group transformation. All other source labels and preserved holds remain unchanged.
- The four older orthographic collision groups (APJ punctuation, Chopin accent, Kösem accent, Báthory accent) are now complemented by Mother Teresa 3-way title, Teresa of Ávila 2-way, and Zulfikar Ali Bhutto 2-way identity confirmations. Old global normalized review is used as corroboration, not overwritten.
- **These are internal offline review counts, never Production discovery/UI publishable rankings or counts of confirmed missing persons.** Any up-to-date current registered-Person/alias screen must be performed LAST as mandated by [#2318](https://github.com/JezCH/atlas-person-db/issues/2318).

## Files / regression gate

- `audits/youtube-b024-seven-reviewed-source-identity-unions-20261021.json` contains exact sorted original video/channel IDs, identity evidence URLs and QID, the live-registry-not-checked and content-not-watched flags.
- `tests/atlas-youtube-b024-reviewed-source-identity-unions.test.cjs` validates original source/archive consistency, no duplicate ID or source label, union totals 84/80, QID disjointness, strict 7→15 identity union and historical-vs-living/nonmerge protection.

**Resume point:** Select the next high-impact unreviewed cross-label identities (start with genuine same-person variants, but do not infer from generic tokens), obtain external person-level identity and verified original-title subjecthood, then update the *same* pre-production candidate ledger. Finally compare complete current Production Person UUID+names/aliases before inclusion in the existing single ranked unregistered-Person UI/API. Zero existing canonical DB/Production changes by this work unit.
