(() => {
  "use strict";

  const map = {
    "Gorgo of Sparta": "고르고 왕비",
    "Sparta": "스파르타",
    "Harald Hardrada": "하랄 3세 하르드라다",
    "Kingdom of Norway": "노르웨이 왕국",
    "Frederick I Barbarossa": "프리드리히 1세 바르바로사",
    "Holy Roman Empire": "신성 로마 제국",
    "Trajan": "트라야누스",
    "Roman Empire": "로마 제국",
    "Theodore Roosevelt": "시어도어 루스벨트",
    "United States": "미국",
    "Tomyris": "토미리스",
    "Massagetae": "마사게타이",
    "Hojo Tokimune": "호조 도키무네",
    "Kamakura Shogunate": "가마쿠라 막부",
    "Afonso I of Kongo": "은징가 음벰바(아폰수 1세)",
    "Kingdom of Kongo": "콩고 왕국",
    "Catherine de' Medici": "카트린 드 메디시스",
    "Kingdom of France": "프랑스 왕국",
    "Jadwiga of Poland": "야드비가",
    "John Curtin": "존 커틴",
    "Commonwealth of Australia": "오스트레일리아 연방",
    "Amanitore": "아마니토레",
    "Kingdom of Kush": "쿠시 왕국",
    "Jayavarman VII": "자야바르만 7세",
    "Khmer Empire": "크메르 제국",
    "Gitarja": "기타르자",
    "Wilhelmina of the Netherlands": "빌헬미나 여왕",
    "Kingdom of the Netherlands": "네덜란드 왕국",
    "Leftraru": "레프트라루",
    "Mapuche": "마푸체",
    "Robert the Bruce": "로버트 1세",
    "Kingdom of Scotland": "스코틀랜드 왕국",
    "Chandragupta Maurya": "찬드라굽타 마우리아",
    "Maurya Empire": "마우리아 제국",
    "Tamar of Georgia": "타마르",
    "Kingdom of Georgia": "조지아 왕국",
    "Poundmaker": "파운드메이커",
    "Cree": "크리",
    "Matthias Corvinus": "마차시 1세",
    "Kingdom of Hungary": "헝가리 왕국",
    "Kupe": "쿠페",
    "Maori": "마오리",
    "Wilfrid Laurier": "윌프리드 로리에",
    "Dominion of Canada": "캐나다 자치령",
    "Christina of Sweden": "크리스티나 여왕",
    "Swedish Empire": "스웨덴 제국",
    "Eleanor of Aquitaine": "엘레오노르 다키텐",
    "Duchy of Aquitaine": "아키텐 공국",
    "Wak Chanil Ajaw": "왁 차닐 아하우",
    "Naranjo": "나란호",
    "Simon Bolivar": "시몬 볼리바르",
    "Gran Colombia": "그란콜롬비아",
    "Menelik II": "메넬리크 2세",
    "Basil II": "바실리오스 2세",
    "Byzantine Empire": "비잔티움 제국",
    "Ambiorix": "암비오릭스",
    "Eburones": "에부로네스족",
    "Lady Trieu": "조구(趙嫗)",
    "Jiaozhi resistance": "교주 저항 세력",
    "John III of Portugal": "주앙 3세",
    "Ludwig II of Bavaria": "루트비히 2세",
    "Kingdom of Bavaria": "바이에른 왕국",
    "Sundiata Keita": "순자타 케이타",
    "Mali Empire": "말리 제국",
    "Yongle Emperor": "영락제",
    "Ming dynasty": "명나라",
    "Nzinga Mbande": "은징가 음반데",
    "Kingdoms of Ndongo and Matamba": "은동고-마탐바 왕국",
    "Nader Shah": "나디르 샤",
    "Afsharid Iran": "아프샤르 왕조"
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
