# VIS3-05R-B — Same-source Dashboard ornament concepts A/B/C/D (2026-10-10)

> **State: DESKTOP PIXEL-PRESERVING CONCEPTS READY / MOBILE CURRENT-CHROME EVIDENCE BLOCKED / USER STYLE DECISION PENDING.**  
> Document + design evidence only. **No production index/CSS/JS/SVG, UI behavior, APIs, or DB changed.**  
> Parent design plan: [Phase III v2](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md). Source evidence: [VIS3-05R-A baseline](UI_PHASE_III_VIS3_05R_A_PRODUCTION_BASELINE_20261010.md).

## 1. Provenance and exact comparison set

- Shared screenshot: user-supplied restrained real Dashboard PNG `image(20261009-224109).png`, exactly **1889×833 pixels**, original SHA-256 `048e19a741701ce22407f434d775225fa121ac2bfb05a6f5b4013a1e449d0fa9`.
- A is a **byte-identical copy**. B/C/D start from the same source RGB pixels and draw very small original vector-like brass strokes at explicit safe coordinates only; every KPI, button, heading, data label, navigation item and the preexisting corner SVG remains *untouched* in the screenshot.
- These are **nondeployed static proposals, not actual production browser captures**, not newly rendered DOM at 1440/390 CSS px. The user upload does not encode or verify a historical source commit SHA. No newly captured mobile screenshot exists.
- The source CSS/HTML/SVG parity verified in VIS3-05R-A belonged to its own exact earlier Production snapshot; concurrent changes to `main` are not assumed to be present in the older user PNG.

## 2. Four choices, same image/data

| Option | Applied ornamental geometry | Decision intention |
| --- | --- | --- |
| A — Current | 0 added pixels; original image unchanged | If additional ornament does not improve hierarchy, keep A |
| B — Edge | Sparse two-line 1px etched fragments within the **existing Dashboard hero border**: top-left around x249–440/y136–144; bottom-right around x1586–1816/y261–269, restrained brass rgba | Restore only partial map-plate engraving, **never** a complete cartouche |
| C — Ledger | A 132×28px-ish 1px chamfered nameplate outline around `핵심 통계` at x225–357/y294–322, an isolated 4px-facet terminal and short line to x420/y325 | Small archival chapter marker; no ornate hexagon scaling |
| D — Combined | B at 68% and C at 76% of prototype stroke presence | Check whether the two small motifs genuinely reinforce each other; reject if redundant |

The nearby existing icon, original heavy hero border, six KPI cards, Person numbers and status remain unmodified in all four. There is no invented historical icon, flag, source or metric. The artwork uses muted brass RGB(187,165,116), distinct from governance semantic gold. Thin 1px drawn line/shape only; no SVG overlay behind characters, no giant compass, no additional footer or topbar plate.

## 3. Machine-checked content preservation

Protected regions cover: live navigation/header (x226–1888/y0–116); hero eyebrow (x251–450/y152–170); hero heading (x248–710/y175–223); live description (x250–1015/y221–249); refresh button (x1718–1850/y180–237); KPI title glyphs (x230–322/y299–319); **all six KPI tiles** (x230–1888/y338–456); and lower dashboard content (x230–1888/y458–833). Direct screenshot array comparison found **zero changed pixels** in every listed protection region for all four variants.

| PNG | Changed pixels outside protected data | All protected pixels |
| --- | ---: | --- |
| A | 0 | Unchanged |
| B | 777 | Unchanged |
| C | 402 | Unchanged |
| D | 1,179 | Unchanged |

Artifacts delivered with the conversation, **not committed to Production**: `VIS3-05R-B-A-B-C-D-comparison.png` (four full dashboard screenshots), `VIS3-05R-B-title-detail.png` and `VIS3-05R-B-title-KPI-zoom.png` (close-ups), `VIS3-05R-B-interactive-comparison.html` (self-contained offline image switcher), and `VIS3-05R-B-design-comparison.zip` (four lossless full-size PNGs + manifest + previews). The ZIP is attached to the chat; do not invent a permanent GitHub URL for it.

| Integrity reference | SHA-256 |
| --- | --- |
| A PNG | `048e19a741701ce22407f434d775225fa121ac2bfb05a6f5b4013a1e449d0fa9` |
| B PNG | `ddc6ee8479eca3b5d01f98f22e5750000b0d8586def2c213aca8f40ea2c72a23` |
| C PNG | `10f59bb74fbceded04b25d68a173c06dc647c12962674bd31242f6203ca6effb` |
| D PNG | `4eae6976668934be6f7928d243c19b15133ab3bd06f31a298868ce48a244972c` |
| Overview PNG | `bbea3a00ad4aafcd810aabb747584d9f8a287953880d020bdbc1f1ce417676eb` |
| Offline switcher HTML | `34fa53dc34a4302fa3425e0af58952d5660b16466ed3eeadf8d298b0042b581e` |
| Complete ZIP | `2ee3b0e8ccb6f722515ebfc8ddcf7aa1a2f5508754313f431a21d207a2b1d1cb` |

## 4. Design review, not automatic approval

- **A** is a fully valid final result. B is the lowest-risk historical signature but is intentionally subtle at full-width. C is more visually distinct; verify no cramped title/frame feeling in a real browser. D is permitted only if the elements are clearly complementary.
- User **must choose** A, B, C or D, or reject all. *There is no advance approval from this artifact*. Do not merge a visual implementation on the basis of a numeric score or this description alone.
- Current Chrome at **390/768/1440/1600 CSS px** (including true responsive layout, status, dynamic KPI and 125/150% scaling) remains required before Production final signoff. A stretched/cropped 1889px desktop screenshot is not a valid 390px mobile test.
- VIS3-05R-A fresh browser capture was blocked by remote Sandbox HTTP 402 Hobby limit; this is not represented as solved here. The existing GitHub Actions visual acceptance workflow is the appropriate alternate route if appropriately authorized. Never claim exact-sha Chrome PASS on the basis of screenshot-overlay pixel parity.

## 5. Next restart boundary

**VIS3-05R-C = user selects the preferred visual treatment.** Record an explicit decision and decide whether to proceed with a branch-only (not Production) prototype after resolving exact responsive baseline. If the chosen option is A, mark this Dashboard style unchanged and proceed to VIS3-05T information legibility instead of adding ornamental code. Stop at this comparison stage now.
