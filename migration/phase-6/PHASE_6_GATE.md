# Phase 6 Gate — Compatibility Reader and Shadow Validation

Status: PASS

Closed after compatibility-object deployment, privilege verification, reader integration, lineage parity, preview smoke, and rollback evidence all passed.

## Approved evidence

### Compatibility apply

- Workflow run: `31090419063`
- Workflow head SHA: `9a22b7c7e347d06223d59cdd3faa127bb0e323ab`
- Approved target SHA: `dac791bbe5a29eda468a576d604fd91a32b9641a`
- Artifact ID: `8963187048`
- Artifact digest: `sha256:c8791492738c5601b27e7349c0e9e31a85fcf52ef6e4707688dc9a0c116cf6b3`

Verified database state:

- `public.atlas_person_politics_compat_v1` exists
- v2 rows: 349
- legacy rows: 319
- duplicate IDs: 0
- invalid periods: 0
- invalid period basis values: 0
- `anon` and `authenticated`: explicit SELECT only
- write denial verified, including an actual anonymous INSERT attempt inside a rollback transaction

### Reader contract

- Reader integration merge SHA: `33b9e0cf5d8785a256d0a3acf5564f6c52503f5e`
- Reader Contract workflow run: `31091172067`
- Result: PASS

Reader behavior at gate closure:

- default read source remains `legacy`
- fallback remains enabled
- all application writes remain directed to `public.person_politics`

### Lineage parity

- Workflow run: `31096650046`
- Workflow head SHA: `a09795b06ae6e1d006bcf74b9d79ab3c985be2b9`
- Approved comparison SHA: `3ac910790ac380ad05656006859f5e5bba52d91f`
- Artifact ID: `8965714197`
- Artifact digest: `sha256:eda4ff24bbafc9b486355c61b5e327c4ef22e0e1f580cbc9a5e48c21fc51fdaf`
- Report digest: `sha256:763b0f05e422805b763d010561c80ec7e53bdcd2a14b131740cdb7dbcd4304a3`

Verified parity:

- legacy rows: 319
- v2 rows: 349
- matched lineage rows: 319
- missing legacy lineage in v2: 0
- approved v2 expansion rows: 30
- expansion row delta: 30
- contraction row delta: 0
- unexplained differences: 0
- structural validation: PASS
- lineage parity: PASS

The only repeated-payload expansion group was explicitly classified as `Simon Bolivar / Gran Colombia / 1819–1830`, delta 2.

### Preview smoke and rollback evidence

- Workflow run: `31097861921`
- Workflow head SHA: `4f1973f021cabd12f776f3585bcfa5efb32da8b6`
- Approved preview SHA: `e7bc11efa41f8eac28dd97e90a61a3d95667bdd1`
- Artifact ID: `8966195985`
- Artifact digest: `sha256:be773c6e5fdab092a8418c1da68f451775aa125d9e67fb2d76fb9a769f7fc589`

Verified checks:

- render projection: PASS
- search: PASS
- filter: PASS
- chronology: PASS
- export projection: PASS
- rollback evidence: PASS
- failures: 0

Rollback evidence:

- preview source: `v2-shadow`
- rollback source: `legacy`
- preview rows: 349
- rollback rows: 319
- write target unchanged: `public.person_politics`

## Gate decision

Phase 6 is closed as PASS.

This gate authorizes progression to Phase 7 planning. It does **not** itself change the production read source. At closure:

- production reads remain `legacy`
- production writes remain `public.person_politics`
- the v2 compatibility object remains read-only for application roles
- any production read cutover requires a separate, explicitly reviewed Phase 7 change and rollback procedure

## Exclusions

The divergent PR `#4` is not approved and must not be merged or used as migration evidence.
