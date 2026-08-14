// Compatibility CI entrypoint. The full 54-target rehearsal is dependency-aware
// and implemented in the scheduled runner so reviewed survivor mutations can
// precede dependent retire operations without weakening atomic manifests.
import './rehearse-stage2-p6-full-54-scheduled.mjs';
