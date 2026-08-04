(() => {
  "use strict";

  const BUILD_ID = "20260804-asset-sync-v1";

  function withBuildId(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("v", BUILD_ID);
    return url.href;
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = withBuildId(path);
      script.async = false;
      script.onload = () => resolve(path);
      script.onerror = () => reject(new Error(`Failed to load ${path}`));
      document.head.appendChild(script);
    });
  }

  async function loadSeries(paths) {
    for (const path of paths) await loadScript(path);
  }

  window.ATLAS_ASSETS = Object.freeze({
    BUILD_ID,
    withBuildId,
    loadSeries
  });
})();
