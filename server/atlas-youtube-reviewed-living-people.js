"use strict";

/**
 * Verified/reviewed living public-figure defaults. This is an intentionally
 * short, exact-label exception set: no surname substring or regex prefix
 * matches. Do not assume an absent Wikidata death property means verified alive.
 *
 * Last reviewed 2026-10-09. Entries expire after 90 days to avoid permanently
 * misclassifying a person who may subsequently have died. The fallback
 * provider handles all names not covered by this current-evidence cache.
 *
 * Evidence for reported Musk/Trump false negatives:
 * Reuters 2026-10-07 https://www.reuters.com/business/media-telecom/trump-expected-award-science-medal-spacexs-elon-musk-fox-news-reports-2026-10-07/
 * Reuters 2026-10-04 https://www.reuters.com/business/media-telecom/musk-says-he-will-rename-spacexai-spacexsi-2026-10-04/
 * White House 2026-10-05 https://www.whitehouse.gov/gallery/departure-and-arrival-october-5-2026/
 *
 * Other entries are conservative editorial defaults for living, widely
 * documented contemporaries, not a full life-status authority.
 */
const REVIEWED_AS_OF="2026-10-09";
const REVIEW_EXPIRES_AT="2027-01-09T00:00:00.000Z";
const REVIEWED_LIVING_NAMES=Object.freeze([
  "Angelina Jolie",
  "Arnold Schwarzenegger",
  "Barack Obama",
  "Barron Trump",
  "Benjamin Netanyahu",
  "Beyoncé",
  "Biden",
  "Bill Clinton",
  "Bill Gates",
  "Cristiano Ronaldo",
  "Cristiano Ronaldo dos Santos Aveiro",
  "Dolly Parton",
  "Donald Trump",
  "Elon Musk",
  "Giorgia Meloni",
  "Hillary Clinton",
  "Ibrahim Traoré",
  "Imran Khan",
  "Ivanka Trump",
  "Jack Ma",
  "Jeff Bezos",
  "Jeffrey Bezos",
  "Jensen Huang",
  "Joe Biden",
  "Johnny Depp",
  "Justin Bieber",
  "Kamala Harris",
  "Keanu Reeves",
  "Kim Jong-un",
  "LeBron James",
  "Leonardo DiCaprio",
  "Lionel Messi",
  "Madonna",
  "Malala Yousafzai",
  "Mark Zuckerberg",
  "Melania Trump",
  "Melinda Gates",
  "Messi",
  "Michael Jordan",
  "Michelle Obama",
  "MrBeast",
  "Narendra Modi",
  "Obama",
  "Oprah Winfrey",
  "President Donald Trump",
  "President Trump",
  "Putin",
  "Ronaldo",
  "Satya Nadella",
  "Selena Gomez",
  "Sundar Pichai",
  "Sylvester Stallone",
  "Taylor Swift",
  "Tiger Woods",
  "Tom Cruise",
  "Trump",
  "Virat Kohli",
  "Vladimir Putin",
  "Will Smith",
  "Xi Jinping"
]);

function normalizeLivingName(value) {
  return String(value??"").normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/\p{M}/gu,"")
    .replace(/[^a-z0-9가-힣]/g,"");
}
const REVIEWED_KEYS=new Set(REVIEWED_LIVING_NAMES.map(normalizeLivingName));
if(REVIEWED_KEYS.size!==REVIEWED_LIVING_NAMES.length) {
  throw new Error("Duplicate verified living-name identity key");
}

function reviewedLivingStatus(name,now=Date.now()) {
  if(!Number.isFinite(now)||now>=Date.parse(REVIEW_EXPIRES_AT)) return null;
  const key=normalizeLivingName(name);
  if(!key || !REVIEWED_KEYS.has(key)) return null;
  return Object.freeze({name,status:"living_likely",wikidata_id:null,
    evidence_type:"reviewed_living_public_figure",reviewed_as_of:REVIEWED_AS_OF});
}

module.exports=Object.freeze({REVIEWED_AS_OF,REVIEW_EXPIRES_AT,REVIEWED_LIVING_NAMES,
  normalizeLivingName,reviewedLivingStatus});
