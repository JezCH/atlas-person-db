# SOURCE-PROD-01 (#2478) — exact Source URL semantic census, read-only

**Review date:** 2026-11-17. **Data date:** 2026-10-11 Production OIDC P2-10 census; not a fresh 2026-11-17 Production database snapshot.

**Immutable input:** [approved protected workflow #38128160741](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741), [full artifact #11697859340](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741/artifacts/11697859340), ZIP SHA-256 `92bfb11dec48bdfa54d967d94763aac931e667001e6f0ed2b03fbb303685b253`. Verified the exact ZIP digest before reading the full `polity-p2-10-internal-full-census.json`. The accepted full snapshot includes **3,354 Sources**, 3,889 Activity-Source links, 255 Polity-Source links, 108 Designation-Source links and 20 Governance-Source links. Source data are read-only; no current Production query or mutation in this review.

## Full exact-group findings

| Population | Count | Correct interpretation |
| --- | ---: | --- |
| Shared exact canonical URL groups | **83** | URL equality only; not proven duplicate bibliography |
| Source UUIDs in those groups | **197** | Every UUID preserved |
| Excess over hypothetical global one-UUID-per-URL rule | **114** | **Not** 114 safely deletable rows; URL uniqueness is not the accepted Source schema |
| Activity-scoped Source keys in shared groups | **196/197** | Most UUIDs were intentionally keyed by Human Authoring context |
| Activity-Source references within the groups | **197** | **142 distinct Activity IDs**; preserve each UUID and locator |
| Designation-Source references within groups | **9** | Also retain these cross-domain claims |
| Title-variant groups | **5** | Metadata/semantics require review |
| Source-type-variant groups | **4** | Metadata/semantics require review |
| Union of variant groups | **6** | Some of the 5 and 4 overlap |
| Same Activity references multiple Source UUIDs with same URL | **3 groups / 4 Activity collisions** | Highest-value scoped review cases, **not** authorized merges |
| Ordinary scoped URL reuse, not in above two priority classes | **74 groups** | Still semantic review, not a terminal verdict |

### Highest priority — same Activity + same URL + multiple Source identities

These four collisions are particularly actionable because **the same normalized Activity UUID** references multiple Source UUIDs for an identical URL. All are for **Josip Broz Tito**; some distinct Human Authoring request keys represent separate polity-era assertions later consolidated into one Activity. Exact source keys and every locator are retained in the immutable audit; do **not** assume duplicates are safe to delete.

| URL / source group | Activity UUID | Source UUIDs |
| --- | --- | --- |
| Yugoslav Archives — `/leksikon-jugoslavije/licnosti` | `f8f25787-fc27-4a77-84e6-2888f2aa5a40` | `0184717f-1c05-4e13-9dd1-5a177c37ddf4`, `c0329ec6-86d3-4e13-9147-3d82e80e2ccd` |
| Yugoslav Archives — `/leksikon-jugoslavije/konstitutivni_akti_jugoslavije` | `f8f25787-fc27-4a77-84e6-2888f2aa5a40` | `08816c4e-95eb-4dc4-bcbb-912b68992a1a`, `fe591c1e-2823-4017-8dc9-402c980cae92` |
| Yugoslav Archives — same constituent-acts URL | `5d506d43-6518-426f-b3de-8e5877cf8bb4` | `dbe1dd9f-eec8-4e39-99a3-523e689c51bc`, `fd71b3ef-e0e6-460e-a1ef-d0ba9cb28051` |
| Croatian Encyclopaedia — `/clanak/broz-josip-tito` | `5d506d43-6518-426f-b3de-8e5877cf8bb4` | `f2ce96c3-b751-4a25-8e50-e3e67055d289`, `f8fc5f32-2479-41bc-96dc-d991a61f899d` |

These exact rows require read-only current-Production preflight, full citation_text and source locator comparison, Human Authoring ledger/provenance review and all dependent link coverage before any identity correction. No Source deletion, global URL uniqueness constraint or automatic rewrite is permitted.

### Six metadata-variation URL groups

- `https://www.metmuseum.org/toah/ht/04/wae.html` — two wording/punctuation variants of an art-chronology title (same type).
- `https://www.presidency.gov.za/history` — title **and type** vary between two government references.
- `https://japan.kantei.go.jp/past_cabinet/index.html` — title **and type** vary; one may be specifically scoped to Yoshida Shigeru rather than the generic list.
- `https://www.kongehuset.dk/monarkiet-i-danmark/kongerakken` — three source records with two title versions (the English/Danish naming differs).
- `https://www.iranicaonline.org/articles/armenia-ii/` — title **and type** differ across Person/period assertions.
- `https://www.kongehuset.no/monarkiet/historie/kongerekken` — same title with **source-type variation**.

No claim that these six are all actual errors: a source title can legitimately vary in translation or scope while referring to the same URL.

### Why the 11-source Mexican URL is not eleven Source deletions

The large Gaceta Parlamentaria group has **11** Source UUIDs keyed to eleven distinct Santa Anna presidential intervals; each is linked to an Activity and the original locator. The two Ramón Castilla Peru URLs each have **5** Source UUIDs across different office terms. These are exact-document reuse across separate historical assertions. Bibliographic consolidation, if desirable, requires a deliberately reviewed policy and complete all-route reference migration, not simple unique-URL SQL.

## Reproducible read-only audit

Run on the immutable extracted JSON from the ZIP, **without any database connection**:

`node scripts/atlas-source-url-semantic-audit.mjs --input polity-p2-10-internal-full-census.json --output source-url-audit.json`

The tool retains **all 83 cases**, complete Source UUID/key/title/type/external identifier and all listed Activity, Polity, Designation and Governance Source links including exact locators. All cases are explicitly `REVIEW_REQUIRED`; `safe_to_merge=false`, `mutation_authorized=false`, `operations=[]`. The script intentionally fails closed on incomplete source/link exports, invalid or repeated Source IDs and dangling Source references.

**Next actual work:** Verify the above Tito 4 collisions against current canonical Source citation_text, all live reference routes, before/after ledger and original reviewed assertions. For every genuinely equivalent bibliography identity, require separately approved serializable Source-owner rewrite preserving Activity/Source locator semantics; otherwise retain distinct keys. This audit improves prioritization and provenance safety but does **not** claim a live normalized Source correction or issue #2478 closure.
