# 05: Borrado de Posts y documentación del dominio

**Qué construir:** cerrar el dominio Post por arriba y por abajo: borrar un Post con confirmación, y dejar la documentación alineada con el modelo final (incluidos estado y fuente).

**Blocked by:** 02 (borrado), 04 (la documentación describe el modelo final, con fuente)

**Status:** resolved

- [x] Borrar un Post pide confirmación y lo elimina de la lista.
- [x] El Post borrado no reaparece tras recargar la app.
- [x] El glosario define `Post`, `PostState` y `ScheduledAt`, amplía `Topic` para cubrir Story y Post, y ya no veta «post» como sinónimo de Article.
- [x] El contrato IPC documenta los canales de Post.
- [x] `AGENTS.md` lista el dominio Post junto a Story y Article.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Implementado en `8af00f3`: `post:delete` (repositorio, servicio, IPC y preload), acción de borrado en la fila y en el header, `ConfirmDialog`, y documentación (glosario, contrato IPC y `AGENTS.md`).
- Suite final: 43 suites / 651 tests.
