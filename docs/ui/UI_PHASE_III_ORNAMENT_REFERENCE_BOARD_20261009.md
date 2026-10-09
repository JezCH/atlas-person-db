# ATLAS Phase III — Ornament Reference Board / Decoration-First Design Proposal

**Date:** 2026-10-09  
**Status:** RESEARCH / DESIGN CANDIDATE — NOT APPROVED TO IMPLEMENT  
**Authority:** user specifically requires meaningful **decorative historical forms**, beyond color, fine rules and operational polish. This proposal does not silently amend the existing canonical `ATLAS_UI_VISUAL_GUIDELINES.md`.  
**Delivery:** 42 named motifs, six screen allocations, explicit retained contracts and replacement candidates. No UI/CSS/DB edits.

## Why Phase II did not satisfy the visual ambition

The VIS2-13 verified Production screen is structurally consistent but still tends toward a dark administrative system. Phase II chiefly refined graphite/brass material, existing dividers, type hierarchy, controls and subtle surface edges, while `ATLAS_UI_VISUAL_GUIDELINES.md` §22 assigns frame ornament only ★, texture ★, and illustration on main 0. This policy is **in tension with the user's renewed explicit requirement that historical decorative forms themselves be visible**. Repeated hairlines are not a replacement for meaningful ceremonial ornament.

**New provisional thesis: "Grand Atlas × Astronomical Instrument × Illuminated Codex" (장엄한 고지도 × 정밀한 천문기구 × 장식 필사본)**. Use the instrument as a structural/proportional vocabulary, historical folio as an editorial title vocabulary, and map title cartouches as controlled ceremonial ornament. This is not a fully skeuomorphic European parchment UI; it is a modern synthesis with multiple cultural sources.

## Directly verified primary visual references

