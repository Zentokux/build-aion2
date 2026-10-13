import json, os, re
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
def datos(pg):
    t = re.sub(r"\s+", " ", pg.locator("body").inner_text())
    g = lambda r: (re.search(r, t) or [None, None])[1]
    return {"titulos": g(r"Títulos ?(\d+)"), "arcanas": g(r"Arcanas ?(\d+)"), "alas": g(r"Alas ?(\d+)"),
            "raza": g(r"Comprensión de raza ?(\d+)"), "gs": g(r"★ ?([\d.,]+)") , "pasivas": g(r"(\d+) PASIVAS|(\d+) pasivas")}
fallos = 0
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", args=["--allow-file-access-from-files"])
    for c in ["assassin", "gladiator", "templar", "ranger", "sorcerer", "spiritmaster", "cleric", "chanter"]:
        url = json.load(open(os.path.join(D, "crudo", "builds", c + ".json"), encoding="utf8"))["url"]
        mr = b.new_page(); mr.goto(url, wait_until="load", timeout=120000); mr.wait_for_timeout(4000)
        lo = b.new_page(); lo.goto("file:///" + R.replace("\\", "/") + "/clase.html?c=" + c); lo.wait_for_timeout(1500)
        a, z = datos(mr), datos(lo)
        print(c, "metaroad", a, "\n", " " * len(c), "nuestra ", z)
        fallos += sum(1 for k in a if a[k] != z[k])
        mr.close(); lo.close()
    b.close()
print("DIFERENCIAS", fallos)
