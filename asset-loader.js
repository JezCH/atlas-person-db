(() => {
  "use strict";

  const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const LOCALIZATION_ASSET = "./atlas-ui-localization.js";

  function withSession(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("session", SESSION_ID);
    return url.href;
  }

  function rawLoadScript(path) {
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

  const localizationReady = window.ATLAS_UI_I18N
    ? Promise.resolve(LOCALIZATION_ASSET)
    : rawLoadScript(LOCALIZATION_ASSET);

  async function loadScript(path) {
    if (path !== LOCALIZATION_ASSET) await localizationReady;
    return rawLoadScript(path);
  }

  async function loadSeries(paths) {
    await localizationReady;
    for (const path of paths) await rawLoadScript(path);
    window.ATLAS_RUNTIME_BUILD = Object.freeze({
      sessionId: SESSION_ID,
      loadedAt: new Date().toISOString(),
      assets: [LOCALIZATION_ASSET, ...paths]
    });
  }

  window.ATLAS_ASSETS = Object.freeze({
    SESSION_ID,
    LOCALIZATION_ASSET,
    localizationReady,
    withSession,
    loadScript,
    loadSeries
  });
})();