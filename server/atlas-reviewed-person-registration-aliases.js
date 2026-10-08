"use strict";

// Reviewed Person identities. Each value must resolve to exactly one current
// canonical Person. These aliases are *not* candidate-name substring guesses,
// and do not mutate atlas_v2.persons or atlas_v2.person_names.
const REVIEWED_REGISTRATION_ALIASES=Object.freeze([
  Object.freeze({alias_name:"Napoleon Bonaparte",canonical_key:"Napoleon I"}),
  Object.freeze({alias_name:"Avicenna",canonical_key:"Ibn Sina"}),
  Object.freeze({alias_name:"Queen Victoria",canonical_key:"Victoria"}),
  Object.freeze({alias_name:"Queen Elizabeth II",canonical_key:"Elizabeth II"}),
  Object.freeze({alias_name:"Shaka Zulu",canonical_key:"Shaka kaSenzangakhona"}),
  Object.freeze({alias_name:"Attila the Hun",canonical_key:"Attila"}),
  Object.freeze({alias_name:"Richard the Lionheart",canonical_key:"Richard I"}),
  Object.freeze({alias_name:"Vlad the Impaler",canonical_key:"Vlad III"})
]);

function sqlLiteral(value) {
  return "'"+String(value).replaceAll("'","''")+"'";
}

function reviewedPersonAliasesValuesSql() {
  return "values "+REVIEWED_REGISTRATION_ALIASES
    .map(({alias_name,canonical_key})=>"("+sqlLiteral(alias_name)+","+sqlLiteral(canonical_key)+")")
    .join(",\n    ");
}

module.exports=Object.freeze({REVIEWED_REGISTRATION_ALIASES,reviewedPersonAliasesValuesSql});
