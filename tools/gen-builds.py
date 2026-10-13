"""Genera data/builds/<clase>.js (datos de metaroad + textos redactados) y baja los iconos.

Uso: python tools/gen-builds.py
Entrada: tools/crudo/builds/<clase>.json y data/textos/builds/<clase>.json (si existe).
"""
import json, os, re, time, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)
ASSETS = "https://guosmhnujsowkrkvuoyn.supabase.co/storage/v1/object/public/aion2-assets/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

CLASES = ["assassin", "gladiator", "templar", "ranger", "sorcerer", "spiritmaster", "cleric", "chanter"]

# Teclas de la barra del usuario: 1-8, Q, E, Clic izq., Clic der.
ORDEN_TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "Q", "E", "LMB", "RMB"]
# Tecla de cada casilla de build.skillBar según el texto «La barra» de metaroad
# (Mouse1 = LMB, Mouse2 = RMB). None = metaroad no la fija: va a la siguiente tecla libre.
# Los estigmas (build.stigmaBar) van siempre a las siguientes teclas libres.
TECLAS = {
    "assassin":     ["LMB", "RMB", None, None, None, None, None, None],
    "chanter":      ["LMB", "RMB", "1", "2", "3", "4", "Q", "E", None],
    "cleric":       ["LMB", "RMB", "1", "2", "3", "4", "Q", "E"],
    "gladiator":    ["LMB", "RMB", "1", "2", "3", "4", "Q"],
    "ranger":       ["LMB", "2", "3", None, None, None, None, None, None],
    "sorcerer":     ["LMB", "RMB", "1", "2", "3", "4", "Q", "E"],
    "spiritmaster": ["LMB", None, "1", "2", "3"],
    "templar":      ["LMB", "RMB", "1", "2", "3", "4", "Q"],
}
# Notas cuando la tecla de metaroad no existe en la barra del usuario
NOTA_TECLA = {
    ("ranger", 3): "metaroad: botón lateral del ratón",
    ("spiritmaster", 1): "metaroad: tecla T",
}
# Tecla de la macro: metaroad la fija en el clic derecho para Ranger, Hechicero y Espiritualista;
# en el resto solo dice «una tecla que mantengas pulsada».
MACRO_EN_RMB_METAROAD = {"ranger", "sorcerer", "spiritmaster"}

RANURAS = {
    "MainHand": "Arma", "SubHand": "Mano secundaria", "Helmet": "Casco", "Shoulder": "Hombreras",
    "Torso": "Torso", "Pants": "Pantalones", "Gloves": "Guantes", "Boots": "Botas", "Cape": "Capa",
    "Necklace": "Collar", "Amulet": "Amuleto", "Earring1": "Pendiente 1", "Earring2": "Pendiente 2",
    "Ring1": "Anillo 1", "Ring2": "Anillo 2", "Bracelet1": "Brazalete 1", "Bracelet2": "Brazalete 2",
    "Belt": "Cinturón", "Rune1": "Runa 1", "Rune2": "Runa 2", "Brooch1": "Broche 1", "Brooch2": "Broche 2",
    "Pendant": "Colgante", "Wings": "Alas", "TitleAttack": "Título (ataque)", "TitleDefense": "Título (defensa)",
    "TitleUtility": "Título (utilidad)", "Grail": "Cáliz", "Parchment": "Pergamino", "Compass": "Brújula",
    "Bell": "Campana", "Mirror": "Espejo",
}
GRADOS = {"Common": "Común", "Rare": "Raro", "Legend": "Legendario", "Unique": "Único", "Epic": "Épico", "Mythic": "Mítico"}
TIPOS = {"Mastery": "Activa", "Stigma": "Estigma"}


def bajar(carpeta, nombre, url):
    dest = os.path.join(R, "icons", carpeta, nombre)
    if os.path.exists(dest):
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        data = urllib.request.urlopen(req, timeout=30).read()
        open(dest, "wb").write(data)
        time.sleep(0.2)
        return True
    except Exception as e:
        print("  sin icono", url, e)
        return False


