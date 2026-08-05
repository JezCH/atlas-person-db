# Phase 4 Gate — Deterministic Migration Compiler

## Purpose

Compile the legacy repository datasets into deterministic normalized artifacts for the Phase 3 target model without deploying, connecting to a database, or changing production behavior.

## Authorized paths

- `migration/phase-4/**`
- `.github/workflows/phase-4-compiler.yml`

## Required checks

- [x] Phase 3 gate remains valid.
- [x] Phase 4 branch starts from `aaf3eec0b07a4108cb80b0acdc5f6c9f5f8c4e8b`.
- [x] Existing production files changed: 0.
- [x] Database changes: none.
- [x] Runtime changes: none.
- [x] All canonical relationship sources discovered.
- [x] All locale sources inspected without executing repository JavaScript.
- [x] Stable source locators and content hashes generated.
- [x] Deterministic UUIDv5 identifiers generated.
- [x] Legacy relationship count preserved exactly.
- [x] Reference-integrity validation passed.
- [x] UUID collision validation passed.
- [x] Existing locale conflicts were reported explicitly and not silently overwritten.
- [x] Two independent compiler runs were byte-for-byte identical.
- [x] Protected-scope validation passed.
- [x] Workflow used read-only repository permissions.
- [x] Workflow used no database or deployment secrets.
- [x] Artifact uploaded and inspected.

## Existing source defects preserved as diagnostics

The compiler reported two pre-existing Korean locale conflicts:

- `Isabella I of Castile`: `이사벨 1세` / `카스티야의 이사벨 1세`
- `Otto von Bismarck`: `비스마르크` / `오토 폰 비스마르크`

The compiler did not choose by source order or discard either value. Both variants were preserved, with deterministic preferred-name selection solely to keep the generated dataset structurally valid. Historical/editorial resolution remains a separate explicit data-cleaning decision.

## Completion record

Status: PASS

- Branch: `agent/phase4-deterministic-compiler`
- Phase 3 closing SHA: `aaf3eec0b07a4108cb80b0acdc5f6c9f5f8c4e8b`
- Compiler workflow SHA: `f388996ec6745365fe9aba7a97da44e7f5cec2f8`
- Workflow run ID: `31021671237`
- Workflow conclusion: `success`
- Artifact ID: `8936847117`
- Artifact name: `phase-4-compiler-f388996ec6745365fe9aba7a97da44e7f5cec2f8`
- Artifact digest: `sha256:3842e7807b73238ac5f2d772ae87fea4f0e85bc338292a9883b2cc227d9345bc`
- Legacy relationship rows: `349`
- Compiled relationship rows: `349`
- Persons: `303`
- Polities: `211`
- Person names: `599`
- Polity names: `407`
- Roles: `149`
- Repository provenance sources: `20`
- Missing person references: `0`
- Missing polity references: `0`
- Missing role references: `0`
- Missing period-basis references: `0`
- UUID collisions: `0`
- Locale conflicts reported: `2`
- Count conservation: `PASS`
- Reference integrity: `PASS`
- Determinism: `PASS`
- Protected scope: `PASS`
- Existing production files changed: `0`
- Database changes: `none`
- Runtime changes: `none`
- Gate result: `PASS`
- Phase 5 authorized: `no`
