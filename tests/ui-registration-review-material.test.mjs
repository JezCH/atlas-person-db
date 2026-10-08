import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("REVIEW-M1 uses the shared structural hairline scale without changing semantic states", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M1 — Registration Review material normalization/);
  assert.match(css, /\.registration-review-head,\.registration-review-section\{border:1px solid var\(--atlas-material-hairline\)/);
  assert.match(css, /\.registration-review-stats\{[^}]*border:1px solid var\(--atlas-material-hairline-soft\);background:var\(--atlas-material-hairline-soft\)/);
  assert.match(css, /\.registration-review-table-wrap\{[^}]*border:1px solid var\(--atlas-material-hairline-soft\)/);
  assert.match(css, /\.registration-review-table th\{[^}]*border-bottom:1px solid var\(--atlas-material-hairline\)/);
  assert.match(css, /\.registration-review-table td\{[^}]*border-bottom:1px solid var\(--atlas-material-hairline-soft\)/);

  assert.match(css, /\.registration-review-head-actions>span\[data-state="ready"\]\{color:var\(--atlas-success\)\}/);
  assert.match(css, /\.registration-review-head-actions>span\[data-state="error"\]\{color:var\(--atlas-danger\)\}/);
  assert.match(css, /\.registration-review-thresholds button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*color:#e7dfcf/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
});


test("REVIEW-M2 uses the shared hover / active / selected luminance scale for thresholds", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M2 — Threshold interaction luminance/);
  assert.match(css, /\.registration-review-thresholds button\{[^}]*--registration-review-threshold-fill:#171b1f[^}]*background:var\(--registration-review-threshold-fill\)/);
  assert.match(css, /button:active:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-active\)[^}]*var\(--registration-review-threshold-fill\)/);
  assert.match(css, /button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*var\(--atlas-material-wash-selected\)[^}]*var\(--registration-review-threshold-fill\)/);
  assert.match(css, /@media\(hover:hover\)\{\.registration-review-thresholds button:hover:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-hover\)[^}]*var\(--registration-review-threshold-fill\)/);

  assert.doesNotMatch(css, /\.registration-review-thresholds button:hover\{background:#20262b/);
  assert.doesNotMatch(css, /\.registration-review-thresholds button\.is-active\{[^}]*background:rgba\(192,174,136,\.08\)/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
});


test("REVIEW-M3 gives Registration Review controls the shared focus language", () => {
  const css = read("atlas-registration-review.css");

  assert.match(css, /REVIEW-M3 — Registration Review focus language/);
  assert.match(css, /\.registration-review-thresholds button:focus-visible\{outline:1px solid var\(--atlas-focus-ring\);outline-offset:2px\}/);
  assert.match(css, /\.registration-review-queue-head input:focus\{[^}]*border-color:var\(--atlas-material-hairline-strong\)[^}]*outline:1px solid var\(--atlas-focus-ring\)[^}]*outline-offset:2px[^}]*box-shadow:none/);

  assert.match(css, /REVIEW-M2 — Threshold interaction luminance/);
  assert.match(css, /\.registration-review-table tbody tr:hover td\{background:var\(--atlas-material-wash-hover\)\}/);
  assert.doesNotMatch(css, /\.registration-review-thresholds button:focus-visible\{[^}]*rgba\(/);
  assert.doesNotMatch(css, /\.registration-review-queue-head input:focus\{[^}]*rgba\(/);
});


test("REVIEW-M4 uses one five-card registration row and prevents YouTube signal horizontal overflow on mobile", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M4 — Registration Review density and responsive signal table/);
  assert.match(css, /\.registration-review-stats\{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /registration-review-stats-compact/);
  assert.match(css, /\.registration-review-signal-wrap\{[^}]*width:min\(100%,980px\)[^}]*overflow:hidden/);
  assert.match(css, /\.registration-review-signal-table\{[^}]*min-width:0[^}]*table-layout:fixed/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-signal-table tbody tr\{[^}]*grid-template-columns:38px minmax\(0,1fr\) 46px 42px/);
  assert.match(css, /\.registration-review-signal-table colgroup,[\s\S]*\.registration-review-signal-table thead\{display:none\}/);

  assert.match(js, /statCard\(number\(pending\),"등록대기열","현재 미등록 후보"\)/);
  assert.doesNotMatch(js, /registration-review-queue-summary/);
  assert.match(js, /registration-review-table registration-review-signal-table/);
  assert.match(js, /data-label="채널"/);
  assert.match(js, /data-label="영상"/);
});


