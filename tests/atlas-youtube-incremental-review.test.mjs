import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {computeIncrementalAudit,attentionCsv,nameKey,tier} from "../scripts/youtube-incremental-review.mjs";

const signal=(rank,name,channels,videos=channels)=>({
  rank,raw_name:name,distinct_channel_count:channels,video_count:videos
});
const make=(id,rows)=>({snapshot:{snapshot_id:id,threshold_counts:{"3":rows.length}},signals:rows});
const old=make("yt-previous",[
  signal(1,"Abraham Lincoln",10),signal(2,"Metamorphosis",10),
  signal(3,"Chopin",5),signal(4,"Alexandria",3),
  signal(5,"Future Hero",9),signal(6,"Retired Candidate",3)
]);
const next=make("yt-next",[
  signal(1,"New Candidate",15),signal(2,"Abraham Lincoln",12),
  signal(3,"Metamorphosis",11),signal(4,"Future Hero",10),
  signal(5,"Chopín",6),signal(6,"Elon Musk",10),
  signal(7,"Alexandria",4),signal(8,"Another Fresh",3)
]);
const extra={
  decisions:{decisions:[
    {name:"Metamorphosis",disposition:"NON_INDIVIDUAL",reason:"A title, not a Person",reviewed_at:"2026-10-09"},
    {name:"Alexandria",disposition:"AMBIGUOUS",reason:"A city or personal name",reviewed_at:"2026-10-09"}
  ]},
  persons:{ok:true,mode:"list",persons:[
    {id:"p-lincoln",canonical_name_en:"Abraham Lincoln",names:[{name:"Abe Lincoln"}]}
  ]},
  registeredAliases:[],livingNames:["Elon Musk"],currentAsOf:"2026-10-09T00:00:00Z"
};

test("incremental audit reuses reviewed cases and screens only changes/new candidates",()=>{
  const res=computeIncrementalAudit(next,old,extra);
  const s=res.summary;
  assert.equal(s.previous_signals,6);
  assert.equal(s.current_signals,8);
  assert.equal(s.new_raw_names,3);
  assert.equal(s.priority_upgrades,1);
  assert.equal(s.channel_growth,4);
  assert.equal(s.disappeared_keys,1);
  assert.equal(s.attention_total,4);
  assert.deepEqual(res.attention.map(x=>x.raw_name),
    ["New Candidate","Future Hero","Chopín","Another Fresh"]);
  assert.deepEqual(res.attention.map(x=>x.tier),["P0","P0","P1","P2"]);
  const lincoln=res.changed.find(x=>x.raw_name==="Abraham Lincoln");
  assert.equal(lincoln.disposition,"REGISTERED_PERSON_ID");
  assert.deepEqual(lincoln.registered_person_ids,["p-lincoln"]);
  assert.equal(lincoln.needs_review,false);
  const musk=res.changed.find(x=>x.raw_name==="Elon Musk");
  assert.equal(musk.disposition,"REVIEWED_LIVING_NAME");
  assert.equal(musk.needs_review,false);
  assert.equal(res.changed.find(x=>x.raw_name==="Metamorphosis").disposition,"NON_INDIVIDUAL");
  assert.equal(res.changed.find(x=>x.raw_name==="Alexandria").disposition,"AMBIGUOUS");
  assert.equal(res.changed.find(x=>x.raw_name==="Chopín").alias_spelling_changed,true);
  assert.equal(res.disappeared[0].raw_names[0],"Retired Candidate");
  assert.ok(attentionCsv(res).includes("New Candidate"));
  assert.ok(!attentionCsv(res).includes("Elon Musk"));
});

test("identity normalization does not merge homonyms by surname or substring",()=>{
  assert.equal(nameKey("Chopín"),nameKey("Chopin"));
  assert.notEqual(nameKey("Napoleon III"),nameKey("Napoleon"));
  assert.notEqual(nameKey("Yugoslavia"),nameKey("Peter II of Yugoslavia"));
  assert.equal(tier(3),"P2");
  assert.equal(tier(5),"P1");
  assert.equal(tier(10),"P0");
});

test("ambiguous duplicate normalized keys always demand review, never silently merge",()=>{
  const prev=make("older",[signal(1,"Émile Zola",3)]);
  const curr=make("newer",[signal(1,"Emile Zola",5),signal(2,"Émile Zola",3)]);
  const res=computeIncrementalAudit(curr,prev,{currentAsOf:"2026-10-09T00:00:00Z"});
  assert.equal(res.attention.length,2);
  assert.ok(res.attention.every(row=>row.normalized_name_collision));
});

test("invalid snapshots fail closed instead of creating partial review output",()=>{
  assert.throws(()=>computeIncrementalAudit(next,next,extra),/SAME_SNAPSHOT_ID/);
  assert.throws(()=>computeIncrementalAudit(
    {...next,signals:[next.signals[0],next.signals[2]]},old,extra),/RANK_INVALID/);
  assert.throws(()=>computeIncrementalAudit(next,old,{
    ...extra,persons:{ok:true,mode:"list",persons:null}
  }),/PERSON_RUNTIME_INVALID/);
});

test("publish uses new corpus artifacts and reports increments without replaying batch017",()=>{
  const yml=fs.readFileSync(new URL("../.github/workflows/youtube-person-signal-publish.yml",import.meta.url),"utf8");
  assert.match(yml,/workflow_dispatch:/);
  assert.match(yml,/workflow_call:/);
  assert.doesNotMatch(yml,/branches: \[main\]/);
  assert.doesNotMatch(yml,/youtube-cumulative-batch017-validated/);
  assert.doesNotMatch(yml,/channel_count==6011/);
  assert.doesNotMatch(yml,/next_batch\)=="batch018"/);
  assert.match(yml,/youtube-fetch-previous-signals\.py/);
  assert.match(yml,/youtube-incremental-review\.mjs/);
  assert.match(yml,/--persons \/tmp\/atlas-youtube-current-persons\.json/);
  assert.match(yml,/--decisions audits\/youtube-reviewed-dispositions\.json/);
  assert.match(yml,/GITHUB_STEP_SUMMARY/);
  assert.match(yml,/Upload publication evidence/);
});

test("durable review decisions never auto-classify ambiguity as a Person",()=>{
  const raw=JSON.parse(fs.readFileSync(new URL("../audits/youtube-reviewed-dispositions.json",import.meta.url),"utf8"));
  assert.equal(raw.schema,"atlas-youtube-reviewed-dispositions/v1");
  assert.ok(raw.decisions.length>=20);
  const m=new Map(raw.decisions.map(item=>[item.name,item.disposition]));
  assert.equal(m.get("the Habsburgs"),"NON_INDIVIDUAL");
  assert.equal(m.get("Paris"),"AMBIGUOUS");
  assert.equal(m.get("Jack the Ripper"),"UNIDENTIFIED");
  assert.equal(m.get("Drake"),"AMBIGUOUS");
});
