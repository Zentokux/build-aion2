// Página de clase: lee window.BUILD (data/builds/<clase>.js)
var TECLA_TXT = { LMB: "Clic izq.", RMB: "Clic der.", Otra: "Otra tecla" };

function pintarClase() {
  var B = window.BUILD, T = B.textos || {}, S = T.secciones || {};
  var H = {};
  B.habilidades.forEach(function (h) { H[h.id] = h; });
  var main = document.getElementById("main");
  document.title = B.nombre + " · BUILD AION2";

  function icono(id, cls) {
    var h = H[id];
    if (!h) return "";
    return '<img src="icons/habilidades/' + h.icono + '.webp" alt="' + esc(h.nombre) + '" loading="lazy"' +
      ' data-tip="' + esc(tipHab(h)) + '"' + (cls ? ' class="' + cls + '"' : "") + ">";
  }
  function tipHab(h) {
    return "<b>" + esc(h.nombre) + "</b> · " + esc(h.tipo) + (h.nivel ? " · nivel " + h.nivel : "") +
      (h.enfriamiento ? " · " + h.enfriamiento + " s" : "") + "<br>" + esc(h.efecto);
  }
  function hab(id) {
    var h = H[id];
    return h ? '<span class="hab">' + icono(id) + esc(h.nombre) + "</span>" : esc(id);
  }
  function seccion(id, titulo, html) {
    if (!html) return "";
    secciones.push([id, titulo]);
    return '<h2 id="' + id + '">' + esc(titulo) + "</h2>" + html;
  }
  var secciones = [];
  var macro = B.macros[0];
  var enMacro = {};
  if (macro) macro.pasos.forEach(function (p) { enMacro[p.id] = true; });

  // ---------- cabecera ----------
  var h = '<div class="cabecera-clase"><img src="icons/clases/' + B.clase + '.webp" alt="">' +
    "<div><h1>" + esc(B.nombre) + "</h1><div class=\"sub\">" + md(T.resumen || "") + "</div>" +
    '<div class="chips"><span class="chip">' + esc(B.rol || "") + '</span><span class="chip">Nivel ' + B.nivel +
    '</span><span class="chip">Build de ' + esc(B.autor || "metaroad") + " · " + esc(B.actualizado) +
    '</span><span class="chip"><a href="' + esc(B.fuente) + '" target="_blank" rel="noopener">Guía original en metaroad</a></span></div></div></div>';

  // ---------- resumen ----------
  if (T.pros || T.contras) {
    h += seccion("resumen", "Pros y contras",
      '<div class="dos"><div class="panel"><h3>A favor</h3><ul class="pros">' +
      (T.pros || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") +
      '</ul></div><div class="panel"><h3>En contra</h3><ul class="contras">' +
      (T.contras || []).map(function (x) { return "<li>" + md(x) + "</li>"; }).join("") + "</ul></div></div>");
  }

  // ---------- barra + macro ----------
  var porTecla = {};
  B.barra.forEach(function (c) { (porTecla[c.tecla] = porTecla[c.tecla] || []).push(c); });
  var macroTecla = "RMB";
  var grupos = [["1", "2", "3", "4"], ["5", "6", "7", "8"], ["Q", "E"], ["LMB", "RMB"]];
  if (porTecla.Otra) grupos.push(porTecla.Otra.map(function (_, i) { return "Otra#" + i; }));
  var filas = 4;
  B.barra.forEach(function (c) { filas = Math.max(filas, c.pila.length); });
  var notas = [];
  var barra = '<div class="barra">' + grupos.map(function (g) {
    return '<div class="grupo">' + g.map(function (t) {
      var col = t.indexOf("Otra#") === 0 ? porTecla.Otra[+t.split("#")[1]] : (porTecla[t] || [])[0];
      var pila = col ? col.pila.slice() : [];
      var celdas = [];
      var oro = false;
      // si la macro pulsa la de abajo, la tecla dispara toda la pila
      var pilaOro = pila.length > 1 && enMacro[pila[0]];
      for (var i = filas - 1; i >= 0; i--) {
        var id = pila[i];
        if (id) {
          var o = enMacro[id] || pilaOro;
          if (o) oro = true;
          celdas.push('<div class="celda llena' + (o ? " oro" : "") + '">' + icono(id) +
            (pila.length > 1 ? '<span class="orden">' + (i + 1) + "</span>" : "") + "</div>");
        } else if (t === macroTecla && !col && i === 0) {
          oro = true;
          celdas.push('<div class="celda oro macro">MACRO</div>');
        } else {
          celdas.push('<div class="celda"></div>');
        }
      }
      if (t === macroTecla && macro) oro = true;
      if (col && col.nota && col.nota !== "estigma") notas.push("Tecla " + (TECLA_TXT[col.tecla] || col.tecla) + " (" + col.nota + ")");
      var etiqueta = t.indexOf("Otra#") === 0 ? "Otra" : (TECLA_TXT[t] || t);
      return '<div class="col">' + celdas.join("") + '<span class="tecla' + (oro ? " oro" : "") + '">' + esc(etiqueta) + "</span></div>";
    }).join("") + "</div>";
  }).join("") + "</div>";

  var hb = '<div class="barra-box"><h3>Barra nivel ' + B.nivel + " (orden del juego)</h3>" + barra +
    '<div class="barra-pie">Orden del juego: 1-8, Q, E, clic izquierdo, clic derecho. Las doradas son las que pulsa la macro. ' +
    "En una línea apilada sale primero la de abajo (el número pequeño es el orden). Pasa el ratón por un icono para ver qué hace.</div>" +
    (notas.length ? '<p class="notas-barra">' + notas.map(esc).join(" · ") + "</p>" : "") +
    (porTecla.Otra ? '<p class="notas-barra">«Otra»: metaroad usa más de 12 teclas; ponla en cualquier tecla libre.</p>' : "") +
    "</div>";

  if (macro) {
    hb += '<h3>Tu macro (' + esc(nombrePreset(B.presets[0] && B.presets[0].nombre_en)) + ")</h3>" +
      '<div class="panel"><div class="macro">' + macro.pasos.map(function (p, i) {
        var x = H[p.id] || { nombre: p.id, icono: "" };
        return (i ? '<span class="flecha">→</span>' : "") + '<div class="paso"><b>Paso ' + (i + 1) + "</b>" + icono(p.id) +
          "<span>" + esc(x.nombre) + "</span><small>" + p.ms + " ms</small></div>";
      }).join("") + "</div>" +
      "<table><tr><th>Tecla</th><td><strong>Clic der.</strong> — mantenla pulsada" +
      (B.macro_rmb_metaroad ? "" : " (metaroad solo dice «una tecla que mantengas pulsada»; el clic derecho es la sugerida)") +
      "</td></tr></table></div>";
  }
  var otras = (T.macros_por_preset || []).filter(function (m) { return m.pasos && m.pasos.length; });
  if (otras.length) {
    hb += "<h3>Macro de cada preset</h3><div class=\"tabla-scroll\"><table><thead><tr><th>Preset</th><th>Pasos (en orden)</th><th>Nota</th></tr></thead><tbody>" +
      otras.map(function (m) {
        return "<tr><td>" + esc(nombrePreset(m.preset_en)) + "</td><td>" + m.pasos.map(function (n, i) {
          var id = idPorNombre(n);
          return (i ? " → " : "") + (id ? hab(id) : esc(n));
        }).join("") + "</td><td>" + md(m.nota || "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  h += seccion("barra", "Barra y macro", hb);

  h += seccion("rotacion", "Rotación", bloquesHTML(S.rotacion));

  // ---------- presets ----------
  if (T.presets && T.presets.length) {
    h += seccion("presets", "Presets de habilidades",
      "<table><thead><tr><th>#</th><th>Preset</th><th>Cuándo usarlo</th></tr></thead><tbody>" +
      T.presets.map(function (p, i) {
        return "<tr><td>" + (i + 1) + "</td><td><strong>" + esc(p.nombre) + "</strong></td><td>" + md(p.uso) + "</td></tr>";
      }).join("") + "</tbody></table>");
  }

  // ---------- habilidades ----------
  var tipos = ["Activa", "Estigma", "Pasiva"];
  var th = bloquesHTML(S.habilidades);
  tipos.forEach(function (tp) {
    var lista = B.habilidades.filter(function (x) { return x.tipo === tp; });
    if (!lista.length) return;
    th += "<h3>" + (tp === "Activa" ? "Activas" : tp === "Estigma" ? "Estigmas" : "Pasivas") + '</h3><div class="tabla-scroll"><table><thead><tr><th>Habilidad</th><th>Nivel</th>' +
      (tp === "Pasiva" ? "" : "<th>Especializaciones</th>") +
      B.presets.map(function (p, i) { return '<th title="' + esc(nombrePreset(p.nombre_en)) + '">P' + (i + 1) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + lista.map(function (x) {
        var specs = x.especializaciones.filter(function (s) { return s.elegida; });
        return "<tr><td>" + hab(x.id) + "</td><td class=\"nivel\">" + (x.nivel || "—") +
          (x.extra ? " <small>(" + x.base + " + " + x.extra + ")</small>" : "") + "</td>" +
          (tp === "Pasiva" ? "" : "<td>" + (specs.length ? specs.map(function (s) {
            return "<div><small class=\"tipo\">" + s.nivel + "</small> " + esc(s.texto) + "</div>";
          }).join("") : "—") + "</td>") +
          B.presets.map(function (p) {
            return "<td>" + (p.habilidades.indexOf(x.id) >= 0 ? '<span class="preset-on">✓</span>' : "") + "</td>";
          }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  });
  th += '<p class="fuente">Nivel = base + extra de equipo y Daevanion. P1-P3 = presets (ver arriba).</p>';
  h += seccion("habilidades", "Habilidades", th);
  h += seccion("estigmas", "Estigmas", bloquesHTML(S.estigmas));

  // ---------- equipo ----------
  var te = bloquesHTML(S.equipo);
  te += '<h3>Equipo final de la build</h3><div class="tabla-scroll"><table><thead><tr><th>Ranura</th><th>Pieza</th><th>Mejora</th><th>Soul Binding</th><th>Manastones</th></tr></thead><tbody>' +
    B.equipo.map(function (e) {
      return "<tr><td>" + esc(e.ranura) + '</td><td><span class="hab">' +
        (e.icono ? '<img src="icons/objetos/' + e.icono + '.webp" alt="" loading="lazy">' : "") +
        "<span>" + esc(e.nombre) + "<br><small class=\"tipo\">" + esc(e.grado || "") + (e.nivel ? " · nv. obj. " + e.nivel : "") +
        "</small></span></span></td><td>" + (e.mejora ? "+" + e.mejora : "—") + "</td><td>" +
        (e.vinculos.length ? e.vinculos.map(esc).join("<br>") : "—") + "</td><td>" +
        (e.piedras.length ? e.piedras.map(esc).join("<br>") : "—") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
  if (B.puntuacion_equipo) te += '<p class="fuente">Puntuación de equipo de la build: ' + B.puntuacion_equipo + ".</p>";
  h += seccion("equipo", "Equipo", te);

  // ---------- Daevanion ----------
  var D = B.daevanion;
  var td = bloquesHTML(S.daevanion);
  if (D && D.tableros.length) {
    td += "<h3>Puntos por tablero</h3><table><thead><tr><th>Tablero</th><th>Se abre</th>" +
      D.presets.map(function (p) { return "<th>" + esc(nombreDaev(p)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      D.tableros.map(function (t) {
        return "<tr><td><strong>" + esc(t.tablero) + "</strong></td><td>nivel " + t.nivel + "</td>" +
          D.presets.map(function (p) { return "<td>" + (t.puntos[p] != null ? t.puntos[p] : "—") + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }
  h += seccion("daevanion", "Daevanion", td);
  h += seccion("coleccionables", "Coleccionables", bloquesHTML(S.coleccionables));
  h += seccion("mascotas", "Mascotas", bloquesHTML(S.mascotas));

  h += '<p class="fuente" style="margin-top:30px">Fuente: <a href="' + esc(B.fuente) + '" target="_blank" rel="noopener">' + esc(B.fuente) + "</a>" +
    (B.planificador ? ' · <a href="' + esc(B.planificador) + '" target="_blank" rel="noopener">abrir la build en el planificador de metaroad</a>' : "") + "</p>";

  var indice = '<div class="chips" style="margin:14px 0 0">' + secciones.map(function (s) {
    return '<a class="chip" href="#' + s[0] + '">' + esc(s[1]) + "</a>";
  }).join("") + "</div>";
  main.innerHTML = h.replace('</div></div></div>', '</div></div></div>' + indice);

  function nombrePreset(en) {
    var p = (T.presets || []).filter(function (x) { return x.nombre_en === en; })[0];
    return p ? p.nombre : (en || "");
  }
  function idPorNombre(n) {
    var x = B.habilidades.filter(function (h) { return h.nombre.toLowerCase() === String(n).toLowerCase(); })[0];
    return x && x.id;
  }
}

function nombreDaev(p) {
  return { "Launch priority": "Prioridad de lanzamiento", "Full PvE": "PvE completo" }[p] || p;
}

(function () {
  var c = param("c") || "assassin";
  cabecera(c);
  cargarScript("data/builds/" + c + ".js?v=1", pintarClase, function () {
    document.getElementById("main").innerHTML = "<p>No existe esa clase.</p>";
  });
})();
