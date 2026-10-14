#!/usr/bin/env bash
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
NC=$'\033[0m'
FAIL=0

say_ok()    { printf "%s✓%s %s\n" "$GREEN" "$NC" "$1"; }
say_fail()  { printf "%s✗%s %s\n" "$RED" "$NC" "$1"; FAIL=$((FAIL+1)); }
say_warn()  { printf "%s!%s %s\n" "$YELLOW" "$NC" "$1"; }

# Windows: node recién instalado puede no estar aún en el PATH de esta consola
if ! command -v node >/dev/null 2>&1 && [ -x "/c/Program Files/nodejs/node.exe" ]; then
  PATH="/c/Program Files/nodejs:$PATH"
fi
# Windows: "python3" suele ser el alias de la Microsoft Store; probar cuál funciona de verdad
PY=""
for cand in python3 python py; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" -c "import json" >/dev/null 2>&1; then
    PY="$cand"; break
  fi
done
if ! command -v node >/dev/null 2>&1; then
  printf "%sFalta Node.js%s (https://nodejs.org)\n" "$RED" "$NC"; exit 1
fi
if [ -z "$PY" ]; then
  printf "%sFalta Python%s (https://python.org)\n" "$RED" "$NC"; exit 1
fi

printf "\n== Sintaxis JS ==\n"
JS_FILES=$(find js data -type f -name "*.js")
for f in $JS_FILES; do
  if node -c "$f" 2>/tmp/validate_js_err; then
    say_ok "$f"
  else
    say_fail "$f  —  $(cat /tmp/validate_js_err | tr '\n' ' ')"
  fi
done

printf "\n== JSON valido ==\n"
JSON_FILES=$(find data -type f -name "*.json")
for f in $JSON_FILES; do
  if "$PY" -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$f" 2>/tmp/validate_json_err; then
    say_ok "$f"
  else
    say_fail "$f  —  $(cat /tmp/validate_json_err | tr '\n' ' ')"
  fi
done

printf "\n== Paridad JS<->JSON ==\n"
GUIAS_JS=$(ls data/guias/*.js 2>/dev/null | wc -l | tr -d ' ')
GUIAS_JSON=$(ls data/textos/guias/*.json 2>/dev/null | wc -l | tr -d ' ')
BUILDS_JS=$(ls data/builds/*.js 2>/dev/null | wc -l | tr -d ' ')
BUILDS_JSON=$(ls data/textos/builds/*.json 2>/dev/null | wc -l | tr -d ' ')

if [ "$GUIAS_JS" = "$GUIAS_JSON" ]; then
  say_ok "guias: ${GUIAS_JS} JS == ${GUIAS_JSON} JSON"
else
  say_fail "guias desalineadas: ${GUIAS_JS} JS vs ${GUIAS_JSON} JSON"
fi
if [ "$BUILDS_JS" = "$BUILDS_JSON" ]; then
  say_ok "builds: ${BUILDS_JS} JS == ${BUILDS_JSON} JSON"
else
  say_fail "builds desalineadas: ${BUILDS_JS} JS vs ${BUILDS_JSON} JSON"
fi

for js in data/guias/*.js; do
  base=$(basename "$js" .js)
  json="data/textos/guias/${base}.json"
  if [ ! -f "$json" ]; then
    say_fail "falta JSON: $json  (tiene JS: $js)"
  fi
done
for json in data/textos/guias/*.json; do
  base=$(basename "$json" .json)
  js="data/guias/${base}.js"
  if [ ! -f "$js" ]; then
    say_fail "falta JS: $js  (tiene JSON: $json)"
  fi
done
for js in data/builds/*.js; do
  base=$(basename "$js" .js)
  json="data/textos/builds/${base}.json"
  if [ ! -f "$json" ]; then
    say_fail "falta JSON build: $json"
  fi
done

printf "\n== HTML basico ==\n"
for html in *.html; do
  if grep -q "</html>" "$html"; then
    say_ok "$html cierra </html>"
  else
    say_fail "$html sin </html>"
  fi
done

printf "\n== Cache-buster en index.html ==\n"
MISSING_V=$(grep -oE '(href|src)="[^"]*\.(js|css)"' index.html guia.html clase.html mapa-cubos.html temporizador.html 2>/dev/null | grep -v "\?v=" || true)
if [ -z "$MISSING_V" ]; then
  say_ok "todos los <script>/<link> locales tienen ?v="
else
  while IFS= read -r line; do
    [ -n "$line" ] && say_warn "sin cache-buster: $line"
  done <<< "$MISSING_V"
fi

printf "\n== Resumen ==\n"
if [ "$FAIL" -eq 0 ]; then
  printf "%sOK%s — todo valido\n" "$GREEN" "$NC"
  exit 0
else
  printf "%s%d fallos%s\n" "$RED" "$FAIL" "$NC"
  exit 1
fi
