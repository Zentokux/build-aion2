"""Abre cada build de metaroad en Edge (Playwright), pulsa las pestañas de tableros
y guarda lo que la página carga: crudo/tableros/<clase>.json y <clase>.i18n.json,
y una captura de referencia en referencia/<clase>.png."""
import json, os, glob
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(D, "crudo", "tableros"), exist_ok=True)
os.makedirs(os.path.join(D, "referencia"), exist_ok=True)
builds = {json.load(open(p, encoding="utf8"))["build"]["classSlug"]: json.load(open(p, encoding="utf8"))["url"]
          for p in glob.glob(os.path.join(D, "crudo", "builds", "*.json"))}
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge")
    for clase, url in sorted(builds.items()):
        pg = b.new_page(viewport={"width": 1400, "height": 1000})
        got = {}
        def on_resp(r, got=got):
            if "/api/aion2/planner/" in r.url and "boards" in r.url:
                key = "i18n" if "/i18n/" in r.url else "boards"
                try: got[key] = r.json()
                except Exception: pass
        pg.on("response", on_resp)
        pg.goto(url, wait_until="networkidle", timeout=90000)
        for t in ["Zikel", "Vaizel", "Triniel"]:
            btn = pg.locator("button", has_text=t).first
            if btn.count():
                btn.scroll_into_view_if_needed(); btn.click(); pg.wait_for_timeout(1500)
        pg.locator("button", has_text="Nezekan").first.click(); pg.wait_for_timeout(500)
        h = pg.evaluate("document.body.scrollHeight")
        for y in range(0, h, 900):
            pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(120)
        pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(D, "referencia", clase + ".png"), full_page=True)
        for k, v in got.items():
            json.dump(v, open(os.path.join(D, "crudo", "tableros", clase + (".i18n" if k == "i18n" else "") + ".json"), "w", encoding="utf8"), ensure_ascii=False)
        print(clase, list(got.keys()))
        pg.close()
    b.close()
