"""Compara nuestra página de clase con la de metaroad (Daevanion y fichas de habilidades)."""
import json, os, re, sys
from playwright.sync_api import sync_playwright
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
PRE = {"Launch priority": "Prioridad de lanzamiento", "Full PvE": "JcE completo"}
TEC = {"Mouse1": "Clic izq.", "Mouse2": "Clic der."}

def daev(pg, presets, tableros):
    out = {}
    for p in presets:
        pg.locator("button", has_text=p).first.click(); pg.wait_for_timeout(400)
        for t in tableros:
            pg.locator("button", has_text=re.compile("^" + t + " · ")).first.click(); pg.wait_for_timeout(400)
            txt = pg.locator("body").inner_text()
            m = re.search(r"(\d+) de (\d+) nodos · (\d+) / (\d+) puntos", txt)
            out[(PRE.get(p, p), t)] = m.groups() if m else None
    return out

def fichas(pg):
    txt = pg.locator("body").inner_text()
    txt = re.sub(r"[ \t]+\n", "\n", txt)
    res = {}
    for m in re.finditer(r"(?<=\n)([^\n]+)\n(?:Nv\. )(\d+(?: \(\d+ \+ \d+\))?)\s*(Mouse\d(?:·\d)?|Clic (?:izq|der)\.(?:·\d)?|[1-8QE](?:·\d)?)?", txt):
        res[m.group(1).strip()] = (m.group(2), TEC.get((m.group(3) or "").split("·")[0], (m.group(3) or "").split("·")[0]) + ("·" + m.group(3).split("·")[1] if m.group(3) and "·" in m.group(3) else ""))
    return res

clases = sys.argv[1:] or ["assassin", "gladiator", "templar", "ranger", "sorcerer", "spiritmaster", "cleric", "chanter"]
fallos = 0
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", args=["--allow-file-access-from-files"])
    for c in clases:
        url = json.load(open(os.path.join(D, "crudo", "builds", c + ".json"), encoding="utf8"))["url"]
        mr = b.new_page(viewport={"width": 1400, "height": 1000}); mr.goto(url, wait_until="load", timeout=120000); mr.wait_for_timeout(4000)
        lo = b.new_page(viewport={"width": 1400, "height": 1000}); lo.goto("file:///" + R.replace("\\", "/") + "/clase.html?c=" + c); lo.wait_for_timeout(1500)
        tabs = ["Nezekan", "Zikel", "Vaizel", "Triniel"]
        a = daev(mr, ["Launch priority", "Full PvE"], tabs)
        bb = daev(lo, ["Prioridad de lanzamiento", "JcE completo"], tabs)
        for k in a:
            if a[k] != bb.get(k):
                fallos += 1; print(c, "DAEVANION", k, "metaroad", a[k], "nuestra", bb.get(k))
        fa, fb = fichas(mr), fichas(lo)
        for n, v in fa.items():
            if n not in fb: fallos += 1; print(c, "FALTA ficha", n, v)
            elif fa[n] != fb[n]: fallos += 1; print(c, "FICHA", n, "metaroad", v, "nuestra", fb[n])
        print(c, "tableros comparados", len(a), "fichas", len(fa))
        mr.close(); lo.close()
    b.close()
print("FALLOS", fallos)
