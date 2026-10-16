#!/usr/bin/env node
// Project validator: same checks as the old validate.sh, in a single Node
// process (no bash, no Python): works the same on Windows 11 and macOS.
// Usage: node validate.mjs        Exit code: 0 = ok, 1 = failures.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = dirname(fileURLToPath(import.meta.url));
process.chdir(ROOT);

const tty = process.stdout.isTTY;
const color = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
let failures = 0;
const ok = (msg) => console.log(`${color("0;32", "✓")} ${msg}`);
const fail = (msg) => { failures++; console.log(`${color("0;31", "✗")} ${msg}`); };
const warn = (msg) => console.log(`${color("0;33", "!")} ${msg}`);
const section = (title) => console.log(`\n== ${title} ==`);

const rel = (p) => relative(ROOT, p).split("\\").join("/");
const read = (p) => readFileSync(p, "utf8");

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, ext));
    else if (entry.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

const listNames = (dir, ext) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => basename(f, ext)).sort() : [];

// ---- JS syntax: parsed as browser scripts, without running them -------------
section("Sintaxis JS");
for (const f of [...walk("js", ".js"), ...walk("data", ".js")]) {
  try {
    new vm.Script(read(f), { filename: rel(f) });
    ok(rel(f));
  } catch (e) {
    const line = (e.stack || "").split("\n")[0];  // "file:line"
    fail(`${rel(f)}  —  ${e.name}: ${e.message} (${line})`);
  }
}

// ---- JSON --------------------------------------------------------------------
section("JSON valido");
for (const f of walk("data", ".json")) {
  try {
    JSON.parse(read(f));
    ok(rel(f));
  } catch (e) {
    fail(`${rel(f)}  —  ${e.message}`);
  }
}

// ---- JS <-> JSON parity ------------------------------------------------------
section("Paridad JS<->JSON");
const guiasJs = listNames("data/guias", ".js");
const guiasJson = listNames("data/textos/guias", ".json");
const buildsJs = listNames("data/builds", ".js");
const buildsJson = listNames("data/textos/builds", ".json");

if (guiasJs.length === guiasJson.length) ok(`guias: ${guiasJs.length} JS == ${guiasJson.length} JSON`);
else fail(`guias desalineadas: ${guiasJs.length} JS vs ${guiasJson.length} JSON`);
if (buildsJs.length === buildsJson.length) ok(`builds: ${buildsJs.length} JS == ${buildsJson.length} JSON`);
else fail(`builds desalineadas: ${buildsJs.length} JS vs ${buildsJson.length} JSON`);

for (const b of guiasJs) if (!guiasJson.includes(b))
  fail(`falta JSON: data/textos/guias/${b}.json  (tiene JS: data/guias/${b}.js)`);
for (const b of guiasJson) if (!guiasJs.includes(b))
  fail(`falta JS: data/guias/${b}.js  (tiene JSON: data/textos/guias/${b}.json)`);
for (const b of buildsJs) if (!buildsJson.includes(b))
  fail(`falta JSON build: data/textos/builds/${b}.json`);

// ---- HTML --------------------------------------------------------------------
section("HTML basico");
const pages = readdirSync(".").filter((f) => f.endsWith(".html")).sort();
for (const html of pages) {
  if (read(html).includes("</html>")) ok(`${html} cierra </html>`);
  else fail(`${html} sin </html>`);
}

// ---- cache-buster on local scripts/styles ------------------------------------
section("Cache-buster en index.html");
const missing = [];
for (const html of pages) {
  for (const m of read(html).matchAll(/(href|src)="([^"]*\.(js|css))"/g)) {
    missing.push(`${html}:${m[0]}`);
  }
}
if (missing.length === 0) ok("todos los <script>/<link> locales tienen ?v=");
else for (const m of missing) warn(`sin cache-buster: ${m}`);

// ---- summary -----------------------------------------------------------------
section("Resumen");
if (failures === 0) {
  console.log(`${color("0;32", "OK")} — todo valido`);
  process.exit(0);
}
console.log(color("0;31", `${failures} fallos`));
process.exit(1);
