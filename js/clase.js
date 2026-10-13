// Página de clase: lee window.BUILD (data/builds/<clase>.js) y la pinta
var TECLA_TXT = { LMB: "Clic izq.", RMB: "Clic der.", Otra: "Otra" };
var PRESET_DAEV = { "Launch priority": "Prioridad de lanzamiento", "Full PvE": "JcE completo" };
var IZQ = [["MainHand", "SubHand"], ["Helmet", "Shoulder"], ["Torso", "Pants"], ["Gloves", "Boots"], ["Cape"]];
var DER = [["Necklace", "Amulet"], ["Earring1", "Earring2"], ["Ring1", "Ring2"], ["Bracelet1", "Bracelet2"],
  ["Belt", "Rune1"], ["Rune2", "Brooch1"], ["Brooch2", "Pendant"]];
var VACIAS = { Brooch1: "Broche 1", Brooch2: "Broche 2", Pendant: "Colgante", Rune1: "Runa 1", Rune2: "Runa 2", Amulet: "Amuleto", Belt: "Cinturón" };

function pintarClase() {
  var B = window.BUILD, T = B.textos || {}, S = T.secciones || {};
  var H = {};
  B.habilidades.forEach(function (h) { H[h.id] = h; });
  var main = document.getElementById("main");
  document.title = "Build PvE de " + B.nombre + " · BUILD AION2";
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
    var x = B.habilidades.filter(function (h) { return h.nombre.toLowerCase() === String(n).toLowerCase(); })[0];
    return x && x.id;
  }
  // tecla de cada habilidad según la barra («Clic der.·1» = 1.ª encima de la de abajo)
  var teclaDe = {};
  B.barra.forEach(function (c) {
    c.pila.forEach(function (id, i) { teclaDe[id] = (c.tecla === "Otra" ? "Q" : (TECLA_TXT[c.tecla] || c.tecla)) + (i ? "·" + i : ""); });
  });

  // ---------- cabecera y resumen ----------
  var cont = B.contadores || [];
  var tarjeta = '<div class="tarjeta-build"><div class="cab"><img src="icons/clases/' + B.clase + '.webp" alt=""><div><b>' + esc(B.nombre) +
    '</b><span class="fac">' + esc((B.faccion || "").toUpperCase()) + '</span><div class="rol">' + esc(B.rol || "") + "</div></div></div>" +
    '<div class="lbl">Nivel de objeto</div><div class="gs"><span>★</span> ' + (B.puntuacion_equipo || "—") + "</div>" +
    '<div style="color:var(--suave);font-size:11px;margin-bottom:8px">' + B.huecos[0] + " de " + B.huecos[1] + " huecos ocupados</div>" +
    cont.map(function (c) { return '<div class="fila">' + esc(c.label) + "<b>" + c.used + ' <small style="color:var(--suave)">/ ' + c.cap + "</small></b></div>"; }).join("") +
    '<div class="fila">Nv. de personaje<b>' + B.nivel + "</b></div></div>";

  var h = "<h1>Build PvE de " + esc(B.nombre) + '</h1><div class="ruta">AION 2 / Guías de builds</div>' +
    '<p class="intro">' + md(T.resumen || "") + "</p>";
  h += seccion("resumen", "Resumen de la build",
    '<div class="resumen"><div>' + bloquesHTML(S.resumen) +
    '<div class="proscontras"><div class="pro"><h4>✓ Pros</h4><ul>' + (T.pros || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") +
    '</ul></div><div class="contra"><h4>⚠ Contras</h4><ul>' + (T.contras || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") +
    "</ul></div></div></div>" + tarjeta + "</div>");

  // ---------- equipo ----------
  function tipEquipo(e) {
    return "<div class='tt-nombre'>" + esc(e.nombre) + (e.mejora ? " +" + e.mejora : "") + "</div><div class='tt-sub'>" + esc(e.ranura) +
      " · " + esc(e.grado_es || "") + (e.nivel ? " · Nv. de objeto " + e.nivel : "") + "</div>" +
      (e.stats.length ? "<table class='tt-tabla'>" + e.stats.map(function (s) { return "<tr><td>" + esc(s[0]) + "</td><td>" + esc(s[1]) + "</td></tr>"; }).join("") + "</table>" : "") +
      (e.vinculos.length ? "<div class='tt-sec'>Soul Binding</div>" + e.vinculos.map(esc).join("<br>") : "") +
      (e.piedras.length ? "<div class='tt-sec'>Manastones</div>" + e.piedras.map(esc).join("<br>") : "");
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
  var tablaSB = filasSB.length ? "<h3>Líneas de Soul Binding</h3><div class=\"tabla-scroll\"><table><thead><tr><th>Ranura</th><th>Líneas a buscar</th></tr></thead><tbody>" +
    filasSB.map(function (f) { return "<tr><td>" + esc(f[0]) + "</td><td>" + esc(f[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>" : "";
  var bloqEq = S.equipo || [];
  te += bloquesHTML(bloqEq.slice(0, 1)) + tablaSB + bloquesHTML(bloqEq.slice(1));
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
    return '<div class="mr-col">' + celdas + '<span class="mr-tecla">' + esc(c ? (c.tecla === "Otra" ? "Q" : (TECLA_TXT[c.tecla] || c.tecla)) : "") + "</span></div>";
  }
  var th = '<div class="mr-barra"><div class="cols"><div class="bloque"><div class="cab"><span>Habilidades</span><span>' + normales.length + "/" + normales.length +
    ' asignadas</span></div><div class="fila-cols">' + normales.map(colMR).join("") + '</div></div><div class="bloque"><div class="cab"><span>Estigma</span><span>' +
    estigmas.length + '/4 asignadas</span></div><div class="fila-cols">' + estigmas.map(colMR).join("") + "</div></div></div>";
  var pas = B.habilidades.filter(function (x) { return x.tipo === "Pasiva"; });
  th += '<div class="sub-mr">' + pas.length + ' pasivas</div><div class="chips-pas">' + pas.map(function (x) {
    return '<span class="chip-pas">' + icono(x.id) + esc(x.nombre) + "</span>";
  }).join("") + "</div></div>";

  function ficha(x) {
    var sp = x.especializaciones.filter(function (s) { return s.elegida; });
    return '<div class="ficha">' + icono(x.id) + '<div class="cuerpo"><div class="linea"><b>' + esc(x.nombre) + '</b><span class="nv">Nv. ' + (x.nivel || "—") +
      (x.extra ? " (" + x.base + " + " + x.extra + ")" : "") + "</span>" + (teclaDe[x.id] ? '<span class="tec">' + esc(teclaDe[x.id]) + "</span>" : "") + "</div>" +
      (sp.length ? '<div class="esp">' + sp.map(function (s) { return esc(s.texto); }).join(" · ") + "</div>" : "") + "</div></div>";
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
    grupoFichas("Pasivas", pas) + "</div>";

  var P = B.prioridad || {};
  var nPrio = enP1.length;
  th += '<details class="rot"><summary><span>Rotación</span><span style="color:var(--suave)">Prioridad ' + nPrio + " · Macro " + B.macros.length + "/" + B.macros.length + "</span></summary><div class=\"dentro\">" +
    [["Active", "Activas"], ["Stigma", "Estigmas"], ["Passive", "Pasivas"]].map(function (g) {
      return (P[g[0]] || []).length ? '<div class="prio-grupo"><div class="sub-mr">' + g[1] + "</div>" + P[g[0]].map(function (id, i) {
        return "<span>" + (i + 1) + ". " + hab(id) + "</span>";
      }).join(" ") + "</div>" : "";
    }).join("") +
    B.macros.map(function (m) {
      return '<div class="sub-mr">Macro: ' + esc(m.nombre_en) + "</div>" + m.pasos.map(function (p, i) { return (i ? " → " : "") + hab(p.id) + " <small>" + p.ms + " ms</small>"; }).join("");
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
  var M = B.mascotas || [];
  var tm = "";
  if (M.length) {
    tm += '<div class="pestanas"><span class="pestana on">Comprensión de raza<span>' + M.length + '</span></span></div><div class="panel-col"><div class="genus">' +
      M.map(function (g) {
        return '<div class="gen"><div class="cab"><img src="icons/ui/' + g.icono + '.webp" alt=""><b>' + esc(g.nombre) + "</b></div>" +
          '<div class="pos">' + g.posesion.map(function (s) { return esc(s[0]) + " " + esc(s[1]); }).join(" · ") + "</div>" +
          '<div class="ran"><span>Ranuras de comprensión</span><span>' + g.lineas.length + "/" + g.ranuras + "</span></div><ol>" +
          g.lineas.map(function (l) { return "<li><span>" + esc(l[0]) + " " + esc(l[1]) + "</span><small>" + esc(l[2]) + "</small></li>"; }).join("") + "</ol></div>";
      }).join("") + '</div><div class="otorgado"><div class="t">Otorgado</div>' + filasStats(B.mascotas_total) + "</div></div>";
  }
  tm += bloquesHTML(S.mascotas);
  h += seccion("mascotas", "Mascotas", tm);


  // ---------- maqueta con lateral ----------
  var lateral = '<aside class="lateral"><div class="lat-caja indice"><div class="titulo" style="text-align:left">Índice</div><ol>' +
    secciones.map(function (s) { return '<li><a href="#' + s[0] + '">' + esc(s[1]) + "</a></li>"; }).join("") + "</ol></div></aside>";
  main.innerHTML = '<div class="pag">' + lateral + '<div class="contenido">' + h + "</div></div>";

  // icono junto a cada nombre de habilidad en la 1.ª columna de las tablas y en las negritas de los textos
  var nombresHab = B.habilidades.map(function (x) { return x.nombre; }).sort(function (a, b) { return b.length - a.length; });
  var reHab = new RegExp(nombresHab.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "g");
  main.querySelectorAll(".contenido td:first-child, .contenido strong").forEach(function (el) {
    if (el.querySelector("img") || el.closest(".hab")) return;
    el.innerHTML = el.innerHTML.replace(reHab, function (n) { return hab(idPorNombre(n)); });
  });

  pintarDaevanion(B, H);
  pintarColeccionables(C, filasStats);
}

// ===== barra estilo juego (la que pidió el usuario) =====
function barraJuego(B, H, icono, hab, nombrePreset, idPorNombre, T) {
  var porTecla = {};
  B.barra.forEach(function (c) { (porTecla[c.tecla] = porTecla[c.tecla] || []).push(c); });
  var macro = B.macros[0];
  var enMacro = {};
  if (macro) macro.pasos.forEach(function (p) { enMacro[p.id] = true; });
  var grupos = [["1", "2", "3", "4"], ["5", "6", "7", "8"], ["Q", "E"], ["LMB", "RMB"]];
  if (porTecla.Otra) grupos.push(porTecla.Otra.map(function (_, i) { return "Otra#" + i; }));
  var filas = 4;
  B.barra.forEach(function (c) { filas = Math.max(filas, c.pila.length); });
  var barra = '<div class="barra">' + grupos.map(function (g) {
    return '<div class="grupo">' + g.map(function (t) {
      var col = t.indexOf("Otra#") === 0 ? porTecla.Otra[+t.split("#")[1]] : (porTecla[t] || [])[0];
      var pila = col ? col.pila : [];
      var pilaOro = pila.length > 1 && enMacro[pila[0]];
      var celdas = [], oro = false;
      for (var i = filas - 1; i >= 0; i--) {
        var id = pila[i];
        if (id) {
          var o = enMacro[id] || pilaOro;
          if (o) oro = true;
          celdas.push('<div class="celda llena' + (o ? " oro" : "") + '">' + icono(id) + (pila.length > 1 ? '<span class="orden">' + (i + 1) + "</span>" : "") + "</div>");
        } else if (t === "RMB" && !col && i === 0 && macro) {
          oro = true;
          celdas.push('<div class="celda oro macro">MACRO</div>');
        } else celdas.push('<div class="celda"></div>');
      }
      if (t === "RMB" && macro) oro = true;
      var etiqueta = t.indexOf("Otra#") === 0 ? "Otra" : (TECLA_TXT[t] || t);
      return '<div class="col">' + celdas.join("") + '<span class="tecla' + (oro ? " oro" : "") + '">' + esc(etiqueta) + "</span></div>";
    }).join("") + "</div>";
  }).join("") + "</div>";

  var out = '<div class="barra-box"><h3 style="margin-top:0">Barra nivel ' + B.nivel + " (orden del juego)</h3>" + barra +
    '<div class="barra-pie">Orden del juego: 1-8, Q, E, clic izquierdo, clic derecho. Las doradas son las que pulsa la macro. ' +
    "En una línea apilada sale primero la de abajo (el número pequeño es el orden).</div>" +
    (porTecla.Otra ? '<p class="notas-barra">«Otra»: esta clase lleva una 9.ª habilidad en la barra; como Q ya está ocupada, ponla en cualquier tecla libre.</p>' : "") + "</div>";
  if (macro) {
    out += "<h3>Tu macro (" + esc(nombrePreset(B.presets[0] && B.presets[0].nombre_en)) + ")</h3>" +
      '<div class="panel"><div class="macro">' + macro.pasos.map(function (p, i) {
        var x = H[p.id] || { nombre: p.id };
        return (i ? '<span class="flecha">→</span>' : "") + '<div class="paso"><b>Paso ' + (i + 1) + "</b>" + icono(p.id) +
          "<span>" + esc(x.nombre) + "</span><small>" + p.ms + " ms</small></div>";
      }).join("") + "</div><table><tr><th>Tecla</th><td><strong>Clic der.</strong>, mantenla pulsada" +
      (B.macro_rmb ? "" : " (o cualquier tecla que puedas mantener pulsada)") + "</td></tr></table></div>";
  }
  var otras = (T.macros_por_preset || []).filter(function (m) { return m.pasos && m.pasos.length; });
  if (otras.length) {
    out += "<h3>Macro de cada preset</h3><div class=\"tabla-scroll\"><table><thead><tr><th>Preset</th><th>Pasos (en orden)</th><th>Nota</th></tr></thead><tbody>" +
      otras.map(function (m) {
        return "<tr><td>" + esc(nombrePreset(m.preset_en)) + "</td><td>" + m.pasos.map(function (n, i) {
          var id = idPorNombre(n);
          return (i ? " → " : "") + (id ? hab(id) : esc(n));
        }).join("") + "</td><td>" + md(m.nota || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  return out;
}

// ===== visor de Daevanion =====
function pintarDaevanion(B, H) {
  var D = B.daevanion, el = document.getElementById("daev");
  if (!D || !D.tableros.length) { el.remove(); return; }
  var estado = { preset: D.activo || 0, tablero: 0, paso: null, iconos: true };

  function pinta() {
    var pr = D.presets[estado.preset], tb = D.tableros[estado.tablero];
    var info = pr.tableros[tb.tablero] || { tomados: [], puntos: 0, tope: 0 };
    var orden = info.tomados;
    var paso = estado.paso == null ? orden.length : estado.paso;
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
      '<div class="botones">' + D.tableros.map(function (t, i) {
        return '<button class="boton' + (i === estado.tablero ? " on" : "") + '" data-tab="' + i + '">' + esc(t.nombre) + " · " + t.nivel + "</button>";
      }).join("") + "</div>" +
      '<div class="daev-info"><span>' + Math.min(paso, orden.length) + " de " + total + " nodos · " + puntos + " / " + (info.tope || "—") +
      ' puntos en este tablero</span><button class="boton" data-iconos="1">' + (estado.iconos ? "Ocultar" : "Mostrar") + " iconos de habilidad</button></div>" +
      '<div class="orden">Orden <button class="boton" data-mov="-1">◀</button><input type="range" min="0" max="' + orden.length + '" value="' + paso +
      '"><button class="boton" data-mov="1">▶</button><span>' + paso + "/" + orden.length + "</span></div>" +
      '<div class="rejilla-daev" style="grid-template-columns:repeat(' + tb.cols + ',1fr)">' + celdas.map(function (n) {
        if (!n) return '<div class="nodo"></div>';
        var tomado = pos[n.id] != null && pos[n.id] < paso;
        var ultimo = pos[n.id] === paso - 1;
        var tip = "<div class='tt-nombre'>" + esc(n.titulo) + "</div>" + (n.valor ? "<div>" + esc(n.valor) + "</div>" : "") +
          (n.coste ? "<div class='tt-sub'>Coste: " + n.coste + "</div>" : "") +
          (pos[n.id] != null ? "<div class='tt-sub'>Paso " + (pos[n.id] + 1) + " del orden</div>" : "<div class='tt-sub'>No se toma en este preset</div>");
        if (n.tipo === "Start") return '<div class="nodo inicio" data-tip="' + esc(tip) + '"><img src="icons/clases/' + B.clase + '.webp" alt=""></div>';
        var img = (n.icono && estado.iconos) ? "habilidades/" + n.icono + ".webp" :
          "ui/Node_" + (n.rareza === "None" ? "Common" : n.rareza) + (tomado ? "" : "_Disabled") + ".webp";
        return '<div class="nodo lleno' + (tomado ? " tomado" : " apagado") + (ultimo ? " ultimo" : "") + '" data-tip="' + esc(tip) + '"><img src="icons/' + img + '" alt="" loading="lazy"></div>';
      }).join("") + "</div>" +
      '<div class="leyenda-daev"><span>Borde azul = nodo tomado hasta este paso del orden</span><span>Borde blanco = último nodo del paso</span>' +
      "<span>Mueve «Orden» para ver en qué orden se cogen</span></div>" +
      '<div class="aviso" style="margin-top:10px"><strong>Dos modos:</strong> primero rellena <strong>Prioridad de lanzamiento</strong> (lo esencial, ' +
      sumaPuntos(D.presets[0]) + " puntos); cuando la completes, sigue con <strong>JcE completo</strong> hasta " + sumaPuntos(D.presets[D.presets.length - 1]) +
      " puntos. Los tableros se abren a nivel " + D.tableros.map(function (t) { return t.nivel; }).join(", ") + ".</div>";
    el.innerHTML = h;
  }
  function sumaPuntos(p) {
    var s = 0;
    for (var k in p.tableros) s += p.tableros[k].puntos || 0;
    return s;
  }
  el.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.preset) { estado.preset = +b.dataset.preset; estado.paso = null; }
    if (b.dataset.tab) { estado.tablero = +b.dataset.tab; estado.paso = null; }
    if (b.dataset.iconos) estado.iconos = !estado.iconos;
    if (b.dataset.mov) {
      var n = D.presets[estado.preset].tableros[D.tableros[estado.tablero].tablero].tomados.length;
      var p = estado.paso == null ? n : estado.paso;
      estado.paso = Math.max(0, Math.min(n, p + (+b.dataset.mov)));
    }
    pinta();
  });
  el.addEventListener("input", function (e) {
    if (e.target.type === "range") { estado.paso = +e.target.value; pinta(); }
  });
  pinta();
}

// ===== coleccionables con pestañas =====
function pintarColeccionables(C, filasStats) {
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
          t.posesion.length ? "<div class='tt-sec'>Al poseer</div>" + t.posesion.map(function (s) { return esc(s[0] + " " + s[1]); }).join("<br>") : ""));
      }).join("") + "</div></div>" + otorgado(C.titulos_equipado, C.titulos_posesion);
    } else if (tab === "arcanas") {
      var tot = {};
      C.arcanas.forEach(function (a) { a.stats.forEach(function (s) { tot[s[0]] = s[1]; }); });
      h = '<div class="items-col">' + C.arcanas.map(function (a) {
        return item("icons/objetos/" + a.icono + ".webp", a.nombre, a.ranura + " · Nv. " + (a.nivel || ""), true, tipStats(a.nombre, a.stats,
          a.vinculos.length ? "<div class='tt-sec'>Líneas</div>" + a.vinculos.map(esc).join("<br>") : ""));
      }).join("") + "</div>" + otorgado(Object.keys(tot).map(function (k) { return [k, tot[k]]; }), []);
    } else if (tab === "alas") {
      h = '<div class="items-col">' + C.alas.map(function (a) {
        return item("icons/objetos/" + a.icono + ".png", a.nombre, "+" + (a.nivel || 0), a.equipado, tipStats(a.nombre, a.stats));
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

(function () {
  var c = param("c") || "assassin";
  cabecera(c);
  cargarScript("data/builds/" + c + ".js?v=2", pintarClase, function () {
    document.getElementById("main").innerHTML = "<p>No existe esa clase.</p>";
  });
})();
