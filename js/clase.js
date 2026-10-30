// Página de clase: dos builds por clase, Build 1 (window.BUILD, data/builds) y Build 2 (window.BUILD2, data/couga); pinta la elegida
var TECLA_TXT = { LMB: "Clic izq.", RMB: "Clic der.", Espacio: "Espacio", Otra: "Otra" };
var PRESET_DAEV = { "Launch priority": "Prioridad de lanzamiento", "Full PvE": "JcE completo", "Guide route": "Ruta de la guía", "Up to 416": "Con 416 cristales (máx. daño)" };
// puntos de habilidad que cuesta llevar una habilidad del nivel 1 al n (2-4: 1 por nivel, 5-7: 2, 8-10: 4)
var COSTE_PTS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 9, 8: 13, 9: 17, 10: 21 };
var IZQ = [["MainHand", "SubHand"], ["Helmet", "Shoulder"], ["Torso", "Pants"], ["Gloves", "Boots"], ["Cape"]];
var DER = [["Necklace", "Amulet"], ["Earring1", "Earring2"], ["Ring1", "Ring2"], ["Bracelet1", "Bracelet2"],
  ["Belt", "Rune1"], ["Rune2", "Brooch1"], ["Brooch2", "Pendant"]];
var VACIAS = { Brooch1: "Broche 1", Brooch2: "Broche 2", Pendant: "Colgante", Rune1: "Runa 1", Rune2: "Runa 2", Amulet: "Amuleto", Belt: "Cinturón" };

