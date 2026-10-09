# VIS3-05R-A — Actual Production source parity + user screenshot baseline (2026-10-10)

> **Status: EVIDENCE CHECKPOINT / PARTIAL — fresh four-width exact-SHA Chrome capture BLOCKED, not falsely marked closed.**
>
> This checkpoint modifies **no product HTML/CSS/JS, SVG, API or DB**. Phase III v2 next visual comparison is VIS3-05R-B, but formal VIS3-05R-A completion requires the pending capture below. Do not substitute prior-Phase-II captures for it.

## 1. Source and deployment evidence (observed, time-sensitive)

- Repo: \`JezCH/atlas-person-db\`, snapshot source/main **\`4841b1c3f2438b3deddbcc39bd5ccf4ba7731652\`**.
- Vercel Production deployment **\`dpl_F1XMhmLHuyU9YVDLiqoFfbNLBkm6\`**, state **READY**, source SHA exactly **\`4841b1c3f2438b3deddbcc39bd5ccf4ba7731652\`**, deployment URL **https://atlas-person-7ts3uospf-jez-ch.vercel.app**.
- Live Production public alias queried: **https://atlas-person-db.vercel.app/**.
- Read-only HTTP GET + exact UTF-8 string equality compared **production body** with GitHub **\`fetch_file(ref=4841b1...)\`**, all four HTTP **200** and **equal**:

| Path | Production HTTP | Source = live body | Chars |
| --- | --- | --- | ---: |
| \`index.html\` | 200 | yes | 7,994 |
| \`atlas-ui-phase3-ornaments.css\` | 200 | yes | 9,874 |
| \`assets/ui-ornaments/atlas-compass-rosette.svg\` | 200 | yes | 4,074 |
| \`assets/ui-ornaments/atlas-corner-filigree.svg\` | 200 | yes | 1,112 |

- Scope note: **this is 4-asset source parity, NOT the repository-wide exact-SHA Chrome acceptance workflow and NOT visual screenshot capture.** Some user-data values are live and may change after this timestamp. If Production/main changes before VIS3-05R-B, refresh only the affected snapshot.

## 2. Real screenshots provided by the user, unmodified

The two screenshot assets are user uploads, stored separately in the conversation evidence package **\`VIS3-05R-A-baseline-evidence.zip\`** with the original PNGs, SHA-256 JSON manifest and explicit provenance disclaimer. The ZIP is attached to the conversation, not committed into Git.

| Image | Pixel dimensions | Original bytes | SHA256 | Observed appearance |
| --- | --- | ---: | --- | --- |
| \`image(20261009-222909).png\` | 1459 × 727 | 286,271 | \`8717a720c3b1d629b9c183770fd32292ed10de01c560197d1d0c64e2b180b483\` | Too many overlapping elements: topbar title cartouche, giant dashboard headline ornament, oversized compass, ornate KPI folio and divider, extra brand/version details |
| \`image(20261009-224109).png\` | 1889 × 833 | 230,950 | \`048e19a741701ce22407f434d775225fa121ac2bfb05a6f5b4013a1e449d0fa9\` | Visibly more restrained, with compact rosette and one small corner engraving; title legible and six card KPIs clearly laid out. **Not final user aesthetic approval** |

**Provenance limits:** the two images have different viewport/pixel sizes and changing live KPI values; they are **NOT** same-DOM A/B captures and their exact Git commit SHAs are not embedded or proven by the image files. File timestamp alone cannot establish commit provenance.

Known visual content visible in the user screenshots:

| KPI label | Earlier ornate screenshot | Later restrained screenshot |
| --- | --- | --- |
| PERSONS | 2,134 | 2,138 |
| RUNTIME ACTIVITIES | 2,512 | 2,516 |
| USED POLITIES | 1,130 | 1,131 |
| DOMAIN COVERAGE | 100% | 100% |
| NAMUWIKI REVIEW | 100% | 100% |
| SPATIAL READY | 99.4% | 99.3% |

Thus old and new PNG numbers **must not** be painted over or used for pixel-identical overlay comparisons. The latest screenshot still shows the header connection state **\`연결 확인 중\`** while KPI values render; this is an observation for separate VIS3-05T investigation, **not proof of a connection bug**.

## 3. Existing live Dashboard presentation contract (source-verified)

- Existing real desktop header \`.topbar > h1\` has **no** large SVG cartouche; mobile \`.mobile-appbar-title\`, brand header and version text likewise omit extra outer frames.
- Live decorative CSS after the restrained correction mounts **exactly two used SVG types**: \`atlas-compass-rosette.svg\` on desktop and mobile ATLAS brand mark, at **34px**; and \`atlas-corner-filigree.svg\` on the dashboard frontispiece corner, **54px and 0.44 alpha**, reduced at <=600px to **30px and 0.34 alpha**.
- \`.dashboard-ledger-heading\` has a typographic \`h3\`, muted metadata and a quiet dividing rule, without the old ornate KPI plaque or central large diamond.
- Dashboard retains exactly six real KPI cards and their live calculated data, existing refresh control and navigation. The source structure is verified; not an independently repeated browser interaction audit.
- Current VIS3-04/05 correction and example layout are baseline A; reserve one proposed partial-engraving variant B, small ledger title variant C, and low-intensity combination variant D for the **separate, unimplemented** VIS3-05R-B comparison.

## 4. Browser screenshot gap / exact next action

Requested by Phase III v2:
1. Fresh **current Production** Chrome Dashboard at **390 × 844**, **768 × 1000**, **1440 × 1100**, **1600 × 1100 CSS px** with identical data/DOM and CSS ON/OFF, recorded SHA and no horizontal overflow.
2. Compare normal/collapsed sidebar, Dashboard loading/loaded/error states, longest KPI supporting text, keyboard and refresh interactions.
3. Repeat meaningful 125%/150% effective scale; record actual source-visible status instead of inventing connection success; confirm typography/focus and CSS/SVG transfer.

**Blockers observed during this work unit:**
- Local analysis runtime includes Chromium but **cannot DNS-resolve Vercel Production**; hence no actual live page screenshot can be taken locally.
- Attempt to create a short-lived read-only Vercel Sandbox Chrome environment returned **HTTP 402 \`payment_required\`**, Hobby usage limit exceeded until **2026-11-01T00:00:00Z**. **No Sandbox was created; no billing changes.**
- GitHub connector supports reading workflow outputs and rerunning failed jobs, but does not expose a general workflow-dispatch action. Existing \`.github/workflows/atlas-spacetime-production-visual.yml\` supports \`workflow_dispatch(expected_runtime_sha)\` and includes \`capture-vis2-production-baseline.mjs\`, which captures Dashboard at four widths. An authorized user can run it via **GitHub Actions → ATLAS Spacetime Production Visual Acceptance → Run workflow**, supplying the **current** Production SHA. It also executes old VIS2 acceptance tests that may fail with newer UI; do not mislabel their success as Phase III approval.

**Next work-unit boundary:** Finish VIS3-05R-A by obtaining the *fresh* exact-SHA Chrome 4-width evidence (prefer already-configured GitHub Actions workflow); if workflow is unavailable, record explicit user-approved evidence substitution before beginning VIS3-05R-B. No CSS changes in VIS3-05R-A.

## 5. Preservation rules

No arbitrary KPI/static values, no fake screenshots, no future styles applied without user selection, no P14 or Spacetime geometry changes, no AI portraits or invented heraldry. Keep the latest real source/deployment and attached user screenshot provenance separate.
