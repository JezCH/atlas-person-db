import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

// A ONE-SHOT acceptance after official Vercel provider restoration and real
// latest-main deployment. Never starts a deployment, never polls 402, never
// fetches YouTube, never writes DB. Read the EXISTING one discovery surface.
const DEFAULT_ORIGIN="https://atlas-person-db.vercel.app";
const EVIDENCE="ORIGINAL_ID_EXPLICIT_BIOGRAPHY_TITLE_UNVERIFIED_CONTENT";
export const PROBE_SCHEMA="atlas-youtube-b024-one-shot-live-acceptance/v1";

function assert(ok,message){
  if(!ok)throw new Error(message);
}
function integer(n){return typeof n==="number"&&Number.isSafeInteger(n);}
function exactSameSHA(a,b){return typeof a==="string" && a.toLowerCase()===b.toLowerCase();}
function payloadIdentity(value,expectedSha){
  assert(value?.ok===true&&value?.schema==="atlas-runtime-identity/v1"&&
    value?.identity?.git_commit_ref==="main"&&
    exactSameSHA(value.identity.git_commit_sha,expectedSha),
    "B024_RELEASE_DEPLOYED_RUNTIME_SHA_NOT_EXPECTED_MAIN");
}

export function validateDiscovery(payload){
  assert(payload?.ok===true &&
    payload?.source==="youtube-unregistered-candidate-discovery" &&
    payload?.schema==="atlas-youtube-unregistered-discovery/v1" &&
    payload?.available===true &&
    payload?.snapshot?.snapshot_id==="yt-20261010T083657Z-10127ch-rebuild-v5" &&
    payload?.snapshot?.parser_version==="yt-title-person-reviewed-v5" &&
    payload?.snapshot?.channel_count===10127 &&
    payload?.snapshot?.video_count===2230031 &&
    payload?.snapshot?.source_state?.artifact_digest===
      "sha256:8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946" &&
    payload?.population==="original_video_id_biography_title_candidate_sets" &&
    payload?.identity_rule==="full_current_registered_person_id_all_names_screened_last" &&
    payload?.ranking_evidence_type===EVIDENCE &&
    payload?.source_candidate_count===2241 &&
    payload?.source_original_biography_title_video_ids===10706 &&
    payload?.registration_checked===true &&
    payload?.current_registry_person_count_parity_verified===true &&
    integer(payload?.current_registry_distinct_persons) &&
    payload.current_registry_distinct_persons>=2000 &&
    payload?.current_registry_distinct_persons===
      payload?.current_registry_authoritative_person_count &&
    payload?.video_person_centeredness_certified===false &&
    payload?.historical_personhood_certified_for_all===false &&
    payload?.source_id_union_verified===true,
    "B024_RELEASE_SOURCE_REGISTRY_OR_EVIDENCE_CONTRACT_MISMATCH");
  const c=payload.threshold_counts||{};
  for(const n of [3,5,10,15,20]){
    assert(integer(c[n]) && c[n]>=0 && c[n]<=2241,
      "B024_RELEASE_RANK_THRESHOLDS_INVALID");
  }
  assert(c["3"]>=c["5"]&&c["5"]>=c["10"]&&
    c["10"]>=c["15"]&&c["15"]>=c["20"]&&
    c["3"]<=799&&
    integer(payload.registered_excluded_count)&&payload.registered_excluded_count>=0&&
    integer(payload.available_count)&&payload.available_count===c["3"]&&
    integer(payload.stored_count)&&payload.stored_count===payload.available_count&&
    integer(payload.min_channels)&&payload.min_channels===3,
    "B024_RELEASE_RANK_COUNT_OR_REGISTRATION_INVALID");
  assert(Array.isArray(payload.rows)&&payload.rows.length===Math.min(20,payload.available_count),
    "B024_RELEASE_PAGE_COUNT_INVALID");
  for(let i=0;i<payload.rows.length;i++){
    const row=payload.rows[i];
    assert(row.rank===i+1&&
      typeof row.raw_name==="string"&&Boolean(row.raw_name.trim())&&
      integer(row.distinct_channel_count)&&row.distinct_channel_count>=3&&
      integer(row.video_count)&&row.video_count>=row.distinct_channel_count&&
      row.evidence_type===EVIDENCE&&
      row.registration_match_count===0&&
      row.source_id_union_verified===true&&
      row.video_person_centeredness_certified===false&&
      row.presently_unregistered_historical_person_certified===false,
      "B024_RELEASE_CANDIDATE_IDENTITY_OR_CONTENT_PROOF_FALSE");
    if(i>0){
      const prev=payload.rows[i-1];
      assert(prev.distinct_channel_count>row.distinct_channel_count ||
        prev.distinct_channel_count===row.distinct_channel_count&&
          prev.video_count>=row.video_count,
        "B024_RELEASE_RANK_SORT_INVALID");
    }
  }
  return {
    source_original_channels:payload.snapshot.channel_count,
    source_original_video_titles:payload.snapshot.video_count,
    source_biography_title_video_ids:payload.source_original_biography_title_video_ids,
    pre_registry_source_candidate_names:payload.source_candidate_count,
    authoritative_persons:payload.current_registry_authoritative_person_count,
    independently_loaded_person_UUIDs:payload.current_registry_distinct_persons,
    newly_registered_candidate_exclusions:payload.registered_excluded_count,
    current_registry_persons_parity_verified:true,
    current_three_channel_title_candidate_count:payload.available_count,
    top_candidates:payload.rows.map(({rank,raw_name,distinct_channel_count,video_count})=>({
      rank,name:raw_name,channels:distinct_channel_count,biography_title_video_ids:video_count
    })),
    actual_video_content_confirmed:0,
    historical_personhood_confirmed_for_all:false,
    verdict:"TITLE_BASED_DISCOVERY_LIVE_NOT_ALL_HISTORICAL_PERSONS_CERTIFIED"
  };
}

