(() => {
  "use strict";

  const map = {
    "Gwanggaeto the Great": "광개토대왕",
    "Goguryeo": "고구려",
    "Liu Bei": "유비",
    "Zhuge Liang": "제갈량",
    "Shu Han": "촉한",
    "Emperor Gaozu of Han": "한고조(유방)",
    "Western Han": "전한",
    "Sophia Duleep Singh": "소피아 둘립 싱",
    "United Kingdom": "영국",
    "Subhas Chandra Bose": "수바스 찬드라 보스",
    "Provisional Government of Free India": "자유 인도 임시정부",
    "Solomon": "솔로몬",
    "Kingdom of Israel": "이스라엘 왕국",
    "Hypatia": "히파티아",
    "Roman Empire": "로마 제국",
    "Leonardo da Vinci": "레오나르도 다빈치",
    "Republic of Florence": "피렌체 공화국",
    "Maximilien Robespierre": "막시밀리앙 드 로베스피에르",
    "French First Republic": "프랑스 제1공화국",
    "Owain Glyndwr": "오와인 글린두르",
    "Principality of Wales": "웨일스 공국",
    "Oliver Cromwell": "올리버 크롬웰",
    "Commonwealth of England": "잉글랜드 공화국",
    "Yasovarman IV": "야소바르만 4세",
    "Khmer Empire": "크메르 제국"
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
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