| Source / original object | Observable ornament | Design translation and restriction |
| --- | --- | --- |
| [Blaeu, `Atlas Maior` and decorated world/continents maps](https://www.sothebys.com/en/buy/_antique-world-and-four-continents-engraved-maps-the-atlas-major-Johannes-Blaeu-6f5b) | Engraved title/dedication cartouches, figures, scenic chapter borders, medallions | Header cartouche and chapter edge only; **never copy ethnographic stereotypes or fantasy landforms into evidence maps** |
| [David Rumsey historical map viewer](https://www.davidrumsey.com/view) | Cartographic plate/index, date/place/person cross-index and inset conventions | Spacetime observation panel, restrained inset and folio number; distinguish citation/object ID from decoration |
| [Met: 1654–55 Iranian planispheric astrolabe](https://www.metmuseum.org/art/collection/search/451699) | Brass instruments as both ornate object and precise rings, engraved scales and calligraphic surface | Spacetime timeline tick caps, focus instrument and dial readout. Decor is not a claim that the UI uses actual astronomical coordinates |
| [British Museum: 1712 Safavid astrolabe](https://www.britishmuseum.org/collection/object/W_OA-369) | Engraved pointers/star-scale, nested precision and mechanical structure | Micro-engraving in controls and inspected/selected state, no star chart falsified as real history |
| [The Met: 1137 Iran/Iraq illuminated Qur'an folio](https://www.metmuseum.org/art/collection/search/453369) | Interlace, foliate scroll and intense heading ornament | Abstract ornamental chapter borders and title tabs; **do not appropriate specific religious calligraphy as generic decoration** |
| [The Met: 14c Mamluk Qur'an manuscript](https://www.metmuseum.org/art/collection/search/452704) | Headings in geometric stripwork and stars, foliate fills | Pattern grammar for bounded section terminals, not specific sacred motifs/signs |
| [British Library: John the Fearless Breviary](https://searcharchives.bl.uk/catalog/040-002088789) | Full/partial illuminated foliate borders, decorated initials | Folio first-character/section thresholds; never illuminate all body text |
| [National Museum of Korea: Goryeo celadon with inlaid cloud/crane](https://www.museum.go.kr/site/eng/relic/search/view?relicId=973) | Repeated cloud/crane inlay, meander and ruyi bands | An East Asian alternative ornament set for explicitly scoped regional editorials, not a blanket 'Asian UI' pattern |
| [National Museum of Korea: Goryeo inlaid cloud/dragon jar](https://www.museum.go.kr/ENG/contents/E0402000000.do?relicId=1340&schM=view&searchId=search) | Contrast through material and repeated patterns | Material/pattern rhythm, no faux historical kingdom badge |
| [Met: Hiroshige `Goyu` ca.1833–34](https://www.metmuseum.org/art/collection/search/36957) | Real publisher/craftsmen names inserted into yellow title cartouches | Editorial caption system and discrete metadata labels without inventing provenance |
| [Rijksmuseum Collection Online](https://www.rijksmuseum.nl/en/about-collection-online) | Museum-grade object interpretation plus collection comparisons | Archive and interpretive information structure, stronger exhibition treatment only at transitions |
| [The Met Heilbrunn Timeline](https://www.metmuseum.org/ko/toah/about) | Chronological / thematic / geographic access | Preserve chronology and scientific legibility within ornament |
| [Library of Congress map collections](https://www.loc.gov/maps/collections/) | Authoritative long-lived maps and archive descriptors | Catalogue notation, source attribution and collection-like plate identity |
| [Google Arts & Culture](https://artsandculture.google.com/) | Curatorial stories and image-rich thematic entry points | Dashboard as guided entrance, not overdone card gallery |

**Historical examples are inspiration, not licensed-to-copy app assets.** Object rights vary; original SVG/CSS geometry is preferable for generic non-religious ornament. If original artifact pixels are introduced later, verify individual license and attribution; the Met has public-domain examples while other archives differ.

## Three distinct candidate directions (compare before implementation)

- **A — GRAND ATLAS / Royal Cartography.** Deep ink, aged brass, engraved title cartouches and sectional folios. Highest ceremonial identity for dashboard / Polity intro. Risk: ornate title stealing space from high-density records.
- **B — CHRONOMETER / Precision Cosmography.** Astrolabe-like calibrated circular linework, reticles and marginalia. Highest match for Spacetime, scales and selected inspector. Risk: decorative marks mistaken for geographic/timeline facts.
- **C — ILLUMINATED CODEX / The Living Chronicle.** One signature illuminated initial, editorial marginalia and discrete ruled folio frames. Highest match for Person Detail, chronology and bibliographical source panel. Risk: copied religious iconography or body copy crowding.

**Recommended synthesis**: A for global/front pages and polity identity, B for Spacetime and calibrated status, C for historical Person Detail; all share one neutral metal/ink material grammar. Do not paste the same European baroque design across every world region or every repeated row.

## 42-element ornament inventory

Legend **P0** = first signature motif prototype, **P1** = selectively adopt after A/B, **P2** = optional; all candidates require visual review before production.

### Shared atlas shell — 01–08
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 01 | P0 | Main masthead engraved cartouche | One ATLAS wordmark field; not the Person row list |
| 02 | P0 | Aged-brass asymmetrical corner brackets | Single primary canvas / modal corners, 8–18px; no interactive target collision |
| 03 | P0 | Fine double-rule chapter divider | Shell-to-domain transitions only; embossed line + narrow inset |
| 04 | P1 | Abstract rosette terminal | One center point at a major chapter divider, not every card |
| 05 | P1 | Corner plate registration ticks | Chapter framing only, distinct from time ticks and scrollbars |
| 06 | P0 | Folio/plate/index number plaque | Header corner “ATLAS · PLATE 01”; purely editorial label, not record ID |
| 07 | P2 | Near-invisible engraved ground texture | Major stationary negative-space area only, avoid active data fields |
| 08 | P1 | Authored secular atlas monogram | Compact identity emblem; must not resemble invented national coat of arms |

### Dashboard — 09–14
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 09 | P0 | Decorative grand frontispiece | One opening frame above KPI ledger; preserves existing KPIs |
| 10 | P1 | Half-disc chronometer surround | Neutral behind *one* primary KPI, no suggestion of factual gauge |
| 11 | P0 | Engraved collection tally/ledger header | Actual KPIs in an archival title hierarchy, not new fabricated statistics |
| 12 | P1 | Chapter medallion / time-of-record seal | Side of major area heading with nonfactual abstract form |
| 13 | P1 | Curator marginal-note frame | Existing review/status notes only; no auto-generated historical claims |
| 14 | P2 | Gentle edge illumination | Active/focused chapter only, no idle shimmer or pulsing |

### Dense Person main register — 15–20
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 15 | P0 | Era chapter ornamental headpiece | Existing era break header; **not** each Person row |
| 16 | P0 | Century marker incision / numeral plaque | Existing year group header only, preserves chronological coordinates |
| 17 | P1 | Narrow archival spine at group edge | Connects era blocks, never overwrites domain-color rails |
| 18 | P1 | Flanking micro-beads at highlighted selection | Only selected/focused row, existing density/height unchanged |
| 19 | P1 | Precision micro-engraved sortbar edge | Static sortbar perimeter; sorting semantics unchanged |
| 20 | P2 | Side index glyph in the margin | Optional era subdivision glyph, no portrait, no false Person rank |

### Person Detail and sources — 21–27
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 21 | P0 | Formal biography title cartouche | Existing hero / Person name, honors real text without invented royal title |
| 22 | P0 | Portrait niche with filigree / inscription corners | Genuine portrait **only**, never paint a fictional historical face |
| 23 | P0 | Singular historiated-initial-inspired chapter mark | One abstract initial at biography overview, no sacred illustration |
| 24 | P1 | Chronicle marginal spine | Parallel to actual Activity lines, not a replacement for time labels |
| 25 | P1 | Activity boundary floral/geometric finial | Only date-group section changes, not every line |
| 26 | P0 | Bibliographic colophon / source imprint bar | Existing citation, certainty and source metadata only |
| 27 | P2 | Rectangular note gloss frame | Existing uncertainty or historical basis note, avoiding fake manuscripts |

### Spacetime instrument — 28–35
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 28 | P0 | Astrolabe-inspired calibration arc in toolbar | **Outside** map coordinates and canvas transform |
| 29 | P0 | Major-year instrument tick ferrules | Existing major ticks only, unchanged position and label count |
| 30 | P1 | Zero-interaction compass/reticle emblem | Background corner of instrument chrome, **not** a compass bearing claim |
| 31 | P0 | Macroregion engraved nameplate | Existing region header strip, maintain nine-region camera math |
| 32 | P1 | Selected Person observational halo/locator | Existing selected track only, domain colors intact |
| 33 | P1 | Minimap inset plate + stamped corners | Overlay-free minimap container, no data coordinate or hit target change |
| 34 | P2 | Chronometer concentric ring etching | Small zoom-display surround only; never faux chronometric data |
| 35 | P1 | Etched selected-period evidence tag | Existing temporal certainty value only; maintain undefined/unknown distinction |

### Polity and regional archive — 36–40
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 36 | P0 | Country/Polity archive cartouche | Polity dossier title; no invented official crest/flag |
| 37 | P1 | Historical regime chapter escutcheon (blank abstract) | Scope-labeled neutral geometric form, **no fabricated heraldry** |
| 38 | P0 | Temporal designation band | Existing dated state_form/official_name only; no artificial succession |
| 39 | P1 | Vertical dynasty/office section connector | Real relationships/activities only, no inferred genealogy |
| 40 | P0 | Source-and-identity colophon | Bottom archival imprint for actual Polity Source evidence/uncertainty |

### Mobile — 41–42
| ID | Priority | Ornament | Exact placement / behavior |
| --- | --- | --- | --- |
| 41 | P0 | Single-line folded folio chapter tab | Replace wide desktop cartouche at <=760 CSS px, not touch targets |
| 42 | P1 | Compact terminal/seal in collapsed inspector | Draw only when the corresponding panel/header is present |

## Per-surface recommended signature (not all 42 at once)

| Surface | First P0 signatures | Avoid |
| --- | --- | --- |
| Dashboard | #01 #09 #11 #12 | One ornate frame repeated on six KPI cards |
| Person register | #15 #16 #19 | Individual portrait card, enlarging every row |
| Person Detail | #21 #22 #23 #26 | Fabricated portrait; sources presented as fake archival facts |
| Spacetime | #28 #29 #31 #33 | Overlaying chart/grid/track hit boxes; changing year/world projection |
| Polity | #36 #38 #40 | False state coat of arms, forced historical continuity |
| Mobile | #41 and one active inherited shell motif | Miniature desktop atlas cover crowding controls |

## Protected functionality / data invariants

1. Main Person UI stays a **high-density table** with existing column widths/row heights/records; no main portrait thumbnails and no forced cards.
2. Existing eight `representative_domain` semantic colors are immutable, including government Gold `#D4AF37`; shared ornament uses **aged neutral brass** instead of gold meaning collisions.
3. Spacetime **500–1500%** camera, unified X/Y transform, common compression, 9 macroregions, precision label/axis positions, history time projection/LOD and hit targets unchanged.
4. Existing sorting/search/filter, key focus-visible, mobile/touch, routing, selected state, responsive layout and reduced-motion preferences unchanged.
5. Polity/Person/Activity identity, sources, temporal certainty, BCE/CE conventions and unknown dates never inferred or fabricated for aesthetic symmetry.
6. Historic artwork rights are checked per asset; generic ornaments should be *redrawn as original* geometric SVG/CSS rather than copied source pixels.
7. On dense areas use a **fixed ceremonial anchor**: one ornament per section/chapter and none per repeated row.
8. P14 Territory/Geometry is user-parked; this decorative review does not reactivate it.

## Replace or retire **visual treatments**, not app functionality

1. Replace **uniform KPI card chrome** with a strong Dashboard chapter frontispiece + quiet metrics ledger; retain six operational KPI metrics and actions.
2. Replace generic repeated **rectangular header box** at chapter boundaries with distinctive map-engraved header/cartouche, sparingly.
3. Replace plain undifferentiated **divider lines** at chapter thresholds with intentional decorated chapter rules; preserve ordinary data grid rules.
4. Replace generic neutral **Person Detail hero framing** with authentic portrait niche and single illuminated title/initial; retain all data/evidence.
5. Replace undifferentiated **Spacetime instrument panel chrome** with calibrated engraving on fixed outer chrome; never obscure actual time chart.
6. Replace pale one-off **selected-state highlights** with a visually recognizable small ceremonial locator; never change role color meaning.
7. Remove redundant ornamental micro-hairlines **where the new anchor supersedes them**. Do not stack all old and new decoration indiscriminately.
8. Replace purely visual-status-based success criteria **“CI pass therefore luxurious”** with screenshot A/B at realistic scale plus explicit visible ceremonial hierarchy review.

## Controlled design-guideline amendment to seek user approval

Canonical `ATLAS_UI_VISUAL_GUIDELINES.md` currently says ornament primarily comes from chronology, gives **frame ornament ★** and **texture ★**, **main illustrations 0** (§§17,22), and rejects fantasy hall/theming (§23). The user's repeated direction requires a revision rather than another silent implementation of minimal outlines.

**Proposed amendment, not applied:** raise **chapter/title/cartouche ornament** to ★★★★ at *entry/major-section boundaries*, **person detail frame/folio ornament** to ★★★, and **Spacetime instrument ornamental geometry** to ★★★; maintain **repeated Person row ornament ≤★**, **domain-color distinction mandatory**, **portrait on main = 0**. Permit a **nonfactual decorative engraving/background** in a header only if separately approved; reject misleading historical illustration in chronology/data canvas. Ornament intensity is local/semantic, not a blanket global frame rule.

## Visual choice/acceptance pipeline

1. Prepare three **identical-data, identical-frame** visual concepts with visibly different A/B/C signatures; no live UI code changes. Include 390 / 1440 and one 1500%-zoom Spacetime screenshot-based layout.
2. User selects or combines A/B/C, specifically authorizing the **guideline ornament-budget update**.
3. One reversible, screen-scoped implementation unit at a time, beginning with **Dashboard entrance / Spacetime instrument border / Person Detail** depending on chosen direction.
4. Visual first: show side-by-side pixels at same source/data state and get affirmative appearance review. Automated invariants only support, not substitute for, visual acceptance.
5. Production exact-SHA Chrome and historical/color/camera accessibility regression gates before final signoff; do not create identity/data migration work here.

**Status:** reference audit and motif inventory delivered. NO IMPLEMENTATION / NO PRODUCTION MUTATION / NO PHASE III acceptance claim.
