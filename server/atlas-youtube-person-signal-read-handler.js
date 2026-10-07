"use strict";

const { requireDatabaseUrl, sendJson } = require("./atlas-read-http.js");
const { readYoutubePersonSignals } = require("./atlas-youtube-person-signal-read-service.js");

function queryValue(req,key) {
  const direct=req?.query?.[key];
  if (Array.isArray(direct)) return direct.length === 1 ? direct[0] : "__INVALID_MULTI__";
  if (direct != null) return direct;
  try {
    const parsed=new URL(String(req?.url || ""), "http://atlas.local");
    return parsed.searchParams.get(key);
  } catch {
    return null;
  }
}

function createYoutubePersonSignalReadHandler({ clientFactory, env = process.env, readSignals = readYoutubePersonSignals } = {}) {
  if (typeof clientFactory !== "function") throw new Error("clientFactory is required");
  if (typeof readSignals !== "function") throw new Error("readSignals is required");

  return async function youtubePersonSignalReadHandler(req,res) {
    if (String(req?.method || "GET").toUpperCase() !== "GET") {
      sendJson(res,405,{ ok:false,code:"METHOD_NOT_ALLOWED",error:"method not allowed" });
      return;
    }
    let databaseUrl;
    try {
      databaseUrl=requireDatabaseUrl(env);
    } catch {
      sendJson(res,503,{ ok:false,code:"SERVER_CONFIGURATION_ERROR",error:"YouTube person signal read service is not configured" });
      return;
    }

    let client=null;
    try {
      const minChannels=queryValue(req,"min_channels");
      const limit=queryValue(req,"limit");
      if (minChannels === "__INVALID_MULTI__" || limit === "__INVALID_MULTI__") {
        sendJson(res,400,{ ok:false,code:"INVALID_YOUTUBE_PERSON_SIGNAL_QUERY",error:"query parameters must be singular" });
        return;
      }
      client=await clientFactory(databaseUrl);
      const result=await readSignals({
        client,
        ...(minChannels == null ? {} : { minChannels }),
        ...(limit == null ? {} : { limit })
      });
      sendJson(res,200,{ ok:true,source:"youtube-person-signal-read-model",...result });
    } catch (error) {
      if (error?.code === "INVALID_YOUTUBE_PERSON_SIGNAL_QUERY" || error?.message === "INVALID_YOUTUBE_PERSON_SIGNAL_QUERY") {
        sendJson(res,400,{ ok:false,code:"INVALID_YOUTUBE_PERSON_SIGNAL_QUERY",error:"invalid min_channels or limit" });
        return;
      }
      console.error("ATLAS YouTube person signal read failed",error);
      sendJson(res,client ? 500 : 503,{
        ok:false,
        code:client ? "YOUTUBE_PERSON_SIGNAL_READ_FAILED" : "DATABASE_UNAVAILABLE",
        error:client ? "YouTube person signal read failed" : "database unavailable"
      });
    } finally {
      if (client && typeof client.end === "function") await client.end();
    }
  };
}

module.exports=Object.freeze({ queryValue,createYoutubePersonSignalReadHandler });
