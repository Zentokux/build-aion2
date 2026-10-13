"""Genera data/builds/<clase>.js (datos de metaroad + textos redactados) y baja los iconos.

Uso: python tools/gen-builds.py
Entrada: tools/crudo/builds/<clase>.json, tools/crudo/tableros/<clase>(.i18n).json
y data/textos/builds/<clase>.json (si existe).
"""
import json, os, re, time, urllib.request

D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)
ASSETS = "https://guosmhnujsowkrkvuoyn.supabase.co/storage/v1/object/public/aion2-assets/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

CLASES = ["assassin", "gladiator", "templar", "ranger", "sorcerer", "spiritmaster", "cleric", "chanter"]

# Teclas tal como las pone la barra de metaroad: casillas Mouse1, Mouse2, 1, 2, 3, 4, Q, E
# y estigmas 5, 6, 7, 8. Una 9.ª casilla (Ranger, Conjurador) metaroad la rotula «Q» otra vez:
# en nuestra barra va como «Otra».
TECLAS_BARRA = ["LMB", "RMB", "1", "2", "3", "4", "Q", "E"]
TECLAS_ESTIGMA = ["5", "6", "7", "8"]
# Tecla de la macro: metaroad la fija en el clic derecho para Ranger, Hechicero y Espiritualista;
# en el resto solo dice «una tecla que mantengas pulsada».
MACRO_EN_RMB_METAROAD = {"ranger", "sorcerer", "spiritmaster"}

RANURAS = {
    "MainHand": "Arma", "SubHand": "Guarda", "Helmet": "Casco", "Shoulder": "Hombreras",
    "Torso": "Peto", "Pants": "Grebas", "Gloves": "Guantes", "Boots": "Botas", "Cape": "Capa",
    "Necklace": "Collar", "Amulet": "Amuleto", "Earring1": "Pendiente 1", "Earring2": "Pendiente 2",
    "Ring1": "Anillo 1", "Ring2": "Anillo 2", "Bracelet1": "Brazalete 1", "Bracelet2": "Brazalete 2",
    "Belt": "Cinturón", "Rune1": "Runa 1", "Rune2": "Runa 2", "Brooch1": "Broche 1", "Brooch2": "Broche 2",
    "Pendant": "Colgante", "Wings": "Alas", "TitleAttack": "Título de ataque", "TitleDefense": "Título de defensa",
    "TitleUtility": "Título variado", "Grail": "Cáliz", "Parchment": "Pergamino", "Compass": "Brújula",
    "Bell": "Campana", "Mirror": "Espejo",
}
GRADOS = {"Common": "Común", "Rare": "Raro", "Legend": "Legendario", "Unique": "Único", "Epic": "Épico", "Mythic": "Mítico"}
TIPOS = {"Mastery": "Activa", "Stigma": "Estigma"}
GENUS = {"Feral": "Feras", "Intellect": "Cognis", "Nature": "Naturas", "Special": "Especial", "Trans": "Varians"}
CAT_TITULO = {"Attack": "Gama de ataque", "Defense": "Gama de defensa", "Etc": "Gama variada"}
ARCANA = ["Parchment", "Compass", "Bell", "Mirror", "Grail"]
DIOSES = {"Life": "Vida", "Death": "Muerte", "Destruction": "Destrucción", "Wisdom": "Sabiduría",
          "Time": "Tiempo", "Illusion": "Fantasía", "Justice": "Justicia", "Freedom": "Libertad"}


def bajar(carpeta, nombre, url):
    dest = os.path.join(R, "icons", carpeta, nombre)
    if os.path.exists(dest):
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        data = urllib.request.urlopen(req, timeout=30).read()
        open(dest, "wb").write(data)
        time.sleep(0.1)
        return True
    except Exception as e:
        print("  sin icono", url, e)
        return False


