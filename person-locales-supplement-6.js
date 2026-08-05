(() => {
  "use strict";

  const personAdditions = Object.freeze({
    "Taejo of Goryeo": "왕건",
    "Gustav II Adolf": "구스타브 2세 아돌프",
    "Yasovarman I": "야소바르만 1세",
    "Chulalongkorn": "쭐랄롱꼰",
    "Aung San Suu Kyi": "아웅 산 수 치",
    "Parameswara": "파라메스와라",
    "Tun Perak": "툰 페락",
    "Dayang Kalangitan": "다양 칼랑이탄"
  });

  const polityAdditions = Object.freeze({
    "Goryeo": "고려",
    "Sweden": "스웨덴",
    "Khmer Empire": "크메르 제국",
    "Kingdom of Siam": "시암 왕국",
    "Myanmar": "미얀마",
    "Malacca Sultanate": "말라카 술탄국",
    "Kingdom of Tondo": "톤도 왕국"
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
