(() => {
  "use strict";

  const koNames = {
    "Constantine I": "콘스탄티누스 1세",
    "Justinian I": "유스티니아누스 1세",
    "Belisarius": "벨리사리우스",
    "Yi Sun-sin": "이순신",
    "Julius Caesar": "율리우스 카이사르",
    "Frederick the Great": "프리드리히 대왕",
    "Hammurabi": "함무라비",
    "Ramses II": "람세스 2세",
    "Abraham Lincoln": "에이브러햄 링컨",
    "Alexander the Great": "알렉산더 대왕",
    "Mahatma Gandhi": "마하트마 간디",
    "Joseph Stalin": "이오시프 스탈린",
    "Shaka kaSenzangakhona": "샤카 카센장가코나",
    "Tokugawa Ieyasu": "도쿠가와 이에야스",
    "Napoleon I": "나폴레옹 1세"
  };

  function localizeTextNode(node) {
    const value = node.nodeValue?.trim();
    if (!value || !koNames[value]) return;
    node.nodeValue = node.nodeValue.replace(value, koNames[value]);
  }

  function localizeTree(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(localizeTextNode);
  }

  function applyLocalization() {
    localizeTree(document.getElementById("dataBody"));
    localizeTree(document.getElementById("detailPanel"));
  }

  const observer = new MutationObserver(applyLocalization);

  function start() {
    applyLocalization();
    const targets = [document.getElementById("dataBody"), document.getElementById("detailPanel")].filter(Boolean);
    targets.forEach((target) => observer.observe(target, { childList: true, subtree: true, characterData: true }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.ATLAS_PERSON_LOCALES = Object.freeze({ ko: Object.freeze(koNames) });
})();
