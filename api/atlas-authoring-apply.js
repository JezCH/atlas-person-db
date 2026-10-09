"use strict";

const { createAuthoringApplyHandler } = require("../server/atlas-authoring-apply-handler.js");

const authoringApplyHandler=createAuthoringApplyHandler();
let youtubePersonSignalPublishHandler=null;
let youtubePersonIdentityPublishHandler=null;

function queryValue(req,key) {
  const direct=req?.query?.[key];
  if (Array.isArray(direct)) return direct.length===1 ? String(direct[0] || "").trim() : "";
  if (direct != null) return String(direct).trim();
  try {
    const parsed=new URL(String(req?.url || ""), "http://atlas.local");
    return String(parsed.searchParams.get(key) || "").trim();
  } catch {
    return "";
  }
}

function youtubePublishHandler() {
  if (!youtubePersonSignalPublishHandler) {
    const { createYoutubePersonSignalPublishHandler } = require("../server/atlas-youtube-person-signal-publish-handler.js");
    youtubePersonSignalPublishHandler=createYoutubePersonSignalPublishHandler();
  }
  return youtubePersonSignalPublishHandler;
}

function youtubeIdentityPublishHandler() {
  if(!youtubePersonIdentityPublishHandler){
    const {createYoutubePersonIdentityPublishHandler}=require("../server/atlas-youtube-person-identity-publish-handler.js");
    youtubePersonIdentityPublishHandler=createYoutubePersonIdentityPublishHandler();
  }
  return youtubePersonIdentityPublishHandler;
}

async function consolidatedAuthoringApplyHandler(req,res) {
  const surface=queryValue(req,"__atlas_authoring_apply_surface");
  if (surface==="youtube-person-signal-publish") return youtubePublishHandler()(req,res);
  if (surface==="youtube-person-identity-publish") return youtubeIdentityPublishHandler()(req,res);
  return authoringApplyHandler(req,res);
}

module.exports=consolidatedAuthoringApplyHandler;
module.exports.queryValue=queryValue;
