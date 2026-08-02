(() => {
  "use strict";

  const koPersons = {
    "Constantine I": "콘스탄티누스 1세",
    "Justinian I": "유스티니아누스 1세",
    "Belisarius": "벨리사리우스",
    "Wu Zetian": "측천무후",
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
    "Napoleon I": "나폴레옹 1세",
    "Moctezuma II": "몬테수마 2세",
    "Mao Zedong": "마오쩌둥",
    "Elizabeth I": "엘리자베스 1세",
    "Genghis Khan": "칭기즈 칸",
    "Hannibal Barca": "한니발 바르카",
    "Cleopatra VII": "클레오파트라 7세",
    "Dido": "디도",
    "Cunobeline": "쿠노벨리누스",
    "Boudica": "부디카"
  };

  const koPolities = {
    "Roman Empire": "로마 제국",
    "Byzantine Empire": "비잔티움 제국",
    "Wu Zhou": "무주",
    "Joseon": "조선",
    "Roman Republic": "로마 공화정",
    "Kingdom of Prussia": "프로이센 왕국",
    "Old Babylonian Empire": "고바빌로니아 제국",
    "New Kingdom of Egypt": "이집트 신왕국",
    "Ptolemaic Kingdom": "프톨레마이오스 왕국",
    "United States": "미국",
    "Macedonian Empire": "마케도니아 제국",
    "British Raj": "영국령 인도",
    "Soviet Union": "소련",
    "Zulu Kingdom": "줄루 왕국",
    "Tokugawa Shogunate": "도쿠가와 막부",
    "First French Empire": "프랑스 제1제국",
    "Aztec Empire": "아즈텍 제국",
    "People's Republic of China": "중화인민공화국",
    "Kingdom of England": "잉글랜드 왕국",
    "Mongol Empire": "몽골 제국",
    "Carthage": "카르타고",
    "Catuvellauni": "카투벨라우니",
    "Iceni": "이케니"
  };

  const koDisplay = Object.freeze({ ...koPersons, ...koPolities });

  function localizeTextNode(node) {
    const value = node.nodeValue?.trim();
    if (!value || !koDisplay[value]) return;
    node.nodeValue = node.nodeValue.replace(value, koDisplay[value]);
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
    localizeTree(document.getElementById("politicFilter"));
  }

  const observer = new MutationObserver(applyLocalization);

  function start() {
    applyLocalization();
    const targets = [
      document.getElementById("dataBody"),
      document.getElementById("detailPanel"),
      document.getElementById("politicFilter")
    ].filter(Boolean);
    targets.forEach((target) => observer.observe(target, { childList: true, subtree: true, characterData: true }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.ATLAS_LOCALES = Object.freeze({
    ko: Object.freeze({
      persons: Object.freeze(koPersons),
      polities: Object.freeze(koPolities)
    })
  });
})();
