(() => {
  "use strict";
  async function run() {
    try {
      const response = await fetch(`/api/run-ingest-3-7f4c9a?v=${Date.now()}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      console.log("ATLAS supplement 3 server ingestion", result);
      if (response.ok && Number(result.inserted || 0) > 0 && !sessionStorage.getItem("atlas-supplement-3-server-reload")) {
        sessionStorage.setItem("atlas-supplement-3-server-reload", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS supplement 3 server ingestion failed", error);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
})();
