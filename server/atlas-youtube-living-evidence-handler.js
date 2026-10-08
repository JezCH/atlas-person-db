"use strict";

const { sendJson } = require("./atlas-read-http.js");
const { readLivingEvidence } = require("./atlas-youtube-living-evidence-service.js");

function createYoutubeLivingEvidenceHandler({read=readLivingEvidence}={}) {
  if(typeof read!=="function") throw new Error("living evidence reader is required");
  return async function handler(req,res) {
    if(String(req?.method||"GET").toUpperCase()!=="GET") {
      return sendJson(res,405,{ok:false,code:"METHOD_NOT_ALLOWED"});
    }
    try {
      const url=new URL(String(req?.url||""),"http://atlas.local");
      const namesValues=url.searchParams.getAll("names");
      if(namesValues.length!==1) throw new Error("INVALID_LIVING_NAMES");
      const names=JSON.parse(namesValues[0]);
      const result=await read({names});
      return sendJson(res,200,{ok:true,...result});
    } catch(error) {
      const invalid=error instanceof SyntaxError||error?.message==="INVALID_LIVING_NAMES";
      if(!invalid) console.error("ATLAS Wikidata living evidence read failed",error);
      return sendJson(res,invalid?400:503,{
        ok:false,
        code:invalid?"INVALID_LIVING_NAMES":"LIVING_EVIDENCE_UNAVAILABLE"
      });
    }
  };
}

module.exports=Object.freeze({createYoutubeLivingEvidenceHandler});