test("REVIEW-M5 preserves every registration-review field across responsive breakpoints", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M5 — Responsive information invariant/);
  assert.match(css, /@media\(max-width:1100px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:700px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:420px\)\{[\s\S]*\.registration-review-stats\{grid-template-columns:1fr\}/);

  assert.match(css, /\.registration-review-signal-table thead tr,[\s\S]*grid-template-columns:56px minmax\(260px,460px\) 120px 90px/);
  assert.match(css, /\.registration-review-queue-table td\{[\s\S]*grid-template-columns:minmax\(82px,30%\) minmax\(0,1fr\)/);
  assert.doesNotMatch(css, /\.registration-review-queue-table td\{[^}]*display:none/);

  for (const label of ["이름","대표 분야","우선순위","검토 상태","출처","갱신"]) {
    assert.match(js, new RegExp(`data-label="${label}"`));
  }
  assert.match(js, /registration-review-table-wrap registration-review-queue-wrap/);
});


test("REVIEW-M6 removes the duplicate local page header without losing refresh/status controls", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M6 — Remove duplicated local page heading while preserving live controls/);
  assert.match(css, /\.registration-review-overview-head\{align-items:center\}/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-overview-head\{align-items:flex-start;flex-direction:column\}/);

  assert.doesNotMatch(js, /<header class="registration-review-head">/);
  assert.doesNotMatch(js, /<h2>등록검토<\/h2>/);
  assert.match(js, /registration-review-section-head registration-review-overview-head/);
  assert.match(js, /id="registrationReviewStatus"/);
  assert.match(js, /id="registrationReviewRefresh"/);
});


test("REVIEW-M7 keeps the YouTube cumulative controls",()=>{
  const css=read("atlas-registration-review.css");
  const js=read("atlas-registration-review.js");
  for(const id of ["youtubeSignalThresholds","youtubeSignalTelemetry","youtubeSignalVisibleCount"])
    assert.ok(js.includes(id));
  assert.ok(js.includes("snapshot.channel_count"));
  assert.ok(js.includes("snapshot.video_count"));
  assert.match(css,/REVIEW-M7/);
});

