#!/usr/bin/env python3
import concurrent.futures
import gzip
import json
import os
import subprocess
import time
from pathlib import Path

ROOT=Path("out/youtube-batch008")
VIDEOS=ROOT/"videos"
VIDEOS.mkdir(parents=True,exist_ok=True)
Y="yt-dlp"

REGIONS=[
"Africa","West Africa","East Africa","North Africa","Southern Africa","Ethiopia","Nigeria","Ghana","Kenya","Sudan",
"Britain","Ireland","France","Germany","Italy","Spain","Portugal","Poland","Ukraine","Russia","Balkans","Scandinavia",
"Arab history","Persian history","Ottoman history","Turkey","Central Asia","Caucasus",
"India","Pakistan","Bangladesh","China","Japan","Korea","Mongolia","Indonesia","Philippines","Vietnam","Thailand","Malaysia","Cambodia",
"Mexico","Brazil","Argentina","Chile","Peru","Colombia","Cuba","Caribbean","United States","Canada","Australia","New Zealand"
]
ROLES=[
"monarch","king","queen","emperor","president","prime minister","general","commander","scientist","inventor","engineer",
"doctor","mathematician","philosopher","writer","poet","artist","painter","composer","explorer","reformer","revolutionary","religious leader","women"
]
QUERIES=[]
for r in REGIONS:
    QUERIES += [f"{r} historical figures biography",f"{r} famous people history",f"{r} biography documentary"]
for r in ["Africa","India","China","Japan","Korea","Middle East","Latin America","Europe","Britain","Russia","Southeast Asia","Ottoman Empire","Persia","Mexico","Brazil"]:
    for role in ROLES:
        QUERIES.append(f"{r} {role} biography")
QUERIES += [
"obscure historical figures biography","forgotten historical people biography","lesser known historical figures documentary",
"historical life stories channel","great lives history biography","historical personalities documentary",
"personajes históricos biografía","personajes históricos poco conocidos","biografías grandes personajes",
"personnages historiques biographie","personnages historiques méconnus","grandes figures histoire",
"historische Persönlichkeiten Biografie","vergessene historische Personen","große Persönlichkeiten Geschichte",
"personagens históricos biografia","personagens históricos pouco conhecidos","grandes figuras história",
"исторические личности биография","малоизвестные исторические личности","великие люди история",
"postacie historyczne biografia","mniej znane postacie historyczne","wielkie postacie historii",
"tarihi kişilikler biyografi","az bilinen tarihi şahsiyetler","önemli tarihi kişiler",
"شخصيات تاريخية سيرة","شخصيات تاريخية غير معروفة","عظماء التاريخ",
"ऐतिहासिक व्यक्तित्व जीवनी","कम प्रसिद्ध ऐतिहासिक व्यक्ति","महान व्यक्ति इतिहास",
"历史人物 传记","冷门历史人物","历史名人 故事",
"歴史人物 伝記","知られざる偉人","人物史 解説",
"역사 인물 이야기","잘 알려지지 않은 역사 인물","인물사 이야기",
"tokoh sejarah biografi","tokoh sejarah kurang dikenal","pahlawan sejarah biografi",
"nhân vật lịch sử tiểu sử","nhân vật lịch sử ít biết","danh nhân lịch sử",
"บุคคลสำคัญ ประวัติศาสตร์","บุคคลประวัติศาสตร์ที่ไม่ค่อยรู้จัก","ชีวประวัติบุคคลสำคัญ",
"talambuhay makasaysayang tao","di kilalang bayani kasaysayan"
]
QUERIES=list(dict.fromkeys(QUERIES))

def run(args,timeout):
    return subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=timeout)

def search(q):
    try:
        p=run([Y,"--flat-playlist","--dump-single-json",f"ytsearch12:{q}"],55)
        if p.returncode:
            return []
        j=json.loads(p.stdout)
        out=[]
        seen=set()
        for e in j.get("entries") or []:
            cid=e.get("channel_id")
            if cid and cid not in seen:
                seen.add(cid)
                out.append((cid,e.get("channel") or ""))
        return out
    except Exception:
        return []

hits={}
start=time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
    for rows in ex.map(search,QUERIES):
        for cid,name in rows:
            item=hits.setdefault(cid,{"channel_name":name,"search_hits":0})
            if name:
                item["channel_name"]=name
            item["search_hits"]+=1

ranked=sorted(hits.items(),key=lambda kv:(kv[1]["search_hits"],kv[1]["channel_name"]),reverse=True)
selected=[{"channel_id":cid,**meta} for cid,meta in ranked[:620]]
(ROOT/"candidates.json").write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding="utf-8")
print("DISCOVERY",json.dumps({"queries":len(QUERIES),"unique":len(ranked),"selected":len(selected),"sec":round(time.time()-start,1)}),flush=True)

def scan(x):
    cid=x["channel_id"]
    try:
        p=run([Y,"--flat-playlist","--playlist-end","3000","--dump-single-json",f"https://www.youtube.com/channel/{cid}/videos"],75)
        if p.returncode:
            return {"channel_id":cid,"channel_name":x["channel_name"],"status":"ERR","count":0}
        j=json.loads(p.stdout)
        entries=j.get("entries") or []
        if not entries:
            return {"channel_id":cid,"channel_name":x["channel_name"],"status":"EMPTY","count":0}
        path=VIDEOS/f"{cid}.ndjson.gz"
        with gzip.open(path,"wt",encoding="utf-8") as f:
            for e in entries:
                f.write(json.dumps({"video_id":e.get("id"),"channel_id":cid,"title":e.get("title")},ensure_ascii=False,separators=(",",":"))+"\n")
        return {"channel_id":cid,"channel_name":j.get("channel") or x["channel_name"],"status":"OK","count":len(entries)}
    except Exception:
        return {"channel_id":cid,"channel_name":x["channel_name"],"status":"ERR","count":0}

out=[]
scan_start=time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
    futs=[ex.submit(scan,x) for x in selected]
    for i,fut in enumerate(concurrent.futures.as_completed(futs),1):
        out.append(fut.result())
        if i%50==0:
            print("PROGRESS",json.dumps({"done":i,"ok":sum(x["status"]=="OK" for x in out),"videos":sum(x["count"] for x in out if x["status"]=="OK"),"sec":round(time.time()-scan_start,1)}),flush=True)

out.sort(key=lambda x:x["channel_id"])
(ROOT/"manifest.json").write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
summary={
    "selected":len(selected),
    "ok":sum(x["status"]=="OK" for x in out),
    "err":sum(x["status"]=="ERR" for x in out),
    "empty":sum(x["status"]=="EMPTY" for x in out),
    "videos":sum(x["count"] for x in out if x["status"]=="OK"),
    "generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
}
(ROOT/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
print("FINAL",json.dumps(summary),flush=True)
