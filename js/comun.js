// Utilidades comunes de BUILD AION2
var CLASES = [
  { id: "assassin", nombre: "Sicario", rol: "DPS cuerpo a cuerpo (burst)" },
  { id: "gladiator", nombre: "Gladiador", rol: "DPS cuerpo a cuerpo" },
  { id: "templar", nombre: "Templario", rol: "Tanque" },
  { id: "ranger", nombre: "Ranger", rol: "DPS a distancia" },
  { id: "sorcerer", nombre: "Hechicero", rol: "DPS mágico" },
  { id: "spiritmaster", nombre: "Espiritualista", rol: "DPS invocador" },
  { id: "cleric", nombre: "Clérigo", rol: "Sanador" },
  { id: "chanter", nombre: "Conjurador", rol: "Apoyo" }
];
var CATEGORIAS = {
  "getting-started": "Primeros pasos",
  "progression": "Progresión",
  "dungeons": "Mazmorras",
  "raids": "Raids",
  "pvp": "JcJ",
  "economy": "Economía"
};

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
// solo **negrita**
function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }

// icono de objeto con el fondo de su grado: {i: icono, g: grado, n: nombre}
function objHTML(o, grande) {
  var g = o.g || o.grado || "Unique", i = o.i || o.icono;
  return '<figure class="obj' + (grande ? " grande" : "") + '"><span class="ranura-g g-' + esc(g) + '"' +
    (g !== "Special" ? ' style="background-image:url(icons/ui/SlotGrade_' + esc(g) + '.webp)"' : "") +
    '><img src="icons/objetos/' + esc(i) + '.webp" alt="" loading="lazy"></span>' +
    (grande || !o.n ? "" : "<figcaption>" + esc(o.n) + "</figcaption>") + "</figure>";
}

