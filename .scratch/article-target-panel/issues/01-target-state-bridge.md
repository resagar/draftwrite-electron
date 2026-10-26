# 01: Puente de estado del Target entre ArticleEditor y SourcePane

**Qué construir:** añadir un contexto local a la rama de Article que proyecte el Target del borrador hacia el panel `Source story`. El contexto expone un `ArticleTargetLink` con `articleId`, `value` y `save`. `ArticleTargetProvider` envuelve solo la rama de Article en `Workspace`. `ArticleEditor` publica el link cuando cambia el `ID` o el `Target` del borrador, y `save` actualiza el borrador con `change({ ...draft, Target: next })` usando refs al último borrador y al último `change` para no pisar el título ni el texto con una copia vieja. El publish no ocurre al escribir en el texto del Article. No se usa un store de módulo y no se toca el proceso principal, el preload, el dominio, SQLite ni las migraciones.

**Blocked by:** ninguna (puede empezar de inmediato)

**Status:** resolved

- [x] Existe `src/renderer/src/state/article-target-context.tsx` con `ArticleTargetLink`, `ArticleTargetProvider`, `useArticleTarget` y `usePublishArticleTarget`.
- [x] `ArticleTargetProvider` envuelve únicamente la rama de Article en `Workspace`; Story y Post no lo montan.
- [x] `ArticleEditor` publica `{ articleId: draft.ID, value: draft.Target, save }` al contexto.
- [x] `save` llama a `change` con el último borrador, no con una copia obsoleta de otro campo.
- [x] El publish depende de `draft.ID` y `draft.Target`; escribir en `draft.Text` no republica el link.
- [x] El provider se desmonta con la rama de Article; no queda estado del Target al salir a Story o Post.
- [x] El cambio no modifica el contrato del `DataPort` ni la persistencia existente.
- [x] `pnpm typecheck`, `pnpm lint` y la suite completa pasan.
- [x] No se cambian tests existentes para hacer pasar la implementación.

## Comments

- 2026-10-26: implementado. Los refs al último borrador y al último `change` se actualizan en un `useEffect` para respetar `react-hooks/refs` (no se escriben refs durante el render).
