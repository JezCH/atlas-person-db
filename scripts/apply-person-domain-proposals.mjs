import process from "node:process";

console.error("PERSON_DOMAIN_V1_PROPOSAL_APPLY_RETIRED: pre-v2 proposal manifests are immutable review evidence and can no longer write Production. Use scripts/verify-person-domain-v2.mjs.");
process.exit(2);
