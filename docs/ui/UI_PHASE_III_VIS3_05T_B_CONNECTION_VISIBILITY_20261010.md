# VIS3-05T-B — Dashboard / Person connection-status real Chrome audit (2026-10-10)

**Outcome: PRIOR T-01 CSS CASCADE HYPOTHESIS WAS NOT REPRODUCED. NO FIX WILL BE MERGED.**

Previous VIS3-05T-A source reading suggested the browser might honor `styles.css .status {display:inline-flex}` instead of the HTML `hidden` attribute, explaining the historical screenshot with `연결 확인 중` visible on the Dashboard.

This was checked in **unmodified, real Production Chrome** using the existing `window.ATLAS_MAIN_AUTHORITY_NAV.showDomain` API and `getComputedStyle(connectionStatus).display` in the same DOM. Initial run [#38018884859](https://github.com/JezCH/atlas-person-db/actions/runs/38018884859) disproved the exact hypothesis at 390px: on the Dashboard `hidden:true`, **`display:"none"`**, even though the original text remained in the DOM. The first implementation PR was therefore **reversed before merging**. No unnecessary new `[hidden]` selector or asset cache bump will ship. Note: a DOM's `textContent` still includes hidden text; it is not a visibility test.

The follow-up read-only Chrome job on this PR checks both **390px and 1440px** Dashboard → Persons → Dashboard transitions and archives computed visibility and screenshots. It verifies that the Person route remains visible, Dashboard route remains hidden, six KPI cards still show and no dynamic text change is claimed to be a connection failure. These test screens show the **current** Production behavior, not necessarily the earlier October screenshot's exact deployed revision.

**Correct interpretation:** The user's old screenshot exposed an apparent display inconsistency; current Production behavior may have improved due to a later release or the screenshot timing. The source-only CSS cascade theory was **not** validated by live testing and cannot justify a patch. Other network or status-lifecycle errors have not been ruled out categorically; there is simply no reproduced issue in these paths right now.

This VIS3-05T-B work unit is **a completed targeted verification without runtime code edits**, not a successful bug fix. No DB/API/Person/Spacetime/ornament changes. Continue with **VIS3-05T-C sidebar long-label/status layout and contrast audit** as defined by Phase III v2.0, and keep 390/768/1440/1600 real browser screenshot checks for any later UI change. The mixed-D production visual-art final signoff remains user-pending.
