"""Convierte data/textos/guias/*.json en data/guias/<slug>.js y data/indice.js."""
import json, os, glob
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDEN = ["getting-started", "progression", "dungeons", "raids", "pvp", "economy"]
os.makedirs(os.path.join(R, "data", "guias"), exist_ok=True)
indice = []
for p in sorted(glob.glob(os.path.join(R, "data", "textos", "guias", "*.json"))):
    g = json.load(open(p, encoding="utf8"))
    slug = os.path.basename(p)[:-5]
    g["slug"] = slug
    for b in g.get("bloques", []):
        if b.get("tipo") == "tabla":
            n = len(b["columnas"])
            assert all(len(f) == n for f in b["filas"]), (slug, b.get("titulo"))
    open(os.path.join(R, "data", "guias", slug + ".js"), "w", encoding="utf8").write(
        "window.GUIA = " + json.dumps(g, ensure_ascii=False) + ";\n")
    indice.append({"slug": slug, "categoria": g["categoria"], "titulo": g["titulo"], "resumen": g.get("resumen", "")})
indice.sort(key=lambda x: (ORDEN.index(x["categoria"]) if x["categoria"] in ORDEN else 99, x["titulo"]))
open(os.path.join(R, "data", "indice.js"), "w", encoding="utf8").write(
    "window.INDICE = " + json.dumps(indice, ensure_ascii=False, indent=1) + ";\n")
print(len(indice), "guías")
