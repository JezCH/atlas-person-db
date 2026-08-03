(() => {
  "use strict";

  const map = {
    "Gwanggaeto the Great": "광개토대왕",
    "Goguryeo": "고구려",
    "Liu Bei": "유비",
    "Zhuge Liang": "제갈량",
    "Guan Yu": "관우",
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
    "Byzantine Empire": "비잔티움 제국",
    "Leonardo da Vinci": "레오나르도 다빈치",
    "Republic of Florence": "피렌체 공화국",
    "Maximilien Robespierre": "막시밀리앙 드 로베스피에르",
    "French First Republic": "프랑스 제1공화국",
    "Owain Glyndwr": "오와인 글린두르",
    "Principality of Wales": "웨일스 공국",
    "Oliver Cromwell": "올리버 크롬웰",
    "Commonwealth of England": "잉글랜드 공화국",
    "Yasovarman IV": "야소바르만 4세",
    "Khmer Empire": "크메르 제국",
    "Narai": "나라이",
    "Ayutthaya Kingdom": "아유타야 왕국",
    "Bayinnaung": "버인나웅",
    "Toungoo Empire": "통구 제국",
    "Hadrian": "하드리아누스",
    "Vercingetorix": "베르킨게토릭스",
    "Gaul": "갈리아",
    "Idris Alooma": "이드리스 알루마",
    "Kanem-Bornu Empire": "카넴-보르누 제국",
    "Rurik": "류리크",
    "Kievan Rus'": "키이우 루스",
    "Ingólfr Arnarson": "잉골프 아르나르손",
    "Settlement of Iceland": "아이슬란드 정착기",
    "Po Ngbe": "포 응베",
    "Olmec": "올멕",
    "Akhenaten": "아크나톤",
    "New Kingdom of Egypt": "이집트 신왕국",
    "K'inich Janaab' Pakal": "킨이치 하나브 파칼",
    "Palenque": "팔랑케",
    "Minos": "미노스",
    "Minoan Crete": "미노스 크레타",
    "Agamemnon": "아가멤논",
    "Mycenaean Greece": "미케네 그리스",

    "Spanish Monarchy": "스페인 군주국",
    "Kingdom of England": "잉글랜드 왕국",
    "Kingdom of Denmark": "덴마크 왕국",
    "Kingdom of Norway": "노르웨이 왕국",
    "Holy Roman Empire": "신성 로마 제국",
    "Kingdom of Portugal": "포르투갈 왕국",
    "Peru": "페루",
    "Bolivia": "볼리비아",
    "Gran Colombia": "그란콜롬비아",
    "Kingdom of Ndongo": "은동고 왕국",
    "Kingdom of Matamba": "마탐바 왕국",
    "United Kingdom of Portugal, Brazil and the Algarves": "포르투갈·브라질·알가르브 연합왕국"
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