test("REVIEW-M8 visualizes YouTube signal strength with bars while preserving all numeric fields", () => {
  const css = read("atlas-registration-review.css");
  const js = read("atlas-registration-review.js");

  assert.match(css, /REVIEW-M8 — Ranked YouTube signal bars/);
  assert.match(css, /\.registration-review-signal-table tbody\{[\s\S]*display:grid[\s\S]*gap:7px/);
  assert.match(css, /\.registration-review-signal-bar\{[\s\S]*grid-column:2 \/ 5[\s\S]*background:#0f1215/);
  assert.match(css, /\.registration-review-signal-bar span\{[\s\S]*width:var\(--signal-strength,0%\)[\s\S]*background:var\(--atlas-honor-metal\)/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*\.registration-review-signal-row \.registration-review-signal-bar\{[\s\S]*grid-column:2 \/ -1/);

  assert.match(js, /const maxChannels=Math\.max\(1,\.\.\.signalRows\.map/);
  assert.match(js, /const strength=Math\.min\(100,\(channels\/maxChannels\)\*100\)/);
  assert.match(js, /class="registration-review-signal-row" style="--signal-strength:/);
  assert.match(js, /class="registration-review-signal-bar" aria-hidden="true"/);

  assert.match(js, /data-label="순위"/);
  assert.match(js, /data-label="인물"/);
  assert.match(js, /data-label="채널"/);
  assert.match(js, /data-label="영상"/);
});


test("REVIEW-M9 uses one exact cumulative channel ranking and a non-overlapping toolbar",()=>{
 const js=read("atlas-registration-review.js");
 const css=read("atlas-registration-review.css");
 assert.ok(js.includes("Channel ID 기반 누적 데이터"));
 assert.ok(js.includes("source_state?.next_batch"));
 assert.ok(!js.includes("cross_segment_bounds"));
 assert.ok(!js.includes("channel_count_upper_bound"));
 assert.ok(css.includes(".registration-review-signal-toolbar{display:grid"));
 assert.ok(css.includes("white-space:normal;overflow-wrap:anywhere"));
});

test("REVIEW-M10 keeps mobile YouTube names and counts in separate grid rows",()=>{
  const css=read("atlas-registration-review.css");
  const js=read("atlas-registration-review.js");
  const mobile=css.slice(css.indexOf("/* REVIEW-M8"),css.indexOf("/* Cumulative YouTube toolbar"));
  assert.match(mobile,/grid-template-columns:38px repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(mobile,/grid-template-rows:auto auto 5px/);
  assert.match(mobile,/\.registration-review-name\{\s*grid-column:2 \/ -1;\s*grid-row:1/);
  assert.match(mobile,/td:nth-child\(3\)\{\s*grid-column:2;\s*grid-row:2/);
  assert.match(mobile,/td:nth-child\(4\)\{\s*grid-column:3;\s*grid-row:2/);
  assert.match(mobile,/\.registration-review-number\{\s*position:static;\s*padding-top:0;\s*text-align:left/);
  assert.match(mobile,/\.registration-review-number::before\{\s*position:static/);
  assert.match(mobile,/\.registration-review-signal-bar\{\s*grid-column:2 \/ -1;\s*grid-row:3/);
  assert.match(js,/data-label="채널"/);
  assert.match(js,/data-label="영상"/);
});

test("REVIEW-M11 labels only unique exact registered aliases and current pending-queue matches",async()=>{
  const vm=await import("node:vm");
  const js=read("atlas-registration-review.js");
  const css=read("atlas-registration-review.css");
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{
      innerHTML:"",textContent:"",value:"",dataset:{},disabled:false,
      addEventListener(){}
    });
    return nodes.get(id);
  };
  const root={isConnected:true,innerHTML:"",querySelector:node};
  const persons={persons:[
    {id:"p-lincoln",canonical_name_en:"Abraham Lincoln",names:[{name:"Abraham Lincoln"}],historicity:"historical"},
    {id:"p-sejong",canonical_name_en:"Sejong the Great",preferred_name_ko:"세종",names:[{name:"세종대왕"}],historicity:"historical"},
    {id:"p-leonardo",canonical_name_en:"Leonardo da Vinci",names:[],historicity:"historical"},
    {id:"p-cleopatra-1",canonical_name_en:"Cleopatra",names:[],historicity:"historical"},
    {id:"p-cleopatra-2",canonical_name_en:"Cléopatra",names:[],historicity:"historical"}
  ],summary:{total:5}};
  const queue={ok:true,summary:{pending_count:3},candidates:[
    {candidate_id:"q-hypatia",name:"Hypatia of Alexandria",review_metadata:{lookup_names:["Hypatia"]}},
    {candidate_id:"q-galois",name:"Évariste Galois",review_metadata:{}},
    {candidate_id:"q-leonardo",name:"Leonardo da Vinci",review_metadata:{}}
  ]};
  const signals={ok:true,available_count:8,rows:[
    {rank:1,raw_name:"Abraham Lincoln",distinct_channel_count:95,video_count:105},
    {rank:2,raw_name:"Leonardo da Vinci",distinct_channel_count:80,video_count:100},
    {rank:3,raw_name:"Cleopatra",distinct_channel_count:72,video_count:95},
    {rank:4,raw_name:"Hypatia",distinct_channel_count:42,video_count:50},
    {rank:5,raw_name:"Evariste Galois",distinct_channel_count:23,video_count:30},
    {rank:6,raw_name:"Mansa Musa",distinct_channel_count:18,video_count:21},
    {rank:7,raw_name:"Abraham Lincoln Biography",distinct_channel_count:7,video_count:8},
    {rank:8,raw_name:"세종대왕",distinct_channel_count:6,video_count:7}
  ],snapshot:{channel_count:6011,video_count:1536512,threshold_counts:{"3":8},source_state:{next_batch:"batch018"}}};
  const context={
    window:{ATLAS_CLIENT_DATA_STORE:{loadPersons:async()=>persons},addEventListener(){}},
    fetch:async url=>({ok:true,status:200,json:async()=>url.includes("registration-queue")?queue:signals}),
    console,Date,setInterval:()=>7,clearInterval:()=>{}
  };
  vm.runInNewContext(js,context,{filename:"atlas-registration-review.js"});
  context.window.ATLAS_REGISTRATION_REVIEW.mount(root);
  for(let i=0;i<25 && node("#registrationReviewStatus").dataset.state!=="ready";i++)
    await new Promise(resolve=>setImmediate(resolve));
  assert.equal(node("#registrationReviewStatus").dataset.state,"ready");
  const html=node("#youtubeSignalBody").innerHTML;
  const matchingRow=name=>{
    const item=html.split('<tr class="registration-review-signal-row"').find(part=>part.includes(`<span class="registration-review-signal-raw-name">${name}</span>`));
    assert.ok(item,`missing ${name}`);
    return item.slice(0,item.indexOf("</tr>"));
  };
  assert.match(matchingRow("Abraham Lincoln"),/data-status="registered">기등록/);
  assert.match(matchingRow("세종대왕"),/data-status="registered">기등록/);
  assert.match(matchingRow("Leonardo da Vinci"),/data-status="registered">기등록/);
  assert.doesNotMatch(matchingRow("Leonardo da Vinci"),/대기열 등재/);
  assert.match(matchingRow("Cleopatra"),/data-status="ambiguous">동명이인 확인/);
  assert.match(matchingRow("Hypatia"),/data-status="queued">대기열 등재/);
  assert.match(matchingRow("Evariste Galois"),/data-status="queued">대기열 등재/);
  assert.match(matchingRow("Mansa Musa"),/기등록 일치 없음/);
  assert.match(matchingRow("Mansa Musa"),/대기열 미등재/);
  assert.doesNotMatch(matchingRow("Abraham Lincoln Biography"),/data-status="registered"/);
  assert.match(css,/REVIEW-M11/);
  assert.match(css,/\.registration-review-signal-identity\[data-status="registered"\]/);
  assert.match(js,/일치 없음은 실제 미등록을 확정하지 않습니다/);
});

test("REVIEW-M12 toggles registered and living exclusions independently with unknowns retained",async()=>{
  const vm=await import("node:vm");
  const js=read("atlas-registration-review.js");
  const css=read("atlas-registration-review.css");
  const events=new Map(),nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{innerHTML:"",textContent:"",dataset:{},checked:false,isConnected:true,disabled:false,
      addEventListener(event,callback){events.set(id+":"+event,callback)}
    });
    return nodes.get(id);
  };
  const root={isConnected:true,querySelector:node,innerHTML:""};
  const persons={persons:[{id:"p-lincoln",canonical_name_en:"Abraham Lincoln",names:[{name:"Abraham Lincoln"}]}],summary:{total:1}};
  const queue={ok:true,summary:{pending_count:0},candidates:[]};
  const raw=[
    {raw_name:"Abraham Lincoln",rank:1,distinct_channel_count:95,video_count:105},
    {raw_name:"Taylor Swift",rank:2,distinct_channel_count:22,video_count:29},
    {raw_name:"Hypatia",rank:3,distinct_channel_count:12,video_count:15},
    {raw_name:"Unknown Figure",rank:4,distinct_channel_count:8,video_count:12}
  ];
  const fetchCalls=[];
  const context={
    window:{ATLAS_CLIENT_DATA_STORE:{loadPersons:async()=>persons},addEventListener(){}},
    fetch:async url=>{
      fetchCalls.push(url);
      const parsed=new URL(url,"http://localhost");
      const surface=parsed.searchParams.get("__atlas_read_surface");
      const payload=surface==="registration-queue" ? queue
        : surface==="youtube-person-living"
          ? {ok:true,rows:JSON.parse(parsed.searchParams.get("names")).map(name=>({name,status:name==="Taylor Swift"?"living_likely":"unknown"}))}
          : {ok:true,stored_count:4,available_count:4,rows:raw,
            snapshot:{channel_count:6011,video_count:1536512,threshold_counts:{"3":4},source_state:{next_batch:"batch018"}}};
      return {ok:true,status:200,json:async()=>payload};
    },
    console,Date,URL,setInterval:()=>1,clearInterval(){}
  };
  vm.runInNewContext(js,context);
  context.window.ATLAS_REGISTRATION_REVIEW.mount(root);
  async function ready(){
    for(let i=0;i<40 && node("#registrationReviewStatus").dataset.state!=="ready";i++) await new Promise(resolve=>setImmediate(resolve));
    assert.equal(node("#registrationReviewStatus").dataset.state,"ready");
  }
  await ready();
  const html=()=>node("#youtubeSignalBody").innerHTML;
  assert.match(html(),/Abraham Lincoln/);
  assert.match(html(),/Taylor Swift/);
  assert.match(js,/id="youtubeExcludeRegistered"/);
  assert.match(js,/id="youtubeExcludeLiving"/);
  const toggle=async(id,checked)=>{
    node("#registrationReviewStatus").dataset.state="loading";
    node("#"+id).checked=checked;
    events.get("#youtubeSignalFilters:change")({target:{id,checked}});
    await ready();
  };
  await toggle("youtubeExcludeRegistered",true);
  assert.doesNotMatch(html(),/Abraham Lincoln/);
  assert.match(html(),/Taylor Swift/);
  await toggle("youtubeExcludeLiving",true);
  assert.doesNotMatch(html(),/Taylor Swift/);
  assert.match(html(),/Hypatia/);
  assert.match(html(),/Unknown Figure/);
  assert.match(node("#youtubeSignalVisibleCount").textContent,/생존 미확인 포함/);
  assert.ok(fetchCalls.some(url=>url.includes("youtube-person-living")));
  await toggle("youtubeExcludeRegistered",false);
  assert.match(html(),/Abraham Lincoln/);
  assert.doesNotMatch(html(),/Taylor Swift/);
  await toggle("youtubeExcludeLiving",false);
  assert.match(html(),/Taylor Swift/);
  assert.match(css,/REVIEW-M12/);
});

test("REVIEW-M12 refills after excluding the first 1000 registered ranks",async()=>{
  const vm=await import("node:vm");
  const js=read("atlas-registration-review.js");
  const events=new Map(),nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{innerHTML:"",textContent:"",dataset:{},disabled:false,checked:false,
      addEventListener(event,handler){events.set(id+":"+event,handler)}
    });
    return nodes.get(id);
  };
  const root={isConnected:true,querySelector:node,innerHTML:""};
  const persons={persons:[{id:"p-1",canonical_name_en:"Registered Individual",names:[]}],summary:{total:1}};
  const queue={ok:true,summary:{pending_count:0},candidates:[]};
  const first=Array.from({length:1000},(_,i)=>({rank:i+1,raw_name:"Registered Individual",distinct_channel_count:6,video_count:7}));
  const urls=[];
  const context={
    window:{ATLAS_CLIENT_DATA_STORE:{loadPersons:async()=>persons},addEventListener(){}},
    fetch:async url=>{
      urls.push(url);
      const parsed=new URL(url,"http://localhost");
      const surface=parsed.searchParams.get("__atlas_read_surface");
      const payload=surface==="registration-queue" ? queue
        : {ok:true,stored_count:1001,available_count:1001,
          rows:Number(parsed.searchParams.get("offset"))===1000 ? [{rank:1001,raw_name:"New Historical Figure",distinct_channel_count:3,video_count:4}]
            : first.slice(0,Number(parsed.searchParams.get("limit"))||300),
          snapshot:{channel_count:6011,video_count:1536512,threshold_counts:{"3":1001},source_state:{next_batch:"batch018"}}};
      return {ok:true,status:200,json:async()=>payload};
    },
    console,Date,URL,setInterval:()=>1,clearInterval(){}
  };
  vm.runInNewContext(js,context);
  context.window.ATLAS_REGISTRATION_REVIEW.mount(root);
  const ready=async()=>{
    for(let i=0;i<40 && node("#registrationReviewStatus").dataset.state!=="ready";i++) await new Promise(resolve=>setImmediate(resolve));
    assert.equal(node("#registrationReviewStatus").dataset.state,"ready");
  };
  await ready();
  node("#registrationReviewStatus").dataset.state="loading";
  events.get("#youtubeSignalFilters:change")({target:{id:"youtubeExcludeRegistered",checked:true}});
  await ready();
  assert.match(node("#youtubeSignalBody").innerHTML,/New Historical Figure/);
  assert.match(node("#youtubeSignalBody").innerHTML,/>1,001</);
  assert.doesNotMatch(node("#youtubeSignalBody").innerHTML,/Registered Individual/);
  assert.ok(urls.some(url=>url.includes("offset=1000")));
});
