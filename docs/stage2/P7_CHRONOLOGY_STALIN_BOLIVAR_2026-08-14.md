# P7 chronology batch — Stalin / Bolívar — 2026-08-14

Status: **REVIEWED BRANCH-ONLY EXECUTION DECISION — NO PRODUCTION MUTATION**

Baseline: `ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79` / `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`.

## Scope

This batch closes two chronology-only P7/P8 blockers without inventing a new Polity, a new office phase, or an unsupported exact start date.

### Joseph Stalin — Soviet Union

Baseline Activity: `055a3ef9-4cc1-5e1e-8a91-a0c5d9eb0521` (`1924–1953`, `General Secretary and de facto leader`).

Reviewed policy:

- keep the existing Soviet Union Polity and the reviewed `rules` relation;
- retain **1924** as the existing reviewed beginning of the de-facto-leadership Activity, but encode that start as **year granularity / approximate certainty** rather than as an exact transfer-of-power date;
- do not back-project the 1941 government-chairmanship start onto the whole Activity and do not redefine the Activity as merely the General Secretary office, which began in 1922;
- harden the end as **5 March 1953**, Stalin's documented date of death;
- preserve the legacy normalized Source and add the reviewed Presidential Library reference.

Reviewed external authority:

- Presidential Library named after B. N. Yeltsin, `Родился советский государственный и партийный деятель Иосиф Виссарионович Сталин`, https://www.prlib.ru/history/619830 . The page records his election as General Secretary in April 1922, appointment as Chairman of the Council of People's Commissars in May 1941, continued postwar party/government leadership, and death on 5 March 1953.

The exact moment at which post-Lenin collective leadership became Stalin's uncontested personal dominance is not reduced to a fabricated day. `1924 / approximate` is therefore an Authoring truth statement, not an assertion that Stalin obtained a legally defined head-of-state office on a specific day in 1924.

### Simón Bolívar — Bolivia

Baseline Activity: `ec54cba5-8e17-52f9-8849-be88a3bbc81b` (`1825–1825`, `First president`).

Reviewed policy:

- keep Bolivia and the reviewed `rules` relation;
- retain the beginning at **1825 year granularity** only; no start month/day is introduced by this batch;
- harden the terminal boundary to **29 December 1825** because the Bolivian Vice Presidency states that Antonio José de Sucre succeeded Bolívar through the delegation Bolívar made on that date;
- preserve the legacy normalized Source and add the reviewed Bolivian Vice Presidency reference.

Reviewed external authority:

- Vicepresidencia del Estado Plurinacional de Bolivia, `Origen / El primer vicepresidente de la República`, https://www.vicepresidencia.gob.bo/spip.php?id_expositor=12&page=expositor . It states that Sucre succeeded Bolívar by delegation made on **29 December 1825**, before the constitutional vice-presidential office existed.

The source supports the exact end boundary. It does not justify inventing a precise start day for this existing year-level Activity, so none is added.

## Safety

- no Production/Vercel contact;
- no Person merge;
- no Territory/Geometry mutation;
- no name-based identity resolution;
- no invented start day;
- exact before-state + reviewed after-state + normalized Source preservation + immutable Correction v2 replay are required before closure.
