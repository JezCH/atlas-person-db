(() => {
  "use strict";

  const result = Object.freeze({
    changed: 0,
    skipped: true,
    reason: "superseded-by-c6-direct-normalized-read",
    controller_state: "retired-from-page-load",
    v2_committed: false
  });

  window.ATLAS_RECONCILE_PROMISE = Promise.resolve(result).then((value) => {
    window.dispatchEvent(new CustomEvent("atlas:reconciled", { detail: value }));
    return value;
  });
})();
