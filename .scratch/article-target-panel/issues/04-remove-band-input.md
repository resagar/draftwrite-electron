# 04: Quitar el input de la banda y cubrir el flujo completo

**Qué construir:** eliminar `target` y `onTarget` de `ArticleBand` y borrar el input `Target` de la segunda fila; `Subtitle` se queda sola. Quitar también el `onTarget` del call site de `ArticleEditor`, que ya actualiza el Target por el contexto. Cubrir con tests de integración en `App` el flujo completo: Article guardado con y sin Target, editar y guardar, cancelar, crear un Article con Target antes de Story y título, cambiar de Article durante una edición, colapsar y expandir el panel, y comprobar que Post no muestra la región `Target`. Mantener el autosave como único camino de persistencia.

**Blocked by:** 01, 02, 03

**Status:** resolved

- [x] `ArticleBand` ya no recibe `target` ni `onTarget` y no renderiza el input `Target`.
- [x] `Subtitle` sigue funcionando en la banda.
- [x] `ArticleEditor` ya no pasa `onTarget` a la banda y el Target se guarda por el link del contexto.
- [x] Un Article guardado muestra el Target debajo de la Story; editarlo y guardarlo produce un `updateArticle` con el nuevo valor después del autosave.
- [x] `Cancel` no produce escritura y restaura el valor visible.
- [x] Un Article sin Target muestra `No target yet` y `Add target`; guardar un valor lo persiste.
- [x] En creación, definir el Target antes de Story y título no lo pierde; cuando el Article es guardable, `createArticle` recibe el Target.
- [x] Cambiar de Article mientras se edita descarta la edición y muestra el Target del Article nuevo.
- [x] Colapsar `SourcePane` oculta el Target; expandirlo lo muestra.
- [x] La pantalla de Post no tiene la región `Target`.
- [x] Vaciar el Target y guardar vuelve a `No target yet` y persiste el valor vacío.
- [x] No hay dos controles de Target en la pantalla (banda y panel).
- [x] Los tests existentes no se modifican para hacer pasar la implementación; si alguno consulta el input `Target`, el cambio de contrato se justifica en el ticket.
- [ ] Verificación manual: 25%, scroll, tipografía, foco, `Escape`, `Cmd/Ctrl+Enter`, Target largo y ventana estrecha.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- 2026-10-26: implementado. Se añadió el test de integración que vacía el Target, comprueba `No target yet.` y verifica que el autosave persiste `Target: ''`, que era el único caso del ticket sin cobertura. La verificación manual en Electron sigue pendiente.
