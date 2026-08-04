(() => {
  "use strict";

  const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function withSession(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("session", SESSION_ID);
    return url.href;
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = withSession(path);
      script.async = false;
      script.dataset.atlasAsset = path;
      script.onload = () => resolve(path);
      script.onerror = () => reject(new Error(`Failed to load ${path}`));
      document.head.appendChild(script);
    });
  }

  async function loadSeries(paths) {
    for (const path of paths) await loadScript(path);
    window.ATLAS_RUNTIME_BUILD = Object.freeze({
      sessionId: SESSION_ID,
      loadedAt: new Date().toISOString(),
      assets: [...paths]
    });
  }

  window.ATLAS_ASSETS = Object.freeze({
    SESSION_ID,
    withSession,
    loadScript,
    loadSeries
  });
})();
