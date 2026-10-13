"""Descarga las páginas en español de AION 2 de metaroad.gg (sitemap) a fuentes/."""
import os, re, sys, time
from flight import get
BASE = os.path.join(os.path.dirname(__file__), "fuentes")
os.makedirs(BASE, exist_ok=True)
sm = get("https://metaroad.gg/sitemap.xml")
urls = [u for u in re.findall(r"<loc>(https://metaroad\.gg/es/aion2/[^<]*)</loc>", sm) if "/database/" not in u]
for u in urls:
    name = u.replace("https://metaroad.gg/es/aion2/", "").replace("/", "__") + ".html"
    p = os.path.join(BASE, name)
    if os.path.exists(p) and "--force" not in sys.argv: continue
    try:
        open(p, "w", encoding="utf8").write(get(u)); print("ok", name)
    except Exception as e:
        print("ERROR", u, e)
    time.sleep(1.5)
print(len(urls), "urls")
