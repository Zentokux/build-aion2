# BUILD AION2

Guía en español de AION 2 Global (temporada 1, nivel 45) basada únicamente en [metaroad.gg](https://metaroad.gg/es/aion2):

- **8 builds JcE** (Sicario, Gladiador, Templario, Ranger, Hechicero, Espiritualista, Clérigo, Conjurador) con la **barra y la macro en imagen**: teclas 1-8, Q, E, clic izquierdo y clic derecho; en dorado lo que pulsa la macro; en cada línea apilada sale primero la de abajo.
- Habilidades con nivel y especializaciones, estigmas, equipo final (Soul Binding y Manastones), Daevanion, coleccionables y mascotas.
- **53 guías** (primeros pasos, progresión, mazmorras, raids, JcJ y economía) resumidas en tablas.

Web: https://zentokux.github.io/build-aion2/

Los datos vienen de los builds y guías publicados por metaroad.gg; los textos están resumidos con palabras propias y cada página enlaza a su guía original. AION 2 es una marca de NCSOFT.

## Actualizar
```
python tools/descargar.py --force   # baja de nuevo las páginas de metaroad
python tools/extraer.py             # crudo/builds y crudo/guias
python tools/gen-builds.py          # data/builds/*.js + iconos
python tools/gen-guias.py           # data/guias/*.js + data/indice.js
```
Los textos redactados están en `data/textos/`.
