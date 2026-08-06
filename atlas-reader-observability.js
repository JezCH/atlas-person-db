(() => {
  "use strict";

  const state = {
    last: null,
    history: []
  };

  function sanitize(input = {}) {
    const event = Object.freeze({
      marker: "ATLAS_READER_OUTCOME",
      requested_source: String(input.requested_source || "legacy"),
      effective_source: String(input.effective_source || "legacy"),
      fallback: Boolean(input.fallback),
      row_count: Number.isInteger(Number(input.row_count)) ? Number(input.row_count) : 0,
      validation_failures: Number.isInteger(Number(input.validation_failures)) ? Number(input.validation_failures) : 0,
      timestamp: new Date(input.timestamp || Date.now()).toISOString()
    });
    return event;
  }

  function record(input) {
    const event = sanitize(input);
    state.last = event;
    state.history.push(event);
    if (state.history.length > 20) state.history.shift();
    window.dispatchEvent(new CustomEvent("atlas:reader-outcome", { detail: event }));
    return event;
  }

  function getLast() {
    return state.last;
  }

  function getHistory() {
    return [...state.history];
  }

  window.AtlasReaderObservability = Object.freeze({ record, sanitize, getLast, getHistory });
})();
