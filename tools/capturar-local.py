"""Captura nuestra página de clase (archivo local) a pantalla completa: tools/referencia/local-<clase>.png"""
import os, sys
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", args=["--allow-file-access-from-files"])
    for c in sys.argv[1:]:
        pg = b.new_page(viewport={"width": 1400, "height": 1000})
        errores = []
        pg.on("requestfailed", lambda r: errores.append("falta " + r.url[-60:]))
        pg.on("pageerror", lambda e: errores.append(str(e)))
        pg.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
        pg.goto("file:///" + R.replace("\\", "/") + "/clase.html?c=" + c)
        pg.wait_for_timeout(1500)
        h = pg.evaluate("document.body.scrollHeight")
        for y in range(0, h, 800):
            pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(80)
        pg.wait_for_timeout(1000)
        pg.on("requestfailed", lambda r: errores.append("falta " + r.url))
        pg.screenshot(path=os.path.join(D, "referencia", "local-" + c + ".png"), full_page=True)
        print(c, "errores:", errores[:5])
        pg.close()
    b.close()