def gen(clase):
    crudo = json.load(open(os.path.join(D, "crudo", "builds", clase + ".json"), encoding="utf8"))
    b = crudo["build"]
    sr = b["skillRotation"]
    SI = b["statInfo"]

    def deref(v):
        """Resuelve referencias "$56:props:build:gear:X:stats" dentro del propio build."""
        if isinstance(v, str) and v.startswith("$") and ":props:build:" in v:
            cur = b
            for k in v.split(":props:build:")[1].split(":"):
                cur = cur[int(k)] if isinstance(cur, list) else cur.get(k)
            return cur
        return v

    def nom(stat):
        if stat in DIOSES:
            return DIOSES[stat]
        return (SI.get(stat) or {}).get("name", stat)

    def val(stat, v):
        if v is None:
            return ""
        if (SI.get(stat) or {}).get("percent"):
            x = v / 100
            return (("%g" % x) + "%")
        return "{:,}".format(v) if isinstance(v, int) else str(v)

    def stats(lista):
        out = []
        for s in deref(lista) or []:
            if "value" in s:
                out.append([nom(s["stat"]), val(s["stat"], s["value"])])
            elif "min" in s:
                out.append([nom(s["stat"]), val(s["stat"], s["min"]) + "–" + val(s["stat"], s["max"])])
        return out

    def grants(g):
        out = []
        for k, v in (g or {}).items():
            out.append([nom(k), val(k, v["min"]) if v["min"] == v["max"] else val(k, v["min"]) + "–" + val(k, v["max"])])
        return out

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
        elegidas = b["skillSpecs"].get(sid, [])
        todas = full.get("specializations", [])
        specs = [{"n": todas.index(sp) + 1, "nivel": sp["level"], "texto": sp["text"], "elegida": sp["id"] in elegidas}
                 for sp in todas]
        habil.append({
            "id": sid, "nombre": s["name"], "icono": s["icon"],
            "tipo": "Pasiva" if s["kind"] == "Passive" else TIPOS.get(s["acquire"], s["acquire"]),
            "nivel": li.get("level"), "base": li.get("base"), "extra": (li.get("bonus") or {}).get("total", 0),
            "efecto": re.sub(r"</?[^>]*>", "", li.get("text") or full.get("effect") or ""),
            "enfriamiento": (li.get("cooldownMs") or full.get("cooldownMs") or 0) / 1000,
            "especializaciones": specs,
        })
    presets = [{"nombre_en": p["name"], "habilidades": p["skills"]} for p in b["skillPresets"]]

    # --- barra (pilas: la de abajo sale primero) ---
    barra = []
    for i, s in enumerate(b["skillBar"]):
        if not s:
            continue
        pila = [s["id"]] + [x["id"] for x in (b["skillContext"] or {}).get(str(i + 1), []) if x]
        barra.append({"tecla": TECLAS_BARRA[i] if i < len(TECLAS_BARRA) else "Otra", "pila": pila, "estigma": False})
    for i, s in enumerate(b["stigmaBar"]):
        if s:
            barra.append({"tecla": TECLAS_ESTIGMA[i], "pila": [s["id"]], "estigma": True})

    macros = [{"nombre_en": m["name"], "pasos": [{"id": st["skill"], "ms": st["delayMs"]} for st in m["steps"]]}
              for m in sr.get("macros", [])]

    # --- equipo ---
    equipo = {}
    for ranura, it in b["gear"].items():
        if not it or not it.get("name"):
            continue
        icono = it.get("icon")
        if icono:
            if it.get("iconKind") == "wing":
                bajar("objetos", icono + ".png", ASSETS + "wing-icons/" + icono + ".png")
            else:
                bajar("objetos", icono + ".webp", ASSETS + "item-icons/" + icono + ".webp")
        grado = it.get("grade")
        if grado and grado != "Special":
            bajar("ui", "SlotGrade_" + grado + ".webp", ASSETS + "slot-grades/UT_SlotGrade_" + grado + ".webp")
        vinc = []
        for v in b["binds"].get(ranura, []):
            vinc.append("+ " + nombres.get(v[6:], v[6:]) if v.startswith("skill:") else nom(v))
        piedras = []
        for p in b["stones"].get(ranura, []):
            partes = p.split("|")
            piedras.append(nom(partes[1]) + (" (" + GRADOS.get(partes[2], partes[2]) + ")" if len(partes) > 2 else ""))
        equipo[ranura] = {
            "ranura": RANURAS.get(ranura, ranura), "nombre": it["name"], "icono": icono,
            "ext": "png" if it.get("iconKind") == "wing" else "webp",
            "grado": grado, "grado_es": GRADOS.get(grado, grado), "nivel": it.get("level"),
            "nivel_req": it.get("requiredLevel"), "mejora": b["enchant"].get(ranura),
            "stats": stats(it.get("stats")), "vinculos": vinc, "piedras": piedras,
        }

    # --- coleccionables ---
    col = b.get("collectibles") or {}
    g = col.get("grants") or {}
    titulos = [{"nombre": t["item"]["name"], "categoria": CAT_TITULO.get(t["item"].get("category"), t["item"].get("category")),
                "grado": t["item"].get("grade"), "equipado": t.get("worn"),
                "stats": stats(t["item"].get("stats")), "posesion": stats(t["item"].get("collectionStats"))}
               for t in (col.get("titles") or [])]
    alas = []
    for w in col.get("wings") or []:
        it = w["item"]
        if it.get("icon"):
            bajar("objetos", it["icon"] + ".png", ASSETS + "wing-icons/" + it["icon"] + ".png")
        alas.append({"nombre": it["name"], "icono": it.get("icon"), "grado": it.get("grade"), "nivel": w.get("level"),
                     "equipado": w.get("worn"), "stats": stats(it.get("stats"))})
    arcanas = [dict(equipo[k], clave=k) for k in ARCANA if k in equipo]
    tot_arc = {}
    for a in arcanas:
        for n_, v_ in a["stats"]:
            tot_arc.setdefault(n_, []).append(v_)
    coleccionables = {
        "titulos": titulos, "titulos_equipado": grants((g.get("titles") or {}).get("equipped")),
        "titulos_posesion": grants((g.get("titles") or {}).get("owned")),
        "alas": alas, "alas_equipado": grants((g.get("wings") or {}).get("equipped")),
        "alas_posesion": grants((g.get("wings") or {}).get("owned")),
        "arcanas": arcanas,
    }

    # --- mascotas (Comprensión de raza) ---
    pets = b.get("pets") or {}
    opciones = {x["genus"]: x for x in (pets.get("insight") or {}).get("genera", [])}
    mascotas = []
    for gen_ in pets.get("genus", []):
        gid = gen_["genus"]
        bajar("ui", gen_["icon"] + ".webp", ASSETS + "genus-symbols/" + gen_["icon"] + ".webp")
        lineas = []
        for i, pk in enumerate((pets.get("picks") or {}).get(gid, [])):
            grado, st = pk.split(":")
            opt = next((o for o in (opciones.get(gid, {}).get("options", {}).get(str(i + 1), []))
                        if o["stat"] == st and o["grade"] == grado), None)
            rango = (val(st, opt["min"]) + "–" + val(st, opt["max"])) if opt else ""
            lineas.append([nom(st), rango, GRADOS.get(grado, grado)])
        mascotas.append({"genus": gid, "nombre": GENUS.get(gid, gid), "icono": gen_["icon"],
                         "posesion": stats(gen_.get("stats")), "lineas": lineas,
                         "ranuras": opciones.get(gid, {}).get("slots", len(lineas))})
    mascotas_total = grants((pets.get("grants") or {}).get("insight"))

    # --- Daevanion: tableros completos + orden de toma de cada preset ---
    tb = json.load(open(os.path.join(D, "crudo", "tableros", clase + ".json"), encoding="utf8"))
    t18 = json.load(open(os.path.join(D, "crudo", "tableros", clase + ".i18n.json"), encoding="utf8"))
    for n in ("Common", "Common_Disabled", "Rare", "Rare_Disabled", "Legend", "Legend_Disabled", "Unique", "Unique_Disabled"):
        bajar("ui", "Node_" + n + ".webp", ASSETS + "node-art/UT_FWindow_Daevanion_Node_" + n + ".webp")
    tableros = []
    for bd in tb["boards"]:
        if bd["pointType"] != "DaevanionCrystal":
            continue
        nodos = [n for n in tb["nodes"] if n["board"] == bd["board"] and n["kind"] != "None"]
        r0 = min(n["row"] for n in nodos); c0 = min(n["col"] for n in nodos)
        r1 = max(n["row"] for n in nodos); c1 = max(n["col"] for n in nodos)
        lista = []
        for n in nodos:
            if n.get("skillIcon"):
                bajar("habilidades", n["skillIcon"] + ".webp", ASSETS + "skill-icons/" + n["skillIcon"] + ".webp")
            st = n.get("stat")
            v = n.get("value")
            texto = ""
            if n["kind"] == "Stat" and st:
                try:
                    texto = val(st, int(v))
                except (TypeError, ValueError):
                    texto = str(v)
            elif n["kind"] == "SkillLevel":
                texto = "+" + str(v)
            lista.append({"id": n["id"], "f": n["row"] - r0, "c": n["col"] - c0, "tipo": n["kind"],
                          "rareza": n["rarity"], "coste": n["cost"],
                          "titulo": (t18.get("nodes", {}).get(str(n["id"])) or {}).get("title") or n.get("title", ""),
                          "valor": texto, "icono": n.get("skillIcon")})
        tableros.append({"tablero": bd["board"], "nombre": (t18.get("boards", {}).get(str(bd["board"])) or {}).get("title") or bd["title"],
                         "nivel": bd["unlockLevel"], "filas": r1 - r0 + 1, "cols": c1 - c0 + 1, "nodos": lista})
    dpresets = []
    for bp in b["boardPresets"]:
        orden = {}
        for x in bp["boards"]:
            if isinstance(x, str):
                x = b["boards"][int(x.rsplit(":", 1)[1])]
            orden[x["board"]] = {"tomados": x.get("taken", []), "puntos": x.get("spent"), "tope": x.get("cap")}
        dpresets.append({"nombre_en": bp["name"], "tableros": orden})
    daevanion = {"tableros": tableros, "presets": dpresets, "activo": b.get("activeBoardPreset", 0),
                 "presupuesto": b.get("budget")}

    bajar("clases", clase + ".webp", ASSETS + "class-icons/" + clase + ".webp")
    bajar("clases", clase + "-arte.webp", ASSETS + "class-art/" + clase + ".webp")

    textos_p = os.path.join(R, "data", "textos", "builds", clase + ".json")
    textos = json.load(open(textos_p, encoding="utf8")) if os.path.exists(textos_p) else {}

    out = {
        "clase": clase, "nombre": b["className"], "rol": b.get("role"), "faccion": b.get("faction"),
        "nivel": b.get("level"), "autor": (b.get("buildAuthor") or {}).get("displayName"),
        "actualizado": (b.get("syncedAt") or "")[:10], "fuente": crudo["url"],
        "planificador": "https://metaroad.gg/aion2/planner?b=" + b["shortenedUrl"] if b.get("shortenedUrl") else "",
        "puntuacion_equipo": b.get("gearScore"), "huecos": [b.get("gearFilled"), b.get("gearSlotCount")],
        "contadores": b.get("counters", []),
        "macro_rmb_metaroad": clase in MACRO_EN_RMB_METAROAD,
        "habilidades": habil, "prioridad": sr.get("priority"), "presets": presets,
        "barra": barra, "macros": macros, "equipo": equipo, "daevanion": daevanion,
        "coleccionables": coleccionables, "mascotas": mascotas, "mascotas_total": mascotas_total,
        "textos": textos,
    }
    dest = os.path.join(R, "data", "builds", clase + ".js")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf8") as f:
        f.write("window.BUILD = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print(clase, "tableros:", [(t["nombre"], len(t["nodos"])) for t in tableros],
          "títulos", len(titulos), "alas", len(alas), "arcanas", len(arcanas), "mascotas", len(mascotas))


if __name__ == "__main__":
    for c in CLASES:
        gen(c)
