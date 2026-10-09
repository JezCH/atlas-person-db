# VIS3-04/05 screenshot visual-restraint fix (2026-10-10)

Production screenshot reveals severe title/cartouche overlap, multiple repeated ornate edges, oversized compass and footer plaque. These are defects, not premium design.

Correction removes active topbar/mobile title and version ornaments, scales ATLAS signet to 34px, replaces Dashboard's giant cartouche/medallion with a single muted 54px corner filigree, and returns the KPI chapter to a quiet text heading plus line. Original six KPI values/actions, routing, filters, 8 domain colors, data and camera unchanged.

Old overlapping CSS was deleted within the same canonical asset, not hidden by additional override styles. All original SVG source primitives remain available for later deliberate use. Added source regression tests. Production Chrome screenshot comparison and user visual approval remain separate from green CI.