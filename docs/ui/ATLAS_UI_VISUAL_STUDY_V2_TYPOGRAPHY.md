# ATLAS UI Visual Study V2 — Typography Audition

> Status: completed visual study checkpoint  
> Scope: V2 typography only  
> Product code changed: **no**  
> Production data/API/behavior changed: **no**  
> Parent guideline: `ATLAS_UI_VISUAL_GUIDELINES.md`  
> Previous checkpoint: `docs/ui/ATLAS_UI_VISUAL_STUDY_V1_PALETTE.md`

## 1. Goal

Determine the ATLAS typography hierarchy after V1 selected the Graphite / Champagne foundation.

The test intentionally holds the following constant:

- Palette B;
- identical information structure;
- Production-derived Person names and chronology;
- representative-domain semantic colors;
- dense spacetime labels using sans-serif in all candidates.

Only the display typography changes.

The goal is not to choose a decorative “historical font.”  
The goal is to establish a modern type system that can express monumentality without making ATLAS look old, literary, or game-themed.

## 2. Production-derived stress data

The comparison uses current Production-derived names and ranges, including:

- 나르메르 / Narmer;
- 임호텝 / Imhotep;
- 로도스의 아가토클레스 / Agathokles of Rhodes;
- 아르테미시아 1세 / Artemisia I of Caria;
- 디오니시오스 1세 / Dionysius I of Syracuse;
- 안티고노스 1세 모노프탈모스 / Antigonus I Monophthalmus;
- 마케도니아의 에우리디케 1세 / Eurydice I of Macedon.

This set intentionally includes short Korean names, long Korean names, long English canonical names, numerals, and mixed chronology metadata.

## 3. Candidate set

### Candidate A — restrained modern Myeongjo + sans UI

Test implementation:

- Korean display: Nanum Myeongjo;
- English/numerics/UI: Inter;
- dense Korean labels: sans.

Purpose:

- test a restrained editorial/historical contrast without applying serif everywhere.

### Candidate B — traditional Batang + sans UI

Test implementation:

- Korean display: Baekmuk Batang;
- English/numerics/UI: Inter;
- dense Korean labels: sans.

Purpose:

- deliberately test a more traditional print/book direction and identify the threshold where “historical” becomes “old.”

### Candidate C — all-sans control

Test implementation:

- Korean display: NanumSquare;
- English/numerics/UI: Inter Display;
- dense labels: sans.

Purpose:

- establish the clean modern-data-tool control condition.

## 4. Test surfaces

Each candidate was compared on the same four ATLAS-critical surfaces.

### A. Era + major year

Example:

- 고전
- CLASSICAL ANTIQUITY
- BC 500

This checks whether typography alone can create a monumental era hierarchy without decorative framing.

### B. Person Register

The register checks:

- short Person names;
- long Korean Person names;
- canonical English names;
- chronology aligned to the right;
- representative-domain rail;
- role / period basis metadata.

### C. Dense spacetime labels

10 px Person labels were tested with long names.

Important result:

**serif is not used here in any candidate.**

At this density, a clean sans label is clearly superior for speed, collision tolerance, and legibility.

### D. Person Detail hero

The detail hero tests the first moment where the Person becomes visually monumental and the portrait can appear.

Long-name wrapping was tested on:

- desktop;
- 390 px mobile.

## 5. Findings

### Candidate A — strongest overall fit

Strengths:

- adds visible dignity and historical weight to Korean Person names;
- creates a clear contrast between historical/display information and operational UI;
- remains more contemporary than the traditional Batang direction;
- works especially well for era names and Person Detail hero names;
- makes the Person Register feel less like a SaaS list even before structural redesign;
- mobile wrapping remains readable when the display size is controlled.

Risks:

- becomes visually dense below medium text sizes;
- long Korean names can feel too literary if size/line-height are not disciplined;
- would look old-fashioned if applied to paragraphs, filters, status, axes, or dense labels.

Decision:

**Adopt the restrained modern Myeongjo direction for the display layer only.**

### Candidate B — rejected as primary direction

Strengths:

- strongest immediate “historical document” association.

Problems:

- noticeably more old-fashioned;
- feels closer to book/document/archive typography than a current digital product;
- long Korean names become visually heavy;
- risks moving ATLAS toward a literary/history-site aesthetic rather than Monumental Chronographic Modernism.

Decision:

**Do not use this traditional Batang direction as the ATLAS primary display system.**

### Candidate C — retained as the interface layer, rejected as the sole visual system

Strengths:

- highest density tolerance;
- strongest small-size legibility;
- excellent number/Latin alignment;
- cleanest utility/UI behavior;
- safest on mobile.

Problems:

