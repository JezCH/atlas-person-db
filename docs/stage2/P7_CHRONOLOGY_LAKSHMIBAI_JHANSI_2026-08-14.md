# P7 chronology decision — Lakshmibai / Jhansi

Status: **REVIEWED BRANCH-ONLY CORRECTION DESIGN — NO PRODUCTION MUTATION**  
Date: 2026-08-14

## Baseline row

- Activity: `b37993f9-df6c-52a6-b27a-ad931e3aa99e`
- Person: Lakshmibai (`e10fcad7-6e2f-5567-bfc7-fca4855101c7`)
- Polity: Jhansi (`77b59677-592e-5bf1-9876-2f218c97bfd3`)
- Legacy interval: 1853–1858
- Audit decision: `KEEP_POLITY + SPLIT`
- Dependency closed by this package after successful rehearsal: `chronology_correction`

The legacy interval is not historically continuous. It conflates the succession/annexation crisis after Gangadhar Rao's death with Lakshmibai's restored authority during the 1857 uprising.

## Reviewed evidence

1. **District Jhansi, Government of Uttar Pradesh — About District**
   - records Jhansi as annexed by the British Governor-General in **1854**;
   - records Lakshmibai as ruling Jhansi again from **June 1857** into 1858.
   - URL: `https://jhansi.nic.in/about-district/`

2. **NRI Department, Government of Uttar Pradesh — Jhansi**
   - records Gangadhar Rao's death on **21 November 1853**;
   - records the British pension/order to leave Jhansi Fort in **March 1854**;
   - records the British attack in **March 1858**, the fall of Jhansi after the ensuing fighting, Lakshmibai's departure for Kalpi, and her death later at Gwalior on **18 June 1858**.
   - URL: `https://nri.up.gov.in/en/article/jhansi2?brd=1`

The official pages compress the annexation and final 1858 phase differently. This package therefore does **not** invent a day-level annexation or recapture boundary. It stores only the precision supported consistently enough for this Activity model.

## Correction

The original UUID survives as the first fragment. A deterministic Stage-2-native UUID is used for the restored-authority fragment.

### Fragment A — succession / pre-annexation authority

- Activity UUID: original `b37993f9-df6c-52a6-b27a-ad931e3aa99e`
- Polity: Jhansi
- relation: `rules`
- start: **1853**, year granularity, `approximate`
- end: **1854**, year granularity, `exact`
- rationale: preserve the legacy succession-crisis start without pretending that Gangadhar Rao's exact death date is automatically the exact start of a new `rules` Activity; terminate the phase in the documented annexation year.

### Fragment B — restored Jhansi authority during the uprising

- Activity UUID: `2335619a-fe8a-59b7-b6c5-47d7a2c2f41b`
- Polity: Jhansi
- relation: `rules`
- start: **June 1857**, month granularity, `exact`
- end: **1858**, year granularity, `exact`
- rationale: the District Jhansi source supports June 1857 as the renewed-rule boundary. The exact within-1858 recapture day is deliberately not encoded; the reviewed note makes clear that the Jhansi `rules` Activity ends with British recapture/departure, while later Kalpi/Gwalior military activity is not projected back onto Jhansi.

## Provenance policy

- Copy the existing normalized legacy Source link and locator to both fragments.
- Add both reviewed Government of Uttar Pradesh references to both fragments.
- The new fragment has `legacy_source_key = null`; no fake legacy key is created.
- No source is resolved by title or URL at execution time; literal UUIDs are pre-authored.

## Safety

- no Production or Vercel mutation;
- no Person merge;
- no Polity identity creation;
- no Territory/Geometry mutation;
- no fabricated month/day precision;
- closure is allowed only after fresh PostgreSQL dry-run/apply/exact-replay rehearsal succeeds.
