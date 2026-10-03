"use strict";
const {verifyGitHubActionsOidcWithPolicy,verifyTrustClaimsWithPolicy,EXPECTED_REPOSITORY,EXPECTED_REPOSITORY_ID,EXPECTED_REF}=require("./atlas-github-oidc.js");
const EXPECTED_AUDIENCE="atlas-person-domain-v2-cutover";
const EXPECTED_WORKFLOW_REF="JezCH/atlas-person-db/.github/workflows/atlas-person-domain-v2-cutover.yml@refs/heads/main";
const POLICY=Object.freeze({audience:EXPECTED_AUDIENCE,repository:EXPECTED_REPOSITORY,repositoryId:EXPECTED_REPOSITORY_ID,ref:EXPECTED_REF,workflowRef:EXPECTED_WORKFLOW_REF,environment:"production",allowedEvents:new Set(["push","workflow_dispatch"])});
function verifyPersonDomainV2CutoverTrustClaims(payload,expectedSha){return verifyTrustClaimsWithPolicy(payload,expectedSha,POLICY);}
async function verifyPersonDomainV2CutoverGithubOidc(token,options={}){return verifyGitHubActionsOidcWithPolicy(token,{...options,policy:POLICY});}
module.exports=Object.freeze({EXPECTED_AUDIENCE,EXPECTED_WORKFLOW_REF,POLICY,verifyPersonDomainV2CutoverTrustClaims,verifyPersonDomainV2CutoverGithubOidc});
