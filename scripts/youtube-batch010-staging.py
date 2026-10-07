#!/usr/bin/env python3
import concurrent.futures, gzip, json, subprocess, time
from pathlib import Path

ROOT = Path("out/youtube-batch010")
VIDEOS = ROOT / "videos"
VIDEOS.mkdir(parents=True, exist_ok=True)
Y = "yt-dlp"

PRIOR_BATCHES = {
    "batch008": Path("prior/batch008"),
    "batch009": Path("prior/batch009"),
}

def load_ids(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise RuntimeError(f"{path} must contain a JSON list")
    ids = []
    for i, row in enumerate(data):
        if not isinstance(row, dict) or not row.get("channel_id"):
            raise RuntimeError(f"{path} row {i} missing channel_id")
        ids.append(row["channel_id"])
    if len(ids) != len(set(ids)):
        raise RuntimeError(f"{path} contains duplicate channel_id values")
    return set(ids)

prior_by_batch = {}
for batch, base in PRIOR_BATCHES.items():
    candidates_path = base / "candidates.json"
    manifest_path = base / "manifest.json"
    if not candidates_path.exists() or not manifest_path.exists():
        raise RuntimeError(f"missing required prior files for {batch}")
    candidate_ids = load_ids(candidates_path)
    manifest_ids = load_ids(manifest_path)
    if candidate_ids != manifest_ids:
        raise RuntimeError(
            f"{batch} candidates/manifest Channel ID mismatch: "
            f"candidates={len(candidate_ids)} manifest={len(manifest_ids)}"
        )
    prior_by_batch[batch] = candidate_ids

prior_overlap = prior_by_batch["batch008"] & prior_by_batch["batch009"]
prior = set().union(*prior_by_batch.values())

regions = [
"West Africa","East Africa","Horn of Africa","Maghreb","Sahel","Ethiopia","Nigeria","Ghana","Kenya","Sudan","South Africa",
"Britain","Ireland","France","Germany","Italy","Spain","Portugal","Netherlands","Belgium","Poland","Czechia","Slovakia","Hungary","Romania","Bulgaria","Serbia","Croatia","Greece","Finland","Sweden","Norway","Denmark","Ukraine","Russia",
"Arab world","Levant","Persia","Iran","Ottoman Empire","Turkey","Armenia","Georgia","Central Asia","Afghanistan",
"India","Pakistan","Bangladesh","Sri Lanka","Nepal","China","Japan","Korea","Taiwan","Mongolia","Tibet",
"Indonesia","Philippines","Vietnam","Thailand","Malaysia","Cambodia","Myanmar",
"Mexico","Brazil","Argentina","Chile","Peru","Colombia","Venezuela","Cuba","Caribbean","Central America",
"United States","Canada","Australia","New Zealand","Pacific Islands","Indigenous history"
]
roles = [
"monarch","statesman","president","prime minister","general","admiral","warrior","scientist","physicist","chemist","biologist",
"mathematician","astronomer","physician","inventor","engineer","architect","philosopher","theologian","scholar","historian",
"writer","novelist","poet","playwright","artist","painter","sculptor","composer","musician","explorer","navigator","merchant",
"industrialist","entrepreneur","reformer","revolutionary","activist","religious leader","woman leader"
]
queries = []
for r in regions:
    queries += [
        f"{r} biography historical figure",
        f"{r} notable people history",
        f"{r} historical personality documentary",
    ]
for r in [
    "Africa","India","China","Japan","Korea","Arab world","Persia","Ottoman Empire","Russia",
    "Eastern Europe","Latin America","Southeast Asia","Mexico","Brazil","Peru","Indonesia","Vietnam","Philippines"
]:
    for role in roles:
        queries.append(f"{r} {role} life story history")
queries += [
"obscure historical biography channel","forgotten historical personalities documentary","lesser known people who changed history",
"biography of historical leaders channel","history through people channel","historical lives documentary channel",
"royalty biography channel history","military biography history channel","scientist biography history channel",
"writer poet biography history channel","artist composer biography history channel","explorer biography history channel",
"personajes históricos desconocidos biografía","biografías de personajes olvidados historia","grandes figuras históricas documental",
"personnages historiques oubliés biographie","figures historiques méconnues documentaire",
"vergessene historische Persönlichkeiten Biografie","weniger bekannte historische Personen",
"personagens históricos esquecidos biografia","figuras históricas pouco conhecidas",
"personaggi storici dimenticati biografia","personaggi storici meno conosciuti",
"забытые исторические личности биография","малоизвестные исторические деятели",
"zapomniane postacie historyczne biografia","mniej znane postacie historii",
"unutulmuş tarihi şahsiyetler","az bilinen tarihi kişilikler biyografi",
"شخصيات تاريخية منسية","شخصيات تاريخية غير مشهورة سيرة",
"شخصیت های تاریخی فراموش شده","چهره های کمتر شناخته شده تاریخ",
"भूले बिसरे ऐतिहासिक व्यक्ति जीवनी","कम प्रसिद्ध ऐतिहासिक हस्तियां",
"被遗忘的历史人物","冷门历史名人 传记","历史人物 生平 纪录",
"忘れられた歴史人物","あまり知られていない偉人","人物伝 歴史",
"잊혀진 역사 인물","덜 알려진 역사 인물","역사 인물 생애 다큐",
"tokoh sejarah terlupakan","tokoh sejarah kurang terkenal biografi",
"nhân vật lịch sử bị lãng quên","nhân vật lịch sử ít nổi tiếng",
"บุคคลประวัติศาสตร์ที่ถูกลืม","บุคคลสำคัญที่ไม่ค่อยมีคนรู้จัก",
"nakalimutang bayani kasaysayan","hindi kilalang makasaysayang tao"
]
queries = list(dict.fromkeys(queries))

(ROOT / "denylist.json").write_text(
    json.dumps({
        "sources": {k: len(v) for k, v in prior_by_batch.items()},
        "source_overlap": len(prior_overlap),
        "union_count": len(prior),
        "channel_ids": sorted(prior),
    }, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

def run(args, timeout):
    return subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)

def search(q):
    try:
        p = run([Y, "--flat-playlist", "--dump-single-json", f"ytsearch12:{q}"], 55)
        if p.returncode:
            return []
        j = json.loads(p.stdout)
        out = []
        seen = set()
        for e in j.get("entries") or []:
            cid = e.get("channel_id")
            if cid and cid not in prior and cid not in seen:
                seen.add(cid)
                out.append((cid, e.get("channel") or ""))
        return out
    except Exception:
        return []

hits = {}
start = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
    for rows in ex.map(search, queries):
        for cid, name in rows:
            item = hits.setdefault(cid, {"channel_name": name, "search_hits": 0})
            if name:
                item["channel_name"] = name
            item["search_hits"] += 1

ranked = sorted(
    hits.items(),
    key=lambda kv: (kv[1]["search_hits"], kv[1]["channel_name"]),
    reverse=True,
)
if len(ranked) < 650:
    raise RuntimeError(f"only {len(ranked)} new candidates remained after denylist; need 650")

selected = [{"channel_id": cid, **meta} for cid, meta in ranked[:650]]
selected_ids = {x["channel_id"] for x in selected}
if len(selected_ids) != 650:
    raise RuntimeError("selected Channel IDs are not unique")
selected_prior_overlap = selected_ids & prior
if selected_prior_overlap:
    raise RuntimeError(f"selected prior Channel IDs: {sorted(selected_prior_overlap)[:10]}")

(ROOT / "candidates.json").write_text(
    json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("DISCOVERY", json.dumps({
    "prior_batch008": len(prior_by_batch["batch008"]),
    "prior_batch009": len(prior_by_batch["batch009"]),
    "prior_source_overlap": len(prior_overlap),
    "prior_union": len(prior),
    "queries": len(queries),
    "unique_new": len(ranked),
    "selected_new": len(selected),
    "selected_prior_overlap": 0,
    "sec": round(time.time() - start, 1),
}), flush=True)

def scan(x):
    cid = x["channel_id"]
    try:
        p = run(
            [Y, "--flat-playlist", "--playlist-end", "3000", "--dump-single-json",
             f"https://www.youtube.com/channel/{cid}/videos"],
            75,
        )
        if p.returncode:
            return {"channel_id": cid, "channel_name": x["channel_name"], "status": "ERR", "count": 0}
        j = json.loads(p.stdout)
        entries = j.get("entries") or []
        if not entries:
            return {"channel_id": cid, "channel_name": x["channel_name"], "status": "EMPTY", "count": 0}
        with gzip.open(VIDEOS / f"{cid}.ndjson.gz", "wt", encoding="utf-8") as f:
            for e in entries:
                f.write(json.dumps({
                    "video_id": e.get("id"),
                    "channel_id": cid,
                    "title": e.get("title"),
                }, ensure_ascii=False, separators=(",", ":")) + "\n")
        return {
            "channel_id": cid,
            "channel_name": j.get("channel") or x["channel_name"],
            "status": "OK",
            "count": len(entries),
        }
    except Exception:
        return {"channel_id": cid, "channel_name": x["channel_name"], "status": "ERR", "count": 0}

out = []
scan_start = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
    futs = [ex.submit(scan, x) for x in selected]
    for i, fut in enumerate(concurrent.futures.as_completed(futs), 1):
        out.append(fut.result())
        if i % 50 == 0:
            print("PROGRESS", json.dumps({
                "done": i,
                "ok": sum(x["status"] == "OK" for x in out),
                "videos": sum(x["count"] for x in out if x["status"] == "OK"),
                "sec": round(time.time() - scan_start, 1),
            }), flush=True)

out.sort(key=lambda x: x["channel_id"])
manifest_ids = {x["channel_id"] for x in out}
if manifest_ids != selected_ids or len(out) != 650:
    raise RuntimeError(
        f"manifest mismatch: rows={len(out)} manifest_ids={len(manifest_ids)} selected={len(selected_ids)}"
    )
if manifest_ids & prior:
    raise RuntimeError("manifest contains a prior-batch Channel ID")

(ROOT / "manifest.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
)
summary = {
    "selected": 650,
    "ok": sum(x["status"] == "OK" for x in out),
    "err": sum(x["status"] == "ERR" for x in out),
    "empty": sum(x["status"] == "EMPTY" for x in out),
    "videos": sum(x["count"] for x in out if x["status"] == "OK"),
    "prior_batch008": len(prior_by_batch["batch008"]),
    "prior_batch009": len(prior_by_batch["batch009"]),
    "prior_source_overlap": len(prior_overlap),
    "prior_union": len(prior),
    "selected_prior_overlap": 0,
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
}
(ROOT / "summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
)
print("FINAL", json.dumps(summary), flush=True)
