(() => {
  "use strict";

  const persons = {
    "Henry VIII": "헨리 8세",
    "Louis XIV": "루이 14세",
    "Joan of Arc": "잔 다르크",
    "Maria Theresa": "마리아 테레지아",
    "Indira Gandhi": "인디라 간디",
    "Hippolyta": "히폴리타",
    "Himiko": "히미코",
    "Börte": "보르테",
    "Eleanor Roosevelt": "엘리너 루스벨트",
    "Xerxes I": "크세르크세스 1세",
    "Livia Drusilla": "리비아 드루실라",
    "Vladimir Lenin": "블라디미르 레닌",
    "Catherine II": "예카테리나 2세",
    "Sitting Bull": "타탕카 이요탕카(시팅 불)",
    "Sacagawea": "사카가위아",
    "Philip II of Spain": "펠리페 2세",
    "Isabella I of Castile": "카스티야의 이사벨 1세",
    "Cnut the Great": "크누트 대왕",
    "Gunnhild Konungamóðir": "군느힐드 코눙가모디르",
    "Otto von Bismarck": "오토 폰 비스마르크",
    "Hiawatha": "히아와타",
    "Ragnar Lodbrok": "라그나르 로드브로크",
    "Abu Bakr": "아부 바크르",
    "Osman I": "오스만 1세",
    "Brennus (Senones)": "브렌누스(세노네스)",
    "Brennus (Galatia)": "브렌누스(갈리아 원정)",
    "William I of Orange": "오라녜 공 빌럼 1세",
    "Chan Imix Kʼawiil": "찬 이믹스 카윌",
    "Theodora": "테오도라",
    "Gilgamesh": "길가메시",
    "Pachacuti": "파차쿠티",
    "Henry the Navigator": "인판트 동 엔히크",
    "Mursili I": "무르실리 1세",
    "Charles V": "카를 5세",
    "Pericles": "페리클레스",
    "Peter I": "표트르 1세",
    "Augustus": "아우구스투스",
    "Mansa Musa": "만사 무사",
    "Kublai Khan": "쿠빌라이 칸",
    "George Washington": "조지 워싱턴",
    "Franklin D. Roosevelt": "프랭클린 D. 루스벨트",
    "Saladin": "살라딘",
    "Hatshepsut": "하트셉수트",
    "Ashoka": "아소카",
    "Victoria": "빅토리아 여왕",
    "Winston Churchill": "윈스턴 처칠",
    "Huayna Capac": "우아이나 카팍",
    "Cyrus the Great": "키루스 대왕",
    "Darius I": "다리우스 1세",
    "Charles de Gaulle": "샤를 드골",
    "Mehmed II": "메흐메트 2세",
    "Suleiman I": "술레이만 1세",
    "Charlemagne": "카롤루스 대제",
    "Zara Yaqob": "자라 야콥",
    "Suryavarman II": "수리야바르만 2세",
    "João II of Portugal": "주앙 2세"
  };

  const polities = {
    "Kingdom of France": "프랑스 왕국",
    "Habsburg Monarchy": "합스부르크 군주국",
    "India": "인도",
    "Amazons": "아마존족",
    "Yamatai": "야마타이국",
    "Achaemenid Empire": "아케메네스 제국",
    "Soviet Russia": "소비에트 러시아",
    "Russian Empire": "러시아 제국",
    "Lakota": "라코타",
    "Lemhi Shoshone": "렘히 쇼쇼니",
    "Spanish Empire": "스페인 제국",
    "Crown of Castile": "카스티야 왕국",
    "North Sea Empire": "북해 제국",
    "Kingdom of Norway": "노르웨이 왕국",
    "German Empire": "독일 제국",
    "Haudenosaunee Confederacy": "하우데노사우니 연맹",
    "Rashidun Caliphate": "라시둔 칼리파국",
    "Ottoman Empire": "오스만 제국",
    "Senones": "세노네스",
    "Gallic Coalition": "갈리아 연합",
    "Dutch Revolt": "네덜란드 독립전쟁",
    "Copán": "코판",
    "Inca Empire": "잉카 제국",
    "Kingdom of Portugal": "포르투갈 왕국",
    "Hittite Kingdom": "히타이트 왕국",
    "Holy Roman Empire": "신성 로마 제국",
    "Scandinavia": "스칸디나비아",
    "Uruk": "우루크",
    "Athens": "아테네",
    "Mali Empire": "말리 제국",
    "Yuan Dynasty": "원나라",
    "Ayyubid Sultanate": "아이유브 술탄국",
    "Maurya Empire": "마우리아 제국",
    "United Kingdom": "영국",
    "French Fifth Republic": "프랑스 제5공화국",
    "Carolingian Empire": "카롤링거 제국",
    "Ethiopian Empire": "에티오피아 제국",
    "Khmer Empire": "크메르 제국"
  };

  const map = { ...persons, ...polities };

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
