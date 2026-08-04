(() => {
  "use strict";

  const BUILD_ID = "20260804-runtime-sync-v2";
  const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function withBuildId(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("v", BUILD_ID);
    url.searchParams.set("session", SESSION_ID);
    return url.href;
  }

  async function verifyFreshResponse(path) {
    const url = withBuildId(path);
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
    return { url, text: await response.text() };
  }

  function executeScript(path, source, sourceUrl) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.text = `${source}\n//# sourceURL=${sourceUrl}`;
      script.dataset.atlasAsset = path;
      script.onload = () => resolve(path);
      try {
        document.head.appendChild(script);
        resolve(path);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function loadScript(path) {
    const { url, text } = await verifyFreshResponse(path);
    await executeScript(path, text, url);
    return path;
  }

  async function loadSeries(paths) {
    for (const path of paths) await loadScript(path);
    window.ATLAS_RUNTIME_BUILD = Object.freeze({
      buildId: BUILD_ID,
      sessionId: SESSION_ID,
      loadedAt: new Date().toISOString(),
      assets: [...paths]
    });
  }

  window.ATLAS_ASSETS = Object.freeze({
    BUILD_ID,
    SESSION_ID,
    withBuildId,
    loadScript,
    loadSeries
  });
})();