def gen(clase):
    crudo = json.load(open(os.path.join(D, "crudo", "builds", clase + ".json"), encoding="utf8"))
    b = crudo["build"]
    sr = b["skillRotation"]
    stat = lambda k: (b["statInfo"].get(k) or {}).get("name", k)

    # --- habilidades ---
    info = {}
    for s in (b["skillBar"] or []) + (b["stigmaBar"] or []) + (b["skillPassives"] or []) + \
             [x for v in (b["skillContext"] or {}).values() for x in v if x]:
        if s:
            info[s["id"]] = s
    nombres = {s["id"]: s["name"] for s in sr["skills"]}
    habil = []
    for s in sr["skills"]:
        sid = s["id"]
        bajar("habilidades", s["icon"] + ".webp", ASSETS + "skill-icons/" + s["icon"] + ".webp")
        li = b["skillLevelInfo"].get(sid, {})
        full = info.get(sid, {})
        elegidas = set(b["skillSpecs"].get(sid, []))
        specs = [{"nivel": sp["level"], "texto": sp["text"], "elegida": sp["id"] in elegidas}
                 for sp in full.get("specializations", [])]
        habil.append({
            "id": sid, "nombre": s["name"], "icono": s["icon"],
            "tipo": "Pasiva" if s["kind"] == "Passive" else TIPOS.get(s["acquire"], s["acquire"]),
            "nivel": li.get("level"), "base": li.get("base"), "extra": (li.get("bonus") or {}).get("total", 0),
            "fuentes_extra": (li.get("bonus") or {}).get("sources", {}),
            "efecto": re.sub(r"</?[^>]*>", "", li.get("text") or full.get("effect") or ""),
            "enfriamiento": (li.get("cooldownMs") or full.get("cooldownMs") or 0) / 1000,
            "especializaciones": specs,
        })
    presets = [{"nombre_en": p["name"], "habilidades": p["skills"]} for p in b["skillPresets"]]

    # --- barra (pilas: la de abajo sale primero) ---
    teclas = list(TECLAS[clase])
    usadas = {t for t in teclas if t}
    libres = [t for t in ORDEN_TECLAS if t not in usadas and t not in ("LMB", "RMB")]
    barra = []
    for i, s in enumerate(b["skillBar"]):
        if not s:
            continue
        t = teclas[i] if i < len(teclas) and teclas[i] else (libres.pop(0) if libres else "Otra")
        pila = [s["id"]] + [x["id"] for x in (b["skillContext"] or {}).get(str(i + 1), []) if x]
        barra.append({"tecla": t, "pila": pila, "nota": NOTA_TECLA.get((clase, i), "")})
    for s in b["stigmaBar"]:
        if s:
            barra.append({"tecla": libres.pop(0) if libres else "Otra", "pila": [s["id"]], "nota": "estigma"})

    macros = [{"nombre_en": m["name"], "pasos": [{"id": st["skill"], "ms": st["delayMs"]} for st in m["steps"]]}
              for m in sr.get("macros", [])]

    # --- equipo ---
    equipo = []
    for ranura, it in b["gear"].items():
        if not it or not it.get("name"):
            continue
        if it.get("icon"):
            bajar("objetos", it["icon"] + ".webp", ASSETS + "item-icons/" + it["icon"] + ".webp")
        vinc = []
        for v in b["binds"].get(ranura, []):
            vinc.append("+ " + nombres.get(v[6:], v[6:]) if v.startswith("skill:") else stat(v))
        piedras = []
        for p in b["stones"].get(ranura, []):
            partes = p.split("|")
            piedras.append(stat(partes[1]) + (" (" + GRADOS.get(partes[2], partes[2]) + ")" if len(partes) > 2 else ""))
        equipo.append({
            "ranura": RANURAS.get(ranura, ranura), "nombre": it["name"], "icono": it.get("icon"),
            "grado": GRADOS.get(it.get("grade"), it.get("grade")), "nivel": it.get("level"),
            "mejora": b["enchant"].get(ranura), "vinculos": vinc, "piedras": piedras,
        })

    # --- Daevanion ---
    tableros = {}
    for bp in b["boardPresets"]:
        for x in bp["boards"]:
            if isinstance(x, str):  # referencia a build.boards[i]
                x = b["boards"][int(x.rsplit(":", 1)[1])]
            t = tableros.setdefault(x["title"], {"tablero": x["title"], "nivel": x["unlockLevel"], "puntos": {}})
            t["puntos"][bp["name"]] = x.get("spent")
    daevanion = {"presets": [bp["name"] for bp in b["boardPresets"]], "tableros": list(tableros.values()),
                 "contadores": b.get("counters", [])}

    bajar("clases", clase + ".webp", ASSETS + "class-icons/" + clase + ".webp")
    bajar("clases", clase + ".png", ASSETS + "class-portraits/" + clase + ".png")

    textos_p = os.path.join(R, "data", "textos", "builds", clase + ".json")
    textos = json.load(open(textos_p, encoding="utf8")) if os.path.exists(textos_p) else {}

    out = {
        "clase": clase, "nombre": b["className"], "rol": b.get("role"), "faccion": b.get("faction"),
        "nivel": b.get("level"), "autor": (b.get("buildAuthor") or {}).get("displayName"),
        "actualizado": (b.get("syncedAt") or "")[:10], "fuente": crudo["url"],
        "planificador": "https://metaroad.gg/aion2/planner?b=" + b["shortenedUrl"] if b.get("shortenedUrl") else "",
        "puntuacion_equipo": b.get("gearScore"),
        "macro_rmb_metaroad": clase in MACRO_EN_RMB_METAROAD,
        "habilidades": habil, "prioridad": sr.get("priority"), "presets": presets,
        "barra": barra, "macros": macros, "equipo": equipo, "daevanion": daevanion,
        "textos": textos,
    }
    dest = os.path.join(R, "data", "builds", clase + ".js")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf8") as f:
        f.write("window.BUILD = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    print(clase, "barra:", [(c["tecla"], len(c["pila"])) for c in barra], "textos" if textos else "SIN TEXTOS")


if __name__ == "__main__":
    for c in CLASES:
        gen(c)
