#!/usr/bin/env python3
"""Incremental YouTube history channel discovery. Batch numbers are provenance only."""
import argparse
import collections
import concurrent.futures
import gzip
import json
import re
import shutil
import subprocess
import time
from pathlib import Path

BATCH_RE=re.compile(r"batch(\d{3})")
REGIONS=[
 "West Africa","East Africa","North Africa","Southern Africa","Sahel","Horn of Africa","Ethiopia","Nigeria","Ghana","Kenya","Sudan","South Africa","Mali","Senegal","Egypt","Morocco","Algeria","Tunisia",
 "Britain","Ireland","Scotland","France","Germany","Italy","Spain","Portugal","Netherlands","Belgium","Poland","Czechia","Slovakia","Hungary","Romania","Bulgaria","Serbia","Croatia","Bosnia","Greece","Finland","Sweden","Norway","Denmark","Ukraine","Russia","Byzantium","Baltic states","Iceland",
 "Arab world","Levant","Persia","Iran","Ottoman Empire","Turkey","Armenia","Georgia","Central Asia","Afghanistan","Iraq","Syria","Arabia","Israel","Palestine",
 "India","Pakistan","Bangladesh","Sri Lanka","Nepal","China","Japan","Korea","Taiwan","Mongolia","Tibet","Bhutan",
 "Indonesia","Philippines","Vietnam","Thailand","Malaysia","Cambodia","Myanmar","Laos","Singapore",
 "Mexico","Brazil","Argentina","Chile","Peru","Colombia","Venezuela","Cuba","Caribbean","Central America","Bolivia","Ecuador","Guatemala",
 "United States","Canada","Australia","New Zealand","Pacific Islands","Indigenous history",
 "Ancient Greece","Ancient Rome","Mesopotamia","Maya","Aztec","Inca","Bronze Age","Medieval Europe","Renaissance",
]
ROLES=["monarch","king","queen","emperor","statesman","president","prime minister","general","admiral","warrior","scientist","physicist","chemist","biologist","mathematician","astronomer","physician","inventor","engineer","architect","philosopher","theologian","scholar","historian","writer","novelist","poet","playwright","artist","painter","sculptor","composer","musician","explorer","navigator","industrialist","entrepreneur","reformer","revolutionary","activist","religious leader","woman leader"]
LANGUAGE_QUERIES=[
 "personajes históricos olvidados biografía","personajes históricos desconocidos documental","biografías personajes historia",
 "personnages historiques oubliés biographie","figures historiques méconnues documentaire",
 "vergessene historische Persönlichkeiten Biografie","historische Persönlichkeiten Doku",
 "personagens históricos esquecidos biografia","história personagens importantes",
 "personaggi storici dimenticati biografia","biografie personaggi storici",
 "забытые исторические личности биография","исторические личности документальный фильм",
 "zapomniane postacie historyczne biografia","ważne postacie historii",
 "tarihi şahsiyetler biyografi","unutulmuş tarihi kişiler","شخصيات تاريخية سيرة","شخصيات تاريخية مجهولة","شخصیت های تاریخی زندگینامه",
 "ऐतिहासिक व्यक्तियों की जीवनी","इतिहास के महान व्यक्तित्व",
 "历史人物 传记","被遗忘的历史人物","历史人物 生平 纪录","历史名人 人物志",
 "歴史人物 伝記","忘れられた歴史人物","偉人 歴史 ドキュメンタリー","잊혀진 역사 인물","역사 인물 다큐",
 "tokoh sejarah biografi","tokoh sejarah terlupakan","nhân vật lịch sử tiểu sử","nhân vật lịch sử ít biết",
 "บุคคลประวัติศาสตร์ ชีวประวัติ","makasaysayang tao talambuhay","sejarah tokoh terkenal",
]

def manifests(root):
    result={}
    for path in Path(root).rglob("manifest.json"):
        labels=BATCH_RE.findall(str(path))
        if len(labels)!=1:
            raise RuntimeError(f"cannot classify manifest {path}: {labels}")
        label="batch"+labels[0]
        if label in result: raise RuntimeError(f"duplicate manifest for {label}")
        result[label]=path
    if not result: raise RuntimeError(f"no previous manifest under {root}")
    expected=[f"batch{i:03d}" for i in range(8,max(int(k[5:]) for k in result)+1)]
    if sorted(result)!=expected: raise RuntimeError(f"noncontinuous retained batches: {sorted(result)}")
    return result

