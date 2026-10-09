"use strict";

const {createPostgresClient}=require("./atlas-postgres-client.js");
const {verifyGitHubActionsOidcWithPolicy}=require("./atlas-github-oidc.js");
const {sendJson}=require("./atlas-read-http.js");
const {
  bearerToken,runtimeIdentity,requireTransport
}=require("./atlas-youtube-person-signal-publish-handler.js");
const {
  applyIdentityMigration,publishIdentity
}=require("./atlas-youtube-person-identity-publish-service.js");

const MARKER="ATLAS_YOUTUBE_PERSON_IDENTITY_PUBLICATION_V1";
const AUDIENCE="atlas-person-db-youtube-identity-publish";
const POLICY=Object.freeze({
  audience:AUDIENCE,
  repository:"JezCH/atlas-person-db",
  repositoryId:"1319427399",
  ref:"refs/heads/main",
  workflowRef:"JezCH/atlas-person-db/.github/workflows/youtube-person-identity-publish.yml@refs/heads/main",
  environment:"production",
  allowedEvents:new Set(["push","workflow_dispatch"])
});

function readBody(req){
  if(req?.body&&typeof req.body==="object"&&!Buffer.isBuffer(req.body))return req.body;
  if(typeof req?.body==="string"){
    try{return JSON.parse(req.body)}catch{throw Error("YOUTUBE_IDENTITY_INVALID_JSON")}
  }
  throw Error("YOUTUBE_IDENTITY_BODY_REQUIRED");
}
function createYoutubePersonIdentityPublishHandler({
  env=process.env,clientFactory=createPostgresClient,
  verifyOidc=verifyGitHubActionsOidcWithPolicy,
  applyMigration=applyIdentityMigration,publish=publishIdentity
}={}){
  return async function(req,res){
    if(String(req?.method||"").toUpperCase()!=="POST"){
      sendJson(res,405,{ok:false,marker:MARKER,code:"METHOD_NOT_ALLOWED"});return;
    }
    let body,transport,runtime;
    try{
      body=readBody(req);
      transport=requireTransport(body);
      runtime=runtimeIdentity(env);
      if(transport.runtimeSha!==runtime.runtime_sha)
        throw Error("YOUTUBE_IDENTITY_RUNTIME_SHA_MISMATCH");
    }catch(error){
      sendJson(res,400,{ok:false,marker:MARKER,code:String(error?.message||"INVALID_REQUEST")});return;
    }
    const token=bearerToken(req);
    if(!token){
      sendJson(res,401,{ok:false,marker:MARKER,code:"GITHUB_OIDC_TOKEN_REQUIRED"});return;
    }
    try{
      await verifyOidc(token,{expectedSha:transport.publicationSha,policy:POLICY});
    }catch(error){
      sendJson(res,403,{ok:false,marker:MARKER,code:String(error?.message||"GITHUB_OIDC_REJECTED")});return;
    }
    const databaseUrl=String(env?.SUPABASE_DB_URL||"").trim();
    if(!/^postgres(?:ql)?:\/\//.test(databaseUrl)){
      sendJson(res,503,{ok:false,marker:MARKER,code:"SUPABASE_DB_URL_REQUIRED"});return;
    }
    let client=null;
    try{
      client=await clientFactory(databaseUrl,{env});
      const migration=await applyMigration(client);
      const outcome=await publish(client,body);
      sendJson(res,200,{ok:true,marker:MARKER,
        runtime_sha:transport.runtimeSha,publication_sha:transport.publicationSha,
        migration,outcome});
    }catch(error){
      console.error("ATLAS YouTube Person UUID publish failed",error);
      sendJson(res,500,{ok:false,marker:MARKER,code:"YOUTUBE_IDENTITY_PUBLICATION_FAILED",
        error:String(error?.message||error)});
    }finally{
      if(client&&typeof client.end==="function"){
        try{await client.end()}catch{}
      }
    }
  };
}
module.exports=Object.freeze({
  createYoutubePersonIdentityPublishHandler,MARKER,AUDIENCE,POLICY,readBody
});
