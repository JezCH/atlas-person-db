(() => {
  "use strict";

  const map = {
    "Askia Muhammad": "아스키아 무함마드",
    "Songhai Empire": "송가이 제국",
    "Ramkhamhaeng": "람캄행",
    "Sukhothai Kingdom": "수코타이 왕국",
    "Harun al-Rashid": "하룬 알 라시드",
    "Abbasid Caliphate": "아바스 칼리파국",
    "Oda Nobunaga": "오다 노부나가",
    "Oda Clan": "오다 가문",
    "Nebuchadnezzar II": "네부카드네자르 2세",
    "Neo-Babylonian Empire": "신바빌로니아 제국",
    "Harald Bluetooth": "하랄 1세 블로탄",
    "Kingdom of Denmark": "덴마크 왕국",
    "Sejong the Great": "세종대왕",
    "Joseon": "조선",
    "Haile Selassie I": "하일레 셀라시에 1세",
    "Ethiopian Empire": "에티오피아 제국",
    "Attila": "아틸라",
    "Hunnic Empire": "훈 제국",
    "Ahmad al-Mansur": "아흐마드 알 만수르",
    "Saadi Sultanate": "사아드 술탄국",
    "Enrico Dandolo": "엔리코 단돌로",
    "Republic of Venice": "베네치아 공화국",
    "Pedro II of Brazil": "페드루 2세",
    "Empire of Brazil": "브라질 제국",
    "Ashurbanipal": "아슈르바니팔",
    "Neo-Assyrian Empire": "신아시리아 제국",
    "Gajah Mada": "가자 마다",
    "Majapahit Empire": "마자파힛 제국",
    "Maria I of Portugal": "마리아 1세",
    "Kingdom of Portugal": "포르투갈 왕국",
    "Casimir III the Great": "카지미에시 3세",
    "Kingdom of Poland": "폴란드 왕국"
  };

  function apply(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const value = node.nodeValue?.trim();
      if (value && map[value]) node.nodeValue = node.nodeValue.replace(value, map[value]);
    });
  }

  const observer = new MutationObserver(() => apply(document));
  function start() {
    apply(document);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
