# Bounded integrated Codex launch anchor

Task ID: atlas-integrated-root-20261020

Documentation-only launcher; DO NOT MERGE. The authorized dispatcher may issue one code-fix request for scripts/person-domain-authoring-origin.mjs and tests/atlas-person-domain-authoring-origin.test.mjs. The source's root-required guard currently runs after path.resolve, which turns an omitted/empty root into cwd. Require an explicit nonempty string root before path resolution; preserve valid explicit root behavior. No historical data/Production changes.

The dispatcher must verify exact source/test snapshot parity with current main before invoking Codex. Output only the bounded patch protocol in the App response. No fetch, push, credentials, recurring calls, Production/Supabase/Vercel, or automatic merge. This launcher is not the resulting code fix.
