# 01: Extraer el layout compartido de editor y preview

**Qué construir:** extraer de `ArticleEditor` el layout de dos columnas que alterna editor, toolbar y preview según `viewMode` a un componente de presentación reutilizable, por ejemplo `EditorPreviewLayout`. El componente lee el `viewMode` global del workspace y recibe el contenido de la toolbar, el editor y el Markdown; renderiza la columna del editor, el divisor solo en Split y la columna del preview con scroll propio y `MarkdownPreview`. `ArticleEditor` pasa a usarlo sin cambiar ningún comportamiento observable.

**Blocked by:** ninguna (puede empezar de inmediato)

**Status:** ready-for-agent

- [ ] `ArticleEditor` usa el layout compartido y conserva exactamente el comportamiento actual en Edit, Split y Preview.
- [ ] El layout centraliza los flags de visibilidad, el divisor de Split, el scroll del preview y la ocultación de la toolbar en Preview.
- [ ] El layout reutiliza `MarkdownPreview` y el `viewMode` existentes; no crea estado, acciones ni hooks nuevos.
- [ ] No se modifica la API ni los estilos de `MarkdownPreview`.
- [ ] No cambian la persistencia, el borrador, la validación ni el contrato del `DataPort`.
- [ ] Los tests existentes de view modes de Article pasan sin modificaciones.
- [ ] Typecheck, lint y suite completa en verde.
- [ ] No se toca IPC, preload, dominio, servicios, SQLite ni migraciones.

## Comments

- **2026-10-20 — Prefactor acordado durante la creación de tickets.** Se hace antes del preview de Story para que ambas editoras compartan el mismo layout y no se duplique la lógica de Edit/Split/Preview.
