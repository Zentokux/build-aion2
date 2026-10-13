# Cómo redactar los textos de BUILD AION2

Fuente ÚNICA: los JSON de `tools/crudo/` (extraídos de metaroad.gg en español). No uses otras webs ni conocimiento propio: si un dato no está en la fuente, no lo pongas.

## Reglas
1. **Español**, frases cortas, tuteo, sin «vosotros». Guía práctica para jugar, no Wikipedia.
2. **No copies párrafos literales** de metaroad: reescribe con tus palabras y en formato tabla/lista. Conserva TODOS los datos útiles (números, niveles, requisitos, nombres, órdenes, costes, tiempos, recompensas).
3. Nombres de habilidades, objetos, jefes, mazmorras y sistemas: EXACTAMENTE como aparecen en la fuente (p. ej. «Estocada al corazón», «Krao Cave», «Odyle Energy»).
4. Prefiere tablas: «Qué / 1.ª opción / Opcional», «Jefe / Qué hace / Qué haces tú», «Paso / Qué hacer». Una explicación de más de 2 líneas casi siempre debe ser una tabla o lista.
5. Solo `**negrita**` como formato dentro del texto. Nada de HTML ni enlaces.
6. Si la fuente dice que algo es incierto/solo Corea/no confirmado, conserva ese matiz con un bloque `aviso`.

## Formato de salida (JSON UTF-8, sin BOM)
```json
{
  "slug": "<igual que el nombre del archivo crudo sin .json>",
  "categoria": "<categoria del crudo>",
  "titulo": "<título corto en español>",
  "fuente": "<campo url del crudo>",
  "resumen": "<1-2 frases: lo que necesitas saber>",
  "bloques": [
    {"titulo": "...", "tipo": "tabla", "columnas": ["...", "..."], "filas": [["...", "..."]]},
    {"titulo": "...", "tipo": "lista", "items": ["..."]},
    {"titulo": "...", "tipo": "pasos", "items": ["..."]},
    {"tipo": "aviso", "texto": "..."}
  ]
}
```
Todas las filas de una tabla con el mismo número de celdas que `columnas`. Valida tu JSON con `python -c "import json;json.load(open(r'RUTA',encoding='utf8'))"` antes de terminar.