- when used for all major names/headings, the visual result becomes a premium dark data tool;
- historical gravity and ceremonial contrast are weaker;
- does not sufficiently distinguish ATLAS from a well-designed generic productivity product.

Decision:

**Use all-sans for the interface layer, not as the sole ATLAS typography language.**

## 6. V2 typography decision

ATLAS will use a two-layer typography system.

### Layer 1 — Monumental / Historical Display

Use a restrained modern Korean Myeongjo-style serif for:

- major Person names in Person Main/Register;
- Person Detail hero name;
- era name;
- major historical section title;
- rare selected historical-object heading.

Do not use it for:

- body paragraphs;
- filters;
- buttons;
- status;
- badges;
- source metadata;
- small activity rows;
- spacetime labels;
- numeric axes.

The visual direction was validated with Nanum Myeongjo.

This V2 checkpoint fixes the **style direction**.  
The eventual implementation font may be bundled/self-hosted separately if another modern Korean Myeongjo family is selected later, but it must reproduce this restrained display behavior rather than a traditional Batang aesthetic.

### Layer 2 — Operational / Data Sans

Use the existing clean sans family direction for:

- UI controls;
- canonical English;
- dates;
- year axes;
- metadata;
- dense spacetime Person labels;
- filters/search;
- status;
- admin;
- tables;
- telemetry;
- mobile compact metadata.

## 7. Numeric typography rule

Chronology numbers are data before they are decoration.

Therefore:

- major years may be large;
- but year glyphs stay sans;
- tabular numerals should be preferred where alignment matters;
- BC/AD / ranges should not be forced into the display serif;
- large year + serif era-name contrast is preferred.

Example:

```text
고전                     BC 500
CLASSICAL ANTIQUITY
──────────────────────────────
```

Here:

- `고전` = display serif;
- `BC 500` = precise sans;
- English era label = small sans.

## 8. Preliminary size hierarchy

These are implementation targets, not immutable constants.

### Desktop

- Page/major historical title: 30–36 px display;
- Person Register primary name: 18–21 px display;
- Person Detail hero: 32–44 px display;
- era heading: 28–34 px display;
- canonical English: 10–13 px sans;
- chronology/meta: 10–12 px sans;
- spacetime Person label: 10 px sans;
- micro telemetry/status: 9–10 px sans.

### Mobile

- main title: 26–30 px display;
- Person primary name: 18–20 px display;
- Person Detail hero: 28–34 px display;
- metadata: 9–11 px sans;
- dense timeline labels remain sans.

Long Person names may wrap naturally.  
The design must not use truncation merely to preserve a decorative composition.

## 9. Letter-spacing / line-height direction

### Display serif

- Korean letter-spacing: neutral to slightly negative;
- do not use theatrical wide tracking;
- line-height: approximately 1.08–1.22 depending on size;
- long-name wrapping should preserve readable phrase rhythm.

### Sans metadata

- Korean metadata: neutral tracking;
- uppercase English eyebrow: positive tracking is allowed;
- numeric ranges: compact;
- dense spacetime text: no decorative tracking.

## 10. Core modernity safeguard

The chosen serif must never become a global “historical skin.”

The modernity of ATLAS comes from the contrast:

> **historical names and eras carry the serif; the instrument around them stays modern sans.**

This is the main protection against:

- museum brochure styling;
- book-like UI;
- fake antiquity;
- fantasy history interface.

## 11. Mobile result

The 390 px stress comparison confirms:

- restrained serif remains readable for long Korean names;
- it can wrap to two lines without losing dignity;
- all-sans remains slightly more compact but materially less ceremonial;
- dense spacetime labels should remain sans regardless of the display choice.

Therefore the desktop decision holds on mobile.

## 12. V2 final decision

**Typography architecture: Hybrid Serif Display + Sans Instrument UI**

More precisely:

> **Modern Myeongjo for monumentality.  
> Sans for chronology precision, density, controls, and navigation.**

This is now the canonical typography direction for subsequent visual work.

## 13. Exact next work unit

**V3 — Global Shell visual foundation**

Production UI may begin changing in V3, but only presentation.

Target files:

- `styles.css`;
- `atlas-main-authority-nav.css`;
- responsive shell CSS where required.

V3 scope:

- introduce Graphite / Champagne visual tokens;
- remove the generic purple-primary visual language from main/public surfaces;
- reduce SaaS-style rounded blocks;
- redesign sidebar active state as text + thin metallic marker;
- simplify brand treatment;
- revise topbar hierarchy;
- keep all routes, data, labels, search/filter behavior, and Admin semantics intact.

V3 must not yet perform the Person card-to-register structural conversion.  
That remains V4.
