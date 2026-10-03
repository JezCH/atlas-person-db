# ATLAS UI Visual Study V1 — Palette Baseline

> Status: completed visual study checkpoint  
> Scope: V0 baseline + V1 palette only  
> Product code changed: **no**  
> Production data/API/behavior changed: **no**  
> Parent guideline: `ATLAS_UI_VISUAL_GUIDELINES.md`

## 1. Goal

Establish the first visual baseline for the ATLAS redesign without changing product behavior.

The controlled comparison keeps:

- the current Person information structure;
- the current card/list/detail relationships;
- the same Production Person sample data;
- the same sans-serif typography family;
- the same representative-domain semantic colors.

Only the global neutral palette, surface treatment, and honor-metal accent change.

This isolates palette/material judgment before typography and structural redesign.

## 2. V0 live baseline

Production reference deployment used for current-state inspection:

- deployment: `dpl_EURKGoZ3QaJTK279v4kxTdiKr52r`
- state: `READY`
- target: `production`
- repository SHA: `8074f43e6fe1554ac0107702d0e20bda19f64bf3`

The later documentation-only deployment for PR #1821 was canceled; it contained no product UI change, so the READY deployment above is the correct visual product baseline.

Current global visual language observed from live HTML/current-main CSS:

- light gray application canvas;
- white panels/cards;
- indigo/purple generic primary;
- repeated 8–12 px radii;
- repeated pills/badges;
- Person list built as nested cards;
- white spacetime canvas with blue-gray labels/rails;
- white minimap/inspector widget surfaces.

This remains usable but reads primarily as a SaaS/admin surface rather than a civilization-scale historical interface.

## 3. Production data used in the controlled study

The visual sandbox uses current Production data, including:

- 나르메르 / Narmer — governance — Ancient Egypt — Pharaoh — reign — c.3150–c.3125 BCE;
- 길가메시 / Gilgamesh — governance — Uruk — King — reign — c.2700 BCE;
- 임호텝 / Imhotep — technology — Ancient Egypt — Adviser — general activity — c.2667–c.2648 BCE;
- 조세르 / Djoser — governance — Ancient Egypt — Pharaoh — reign — c.2667–c.2648 BCE.

No invented data is used to determine the palette decision.

## 4. Palette A — Obsidian / Aged Bronze

Intent: stronger Hall-of-Legends ceremonial character.

| Token | Value |
|---|---|
| Canvas | `#111315` |
| Sidebar | `#0D0F10` |
| Surface 1 | `#171A1D` |
| Surface 2 | `#1D2124` |
| Strong text | `#EEEAE1` |
| Secondary text | `#A9AAA5` |
| Muted text | `#73777A` |
| Divider | `#2B3033` |
| Honor metal | `#9F8B67` |
| Strong metal | `#B5A078` |

### Strengths

- strongest ceremonial atmosphere;
- highest perceived historical gravity;
- aged-bronze accent gives clear material identity;
- selected state reads immediately.

### Risks

- easiest option to drift toward game-event or faux-historical styling;
- aged bronze can compete with governance Gold;
- long-duration use feels slightly heavier;
- future serif/display typography could make this palette feel older than intended.

## 5. Palette B — Graphite / Champagne

Intent: TGA/Destiny-like neutral premium foundation.

| Token | Value |
|---|---|
| Canvas | `#121518` |
| Sidebar | `#0E1114` |
| Surface 1 | `#191D21` |
| Surface 2 | `#20252A` |
| Strong text | `#F0ECE4` |
| Secondary text | `#A7ADB1` |
| Muted text | `#6E767C` |
| Divider | `#30363B` |
| Honor metal | `#9C927D` |
| Strong metal | `#C0AE88` |

### Strengths

- more neutral and durable for long historical browsing;
- cleaner distinction between content and ceremonial accent;
- preserves semantic domain colors more naturally;
- feels newer and less themed;
- offers more headroom for later typography/chronology design.

### Risks

- if implemented too flatly it can become a generic dark productivity UI;
- requires hierarchy, typography, chronology, and spacing to supply monumentality;
- champagne accent must remain scarce or it becomes luxury-brand decoration.

## 6. V1 decision

### Foundation

**Palette B — Graphite / Champagne is the provisional ATLAS foundation.**

Reason:

ATLAS is a persistent historical instrument, not an event landing page. Palette B provides the cleaner, more timeless neutral field while still supporting a restrained ceremonial metal layer.

### Controlled borrowing from Palette A

Do not discard A completely.

Aged-bronze characteristics may be borrowed only for high-ceremony states such as:

- era boundary emphasis;
- selected/focused historical object;
- detail-entry transition;
- major chronology marker;
- rare high-level divider/emblem.

They must not become the default border/background language.

## 7. Semantic color invariant

The global honor-metal system must remain separate from representative-domain colors.

Current semantic domain registry remains authoritative:

- governance — Gold;
- military — Crimson;
- knowledge — Blue;
- technology — Graphite;
- commerce — Emerald;
- culture — Purple;
- religion — light Silver Blue / Ivory-family semantic;
- exploration — Orange.

Especially:

**governance Gold must never be reused as the generic UI honor accent.**

## 8. Neutral-area budget

Target screen-area balance for future prototypes:

- neutral/dark surfaces: 85–90%;
- primary typography: 7–10%;
- semantic domain colors: 2–4%;
- honor metal: 1–2%.

The desired impression is not “a gold UI.”

It is:

> a quiet dark historical field with rare metallic emphasis.

## 9. What this study does not approve

V1 does **not** approve any of the following yet:

- serif typography;
- card-to-register conversion;
- sidebar geometry;
- Person hierarchy redesign;
- spacetime label redesign;
- new motion system;
- new icons;
- production theme switch.

Those remain subsequent visual work units.

## 10. Exact next work unit

**V2 — Typography audition**

Compare, using Palette B foundation and identical content/layout:

1. Noto Serif CJK KR display + current sans UI;
2. Nanum Myeongjo/other Korean editorial serif display + current sans UI;
3. restrained all-sans control.

The comparison must cover at least:

- Person Main title/name hierarchy;
- dense spacetime 10 px Person labels;
- era/major-year headings;
- Person Detail hero name.

No product UI change should occur until the V2 visual decision is closed.