// cada clase tiene dos builds completas: Build 1 (data/builds) y Build 2 (data/couga)
function pintarClase(B, guia) {
  var T = B.textos || {}, S = T.secciones || {};
  var H = {};
  B.habilidades.forEach(function (h) { H[h.id] = h; });
  // habilidades que el texto nombra pero no van en la build (alternativas, PvP, farmeo): solo icono y nombre
  var EXTRA = (B.habilidades_extra || []).map(function (x) {
    return H["x:" + x.nombre] = { id: "x:" + x.nombre, nombre: x.nombre, icono: x.icono, tipo: "No va en esta build (alternativa)", especializaciones: [], efecto: "" };
  });
  var main = document.getElementById("main");
  document.title = "Build JcE de " + B.nombre + " · BUILD AION2";
  var secciones = [];

  // ---------- utilidades ----------
  function tipHab(h) {
    var sp = h.especializaciones.filter(function (s) { return s.elegida; });
    return "<div class='tt-nombre'>" + esc(h.nombre) + "</div><div class='tt-sub'>" + esc(h.tipo) +
      (h.nivel ? " · Nv. " + h.nivel : "") + (h.enfriamiento ? " · " + h.enfriamiento + " s" : "") + "</div>" + esc(h.efecto) +
      (sp.length ? "<div class='tt-sec'>Especializaciones</div>" + sp.map(function (s) { return s.n + ". " + esc(s.texto); }).join("<br>") : "");
  }
  function icono(id, extra) {
    var h = H[id];
    if (!h) return "";
    return '<img src="icons/habilidades/' + h.icono + '.webp" alt="' + esc(h.nombre) + '" loading="lazy" data-tip="' + esc(tipHab(h)) + '"' + (extra || "") + ">";
  }
  function hab(id) {
    var h = H[id];
    return h ? '<span class="hab">' + icono(id) + esc(h.nombre) + "</span>" : esc(id);
  }
  function seccion(id, titulo, html) {
    if (!html) return "";
    secciones.push([id, titulo]);
    return '<h2 class="mr" id="' + id + '">' + esc(titulo) + "</h2>" + html;
  }
  function filasStats(lista) {
    return (lista || []).map(function (s) { return '<div class="fila"><span>' + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></div>"; }).join("");
  }
  function nombrePreset(en) {
    var p = (T.presets || []).filter(function (x) { return x.nombre_en === en; })[0];
    return p ? p.nombre : (en || "");
  }
  function idPorNombre(n) {
    var x = B.habilidades.concat(EXTRA).filter(function (h) { return h.nombre.toLowerCase() === String(n).toLowerCase(); })[0];
    return x && x.id;
  }
  // tecla de cada habilidad según la barra («E·2» = 2.ª prioridad de la pila de la E; la 1.ª es la de abajo)
  var teclaDe = {};
  B.barra.forEach(function (c) {
    c.pila.forEach(function (id, i) { teclaDe[id] = (TECLA_TXT[c.tecla] || c.tecla) + (c.pila.length > 1 ? "·" + (i + 1) : ""); });
  });

  // ---------- cabecera y resumen ----------
  var cont = B.contadores || [];
  var tarjeta = '<div class="tarjeta-build"><div class="cab"><img src="icons/clases/' + B.clase + '.webp" alt=""><div><b>' + esc(B.nombre) +
    '</b><span class="fac">' + esc((B.faccion || "").toUpperCase()) + '</span><div class="rol">' + esc(B.rol || "") + "</div></div></div>" +
    '<div class="lbl">Nivel de objeto</div><div class="gs"><span>★</span> ' + (B.puntuacion_equipo || "—") + "</div>" +
    (B.huecos ? '<div style="color:var(--suave);font-size:11px;margin-bottom:8px">' + B.huecos[0] + " de " + B.huecos[1] + " huecos ocupados</div>" : "") +
    cont.map(function (c) { return '<div class="fila">' + esc(c.label) + "<b>" + c.used + ' <small style="color:var(--suave)">/ ' + c.cap + "</small></b></div>"; }).join("") +
    '<div class="fila">Nv. de personaje<b>' + B.nivel + "</b></div></div>";

  var h = '<div class="pestanas" id="tabs-guia">' + [1, 2].filter(function (g) { return buildDe(g); }).map(function (g) {
    return '<button class="pestana' + (g === guia ? " on" : "") + '" data-guia="' + g + '">' + GUIAS[g] + "</button>";
  }).join("") + "</div>";
  h += "<h1>Build JcE de " + esc(B.nombre) + '</h1><div class="ruta">AION 2 / Guías de builds</div>' +
    '<p class="intro">' + md(T.resumen || "") + "</p>";
  h += seccion("resumen", "Resumen de la build",
    '<div class="resumen"><div>' + bloquesHTML(S.resumen) +
    '<div class="proscontras"><div class="pro"><h4>✓ Pros</h4><ul>' + (T.pros || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") +
    '</ul></div><div class="contra"><h4>⚠ Contras</h4><ul>' + (T.contras || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") +
    "</ul></div></div></div>" + tarjeta + "</div>");

  // ---------- equipo ----------
  function tipEquipo(e) {
    // fijas = sin rango; las que llevan rango son la lista de líneas que PUEDEN salir (solo se usa para poner el rango)
    var fijas = e.stats.filter(function (s) { return String(s[1]).indexOf("–") < 0; });
    var rango = {};
    e.stats.forEach(function (s) { if (String(s[1]).indexOf("–") >= 0 && !(s[0] in rango)) rango[s[0]] = s[1]; });
    var posibles = Object.keys(rango).length;
    var col = function (titulo, filas) { return "<div><div class='tt-sec'>" + titulo + "</div><div class='tt-lista'>" + filas.join("") + "</div></div>"; };
    var izq = fijas.length ? col("Fijas", fijas.map(function (s) { return "<div><span>" + esc(s[0]) + "</span><b>" + esc(s[1]) + "</b></div>"; })) : "";
    var der = e.vinculos.length ? col("Soul Binding · busca estas, en orden", e.vinculos.map(function (v, i) {
      return "<div><span><i>" + (i + 1) + ".</i> " + esc(v) + "</span><b>" + esc(rango[v] || "") + "</b></div>";
    })) : "";
    return "<div class='tt-ancho'><div class='tt-nombre'>" + esc(e.nombre) + (e.mejora ? " +" + e.mejora : "") + "</div><div class='tt-sub'>" + esc(e.ranura) +
      " · " + esc(e.grado_es || "") + (e.nivel ? " · Nv. de objeto " + e.nivel : "") + "</div>" +
      "<div class='tt-pie'>" + izq + der + "</div>" +
      (e.vinculos.length && posibles ? "<div class='tt-nota'>Al azar salen " + (e.vinculos.length >= 5 ? "4 o 5" : e.vinculos.length) + " de " + posibles + " líneas posibles: si te salen las primeras, quédatela.</div>" : "") +
      (e.piedras.length ? "<div class='tt-sec'>Manastones</div>" + e.piedras.map(esc).join(" · ") : "") +
      "</div>";
  }
  function ranura(k) {
    var e = B.equipo[k];
    if (!e) return '<div class="ranura vacia">' + esc(VACIAS[k] || k) + "</div>";
    return '<div class="ranura g-' + esc(e.grado) + '"' + (e.grado !== "Special" ? ' style="background-image:url(icons/ui/SlotGrade_' + esc(e.grado) + '.webp)"' : "") + ' data-tip="' + esc(tipEquipo(e)) + '">' +
      '<img src="icons/objetos/' + e.icono + "." + e.ext + '" alt="' + esc(e.nombre) + '" loading="lazy">' +
      (e.mejora ? '<span class="mej">+' + e.mejora + "</span>" : "") + "</div>";
  }
  function lado(filas) {
    return '<div class="lado">' + filas.map(function (f) { return f.map(ranura).join(""); }).join("") + "</div>";
  }
  var te = '<div class="maniqui"><div class="nombre-clase">' + esc(B.nombre) + "</div>" + lado(IZQ) +
    '<div class="arte"><img class="pj" src="icons/clases/' + B.clase + '-arte.webp" alt="" onerror="this.remove()"><img class="emb" src="icons/clases/' + B.clase + '.webp" alt=""></div>' +
    lado(DER) + "</div>";
  te += '<p class="fuente">Pasa el ratón por cada pieza para ver sus estadísticas, Soul Binding y Manastones.</p>';
  // tabla de Soul Binding: ranuras con las mismas líneas juntas
  var GRUPOS = [["MainHand", "SubHand", "Arma y guarda"], ["Earring1", "Earring2", "Pendientes"], ["Ring1", "Ring2", "Anillos"], ["Bracelet1", "Bracelet2", "Brazaletes"]];
  var filasSB = [], hechas = {};
  ["MainHand", "SubHand", "Helmet", "Shoulder", "Torso", "Pants", "Gloves", "Cape", "Boots", "Necklace", "Earring1", "Earring2", "Ring1", "Ring2", "Bracelet1", "Bracelet2"].forEach(function (k) {
    var e = B.equipo[k];
    if (!e || !e.vinculos.length || hechas[k]) return;
    var g = GRUPOS.filter(function (x) { return x[0] === k; })[0];
    var etiqueta = e.ranura;
    if (g && B.equipo[g[1]] && B.equipo[g[1]].vinculos.join() === e.vinculos.join()) { etiqueta = g[2]; hechas[g[1]] = true; }
    filasSB.push([etiqueta, e.vinculos.map(function (v) { return v.replace(/^\+ /, ""); }).join(", ")]);
  });
  var tablaSB = filasSB.length && !B.sb_en_textos ? "<h3>Líneas de Soul Binding</h3><div class=\"tabla-scroll\"><table><thead><tr><th>Ranura</th><th>Líneas a buscar</th></tr></thead><tbody>" +
    filasSB.map(function (f) { return "<tr><td>" + esc(f[0]) + "</td><td>" + esc(f[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "";
  var bloqEq = S.equipo || [];
  if (!Object.keys(B.equipo || {}).length) te = "";   // la guía no da piezas concretas: solo sus tablas
  // prioridad de atributos (tabla + aviso) y ruta del arma antes de la tabla de Soul Binding
  var antes = bloqEq.length && bloqEq[0].titulo === "Atributos que priorizar (JcE)" ? 3 : 1;
  te += bloquesHTML(bloqEq.slice(0, antes)) + tablaSB + bloquesHTML(bloqEq.slice(antes));
  h += seccion("equipo", "Equipo", te);

  // ---------- Daevanion ----------
  var td = '<div class="daev" id="daev"></div>' + bloquesHTML(S.daevanion);
  h += seccion("daevanion", "Daevanion", td);

  // ---------- habilidades ----------
  var porTecla = {};
  B.barra.forEach(function (c) { porTecla[c.tecla + (c.estigma ? "e" : "")] = c; });
  var normales = B.barra.filter(function (c) { return !c.estigma; });
  var estigmas = B.barra.filter(function (c) { return c.estigma; });
  var filasMR = 4;
  function colMR(c) {
    var celdas = "";
    for (var i = filasMR - 1; i >= 0; i--) {
      var id = c && c.pila[i];
      var x = id && H[id];
      if (x) {
        var nsp = x.especializaciones.filter(function (s) { return s.elegida; }).length;
        celdas += '<div class="mr-celda llena">' + icono(id) + (nsp ? '<span class="sp">' + nsp + "</span>" : "") +
          (x.nivel ? '<span class="nv">' + x.nivel + "</span>" : "") + "</div>";
      } else celdas += '<div class="mr-celda"></div>';
    }
    return '<div class="mr-col">' + celdas + '<span class="mr-tecla">' + esc(c ? (TECLA_TXT[c.tecla] || c.tecla) : "") + "</span></div>";
  }
  var th = '<div class="mr-barra"><div class="cols"><div class="bloque"><div class="cab"><span>Habilidades</span><span>' + normales.length + " teclas" +
    '</span></div><div class="fila-cols">' + normales.map(colMR).join("") + "</div></div>" + (estigmas.length ? '<div class="bloque"><div class="cab"><span>Estigma</span><span>' +
    estigmas.length + " teclas" + '</span></div><div class="fila-cols">' + estigmas.map(colMR).join("") + "</div></div>" : "") + "</div>";
  var pas = B.habilidades.filter(function (x) { return x.tipo === "Pasiva"; });
  th += '<div class="sub-mr">' + pas.length + ' pasivas</div><div class="chips-pas">' + pas.map(function (x) {
    return '<span class="chip-pas">' + icono(x.id) + esc(x.nombre) + "</span>";
  }).join("") + "</div></div>";

  // de dónde sale cada nivel: puntos de habilidad y lo que suben Daevanion, equipo (anillos) y Arcanas
  var FUENTE = { daevanion: "Daevanion", gear: "equipo", anillos: "anillos", arcana: "Arcanas" };
  function desglose(x) {
    var f = x.fuentes || {};
    return "<b>" + x.base + "</b> puntos" + ["daevanion", "gear", "anillos", "arcana"].filter(function (k) { return f[k]; }).map(function (k) {
      return " + <b>" + f[k] + "</b> " + FUENTE[k];
    }).join("");
  }
  // orden en que se gastan los puntos de habilidad (el de la guía) y de dónde sale el resto del nivel
  function ordenPuntos() {
    var vistos = {}, lista = [];
    ((B.prioridad || {}).Active || []).concat(B.habilidades.filter(function (x) { return x.tipo === "Activa"; }).map(function (x) { return x.id; }))
      .concat(((B.prioridad || {}).Passive || []).concat(B.habilidades.filter(function (x) { return x.tipo === "Pasiva"; }).map(function (x) { return x.id; })))
      .forEach(function (id) {
        var x = H[id];
        if (!x || vistos[id] || !x.nivel || x.tipo === "Estigma" || (x.tipo === "Activa" && enP1.indexOf(id) < 0)) return;
        vistos[id] = 1; lista.push(x);
      });
    if (!lista.length) return "";
    var col = function (x, k) { return (x.fuentes || {})[k] ? "+" + x.fuentes[k] : ""; };
    var hayAn = lista.some(function (x) { return (x.fuentes || {}).anillos; }), hayEq = lista.some(function (x) { return (x.fuentes || {}).gear; });
    return '<h3>Nivel final de cada habilidad</h3><div class="aviso">«Con puntos» es hasta dónde la subes tú con los <b>puntos de habilidad</b> (10 como mucho) y «Cuesta» lo que vale desde el nivel 1. ' +
      "El resto del nivel no se compra con puntos: lo dan los nodos azules de <b>Daevanion</b>, las líneas de habilidad del <b>equipo</b> (anillos en las activas) y las <b>Arcanas</b>.</div>" +
      '<div class="tabla-scroll"><table class="orden-pts"><thead><tr><th>#</th><th>Habilidad</th><th>Con puntos</th><th>Cuesta</th><th>Daevanion</th>' +
      (hayEq ? "<th>Equipo</th>" : "") + (hayAn ? "<th>Anillos</th>" : "") + "<th>Arcanas</th><th>Nivel</th></tr></thead><tbody>" +
      lista.map(function (x, i) {
        var bp = Math.min(10, x.base != null ? x.base : x.nivel);
        return "<tr><td>" + (i + 1) + "</td><td>" + hab(x.id) + (x.tipo === "Pasiva" ? " <small>(pasiva)</small>" : "") + "</td><td><b>" + bp + "</b></td><td>" + (COSTE_PTS[bp] || "nada") + "</td><td>" + col(x, "daevanion") + "</td>" +
          (hayEq ? "<td>" + col(x, "gear") + "</td>" : "") + (hayAn ? "<td>" + col(x, "anillos") + "</td>" : "") + "<td>" + col(x, "arcana") + "</td><td><b>" + esc(x.nivel_txt || x.nivel) + "</b></td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  // plan paso a paso: qué subir con los puntos de habilidad, cuánto cuesta y cuántos llevas
  function planPuntos() {
    var P = B.plan_puntos;
    if (!P || !P.filas.length) return "";
    var corte = -1;
    P.filas.forEach(function (f, i) { if (f.llevas <= P.nivel45) corte = i; });
    var h = "", fase = -1;
    P.filas.forEach(function (f, i) {
      if (f.fase !== fase) {
        fase = f.fase;
        h += '<tr class="fase-pts"><td colspan="5">Fase ' + (fase + 1) + " · " + esc(P.fases[fase]) + "</td></tr>";
      }
      h += "<tr><td>" + (i + 1) + "</td><td>" + hab(f.id) + (H[f.id].tipo === "Pasiva" ? " <small>(pasiva)</small>" : "") + "</td><td>" + f.de + " a <b>" + f.a + "</b></td><td>" + f.cuesta + "</td><td><b>" + f.llevas + "</b></td></tr>";
      if (i === corte && i < P.filas.length - 1)
        h += '<tr class="corte-pts"><td colspan="5">Hasta aquí llegas con los <b>' + P.nivel45 + " puntos</b> de subir a nivel 45. Lo de abajo, con Piedras de sabiduría (Wisdom Stone, 1 punto cada una)</td></tr>";
    });
    return '<h3>Dónde echar los puntos de habilidad, paso a paso</h3>' +
      '<div class="tabla-scroll"><table class="coste-pts"><thead><tr><th>Subir a nivel</th><th>2-4</th><th>5-7</th><th>8-10</th><th>De 1 a 8</th><th>De 1 a 10</th></tr></thead>' +
      "<tbody><tr><td>Puntos por nivel</td><td>1</td><td>2</td><td>4</td><td><b>13</b></td><td><b>21</b></td></tr></tbody></table></div>" +
      '<div class="aviso">Sigue la tabla de arriba abajo: en el juego, <b>Habilidades, Maestría</b>, pulsa la habilidad y súbela hasta el nivel de la columna. «Llevas» son los puntos gastados en total. ' +
      "A nivel 8 se abre la primera especialización, por eso las clave van primero a 8. Con puntos llegas a 10 como mucho; lo de encima lo dan Daevanion, equipo y Arcanas. " +
      "Piedras de sabiduría: 2 por cada mazmorra sellada, misiones regionales, el Monolito, el Festival de Shugo y la tienda de Pesadilla. Esta build pide <b>" + P.total + " puntos</b> en total.</div>" +
      '<div class="tabla-scroll"><table class="orden-pts plan-pts"><thead><tr><th>#</th><th>Habilidad</th><th>Nivel</th><th>Cuesta</th><th>Llevas</th></tr></thead><tbody>' + h + "</tbody></table></div>";
  }
  function ficha(x) {
    var sp = x.especializaciones.filter(function (s) { return s.elegida; });
    return '<div class="ficha">' + icono(x.id) + '<div class="cuerpo"><div class="linea"><b>' + esc(x.nombre) + '</b><span class="nv">Nv. ' + esc(x.nivel_txt || x.nivel || "—") +
      (x.extra && !x.fuentes ? " (" + x.base + " + " + x.extra + ")" : "") + "</span>" + (teclaDe[x.id] ? '<span class="tec">' + esc(teclaDe[x.id]) + "</span>" : "") + "</div>" +
      (x.extra && x.fuentes ? '<div class="fuentes-nv">' + desglose(x) + "</div>" : "") +
      espHTML(x, sp) +
      (x.por_que ? '<div class="porque">' + md(x.por_que) + "</div>" : "") + "</div></div>";
  }
  // especializaciones por hueco: en las activas se abren a nivel 8, 12 y 20; en los estigmas se activan solas a 5, 10, 15 y 20
  function espHTML(x, sp) {
    if (!sp.length) return "";
    if (sp.some(function (s) { return s.auto; }))
      return '<div class="esp"><span class="esp-cab">Se activan solas:</span> ' + sp.map(function (s) { return "<b>" + s.nivel + "</b> " + esc(s.texto); }).join(" · ") + "</div>";
    var n = +x.nivel || 0;
    var ahora = sp.filter(function (s) { return !(s.a_20 && n < 20); }), luego = sp.filter(function (s) { return s.a_20 && n < 20; });
    var marca = function (s) { return s.propia ? ' <span class="esp-propia">(de esta guía)</span>' : ""; };
    var h = '<div class="esp"><span class="esp-cab">Especialización:</span> ' + ahora.map(function (s, i) {
      return "<b>" + Math.max([8, 12, 20][i], s.nivel) + "</b> " + esc(s.texto) + marca(s);   // a qué nivel la tienes
    }).join(" · ") + (luego.length ? " · <b>20</b> " + luego.map(function (s) { return esc(s.texto) + marca(s); }).join(", ") + " <small>(cuando llegue a 20)</small>" : "") + "</div>";
    var mot = sp.filter(function (s) { return s.propia || s.del_texto; });
    return h + (mot.length ? '<div class="esp-motivo">' + mot.map(function (s) {
      return (s.propia ? "El autor no la da; elegida por esta guía: " : "") + esc(s.motivo);
    }).join(" · ") + "</div>" : "");
  }
  var enP1 = (B.presets[0] || {}).habilidades || [];
  // orden: por casilla de la barra y, dentro de cada pila, de abajo arriba
  var ordenBarra = {};
  B.barra.forEach(function (c, i) { c.pila.forEach(function (id, j) { ordenBarra[id] = i * 10 + j; }); });
  function grupoFichas(titulo, lista) {
    lista = lista.slice().sort(function (a, b) {
      return (ordenBarra[a.id] != null ? ordenBarra[a.id] : 999) - (ordenBarra[b.id] != null ? ordenBarra[b.id] : 999);
    });
    return lista.length ? '<div class="sub-mr">' + titulo + '</div><div class="fichas">' + lista.map(ficha).join("") + "</div>" : "";
  }
  th += '<div class="mr-barra" style="margin-top:10px"><div class="sub-mr" style="margin-top:0">Build de habilidades</div>' +
    grupoFichas("Estigma", B.habilidades.filter(function (x) { return x.tipo === "Estigma" && enP1.indexOf(x.id) >= 0; })) +
    grupoFichas("Activas de maestría", B.habilidades.filter(function (x) { return x.tipo === "Activa" && enP1.indexOf(x.id) >= 0; })) +
    grupoFichas("Pasivas", pas) + "</div>" + planPuntos() + ordenPuntos();

  var P = B.prioridad || {};
  var nPrio = enP1.length;
  th += '<details class="rot"><summary><span>Rotación</span><span style="color:var(--suave)">Prioridad ' + nPrio + " · Macro " + B.macros.length + "/" + B.macros.length + "</span></summary><div class=\"dentro\">" +
    [["Active", "Activas"], ["Stigma", "Estigmas"], ["Passive", "Pasivas"]].map(function (g) {
      return (P[g[0]] || []).length ? '<div class="prio-grupo"><div class="sub-mr">' + g[1] + "</div>" + P[g[0]].map(function (id, i) {
        return "<span>" + (i + 1) + ". " + hab(id) + "</span>";
      }).join(" ") + "</div>" : "";
    }).join("") +
    B.macros.map(function (m) {
      return '<div class="sub-mr">Macro (Clic der.)</div>' + m.pasos.map(function (p, i) {
        var c = B.barra.filter(function (x) { return x.tecla === p.tecla; })[0];
        return (i ? ", " : "") + "<b>" + esc(TECLA_TXT[p.tecla] || p.tecla) + "</b> " + esc(c.pila.length > 1 ? c.nombre : H[c.pila[0]].nombre) + " <small>" + p.ms + " ms</small>";
      }).join("");
    }).join("") + "</div></details>";

  if (T.presets && T.presets.length) {
    th += "<h3>Presets de habilidades</h3><table><thead><tr><th>#</th><th>Preset</th><th>Cuándo usarlo</th></tr></thead><tbody>" +
      T.presets.map(function (p, i) { return "<tr><td>" + (i + 1) + "</td><td><strong>" + esc(p.nombre) + "</strong></td><td>" + md(p.uso) + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  th += bloquesHTML(S.habilidades);
  if (S.estigmas && S.estigmas.length) th += "<h3>Estigmas</h3>" + bloquesHTML(S.estigmas);
  h += seccion("habilidades", "Habilidades", th);

  // ---------- rotación y macros (barra estilo juego) ----------
  h += seccion("rotacion", "Rotación y macros", barraJuego(B, H, icono, hab, nombrePreset, idPorNombre, T) + bloquesHTML(S.rotacion));

  // ---------- coleccionables ----------
  var C = B.coleccionables || {};
  var tabs = [
    ["titulos", "Títulos", (C.titulos || []).length], ["arcanas", "Arcanas", (C.arcanas || []).length], ["alas", "Alas", (C.alas || []).length]
  ].filter(function (t) { return t[2]; });
  var tc = '<div class="pestanas" id="tabs-col">' + tabs.map(function (t, i) {
    return '<button class="pestana' + (i ? "" : " on") + '" data-tab="' + t[0] + '">' + t[1] + "<span>" + t[2] + "</span></button>";
  }).join("") + '</div><div id="panel-col"></div>' + bloquesHTML(S.coleccionables);
  h += seccion("coleccionables", "Coleccionables", tc);

  // ---------- mascotas ----------
  var M = B.mascotas || [], P = B.mascotas_plan || {};
  var bloqM = S.mascotas || [];
  var tm = bloquesHTML(bloqM.filter(function (x) { return x.id === "minimo"; }));
  if (M.length) {
    // cada ranura sale al azar: se pinta qué buscar, qué vale si no sale y la prioridad (no una tirada fija)
    var ESTR = { 3: "★★★", 2: "★★", 1: "★" };
    tm += '<div class="pestanas"><span class="pestana on">Comprensión de raza<span>' + M.length + '</span></span></div><div class="panel-col"><div class="genus">' +
      M.map(function (g) {
        var rango = {};
        g.lineas.forEach(function (l) { rango[l[0]] = l[1]; });
        var filas = P[g.genus] ? P[g.genus].map(function (r) {
          return '<li class="p' + r.prio + '"><span><i>' + r.n + ".</i> " + esc(r.op) + (rango[r.op] ? " <em>" + esc(rango[r.op]) + "</em>" : "") +
            (r.alt && r.alt !== "—" ? "<br><small>si no sale: " + esc(r.alt) + "</small>" : "") + "</span><b>" + ESTR[r.prio] + "</b></li>";
        }).join("") : g.lineas.map(function (l) { return "<li><span>" + esc(l[0]) + " " + esc(l[1]) + "</span><small>" + esc(l[2]) + "</small></li>"; }).join("");
        return '<div class="gen"><div class="cab"><img src="icons/ui/' + g.icono + '.webp" alt=""><b>' + esc(g.nombre) + "</b></div>" +
          '<div class="pos">' + g.posesion.map(function (s) { return esc(s[0]) + " " + esc(s[1]); }).join(" · ") + "</div>" +
          '<div class="ran"><span>Ranuras: qué buscar</span><span>' + g.ranuras + " al azar</span></div><ol class=\"plan\">" + filas + "</ol></div>";
      }).join("") + "</div>" + ((B.mascotas_total || []).length ? '<div class="otorgado"><div class="t">Si todo saliera perfecto</div>' + filasStats(B.mascotas_total) + "</div>" : "") + "</div>";
  }
  tm += bloquesHTML(bloqM.filter(function (x) { return x.id !== "minimo"; }));
  h += seccion("mascotas", "Mascotas", tm);


  // ---------- maqueta con lateral ----------
  var lateral = '<aside class="lateral"><div class="lat-caja indice"><div class="titulo" style="text-align:left">Índice</div><ol>' +
    secciones.map(function (s) { return '<li><a href="#' + s[0] + '">' + esc(s[1]) + "</a></li>"; }).join("") + "</ol></div></aside>";
  main.innerHTML = '<div class="pag">' + lateral + '<div class="contenido">' + h + "</div></div>";

  // icono junto a cada nombre de habilidad en todos los textos (párrafos, listas, tablas, avisos)
  var nombresHab = B.habilidades.concat(EXTRA).map(function (x) { return x.nombre; }).sort(function (a, b) { return b.length - a.length; });
  var reHab = new RegExp("(^|[^\\p{L}])(" + nombresHab.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?![\\p{L}])", "gu");
  var textos = [], w = document.createTreeWalker(main.querySelector(".contenido"), NodeFilter.SHOW_TEXT), nt;
  while ((nt = w.nextNode())) {
    if (!nt.parentElement.closest(".hab, h2, h3, button, .mr-barra, .barra-box, .tarjeta-build, .daev, .ficha, .paso, .chip-pas") && reHab.test(nt.textContent)) textos.push(nt);
    reHab.lastIndex = 0;
  }
  textos.forEach(function (nt) {
    var t = nt.textContent, html = "", ult = 0, m;
    reHab.lastIndex = 0;
    while ((m = reHab.exec(t))) {
      var ini = m.index + m[1].length;
      // «Congelación» también es un estado («estado de Congelación»): solo la habilidad lleva icono
      if (m[2] === "Congelación" && /de $/.test(t.slice(0, ini))) continue;
      html += esc(t.slice(ult, ini)) + hab(idPorNombre(m[2]));
      ult = ini + m[2].length;
    }
    if (!ult) return;
    var span = document.createElement("span");
    span.innerHTML = html + esc(t.slice(ult));
    nt.replaceWith.apply(nt, Array.prototype.slice.call(span.childNodes));
  });

  pintarDaevanion(B, H);
  // habilidad por nombre (las líneas de Arcana vienen por nombre)
  var PN = {};
  Object.keys(H).forEach(function (id) { PN[H[id].nombre] = id; });
  pintarColeccionables(C, filasStats, function (n) { return PN[n] ? hab(PN[n]) : '<span class="hab">' + esc(n) + "</span>"; });
  document.getElementById("tabs-guia").addEventListener("click", function (e) {
    var b = e.target.closest("[data-guia]");
    if (b && +b.dataset.guia !== guia) elegirGuia(+b.dataset.guia);
  });
}

// ===== barra estilo juego (la que pidió el usuario) =====
function barraJuego(B, H, icono, hab, nombrePreset, idPorNombre, T) {
  var porTecla = {};
  B.barra.forEach(function (c) { porTecla[c.tecla] = c; });
  var macro = B.macros[0];
  var enMacro = {};
  if (macro) macro.pasos.forEach(function (p) { enMacro[p.tecla] = true; });
  var grupos = [["1", "2", "3", "4"], ["5", "6", "7", "8"], ["Q", "E"], ["Espacio"], ["LMB", "RMB"]];
  var filas = 4;
  B.barra.forEach(function (c) { filas = Math.max(filas, c.pila.length); });
  function txt(t) { return TECLA_TXT[t] || t; }
  var barra = '<div class="barra">' + grupos.map(function (g) {
    return '<div class="grupo">' + g.map(function (t) {
      var col = porTecla[t], pila = col ? col.pila : [], oro = !!enMacro[t] || (t === "RMB" && !!macro);
      var celdas = [];
      for (var i = filas - 1; i >= 0; i--) {
        var id = pila[i];
        if (id) celdas.push('<div class="celda llena' + (oro ? " oro" : "") + '">' + icono(id) + (pila.length > 1 ? '<span class="orden">' + (i + 1) + "</span>" : "") + "</div>");
        else if (t === "RMB" && i === 0 && macro) celdas.push('<div class="celda oro macro">MACRO</div>');
        else celdas.push('<div class="celda"></div>');
      }
      return '<div class="col">' + celdas.join("") + '<span class="tecla' + (oro ? " oro" : "") + '">' + esc(txt(t)) + "</span></div>";
    }).join("") + "</div>";
  }).join("") + "</div>";

  var out = '<div class="barra-box"><h3 style="margin-top:0">Barra nivel ' + B.nivel + "</h3>" + barra +
    '<div class="barra-pie">' + (macro ? "Doradas: lo que pulsa la macro (en Clic der.). El resto lo pulsas tú. " : "Sin macro: todo lo pulsas tú. ") +
    "En cada pila sale primero la de abajo (el número pequeño es la prioridad).</div></div>";

  // tabla de pilas
  var orden = ["LMB", "Q", "E", "1", "2", "3", "4", "5", "6", "7", "8", "Espacio"];
  var cols = B.barra.slice().sort(function (a, b) { return orden.indexOf(a.tecla) - orden.indexOf(b.tecla); });
  out += '<h3>Qué va en cada tecla</h3><div class="tabla-scroll"><table class="pilas"><thead><tr><th>Tecla</th><th>Para qué</th><th>Pila (1 = abajo, sale primero)</th><th>La pulsa</th></tr></thead><tbody>' +
    cols.map(function (c) {
      // el ataque básico no se mantiene: si la macro lo lleva, lo pulsa ella; sin macro, de relleno entre habilidades
      var quien = c.tecla === "LMB" ? (enMacro.LMB ? "La macro (último paso)" : "Tú, de relleno entre habilidades") :
        enMacro[c.tecla] ? (c.uso === "ambas" ? "La macro (y tú, si quieres)" : "La macro") : "Tú";
      return "<tr><td><strong>" + esc(txt(c.tecla)) + "</strong></td><td>" + esc(c.nombre) + "</td><td>" +
        c.pila.map(function (id, i) { return '<span class="item">' + (c.pila.length > 1 ? "<small>" + (i + 1) + ".</small> " : "") + hab(id) + "</span>"; }).join("") + "</td><td>" + esc(quien) + "</td></tr>";
    }).join("") + "</tbody></table></div>";

  if (macro) {
    out += '<h3>Tu macro</h3><div class="panel"><div class="macro">' + macro.pasos.map(function (p, i) {
      var c = porTecla[p.tecla];
      return (i ? '<span class="flecha">→</span>' : "") + '<div class="paso"><b>Paso ' + (i + 1) + "</b>" +
        '<span class="iconos-pila">' + c.pila.map(function (id) { return icono(id); }).join("") + "</span>" +
        "<span>Tecla <strong>" + esc(txt(p.tecla)) + "</strong>" + (c.pila.length > 1 ? " · " + esc(c.nombre) : " · " + esc(H[c.pila[0]].nombre)) + "</span><small>" + p.ms + " ms</small></div>";
    }).join("") + "</div><table><tr><th>Tecla de la macro</th><td><strong>Clic der.</strong>, mantenla pulsada " +
      "(Ajustes, Configuración de teclas, General, Macro)</td></tr>" +
      (B.basico_en_macro ? "<tr><th>Ataque básico</th><td>Va como <strong>último paso</strong> de la macro: en el juego no se repite manteniendo Clic izq., así que solo mantienes Clic der.</td></tr>" : "") + "<tr><th>Al crearla</th><td>En la ventana de la macro eliges <strong>teclas</strong> (pilas), no habilidades sueltas: " +
      "la macro lanza lo que esté listo en esa pila.</td></tr></table></div>";
  }
  return out;
}

// ===== visor de Daevanion =====
function pintarDaevanion(B, H) {
  var D = B.daevanion, el = document.getElementById("daev");
  if (!D || !D.tableros.length) { el.remove(); return; }
  var estado = { preset: D.activo || 0, tablero: 0, paso: null, iconos: true, fase: null };
  // preset con las fases (los 416 repartidos en 3 tandas parejas entre los 4 tableros)
  var iFases = -1;
  D.presets.forEach(function (p, i) { if (p.fases && p.fases.length) iFases = i; });

  function pinta() {
    var pr = D.presets[estado.preset], tb = D.tableros[estado.tablero];
    var info = pr.tableros[tb.tablero] || { tomados: [], puntos: 0, tope: 0 };
    var orden = info.tomados;
    var paso = estado.paso == null ? orden.length : estado.paso;
    var fz = estado.fase && pr.fases ? pr.fases[estado.fase - 1] : null, desde = -1;
    if (fz && !tb.propio) {
      paso = fz.hasta[tb.tablero] || 0;
      desde = estado.fase > 1 ? (pr.fases[estado.fase - 2].hasta[tb.tablero] || 0) : 0;
    }
    function faseDe(i) {
      if (!pr.fases || tb.propio) return 0;
      for (var f = 0; f < pr.fases.length; f++) if (i < (pr.fases[f].hasta[tb.tablero] || 0)) return f + 1;
      return 0;
    }
    var pos = {};
    orden.forEach(function (id, i) { pos[id] = i; });
    var puntos = 0;
    var porId = {};
    tb.nodos.forEach(function (n) { porId[n.id] = n; });
    orden.slice(0, paso).forEach(function (id) { if (porId[id]) puntos += porId[id].coste; });
    var total = tb.nodos.filter(function (n) { return n.tipo !== "Start"; }).length;
    var celdas = [];
    for (var f = 0; f < tb.filas; f++) for (var c = 0; c < tb.cols; c++) celdas.push(null);
    tb.nodos.forEach(function (n) { celdas[n.f * tb.cols + n.c] = n; });

    var h = '<div class="botones">' + D.presets.map(function (p, i) {
      return '<button class="boton' + (i === estado.preset ? " on" : "") + '" data-preset="' + i + '">' + esc(PRESET_DAEV[p.nombre_en] || p.nombre_en) + "</button>";
    }).join("") + "</div>" +
      (iFases >= 0 ? '<div class="botones fases"><span>Por fases (416 en 3 tandas):</span>' + D.presets[iFases].fases.map(function (f, i) {
        return '<button class="boton' + (estado.fase === i + 1 ? " on" : "") + '" data-fase="' + (i + 1) + '">Fase ' + (i + 1) + " · " + f.puntos + "</button>";
      }).join("") + "</div>" : "") +
      '<div class="botones">' + D.tableros.map(function (t, i) {
        return '<button class="boton' + (i === estado.tablero ? " on" : "") + '" data-tab="' + i + '">' + esc(t.nombre) + " · " + t.nivel + "</button>";
      }).join("") + "</div>" +
      '<div class="daev-info"><span>' + Math.min(paso, orden.length) + " de " + total + " nodos · " + puntos + " / " + (info.tope || "—") +
      (tb.propio ? " " + (tb.moneda || "cristales de Ariel") : " puntos en este tablero") + '</span><button class="boton" data-iconos="1">' + (estado.iconos ? "Ocultar" : "Mostrar") + " iconos de habilidad</button></div>" +
      '<div class="orden">Orden <button class="boton" data-mov="-1">◀</button><input type="range" min="0" max="' + orden.length + '" value="' + paso +
      '"><button class="boton" data-mov="1">▶</button><span>' + paso + "/" + orden.length + "</span></div>" +
      '<div class="rejilla-daev" style="grid-template-columns:repeat(' + tb.cols + ',1fr)">' + celdas.map(function (n) {
        if (!n) return '<div class="nodo"></div>';
        var tomado = pos[n.id] != null && pos[n.id] < paso;
        var ultimo = pos[n.id] === paso - 1;
        var nueva = desde >= 0 && pos[n.id] != null && pos[n.id] >= desde && pos[n.id] < paso;
        var fn = pos[n.id] != null ? faseDe(pos[n.id]) : 0;
        var tip = "<div class='tt-nombre'>" + esc(n.titulo) + "</div>" + (n.valor ? "<div>" + esc(n.valor) + "</div>" : "") +
          (n.coste ? "<div class='tt-sub'>Coste: " + n.coste + "</div>" : "") +
          (pos[n.id] != null ? "<div class='tt-sub'>Paso " + (pos[n.id] + 1) + " del orden" + (fn ? " · Fase " + fn : "") + "</div>" : "<div class='tt-sub'>No se toma en este preset</div>");
        if (n.tipo === "Start") return '<div class="nodo inicio" data-tip="' + esc(tip) + '"><img src="icons/clases/' + B.clase + '.webp" alt=""></div>';
        var img = (n.icono && estado.iconos) ? "habilidades/" + n.icono + ".webp" :
          "ui/Node_" + (n.rareza === "None" ? "Common" : n.rareza) + (tomado ? "" : "_Disabled") + ".webp";
        return '<div class="nodo lleno' + (tomado ? " tomado" : " apagado") + (nueva ? " fase-nueva" : ultimo && desde < 0 ? " ultimo" : "") + '" data-tip="' + esc(tip) + '"><img src="icons/' + img + '" alt="" loading="lazy"></div>';
      }).join("") + "</div>" +
      (desde >= 0 ? '<div class="leyenda-daev"><span>Borde dorado = nodos de la Fase ' + estado.fase + ' en este tablero</span><span>Borde azul = fases anteriores</span>' +
        "<span>Cambia de pestaña para ver los de cada tablero</span></div>" :
      '<div class="leyenda-daev"><span>Borde azul = nodo tomado hasta este paso del orden</span><span>Borde blanco = último nodo del paso</span>' +
      "<span>Mueve «Orden» para ver en qué orden se cogen</span></div>") +
      (fz && tb.propio ? '<div class="aviso" style="margin-top:10px">Las fases son solo para los 416 cristales de los cuatro primeros tableros; este va aparte, con su ruta completa.</div>' : "") +
      (estado.fase ? tablaFases(pr) : "") +
      (tb.propio && tb.aviso ? '<div class="aviso" style="margin-top:10px">' + tb.aviso + "</div>" :
      tb.propio ? '<div class="aviso" style="margin-top:10px"><strong>Ariel (parches del 21 y 28-oct):</strong> solo JcE y con cristales propios, no con los puntos de nivel. ' +
      "Sale <strong>Fragmento de Ariel</strong> en el modo <strong>Difícil</strong> de Cueva de Krao y Draupnir (nivel de objeto <strong>2.600</strong>) y de Cañón de Urugugu e Isla Aérea de Vakron (<strong>2.700</strong>); 100 fragmentos = 1 Cristal de Daevanion: Ariel " +
      "(Substance Morph), hasta 30 por mazmorra: <strong>120 en total</strong>. La ruta coge los 4 nodos de Amplificación de Daño de JcE (+6 %), los 4 de Amplificación de Daño de Jefe (+4 %), los 4 de Tolerancia a Daño JcE (+6 %) y dos de Crítico (+20); " +
      "los primeros 60 son los de antes (los dos del medio a los 13 y 26 cristales), luego los otros tres de Jefe (a 87) y la Tolerancia (a 117). Es igual en todas las clases.</div>" :
      D.presets.length > 1 ? '<div class="aviso" style="margin-top:10px"><strong>Modos, por orden:</strong> ' + D.presets.map(function (p) {
        return "<strong>" + esc(PRESET_DAEV[p.nombre_en] || p.nombre_en) + "</strong> (" + sumaPuntos(p) + ")";
      }).join(", luego ") + ". Hoy se juntan como mucho <strong>416 cristales</strong> para estos cuatro tableros: «Con 416 cristales» los gasta todos en lo que más daño da. " +
      "Los tableros se abren a nivel " + abren() + "; Ariel y Azphel van aparte, con sus propios cristales.</div>" :
      '<div class="aviso" style="margin-top:10px"><strong>Ruta de la guía:</strong> ' + sumaPuntos(D.presets[0]) + " puntos en los cuatro tableros (cuestan 570 en total: no da para todos). " +
      "Los tableros se abren a nivel " + abren() + (D.tableros.some(function (t) { return t.propio; }) ? "; Ariel va aparte, con sus propios cristales" : "") + ".</div>");
    el.innerHTML = h;
  }
  // qué poner en cada tablero en cada fase (nodos y cristales que se añaden)
  function tablaFases(pr) {
    var tabs = D.tableros.filter(function (t) { return !t.propio; });
    var filas = pr.fases.map(function (f, i) {
      var antes = i ? pr.fases[i - 1].hasta : {};
      return '<tr' + (estado.fase === i + 1 ? ' class="on"' : "") + "><td><strong>Fase " + (i + 1) + "</strong></td><td>" + f.puntos + "</td>" + tabs.map(function (t) {
        var lista = (pr.tableros[t.tablero] || { tomados: [] }).tomados, a = antes[t.tablero] || 0, h = f.hasta[t.tablero] || 0;
        var coste = {}, s = 0;
        t.nodos.forEach(function (n) { coste[n.id] = n.coste; });
        lista.slice(a, h).forEach(function (id) { s += coste[id] || 0; });
        return "<td>" + (h > a ? "+" + (h - a) + " nodos · " + s : "nada") + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="aviso" style="margin-top:10px"><strong>Por fases:</strong> los 416 cristales en 3 tandas parejas, repartidas entre los cuatro tableros para que el daño suba a la vez. ' +
      "Primero va lo que pide el autor de esta build y luego lo que más daño da por cristal. En cada fase pon en cada tablero los nodos en dorado (cambia de pestaña) y pasa a la siguiente. Ariel y Azphel van aparte.</div>" +
      '<div class="tabla-scroll"><table class="tabla tabla-fases"><thead><tr><th>Fase</th><th>Cristales</th>' +
      tabs.map(function (t) { return "<th>" + esc(t.nombre) + "</th>"; }).join("") + "</tr></thead><tbody>" + filas + "</tbody></table></div>";
  }
  function abren() {
    return D.tableros.filter(function (t) { return !t.propio; }).map(function (t) { return t.nivel; }).join(", ");
  }
  function sumaPuntos(p) {
    var s = 0, propio = {};
    D.tableros.forEach(function (t) { if (t.propio) propio[t.tablero] = 1; });
    for (var k in p.tableros) if (!propio[k]) s += p.tableros[k].puntos || 0;
    return s;
  }
  el.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.preset) { estado.preset = +b.dataset.preset; estado.paso = null; estado.fase = null; }
    if (b.dataset.fase) { estado.preset = iFases; estado.paso = null; estado.fase = +b.dataset.fase; }
    if (b.dataset.tab) { estado.tablero = +b.dataset.tab; estado.paso = null; }
    if (b.dataset.iconos) estado.iconos = !estado.iconos;
    if (b.dataset.mov) {
      estado.fase = null;
      var n = D.presets[estado.preset].tableros[D.tableros[estado.tablero].tablero].tomados.length;
      var p = estado.paso == null ? n : estado.paso;
      estado.paso = Math.max(0, Math.min(n, p + (+b.dataset.mov)));
    }
    pinta();
  });
  el.addEventListener("input", function (e) {
    if (e.target.type === "range") { estado.paso = +e.target.value; estado.fase = null; pinta(); }
  });
  pinta();
}

// ===== coleccionables con pestañas =====
// cómo priorizar las Arcanas (igual para todas las clases)
var ARC_PRIO = [
  ["1", "Las líneas de habilidad", "El atributo (Vida, Muerte…) viene fijo con la carta; lo que eliges son las líneas"],
  ["2", "Solo los niveles 12, 16 y 20", "Abren especializaciones; un +1 que no te lleva a uno de ellos casi no suma"],
  ["3", "Primero las clave a 16", "Las 2 primeras de cada carta (borde dorado)"],
  ["4", "Luego las 2 que más daño hacen, a 20", "Mira la tabla de Habilidades de tu clase"],
  ["5", "El resto, a 12 o 16", "Brújula, Espejo y Campana"],
  ["6", "Pergamino: 2 de 4 ya vale", "Es la carta difícil; al subirla los +1 caen al azar en sus líneas"],
  ["7", "Cáliz, la última", "Comodín: tapa lo que no llegue a su nivel"],
  ["8", "No persigas el set de 4", "Vale más el atributo suelto (Crítico, Golpe)"],
  ["Parar", "Cuando las clave estén a 20 y el resto en su meta", "No gastes más en esa carta"]
];

function pintarColeccionables(C, filasStats, habN) {
  var panel = document.getElementById("panel-col"), tabs = document.getElementById("tabs-col");
  if (!panel) return;
  function item(img, nombre, sub, equipado, tip) {
    return '<div class="item-col"' + (tip ? ' data-tip="' + esc(tip) + '"' : "") + ">" + (img ? '<img src="' + img + '" alt="" loading="lazy">' : "") +
      '<div style="min-width:0"><span class="n">' + esc(nombre) + "</span><small>" + esc(sub) + "</small></div>" +
      (equipado ? '<span class="equipado">EQUIPADO</span>' : "") + "</div>";
  }
  function tipStats(nombre, stats, extra) {
    return "<div class='tt-nombre'>" + esc(nombre) + "</div><table class='tt-tabla'>" + (stats || []).map(function (s) {
      return "<tr><td>" + esc(s[0]) + "</td><td>" + esc(s[1]) + "</td></tr>";
    }).join("") + "</table>" + (extra || "");
  }
  function otorgado(equip, pos) {
    return '<div class="otorgado"><div class="t">Otorgado</div>' + (equip && equip.length ? '<div class="st">Efectos de equipo</div>' + filasStats(equip) : "") +
      (pos && pos.length ? '<div class="st">Efectos de posesión</div>' + filasStats(pos) : "") + "</div>";
  }
  function pinta(tab) {
    var h = "";
    if (tab === "titulos") {
      var eq = C.titulos.filter(function (t) { return t.equipado; });
      h = '<div><div class="items-col" style="margin-bottom:8px">' + eq.map(function (t) {
        return '<div class="cat-titulo"><small>' + esc(t.categoria) + "</small><b>" + esc(t.nombre) + "</b></div>";
      }).join("") + '</div><div class="items-col">' + C.titulos.map(function (t) {
        return item("", t.nombre, "Título · " + t.categoria, t.equipado, tipStats(t.nombre, t.stats,
          (t.posesion.length ? "<div class='tt-sec'>Al poseer</div>" + t.posesion.map(function (s) { return esc(s[0] + " " + s[1]); }).join("<br>") : "") +
          (t.nota ? "<div class='tt-sec'>Cuándo</div>" + esc(t.nota) : "")));
      }).join("") + "</div></div>" + otorgado(C.titulos_equipado, C.titulos_posesion);
    } else if (tab === "arcanas") {
      var tot = {};
      C.arcanas.forEach(function (a) { a.stats.forEach(function (s) { tot[s[0]] = s[1]; }); });
      h = '<div class="items-col arc-cartas">' + C.arcanas.map(function (a) {
        return item("icons/objetos/" + a.icono + ".webp", a.nombre, a.ranura + (a.nivel ? " · Nv. " + a.nivel : a.set ? " · " + a.set : ""), true, tipStats(a.nombre, a.stats,
          a.vinculos.length ? "<div class='tt-sec'>Líneas</div>" + a.vinculos.map(esc).join("<br>") : ""));
      }).join("") + "</div>" + otorgado(Object.keys(tot).map(function (k) { return [k, tot[k]]; }), []);
      if (C.arcanas.some(function (a) { return a.buscar; })) {
        h += '<div class="arc-guia"><h3>Qué buscar en cada carta</h3><table class="tabla arc-tabla arc-lin"><thead><tr><th>Carta</th><th>Atributo (fijo)</th><th>Líneas a pescar, en orden</th></tr></thead><tbody>' +
          C.arcanas.map(function (a) {
            var b = a.buscar || { dios: "", lineas: [], nota: "" };
            return '<tr><td><span class="hab arc-carta"><img src="icons/objetos/' + a.icono + '.webp" alt="" loading="lazy">' + esc(a.ranura) + "</span></td><td>" + esc(b.dios) +
              '</td><td><div class="arc-lineas">' + b.lineas.map(function (n, i) { return '<span class="' + (i < 2 ? "clave" : "") + '">' + habN(n) + "</span>"; }).join("") + "</div>" +
              (b.nota ? '<small class="arc-nota">' + esc(b.nota) + "</small>" : "") + "</td></tr>";
          }).join("") + '</tbody></table><h3>Cómo priorizar y hasta dónde</h3><table class="tabla arc-tabla"><thead><tr><th>#</th><th>Qué</th><th>Por qué</th></tr></thead><tbody>' +
          ARC_PRIO.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td><b>" + esc(r[1]) + "</b></td><td>" + esc(r[2]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      }
    } else if (tab === "alas") {
      h = '<div class="items-col">' + C.alas.map(function (a) {
        return item("icons/objetos/" + a.icono + ".png", a.nombre, a.nota || "+" + (a.nivel || 0), a.equipado, tipStats(a.nombre, a.stats));
      }).join("") + "</div>" + otorgado(C.alas_equipado, C.alas_posesion);
    }
    panel.innerHTML = '<div class="panel-col">' + h + "</div>";
    [].forEach.call(tabs.children, function (b) { b.classList.toggle("on", b.dataset.tab === tab); });
  }
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (b) pinta(b.dataset.tab);
  });
  var primero = tabs.querySelector("[data-tab]");
  if (primero) pinta(primero.dataset.tab);
}

// Build 1 o Build 2: se recuerda la elegida en este navegador y va en la dirección (&g=1 / &g=2)
var GUIAS = { 1: "Build 1", 2: "Build 2" };
function buildDe(g) {
  return g === 2 ? window.BUILD2 : window.BUILD;
}
function elegirGuia(g) {
  try { localStorage.setItem("guia-elegida", String(g)); } catch (e) {}
  var u = new URL(location.href);
  u.searchParams.set("g", String(g));
  history.replaceState(null, "", u);
  var y = window.scrollY;
  pintarClase(buildDe(g), g);
  window.scrollTo(0, y);
}

(function () {
  var c = param("c") || "assassin";
  cabecera(c);
  var V = "?v=32";
  cargarScript("data/builds/" + c + ".js" + V, function () {
    cargarScript("data/couga/" + c + ".js" + V, arranca, arranca);
  }, function () {
    document.getElementById("main").innerHTML = "<p>No existe esa clase.</p>";
  });
  function arranca() {
    var g = 1, pg = (param("g") || "").toLowerCase();
    if (pg === "2" || pg === "c2") g = 2;          // c2/m1: enlaces de antes
    else if (pg !== "1" && pg !== "m1") try { g = +localStorage.getItem("guia-elegida") || 1; } catch (e) {}
    if (g !== 2 || !window.BUILD2) g = 1;          // también quien tenía guardada la Build 3, que ya no existe
    pintarClase(buildDe(g), g);
  }
})();
