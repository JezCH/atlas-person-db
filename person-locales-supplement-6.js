(() => {
  "use strict";

  const personAdditions = Object.freeze({
    "Taejo of Goryeo": "왕건"
  });

  const polityAdditions = Object.freeze({
    "Goryeo": "고려"
  });

  const current = window.ATLAS_LOCALES || {};
  const currentKo = current.ko || {};
  window.ATLAS_LOCALES = Object.freeze({
    ...current,
    ko: Object.freeze({
      ...currentKo,
      persons: Object.freeze({ ...(currentKo.persons || {}), ...personAdditions }),
      polities: Object.freeze({ ...(currentKo.polities || {}), ...polityAdditions })
    })
  });

  const fallbackMap = Object.freeze({ ...personAdditions, ...polityAdditions });
  function apply(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const value = node.nodeValue?.trim();
      if (value && fallbackMap[value]) node.nodeValue = node.nodeValue.replace(value, fallbackMap[value]);
    });
  }

  function start() {
    apply(document);
    new MutationObserver(() => apply(document)).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
