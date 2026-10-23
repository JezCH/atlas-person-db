---
name: atlas-code-intelligence
description: Locate exact code symbols, literal relative module importers, potential affected consumers and related tests.
---

# ATLAS code intelligence

1. Search one exact symbol with `node scripts/atlas-agent-context.mjs --query 'symbolName'`.
2. Inspect the exact source file; run `node scripts/atlas-agent-dependency-map.mjs --path scripts/example.mjs` to find tracked literal imports, direct and two-hop reverse importers, and candidate tests.
3. **Limit:** This is not an AST parser, function-call graph, route/DB dependency proof or test-coverage report. Dynamic or computed imports, aliasing and template-interpolated module paths may be missing. Inspect cited files directly.
4. Review affected source and actual tests before changing anything; keep the smallest touch set and follow `WORK_EXECUTION.md`. Existing verified experience is advisory only.