def known_ids(root):
    ids=set()
    stats={}
    for label,path in sorted(manifests(root).items()):
        rows=json.loads(path.read_text(encoding="utf-8"))
        batch=set()
        for row in rows:
            cid=str(row.get("channel_id") or "").strip()
            if not cid or cid in ids or cid in batch:
                raise RuntimeError(f"empty/repeated Channel ID in {label}: {cid}")
            batch.add(cid)
        ids.update(batch)
        stats[label]=len(batch)
    return ids,stats

def commands(args,timeout):
    try:
        p=subprocess.run(args,capture_output=True,text=True,timeout=timeout)
        if p.returncode: return None
        return json.loads(p.stdout)
    except (subprocess.TimeoutExpired,ValueError,OSError):
        return None

def discover(args):
    prior,stats=known_ids(args.prior)
    queries=[]
    for region in REGIONS:
        queries.extend((f"{region} biography historical figure",f"{region} notable people history",f"{region} historical documentary biography"))
        for role in ROLES:
            queries.append(f"{region} {role} biography history")
    queries+=LANGUAGE_QUERIES
    queries+=["biography of historical leaders","forgotten historical figures","obscure historical biography channel","scientist biography documentary","female leaders history documentary"]
    queries=list(dict.fromkeys(queries))
    def search(query):
        obj=commands(["yt-dlp","--flat-playlist","--dump-single-json","--no-warnings",f"ytsearch12:{query}"],65)
        found={}
        if obj:
            for row in obj.get("entries") or []:
                cid=row.get("channel_id")
                if cid and cid not in prior:
                    found[cid]=str(row.get("channel") or "")
        return found
    hits=collections.Counter()
    names={}
    successful=0
    started=time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=18) as executor:
        futures=[executor.submit(search,query) for query in queries]
        for done,future in enumerate(concurrent.futures.as_completed(futures),1):
            rows=future.result()
            if rows: successful+=1
            for cid,name in rows.items():
                hits[cid]+=1
                if name: names[cid]=name
            if done%250==0:
                print("DISCOVERY_PROGRESS",json.dumps({"queries_done":done,"queries_total":len(queries),"candidate_ids":len(hits),"successful_queries":successful,"seconds":round(time.time()-started)}),flush=True)
    selected=[{"channel_id":cid,"channel_name":names.get(cid,""),"search_hits":score}
              for cid,score in sorted(hits.items(),key=lambda item:(-item[1],item[0]))[:args.target]]
    if len(selected)<600: raise RuntimeError(f"too few new candidate Channel IDs: {len(selected)}")
    dest=Path(args.output);dest.mkdir(parents=True,exist_ok=True)
    (dest/"candidates.json").write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding="utf-8")
    summary={"selected":len(selected),"candidate_pool":len(hits),"old_channel_ids":len(prior),"old_batches":stats,"searches":len(queries),"successful_queries":successful}
    (dest/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print("DISCOVERY",json.dumps(summary),flush=True)

def scan(args):
    rows=json.loads(Path(args.selection).read_text(encoding="utf-8"))
    if len({x["channel_id"] for x in rows})!=len(rows):raise RuntimeError("duplicate selected IDs")
    selected=rows[args.shard::args.shards]
    label=f"batch{12+args.shard:03d}"
    folder=Path(args.output)/label; video_dir=folder/"videos";video_dir.mkdir(parents=True,exist_ok=True)
    def scrape(row):
        cid=row["channel_id"]
        obj=commands(["yt-dlp","--flat-playlist","--playlist-end","3000","--dump-single-json","--no-warnings",f"https://www.youtube.com/channel/{cid}/videos"],110)
        if not obj: return {"channel_id":cid,"channel_name":row.get("channel_name",""),"status":"ERR","count":0}
        entries=obj.get("entries") or []
        if not entries:return {"channel_id":cid,"channel_name":row.get("channel_name",""),"status":"EMPTY","count":0}
        with gzip.open(video_dir/f"{cid}.ndjson.gz","wt",encoding="utf-8") as handle:
            for video in entries:
                handle.write(json.dumps({"video_id":video.get("id"),"channel_id":cid,"title":video.get("title")},ensure_ascii=False,separators=(",",":"))+"\n")
        return {"channel_id":cid,"channel_name":obj.get("channel") or row.get("channel_name",""),"status":"OK","count":len(entries)}
    results=[]
    started=time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as executor:
        futures=[executor.submit(scrape,row) for row in selected]
        for done,future in enumerate(concurrent.futures.as_completed(futures),1):
            results.append(future.result())
            if done%50==0:
                print("SCAN_PROGRESS",json.dumps({"batch":label,"completed":done,"selected":len(selected),"success":sum(x["status"]=="OK" for x in results),"videos":sum(x["count"] for x in results),"seconds":round(time.time()-started)}),flush=True)
    results.sort(key=lambda row:row["channel_id"])
    if {x["channel_id"] for x in results}!={x["channel_id"] for x in selected}:raise RuntimeError("scan result ID mismatch")
    (folder/"manifest.json").write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding="utf-8")
    (folder/"candidates.json").write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding="utf-8")
    summary={"batch":label,"selected":len(selected),"ok":sum(x["status"]=="OK" for x in results),"err":sum(x["status"]=="ERR" for x in results),"empty":sum(x["status"]=="EMPTY" for x in results),"videos":sum(x["count"] for x in results)}
    (folder/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print("SCAN_FINAL",json.dumps(summary),flush=True)

def pack(args):
    prior_ids,prior_stats=known_ids(args.prior)
    out=Path(args.output)
    shutil.copytree(args.prior,out/"prior"/"archive",dirs_exist_ok=True)
    new_ids=set()
    totals=collections.Counter()
    for shard in range(args.shards):
        label=f"batch{12+shard:03d}"
        dirs=list(Path(args.parts).rglob(f"{label}/manifest.json"))
        if len(dirs)!=1:raise RuntimeError(f"{label} requires exactly 1 artifact manifest; found {len(dirs)}")
        source=dirs[0].parent
        manifest=json.loads((source/"manifest.json").read_text(encoding="utf-8"))
        candidates=json.loads((source/"candidates.json").read_text(encoding="utf-8"))
        actual={row["channel_id"] for row in manifest}
        if len(actual)!=len(manifest) or actual!={row["channel_id"] for row in candidates}:
            raise RuntimeError(f"candidate / manifest mismatch {label}")
        overlap=actual&(prior_ids|new_ids)
        if overlap:raise RuntimeError(f"Channel ID overlap in {label}: {list(overlap)[:3]}")
        new_ids|=actual
        for row in manifest:
            totals[row["status"]]+=1
            if row["status"]=="OK":
                video=source/"videos"/f"{row['channel_id']}.ndjson.gz"
                if not video.exists():raise RuntimeError(f"missing video archive {video}")
                with gzip.open(video,"rt",encoding="utf-8") as handle:
                    actual_lines=sum(1 for _ in handle)
                if actual_lines!=row["count"]:raise RuntimeError(f"video count mismatch {row['channel_id']}")
                totals["videos"]+=actual_lines
        shutil.copytree(source,out/"out"/label,dirs_exist_ok=True)
    ids,stats=known_ids(out)
    if len(ids)!=len(prior_ids)+len(new_ids):raise RuntimeError("final ID union mismatch")
    summary={"retained_success":2128,"prior_selected":len(prior_ids),"new_selected":len(new_ids),"new_success":totals["OK"],"new_errors":totals["ERR"],"new_empty":totals["EMPTY"],"new_videos":totals["videos"],"target_success":2715,"target_met":totals["OK"]>=2715,"all_selected":len(ids),"batches":stats}
    (out/"recollection-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RECOLLECTION_FINAL",json.dumps(summary),flush=True)

def main():
    p=argparse.ArgumentParser()
    sp=p.add_subparsers(dest="mode",required=True)
    d=sp.add_parser("discover");d.add_argument("--prior",required=True);d.add_argument("--output",required=True);d.add_argument("--target",type=int,default=4200)
    s=sp.add_parser("scan");s.add_argument("--selection",required=True);s.add_argument("--output",required=True);s.add_argument("--shard",type=int,required=True);s.add_argument("--shards",type=int,default=6)
    z=sp.add_parser("pack");z.add_argument("--prior",required=True);z.add_argument("--parts",required=True);z.add_argument("--output",required=True);z.add_argument("--shards",type=int,default=6)
    args=p.parse_args()
    {"discover":discover,"scan":scan,"pack":pack}[args.mode](args)

if __name__=="__main__":main()
