# 03: Integrar el Target en SourcePane

**Qué construir:** añadir un slot opcional `footer?: ReactNode` a `SourcePane` y reorganizar el contenido expandido en una columna: arriba el contenido actual de la Story dentro de un único contenedor con scroll, abajo el footer con `h-1/4 min-h-0 shrink-0`. El scroll del bloque `ready` se mueve al contenedor superior para no anidar scrollers. Crear un `ArticleTargetFooter` que consuma `useArticleTarget` y renderice `<TargetPanel key={link.articleId} link={link} />` cuando haya link; mientras no lo haya, el slot de 25% queda reservado pero vacío. `Workspace` pasa el footer solo en la rama de Article; `PostEditor` no lo pasa. El subpanel se renderiza también cuando la Story está vacía, cargando, en error o ausente. Al colapsar el panel, el footer se oculta con el resto del contenido.

**Blocked by:** 01 (necesita el contexto y el link), 02 (necesita el componente)

**Status:** resolved

- [x] `SourcePane` acepta `footer?: ReactNode` y lo renderiza debajo del contenido de la Story.
- [x] El footer ocupa el 25% del área de contenido bajo la fila `#storyId`, con `min-h-0` y sin encogerse.
- [x] El contenido de la Story tiene un solo scroll; el bloque `ready` ya no anida su propio `overflow-y-auto`.
- [x] `ArticleTargetFooter` consume el contexto, se remonta por `articleId` y descarta una edición en curso al cambiar de Article.
- [x] La rama de Article de `Workspace` monta `ArticleTargetProvider` y pasa el footer.
- [x] La pantalla de Post sigue sin Target y conserva su layout actual.
- [x] El slot de 25% se reserva desde el primer render del Article; no hay salto cuando llega el link.
- [x] El subpanel aparece con Story `ready`, `empty`, `loading`, `error` y `missing`.
- [x] Colapsar `SourcePane` oculta la Story y el Target; expandirlo los muestra.
- [x] La Story y el Target tienen scrolls independientes.
- [x] Los tests actuales de `SourcePane`, Post y Article pasan sin cambios.
- [ ] Verificación manual en Electron: 25%, scroll, tipografía, panel colapsado y ventana estrecha.
- [x] `pnpm typecheck`, `pnpm lint` y la suite completa pasan.

## Comments

- 2026-10-26: implementado. La geometría (25%, scroll y tipografía) no se puede comprobar en jsdom; queda pendiente la pasada manual en Electron antes de dar la feature por cerrada visualmente.
