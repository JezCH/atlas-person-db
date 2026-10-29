# Place #2476: exact writer integration and offline preparation

Status: LOCAL_TESTED, review required; no historical approval or Production action.
Prepared against main `56c7738e3135e6c0eeaa57e117d0694f56c0b973` and preserved Work v10 in PR #2617 at `ba6ad96783a51a2b712756951b7464e2c11d7d69` (still unmerged). The original handoff remains unchanged.

## Completed unit

The existing authenticated identity handler now accepts `assert_place` and delegates to the existing `insertExactPlace` inside its serializable transaction. It preserves the supplied Place UUID and English name, verifies Source references, rejects identity conflicts and rolls back failures. It does not require inventing a Korean name. This is source integration, not a deployed endpoint.

`restoration-bundle.json` combines the original 20 Places, all 27 Source assertions/reviews and 23 fact payloads with dependency ordering. Twenty-five Source assertions pass the actual normalizer; two missing-URL assertions remain quarantined. This incorporates the existing offline evidence records from canonical checkpoint v55, with exact input hashes recorded in `offline_review_provenance`. All 27 source reviews and every fact-source reference explicitly retain `historical_approval: HOLD`; their retrieval/status/findings/locators and unresolved gaps are preserved separately. Structural normalization, successful retrieval, or a supportive passage is not historical approval. The Source execution-plan envelope deliberately has no fabricated baseline; it is not an approved executable correction manifest. Never pass it through a synthesizer that would mark its assertions approved until evidence review and authorized live preflight are complete.

## Verification and execution

Latest bounded bundle refresh: Node 24.22.1; actual validator returns 25 structural Source candidates / 2 quarantine / 20 Places / 23 facts / 0 historical approvals / 0 Production calls. Bundle tests **4/4 PASS**. The two new regressions fail against the prior bundle/validator (2 existing tests PASS): outdated13/14 preparation and missing per-reference historical/evidence binding guards. Exact operations and preserved evidence-record digests are pinned, and promotion/tampered fact evidence fails closed. No original Place/fact payload, Source identity or historical date is changed.

The earlier transport validation below is retained as historical context, not counted as re-executed by this bundle-only update.

Original transport validation: Node 22.23.3; dependencies installed successfully from the existing offline npm cache with lifecycle scripts disabled. Commands from repository root:

```sh
node scripts/verify-place-restoration-bundle.mjs
node tests/place-restoration-bundle.test.mjs
node tests/atlas-p13-source-place-authoring.test.mjs
node tests/atlas-identity-handler.test.mjs
node tests/core-unit12-context-object-authoring.test.mjs
```

Actual results: bundle validator 20 Places / 27 Sources / 23 facts, zero historical approvals; original bundle tests 2/2; Source/Place 11/11; identity handler 4/4; context authoring 5/5. The new transport tests failed before wiring (unsupported operation and HTTP 400) and passed after wiring. Test clients are fixtures: these results do not establish live DB state or PostgreSQL concurrency behavior. This sandbox's `node --test` child runner failed; direct Node invocation executes the same `node:test` cases. Git diff whitespace check passed.

## Exact continuation

Use this branch/PR's current head and this README first; compare only related paths with current main. Reuse the active artifact rather than recreating the patch or v10 inventory. All 27 review entries retain specific missing evidence. Resolve the two still-quarantined canonical URLs (Brazil and Cultural Egnatia) and each recorded historical/period gap. Preserve the existing findings rather than repeating resolved retrieval work. This still includes Edirne1453 versus original1452, Singapore's unsupported end year and the Ottoman1911-source/1922-endpoint gap; no date repair or fact approval is included here. Do not promote a URL or structural PASS to historical approval.

After separately authorized evidence approval and current-state preflight: approved exact Source assertions → approved `assert_place` requests → approved `create_polity_place_function` requests → separately authorized compile/read-back. Check existing IDs/keys and current absence, source-link triples, all expected Polities and exact deployed contract first. Preserve original UUIDs; facts have semantic keys and no original UUID. Failed transactions roll back; a post-commit corrective action needs its own reviewed exact-before plan, never blind deletion.

## Environment and scheduling boundary

GitHub connector reads work. Shell Git fetch failed with `Failed to connect to proxy port 8080 after 0 ms: Could not connect to server`; it was not retried or bypassed. Source was obtained through the authorized GitHub connector against the pinned main revision; this is not a successful fresh git fetch. Existing code/dependency tools and provenance skills were reused. The context tool hit `ATLAS_CONTEXT_GIT_FAILED: spawnSync git EPERM`; dependency mapping worked.

Node 22 is available at `/workspace/.atlas-tools/node_modules/.bin/node` in this session. For future environments select Node 22 and use the supported setup command `npm ci --ignore-scripts --no-audit --no-fund`. The Cloud tools expose status/diagnostics, not configuration creation or publishing. These workspace paths are not promised across future sessions; the selected environment's configuration editor must persist its runtime/setup settings and repair the proxy. No Production credentials are needed for this offline unit.

Existing automation `6ad8b51d1e2c819190ce4f39303f3dbe` was observed enabled with its existing hourly rule. Its last recorded Work result preserved v10; it does not attest scheduled Codex shell/tools. The user's later instruction forbids schedule changes, so no automation field was changed. Scheduled executor tools, durable Cloud binding and scheduled execution of this change remain UNVERIFIED. A future explicitly authorized prompt update can point the same existing task to this PR/README; no new reservation, dispatcher or automation is needed.

One executor completed integration after delegated preparation. A requested additional independent review did not run because the platform returned a usage-limit error; no retry or separate model call was made. Root source/test inspection is not reported as independent approval. Merge, deployed functionality, historical clearance and live restoration remain separate decisions.
