# 02: Preview de Markdown en el editor de Story

**Qué construir:** el editor de Story usa el layout compartido para mostrar el editor y el Markdown renderizado en paralelo, tanto al crear una Story como al abrir una almacenada. El modo inicial sigue siendo Split, el preview se actualiza en vivo con `Story.Text` y usa el mismo `MarkdownPreview` que Article. En modo Preview el editor y la toolbar se ocultan; en Edit el preview desaparece. La persistencia y el guardado diferido no cambian.

**Blocked by:** 01 (necesita el layout compartido)

**Status:** ready-for-agent

- [ ] Al crear una Story, el modo inicial es Split y la región `Preview` muestra el Markdown del borrador.
- [ ] Al abrir una Story almacenada, el preview renderiza su `Text`.
- [ ] Escribir en el editor actualiza el preview sin esperar al guardado.
- [ ] Se renderizan encabezados, párrafos, énfasis, listas, citas, código, enlaces, tablas GFM, tachado y reglas horizontales.
- [ ] Un `Text` vacío produce un preview vacío, sin placeholder ni error.
- [ ] En modo Preview el editor y la toolbar están ocultos; en Edit el preview está oculto.
- [ ] El preview tiene scroll propio y no desplaza al editor en Split.
- [ ] El texto guardado coincide con el editado; no cambian `create`, `update`, la validación ni el guardado diferido.
- [ ] Tests de integración en el seam de App cubren creación y Story almacenada, incluido GFM y actualización en vivo.
- [ ] Los tests existentes de Story y de view modes de Article pasan sin modificaciones.
- [ ] Typecheck, lint y suite completa en verde.
- [ ] No se toca IPC, preload, dominio, servicios, SQLite ni migraciones.

## Comments

- **2026-10-20 — Depende del prefactor 01.** En este ticket todavía no existe el conmutador en la UI de Story; el modo Preview se puede observar heredando `viewMode` desde Article. El header con el conmutador llega en el ticket 03.
