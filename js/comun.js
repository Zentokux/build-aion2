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
    } else if (b.texto) {
      h += "<p>" + md(b.texto) + "</p>";
    }
    return h;
  }).join("");
}

function cabecera(activa) {
  var links = [["index.html", "Inicio", "inicio"]].concat(
    CLASES.map(function (c) { return ["clase.html?c=" + c.id, c.nombre, c.id]; }),
    [["index.html#guias", "Guías", "guias"]]
  );
  document.body.insertAdjacentHTML("afterbegin",
    '<header class="top"><div class="in"><a class="logo" href="index.html">BUILD <span>AION2</span></a><nav>' +
    links.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[2] === activa ? ' class="on"' : "") + ">" + esc(l[1]) + "</a>";
    }).join("") + "</nav></div></header>");
  document.body.insertAdjacentHTML("beforeend",
    '<footer>Guía en español basada únicamente en <a href="https://metaroad.gg/es/aion2">metaroad.gg</a> (datos y builds). ' +
    'Los textos están resumidos; cada página enlaza a su guía original. AION 2 es una marca de NCSOFT.</footer><div id="tip"></div>');
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
