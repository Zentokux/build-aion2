"""Extrae de fuentes/ las builds (crudo/builds/<clase>.json) y guías (crudo/guias/<slug>.json)."""
import json, os, glob
from flight import rows, flight, find
D = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(D, "crudo", "builds"), exist_ok=True)
os.makedirs(os.path.join(D, "crudo", "guias"), exist_ok=True)

def deref(v, r):
    if isinstance(v, str) and v.startswith("$") and v[1:] in r and isinstance(r[v[1:]], str):
        return r[v[1:]]
    return v

for p in sorted(glob.glob(os.path.join(D, "fuentes", "*.html"))):
    name = os.path.basename(p)[:-5]
    cat = name.split("__")[0]
    if cat in ("news", "planner", "events", "build-guides") and "__" not in name: continue
    r = rows(flight(open(p, encoding="utf8").read()))
    posts = [d for v in r.values() for d in find(v, lambda d: "isBuildGuide" in d and "metadata" in d)]
    if not posts: print("sin post", name); continue
    post = posts[0]
    meta = post["metadata"]
    href = "https://metaroad.gg/es/aion2/" + name.replace("__", "/")
    info = next((x for v in r.values() for x in find(v, lambda x: x.get("href", "").endswith(name.split("__")[-1]) and "title" in x)), {})
    out = {"slug": name, "categoria": cat, "url": href, "titulo": info.get("title"),
           "titulo_en": meta.get("seo_title"), "fecha": next((x.get("updated_at") or x.get("published_at") for v in r.values() for x in find(v, lambda x: "published_at" in x)), None)}
    if post.get("isBuildGuide"):
        secs = []
        for s in meta["aion2_guide"]["sections"]:
            s = dict(s)
            for k in ("html",): s[k] = deref(s.get(k), r)
            secs.append(s)
        out["secciones"] = secs
        b = next(d for v in r.values() for d in find(v, lambda d: "skillBar" in d and "classSlug" in d))
        out["build"] = json.loads(json.dumps(b, default=str).replace('"$', '"$'))
        json.dump(out, open(os.path.join(D, "crudo", "builds", meta["class"] + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print("build", meta["class"], len(secs))
    else:
        out["intro"] = deref(post.get("content"), r)
        out["secciones"] = [{"titulo": b.get("title"), "html": deref(b.get("content"), r)} for b in meta.get("content_blocks", [])]
        json.dump(out, open(os.path.join(D, "crudo", "guias", name + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
