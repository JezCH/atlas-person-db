"use strict";

// Reviewed Person identities. Each value must resolve to exactly one current
// canonical Person. These aliases are *not* candidate-name substring guesses,
// and do not mutate atlas_v2.persons or atlas_v2.person_names.
const REVIEWED_REGISTRATION_ALIASES=Object.freeze([
  // Verified ORIGINAL history-YouTube source-first identity review:
  // B024 raw historical names DO NOT become new Persons when these exact
  // aliases resolve to the registered canonical historical individuals.
  // Source reviewed: audits/youtube-b024-source-first-36-final-registered-identity-review.json
  // Production Person UUID confirmation re-checked 2026-10-11.
  Object.freeze({alias_name:"Imam Bukhari",canonical_key:"Al-Bukhari",representative_default:false}),
  Object.freeze({alias_name:"Imam Malik",canonical_key:"Malik ibn Anas",representative_default:false}),
  Object.freeze({alias_name:"King Leonidas",canonical_key:"Leonidas I",representative_default:false}),
  // Verified 2026-10-10 live Person identity Muhammad Ali Jinnah:
  // honorific Quaid-e-Azam variants are NOT new Person registrations.
  Object.freeze({alias_name:"Quaid-e-Azam Muhammad Ali Jinnah",canonical_key:"Muhammad Ali Jinnah",representative_default:true}),
  Object.freeze({alias_name:"Quaid e Azam Muhammad Ali Jinnah",canonical_key:"Muhammad Ali Jinnah",representative_default:true}),
  // Live Production Person-UUID matches for 51-row filtered YouTube audit, 2026-10-09.
  // Full 6,358-label Production audit: 38 additionally verified canonical UUID targets.
  Object.freeze({alias_name:"Al-Jazari",canonical_key:"Ismail al-Jazari",representative_default:true}),
  Object.freeze({alias_name:"Bismarck",canonical_key:"Otto von Bismarck",representative_default:true}),
  Object.freeze({alias_name:"Botticelli",canonical_key:"Sandro Botticelli",representative_default:true}),
  Object.freeze({alias_name:"Churchill",canonical_key:"Winston Churchill",representative_default:true}),
  Object.freeze({alias_name:"Columbus",canonical_key:"Christopher Columbus",representative_default:true}),
  Object.freeze({alias_name:"Copernicus",canonical_key:"Nicolaus Copernicus",representative_default:true}),
  Object.freeze({alias_name:"Crassus",canonical_key:"Marcus Licinius Crassus",representative_default:true}),
  Object.freeze({alias_name:"Descartes",canonical_key:"René Descartes",representative_default:true}),
  Object.freeze({alias_name:"Edison",canonical_key:"Thomas Edison",representative_default:true}),
  Object.freeze({alias_name:"Eisenhower",canonical_key:"Dwight D. Eisenhower",representative_default:true}),
  Object.freeze({alias_name:"Freud",canonical_key:"Sigmund Freud",representative_default:true}),
  Object.freeze({alias_name:"Gaddafi",canonical_key:"Muammar Gaddafi",representative_default:true}),
  Object.freeze({alias_name:"Galileo",canonical_key:"Galileo Galilei",representative_default:true}),
  Object.freeze({alias_name:"Heidegger",canonical_key:"Martin Heidegger",representative_default:true}),
  Object.freeze({alias_name:"JFK",canonical_key:"John F. Kennedy",representative_default:true}),
  Object.freeze({alias_name:"Kafka",canonical_key:"Franz Kafka",representative_default:true}),
  Object.freeze({alias_name:"Khomeini",canonical_key:"Ruhollah Khomeini",representative_default:true}),
  Object.freeze({alias_name:"Lincoln",canonical_key:"Abraham Lincoln",representative_default:true}),
  Object.freeze({alias_name:"Machiavelli",canonical_key:"Niccolo Machiavelli",representative_default:true}),
  Object.freeze({alias_name:"Magellan",canonical_key:"Ferdinand Magellan",representative_default:true}),
  Object.freeze({alias_name:"Mandela",canonical_key:"Nelson Mandela",representative_default:true}),
  Object.freeze({alias_name:"Mendeleev",canonical_key:"Dmitri Mendeleev",representative_default:true}),
  Object.freeze({alias_name:"Metternich",canonical_key:"Klemens von Metternich",representative_default:true}),
  Object.freeze({alias_name:"Mussolini",canonical_key:"Benito Mussolini",representative_default:true}),
  Object.freeze({alias_name:"Newton",canonical_key:"Isaac Newton",representative_default:true}),
  Object.freeze({alias_name:"Prophet Muhammad",canonical_key:"Muhammad",representative_default:false}),
  Object.freeze({alias_name:"Puccini",canonical_key:"Giacomo Puccini",representative_default:true}),
  Object.freeze({alias_name:"Ramanujan",canonical_key:"Srinivasa Ramanujan",representative_default:true}),
  Object.freeze({alias_name:"Robespierre",canonical_key:"Maximilien Robespierre",representative_default:true}),
  Object.freeze({alias_name:"Rommel",canonical_key:"Erwin Rommel",representative_default:true}),
  Object.freeze({alias_name:"Rousseau",canonical_key:"Jean-Jacques Rousseau",representative_default:true}),
  Object.freeze({alias_name:"Seneca",canonical_key:"Lucius Annaeus Seneca",representative_default:true}),
  Object.freeze({alias_name:"Sulla",canonical_key:"Lucius Cornelius Sulla",representative_default:true}),
  Object.freeze({alias_name:"Tolkien",canonical_key:"J. R. R. Tolkien",representative_default:true}),
  Object.freeze({alias_name:"Trotsky",canonical_key:"Leon Trotsky",representative_default:true}),
  Object.freeze({alias_name:"Vivaldi",canonical_key:"Antonio Vivaldi",representative_default:true}),
  Object.freeze({alias_name:"Wagner",canonical_key:"Richard Wagner",representative_default:true}),
  Object.freeze({alias_name:"Zhukov",canonical_key:"Georgy Zhukov",representative_default:true}),
  Object.freeze({alias_name:"Rasputin",canonical_key:"Grigori Rasputin"}),
  Object.freeze({alias_name:"Buddha",canonical_key:"Gautama Buddha",representative_default:true}),
  Object.freeze({alias_name:"Ivan the Terrible",canonical_key:"Ivan IV"}),
  Object.freeze({alias_name:"Haile Selassie",canonical_key:"Haile Selassie I"}),
  Object.freeze({alias_name:"Sun Tzu",canonical_key:"Sun Wu",representative_default:true}),
  Object.freeze({alias_name:"Ashoka the Great",canonical_key:"Ashoka"}),
  Object.freeze({alias_name:"Nietzsche",canonical_key:"Friedrich Nietzsche"}),
  Object.freeze({alias_name:"Thales of Miletus",canonical_key:"Thales"}),
  Object.freeze({alias_name:"Cicero",canonical_key:"Marcus Tullius Cicero"}),
  Object.freeze({alias_name:"Napoleon Bonaparte",canonical_key:"Napoleon I"}),
  Object.freeze({alias_name:"Avicenna",canonical_key:"Ibn Sina"}),
  Object.freeze({alias_name:"Queen Victoria",canonical_key:"Victoria"}),
  Object.freeze({alias_name:"Queen Elizabeth II",canonical_key:"Elizabeth II"}),
  Object.freeze({alias_name:"Shaka Zulu",canonical_key:"Shaka kaSenzangakhona"}),
  Object.freeze({alias_name:"Attila the Hun",canonical_key:"Attila"}),
  Object.freeze({alias_name:"Richard the Lionheart",canonical_key:"Richard I"}),
  Object.freeze({alias_name:"Vlad the Impaler",canonical_key:"Vlad III"}),
  Object.freeze({alias_name:"Constantine the Great",canonical_key:"Constantine I"}),
  Object.freeze({alias_name:"Suleiman the Magnificent",canonical_key:"Suleiman I"}),
  Object.freeze({alias_name:"Emperor Hirohito",canonical_key:"Hirohito"}),
  Object.freeze({alias_name:"Robert Oppenheimer",canonical_key:"J. Robert Oppenheimer"}),
  Object.freeze({alias_name:"Saint Augustine",canonical_key:"Augustine of Hippo"}),
  Object.freeze({alias_name:"Queen Nzinga",canonical_key:"Nzinga Mbande"}),
  Object.freeze({alias_name:"Frederick the Great",canonical_key:"Frederick II of Prussia"}),
  Object.freeze({alias_name:"Ragnar Lothbrok",canonical_key:"Ragnar Lodbrok"}),
  Object.freeze({alias_name:"Alexander",canonical_key:"Alexander the Great",representative_default:true}),
  Object.freeze({alias_name:"Beethoven",canonical_key:"Ludwig van Beethoven",representative_default:true}),
  Object.freeze({alias_name:"Caesar",canonical_key:"Julius Caesar",representative_default:true}),
  Object.freeze({alias_name:"Cleopatra",canonical_key:"Cleopatra VII",representative_default:true}),
  Object.freeze({alias_name:"Da Vinci",canonical_key:"Leonardo da Vinci",representative_default:true}),
  Object.freeze({alias_name:"Darwin",canonical_key:"Charles Darwin",representative_default:true}),
  Object.freeze({alias_name:"Einstein",canonical_key:"Albert Einstein",representative_default:true}),
  Object.freeze({alias_name:"Gandhi",canonical_key:"Mahatma Gandhi",representative_default:true}),
  Object.freeze({alias_name:"Hannibal",canonical_key:"Hannibal Barca",representative_default:true}),
  Object.freeze({alias_name:"Hitler",canonical_key:"Adolf Hitler",representative_default:true}),
  Object.freeze({alias_name:"Lenin",canonical_key:"Vladimir Lenin",representative_default:true}),
  Object.freeze({alias_name:"Leonardo",canonical_key:"Leonardo da Vinci",representative_default:true}),
  Object.freeze({alias_name:"Mao",canonical_key:"Mao Zedong",representative_default:true}),
  Object.freeze({alias_name:"Mozart",canonical_key:"Wolfgang Amadeus Mozart",representative_default:true}),
  Object.freeze({alias_name:"Napoleon",canonical_key:"Napoleon I",representative_default:true}),
  Object.freeze({alias_name:"Oppenheimer",canonical_key:"J. Robert Oppenheimer",representative_default:true}),
  Object.freeze({alias_name:"Shakespeare",canonical_key:"William Shakespeare",representative_default:true}),
  Object.freeze({alias_name:"Stalin",canonical_key:"Joseph Stalin",representative_default:true}),
  Object.freeze({alias_name:"Van Gogh",canonical_key:"Vincent van Gogh",representative_default:true}),
  Object.freeze({alias_name:"Washington",canonical_key:"George Washington",representative_default:true})
]);

const REVIEWED_REPRESENTATIVE_ALIASES=Object.freeze(
  REVIEWED_REGISTRATION_ALIASES.filter(entry=>entry.representative_default===true)
);


function sqlLiteral(value) {
  return "'"+String(value).replaceAll("'","''")+"'";
}

function reviewedPersonAliasesValuesSql() {
  return "values "+REVIEWED_REGISTRATION_ALIASES
    .map(({alias_name,canonical_key})=>"("+sqlLiteral(alias_name)+","+sqlLiteral(canonical_key)+")")
    .join(",\n    ");
}

module.exports=Object.freeze({REVIEWED_REGISTRATION_ALIASES,REVIEWED_REPRESENTATIVE_ALIASES,reviewedPersonAliasesValuesSql});
