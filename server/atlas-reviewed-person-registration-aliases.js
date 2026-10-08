"use strict";

// Reviewed Person identities. Each value must resolve to exactly one current
// canonical Person. These aliases are *not* candidate-name substring guesses,
// and do not mutate atlas_v2.persons or atlas_v2.person_names.
const REVIEWED_REGISTRATION_ALIASES=Object.freeze([
  // Live Production Person-UUID matches for 51-row filtered YouTube audit, 2026-10-09.
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
