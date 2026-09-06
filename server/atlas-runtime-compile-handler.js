"use strict";

const { createMutationAuthorizer } = require("./atlas-session-auth.js");
const { compileRuntimeProjection } = require("./atlas-runtime-compile-service.js");
const { requireDatabaseUrl, sendJson } = require("./atlas-normalized-read-handler.js");

function createRuntimeCompileHandler({ clientFactory, env=process.env, now }={}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");

  return async function handler(req,res) {
    const method=String(req?.method||"POST").toUpperCase();
    if (method!=="POST") { sendJson(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"}); return; }

    let databaseUrl;
    let authorize;
    try {
      databaseUrl=requireDatabaseUrl(env);
      authorize=createMutationAuthorizer({env,...(typeof now==="function"?{now}:{})});
    } catch (error) {
      console.error("ATLAS Runtime compile configuration error",error);
      sendJson(res,503,{ok:false,code:"SERVER_CONFIGURATION_ERROR"});
      return;
    }

    const auth=await authorize({method,headers:req?.headers||{},body:req?.body});
    if (!auth?.authorized) { sendJson(res,401,{ok:false,code:"UNAUTHORIZED",error:auth?.reason||"unauthorized"}); return; }

    const dryRun=req?.body?.dry_run===true;
    let client=null;
    try {
      client=await clientFactory(databaseUrl);
      const outcome=await compileRuntimeProjection(client,{dryRun});
      sendJson(res,200,{ok:true,source:"runtime-person-politics-v1",outcome});
    } catch (error) {
      if (!client) {
        console.error("ATLAS Runtime compile database unavailable",error);
        sendJson(res,503,{ok:false,code:"DATABASE_UNAVAILABLE"});
        return;
      }
      console.error("ATLAS Runtime compile failed",error);
      sendJson(res,500,{ok:false,code:"RUNTIME_COMPILE_FAILED",error:error?.message||String(error)});
    } finally {
      if (client && typeof client.end==="function") await client.end();
    }
  };
}

module.exports=Object.freeze({createRuntimeCompileHandler});