function bloquesHTML(bloques) {
  return (bloques || []).map(function (b) {
    var h = b.titulo ? "<h3>" + md(b.titulo) + "</h3>" : "";
    if (b.tipo === "tabla") {
      h += '<div class="tabla-scroll"><table><thead><tr>' +
        (b.columnas || []).map(function (c) { return "<th>" + md(c) + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        (b.filas || []).map(function (f) {
          return "<tr>" + f.map(function (c) { return "<td>" + md(c) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody></table></div>";
    } else if (b.tipo === "lista") {
      h += "<ul>" + (b.items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ul>";
    } else if (b.tipo === "pasos") {
      h += '<ol class="pasos">' + (b.items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ol>";
    } else if (b.tipo === "aviso") {
      h += '<div class="aviso">' + md(b.texto) + "</div>";
    } else if (b.tipo === "objeto") {
      h += '<div class="ficha-obj">' + objHTML(b, true) + '<div><div class="fo-nombre">' + md(b.nombre) + "</div>" +
        (b.sub ? '<div class="fo-sub">' + md(b.sub) + "</div>" : "") +
        "<ul>" + (b.items || []).map(function (i) { return "<li>" + md(i) + "</li>"; }).join("") + "</ul></div></div>";
    } else if (b.tipo === "escalera") {
      h += '<ol class="escalera">' + (b.items || []).map(function (s) {
        return '<li><div class="es-nivel">' + esc(s.nivel) + '</div><div class="es-cuerpo"><div class="es-texto">' + md(s.texto) + "</div>" +
          (s.objetos ? '<div class="es-obj">' + s.objetos.map(function (o) { return objHTML(o); }).join("") + "</div>" : "") + "</div></li>";
      }).join("") + "</ol>";
    } else if (b.tipo === "ruta") {
      h += (b.rutas || []).map(function (r) {
        var cof = "";
        for (var i = 1; i <= (r.cofres || 0); i++) cof += '<i class="' + (i === r.cofres ? "fin" : "") + (i % 3 === 0 ? " dia" : "") + '"></i>';
        return '<div class="ruta">' +
          '<div class="ru-cab">' + (r.paso ? '<span class="ru-paso">' + esc(r.paso) + "</span>" : "") +
          '<div class="ru-tit"><div class="ru-nombre">' + md(r.abrir) + "</div>" + (r.modo ? '<div class="ru-modo">' + md(r.modo) + "</div>" : "") + "</div>" +
          (r.nivel ? '<span class="ru-nivel">' + esc(r.nivel) + "</span>" : "") + "</div>" +
          (r.jefes ? '<div class="ru-fila"><span class="ru-et">' + (r.lugares ? "Dónde (haz las dos)" : "Matar, en orden") + '</span><div class="ru-jefes' + (r.lugares ? " lugares" : "") + '">' + r.jefes.map(function (j, n) {
            return '<div class="jefe' + (!r.lugares && n === r.jefes.length - 1 ? " final" : "") + '">' + (r.lugares ? "" : '<span class="num">' + (n + 1) + "</span>") + "<span>" + md(j) + "</span></div>";
          }).join("") + "</div></div>" : "") +
          (r.buscar ? '<div class="ru-fila"><span class="ru-et">Qué buscar</span><div class="ru-buscar">' +
            (r.objetos || []).map(function (o) { return objHTML(o); }).join("") + '<div class="ru-btexto">' + md(r.buscar) + "</div></div></div>" : "") +
          (r.cofres ? '<div class="ru-fila"><span class="ru-et">Odyle</span><div class="ru-odyle"><div class="cofres" title="Cada cuadro es un cofre de 40 de Odyle">' + cof + "</div>" +
            '<div class="ru-btexto">' + md(r.odyle || "") + "</div></div></div>" : "") +
          (r.nota ? '<div class="ru-nota">' + md(r.nota) + "</div>" : "") + "</div>";
      }).join("");
    } else if (b.tipo === "expedicion") {
      h += (b.mazmorras || []).map(expHTML).join("");
    } else if (b.texto) {
      h += "<p>" + md(b.texto) + "</p>";
    }
    return h;
  }).join("");
}

// tarjeta de mazmorra con el aspecto de la pantalla de entrada del juego
var ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/></svg>';
function expHTML(m) {
  var est = "";
  for (var i = 0; i < (m.estrellas || 0); i++) est += ESTRELLA;
  var pity = m.garantizada ? '<div class="exp-sec">Recompensa garantizada</div><div class="exp-pity"><div class="barra"><i></i></div><span>0 / ' + esc(m.garantizada) + "</span></div>" : "";
  return '<div class="exp">' +
    '<div class="exp-arte' + (m.fondo ? '" style="background-image:url(img/mazmorras/' + esc(m.fondo) + '.webp)">' : ' sinfondo">') +
    (m.modos ? '<div class="exp-tabs">' + m.modos.map(function (x) { return "<span" + (x === m.modo ? ' class="on"' : "") + ">" + esc(x) + "</span>"; }).join("") + "</div>" : "") +
    '<div class="exp-panel">' + (m.paso ? '<span class="ru-paso">' + esc(m.paso) + "</span>" : "") +
    (est ? '<div class="exp-est">' + est + "</div>" : "") +
    '<div class="exp-nombre">' + esc(m.nombre) + "</div>" +
    '<div class="exp-sec">Condiciones de entrada</div><div class="exp-cond">Nv. ' + esc(m.nivel || 45) +
    ' <i>|</i> <b class="poder">' + esc(m.poder) + "</b> <i>|</i> " + esc(m.jugadores || "1 a 5") + "</div>" +
    (m.limite ? '<div class="exp-sec">Recompensas de cubo</div><div class="exp-txt">' + md(m.limite) + "</div>" : "") +
    '<div class="exp-sec">Recompensa de cubo <b class="od">' + esc(m.od || 40) + " Od</b></div>" +
    (m.objetos ? '<div class="es-obj">' + m.objetos.map(function (o) { return objHTML(o); }).join("") + "</div>" : "") +
    pity + "</div></div>" +
    (m.jefes ? '<div class="exp-jefes' + (m.sinorden ? " sinorden" : "") + '">' + m.jefes.map(function (j, n) {
      var fin = !m.sinorden && n === m.jefes.length - 1;
      return '<div class="exp-jefe' + (fin ? " final" : "") + '">' + (j.img ? '<img src="img/jefes/' + esc(j.img) + '.webp" alt="" loading="lazy">' : '<span class="sinimg"></span>') +
        '<div>' + (m.sinorden ? "" : '<span class="num">' + (n + 1) + "</span>") + "<b>" + esc(j.n) + "</b>" + (fin ? "<small>Jefe final</small>" : (j.nota ? "<small>" + esc(j.nota) + "</small>" : "")) + "</div></div>";
    }).join("") + "</div>" : "") +
    (m.buscar ? '<div class="ru-fila"><span class="ru-et">Qué buscar</span><div class="ru-btexto">' + md(m.buscar) + "</div></div>" : "") +
    (m.plan ? '<div class="ru-fila"><span class="ru-et">Cómo hacerlo</span><div class="ru-btexto">' + md(m.plan) + "</div></div>" : "") +
    (m.nota ? '<div class="ru-nota">' + md(m.nota) + "</div>" : "") + "</div>";
}

// fondo del juego según la sección (img/fondos)
var FONDOS = {
  inicio: "catedral", temporizador: "atreia", ajustes: "hechizo", mapa: "bosque", guias: "cielo",
  assassin: "magia-hielo", gladiator: "golem", templar: "raid", ranger: "selva",
  sorcerer: "alas-fuego", spiritmaster: "abismo-agua", cleric: "clerigo", chanter: "hechizo",
  "getting-started": "cielo", progression: "selva", dungeons: "gruta", raids: "raid", pvp: "alas-fuego", economy: "catedral"
};
function ponerFondo(activa) {
  var g = new URLSearchParams(location.search).get("g");
  var k = activa === "guias" && g ? g.split("__")[0] : activa;
  document.documentElement.style.setProperty("--img", 'url("../img/fondos/' + (FONDOS[k] || "cielo") + '.webp")');
}

function cabecera(activa) {
  ponerFondo(activa);
  var links = [["index.html", "Inicio", "inicio"]].concat(
    CLASES.map(function (c) { return ["clase.html?c=" + c.id, c.nombre, c.id]; }),
    [["index.html#guias", "Guías", "guias"], ["temporizador.html?v=9", "Temporizador", "temporizador"], ["mapa-cubos.html", "Mapa de cubos", "mapa"], ["mascotas.html", "Mascotas", "mascotas"], ["ajustes.html", "Ajustes", "ajustes"], ["guia.html?g=progression__farmeo-de-equipo-700-1400-2100", "Farmeo de equipo", "farmeo"]]
  );
  document.body.insertAdjacentHTML("afterbegin",
    '<header class="top"><div class="in"><a class="logo" href="index.html">BUILD <span>AION2</span></a><nav>' +
    links.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[2] === activa ? ' class="on"' : "") + ">" + esc(l[1]) + "</a>";
    }).join("") + "</nav></div></header>");
  document.body.insertAdjacentHTML("beforeend",
    '<footer>BUILD AION2 · guía en español de AION 2 Global.</footer><div id="tip"></div>');
  activarTips();
}

function activarTips() {
  var tip = document.getElementById("tip");
  document.addEventListener("mouseover", function (e) {
    var t = e.target.closest && e.target.closest("[data-tip]");
    if (!t) { tip.style.display = "none"; return; }
    tip.innerHTML = t.getAttribute("data-tip");
    tip.style.display = "block";
  });
  document.addEventListener("mousemove", function (e) {
    if (tip.style.display !== "block") return;
    var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    var y = e.clientY + 16;
    if (y + tip.offsetHeight > window.innerHeight) y = e.clientY - tip.offsetHeight - 10;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  });
}

function param(n) { return new URLSearchParams(location.search).get(n); }

function cargarScript(src, ok, fallo) {
  var s = document.createElement("script");
  s.src = src; s.onload = ok; s.onerror = fallo;
  document.head.appendChild(s);
}
