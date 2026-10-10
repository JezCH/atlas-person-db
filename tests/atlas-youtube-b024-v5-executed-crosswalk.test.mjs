import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd();
const get=path=>JSON.parse(readFileSync(join(root,path),"utf8"));
const dir="audits/";
const summary=get(dir+"youtube-b024-v5-executed-crosswalk-manifest.json");
const original=get(dir+"youtube-b024-v5-complete-executed-raw-label-crosswalk.json");
const live=get(dir+"youtube-v5-production-8713-title-candidate-reference.json");
const shards=summary.shards.map(item=>({...item,body:get(item.path)}));
const byType=name=>shards.filter(x=>x.body.kind===name).flatMap(x=>x.body.rows);
const matched=byType("exact_name_matched");
const prodOnly=byType("live_name_missing_in_source_lexicon");
const sourceOnly=byType("source_name_not_in_production");
const norm=s=>s.normalize("NFKC").toLowerCase().replaceAll("ß","ss").trim();

test("every original 8,713 Production title-candidate name is reconciled exactly once",()=>{
 assert.equal(summary.schema,"atlas-youtube-b024-v5-executed-crosswalk-manifest/v1");
 assert.equal(summary.metrics.production_rows,8713);
 assert.equal(summary.metrics.source_label_rows,5965);
 assert.equal(matched.length,5217);
 assert.equal(prodOnly.length,3496);
 assert.equal(sourceOnly.length,748);
 assert.equal(summary.metrics.exact_name_collision_holds,0);
 assert.equal(matched.length+prodOnly.length,live.available_count);
 assert.equal(matched.length+sourceOnly.length,summary.metrics.source_label_rows);
 assert.equal(live.snapshot_id,summary.production_snapshot_id);
 assert.equal(summary.source_archive_sha256,"8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946");
 for(const item of shards){
   assert.equal(item.body.rows.length,item.row_count,item.path);
   assert.equal(item.body.source_5965_sha256,summary.source_5965_ledger_sha256);
   assert.equal(item.body.production_snapshot_id,summary.production_snapshot_id);
   assert.equal(item.body.source_snapshot_id,summary.source_snapshot_id);
 }
 const indexes=new Set();
 const allNames=new Set();
 const byRank=new Map(live.rows.map(r=>[r.rank,r]));
 for(const [rank,name,srcName,liveChannels,liveVideos,sourceChannels,sourceVideos] of matched){
   assert.equal(norm(name),norm(srcName));
   assert.equal(byRank.get(rank)?.name,name);
   assert.equal(byRank.get(rank)?.channels,liveChannels);
   assert.equal(byRank.get(rank)?.videos,liveVideos);
   assert.ok(sourceChannels>=0&&sourceVideos>=0);
   assert.ok(!indexes.has(rank)&&!allNames.has(name));
   indexes.add(rank);allNames.add(name);
 }
 for(const [rank,name,channels,videos] of prodOnly){
   assert.equal(byRank.get(rank)?.name,name);
   assert.equal(byRank.get(rank)?.channels,channels);
   assert.equal(byRank.get(rank)?.videos,videos);
   assert.ok(!indexes.has(rank)&&!allNames.has(name));
   indexes.add(rank);allNames.add(name);
 }
 assert.equal(indexes.size,8713);
 assert.equal(sourceOnly.length,new Set(sourceOnly.map(x=>x[0])).size);
});

test("the executed full-result JSON and sharded reusable rows are exactly consistent",()=>{
 assert.equal(original.metrics.production_exact_unique_source_match,5217);
 assert.equal(original.metrics.production_no_exact_source_match,3496);
 assert.equal(original.metrics.source_raw_labels_without_unique_production_match,748);
 assert.equal(original.metrics.exact_matched_different_title_counts,4947);
 assert.equal(original.metrics.exact_matched_equal_title_counts,270);
 assert.equal(original.metrics.old_5720_aggregate_mismatch_count,865);
 assert.equal(original.metrics.previously_reviewed_245_exact_original_id_sets_preserved,true);
 const origMatched=new Map(original.linked.map(x=>[x.rank,x]));
 const origProdOnly=new Map(original.production_only.map(x=>[x.rank,x]));
 const origSourceOnly=new Map(original.source_only.map(x=>[x.name,x]));
 for(const [rank,name,sourceName,pc,pv,sc,sv,origin] of matched){
   const x=origMatched.get(rank);
   assert.deepEqual([name,sourceName,pc,pv,sc,sv,origin],
      [x.name,x.source_name,x.prod_ch,x.prod_vid,x.source_ch,x.source_vid,x.source_origin]);
 }
 for(const [rank,name,channels,videos] of prodOnly){
   const x=origProdOnly.get(rank);
   assert.deepEqual([name,channels,videos],[x.name,x.channels,x.videos]);
 }
 for(const [name,channels,videos,origin] of sourceOnly){
   const x=origSourceOnly.get(name);
   assert.deepEqual([channels,videos,origin],[x.source_ch,x.source_vid,x.origin]);
 }
 assert.equal(matched.filter(r=>r[3]!==r[5]||r[4]!==r[6]).length,4947);
 assert.equal(matched.filter(r=>r[3]===r[5]&&r[4]===r[6]).length,270);
});

test("15 historical identity review groups remain source-only, without false Person approvals",()=>{
 const groups=summary.historical_person_prioritized_groups;
 assert.equal(groups.length,15);
 const historicallyMatched=groups.filter(x=>x.production_exact_matched_forms.length>0);
 assert.equal(historicallyMatched.length,13);
 assert.equal(groups.find(x=>x.identity==="Shivaji").production_exact_matched_forms.length,2);
 for(const name of ["C. S. Lewis","Hürrem Sultan"]){
    const v=groups.find(x=>x.identity===name);
    assert.ok(v);
    assert.equal(v.production_exact_matched_forms.length,0);
    assert.equal(v.missing_exact_source_form_in_live.length,1);
 }
 for(const g of groups){
   assert.equal(g.video_content_verified,false);
   assert.equal(g.registered_aliases_final_rescreen_pending,true);
   assert.equal(g.actual_channel_id_union_not_yet_rank_approved,true);
 }
 assert.equal(summary.production_single_rank_publication_permitted,false);
 assert.equal(summary.all_labels_personhood_confirmed,false);
 assert.equal(summary.registered_person_last_gate_confirmed,false);
});
