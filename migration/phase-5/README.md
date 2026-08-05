# Phase 5 — Supabase Shadow Schema

This phase prepares and validates a deployable shadow schema for normalized multilingual data while preserving `public.person_politics` unchanged and operational.

## Scope

- Build deterministic deployment and rollback SQL.
- Create `atlas_v2` objects only.
- Validate Phase 4 output coverage, load order, constraints, RLS closure, and rollback readiness.
- Do not modify UI, runtime readers, legacy JSON, locale files, or `schema.sql`.
- Do not apply to Supabase until the dry gate passes and the apply workflow is explicitly authorized.

## Baseline

- Phase 4 closing SHA: `3093cdd558e879338fdab31586eafbcf2cace217`
- Phase 4 artifact digest: `sha256:3842e7807b73238ac5f2d772ae87fea4f0e85bc338292a9883b2cc227d9345bc`
- Expected relationships: `349`
- Expected persons: `303`
- Expected polities: `211`

## Safety boundary

The dry workflow has no database credential. The apply workflow is manual-only, read-only to GitHub contents, and must abort before any SQL execution when branch, commit, artifact digest, target project, or confirmation token do not match the recorded authorization.