export async function runAcceptance({fetchImpl=fetch,expectedSha,origin=DEFAULT_ORIGIN}={}){
  assert(/^[0-9a-f]{40}$/i.test(String(expectedSha||"")),
    "B024_RELEASE_EXPECTED_MAIN_SHA_REQUIRED");
  assert(origin===DEFAULT_ORIGIN,"B024_RELEASE_UNEXPECTED_PRODUCTION_ORIGIN");
  let requests=0;
  async function read(uri,kind){
    requests++;
    assert(requests<=4,"B024_RELEASE_READ_BUDGET_EXCEEDED");
    const resp=await fetchImpl(new URL(uri,origin).toString(),{
      method:"GET",headers:{"accept":kind==="js"?"application/javascript":"application/json",
        "cache-control":"no-cache"},cache:"no-store",
      signal:AbortSignal.timeout(12000)
    });
    // Do NOT retry any failed request, especially Hobby HTTP402.
    assert(resp.status!==402,"B024_RELEASE_VERCEL_402_STOP_NO_RETRY");
    assert(resp.ok,"B024_RELEASE_HTTP_"+resp.status+"_STOP_NO_RETRY");
    return kind==="js"?resp.text():resp.json();
  }
  const identityUrl="/api/atlas-read?__atlas_read_surface=runtime-identity";
  const first=await read(identityUrl,"json");
  payloadIdentity(first,expectedSha);
  const rank=await read("/api/atlas-read?__atlas_read_surface=youtube-person-signals&mode=discovery&min_channels=3&limit=20&offset=0","json");
  const facts=validateDiscovery(rank);
  const ui=await read("/atlas-registration-review.js","js");
  assert(typeof ui==="string" &&
    ui.includes('mode=discovery') &&
    ui.includes("ORIGINAL_ID_EXPLICIT_BIOGRAPHY_TITLE_UNVERIFIED_CONTENT") &&
    ui.includes("원본 Video ID · 채널 ID로 집계"),
    "B024_RELEASE_SINGLE_TABLE_UI_ASSET_NOT_UPDATED");
  const last=await read(identityUrl,"json");
  payloadIdentity(last,expectedSha);
  return {
    schema:PROBE_SCHEMA,
    status:"LIVE_TITLE_SIGNAL_ACCEPTED_CONTENT_NOT_CERTIFIED",
    expected_main_sha:expectedSha.toLowerCase(),
    returned_main_sha:last.identity.git_commit_sha.toLowerCase(),
    public_http_200_and_runtime_sha_verified:true,
    ui_asset_original_id_evidence_verified:true,
    one_existing_discovery_API_verified:true,
    source_and_complete_registration_screen_verified:true,
    no_production_write:true,
    no_new_video_collection:true,
    one_shot_no_retry:true,
    exact_request_count:requests,
    ...facts
  };
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const expectedSha=String(process.env.ATLAS_EXPECTED_RUNTIME_SHA||"").trim();
  runAcceptance({expectedSha}).then(report=>{
    const outDir=String(process.env.ATLAS_YOUTUBE_RELEASE_EVIDENCE_DIR||"artifacts/youtube-b024-live-acceptance");
    fs.mkdirSync(outDir,{recursive:true});
    fs.writeFileSync(path.join(outDir,"youtube-b024-one-shot-live-acceptance.json"),
      JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
  }).catch(err=>{
    console.error(String(err?.message||err));
    process.exitCode=1;
  });
}
