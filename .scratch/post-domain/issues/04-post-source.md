# 04: Fuente opcional del Post: Story o Article

**Qué construir:** un Post puede no tener fuente, referenciar una Story o referenciar un Article, nunca las dos. La fuente se elige con un único selector con grupos Stories/Articles y se muestra en el panel de fuente, que reutiliza el comportamiento de Article. La relación solo se puede cambiar mientras el Post está en `pending`.

**Blocked by:** 01 (panel de fuente genérico), 02 (colección y editor), 03 (el gating del selector necesita el estado editorial)

**Status:** resolved

- [x] El selector Source permite no elegir fuente, elegir una Story o elegir un Article; nunca ambas a la vez.
- [x] El panel de fuente muestra la Story referenciada (topic, títulos, tags y texto) o el Article referenciado (título, subtítulo, objetivo y texto); sin fuente muestra su estado vacío.
- [x] Cambiar la fuente solo se permite con el Post en `pending`: fuera de `pending` el selector está deshabilitado y el dominio rechaza el cambio.
- [x] Un Post no puede guardarse con Story y Article a la vez; la exclusividad se rechaza en dominio y en base de datos.
- [x] Borrar la Story o el Article referenciado deja el Post sin fuente, sin borrar el Post.
- [x] Los IDs de fuente opcionales viajan y se conservan como ausencia, nunca como cadena vacía.
- [x] Existen tests de modelo, servicio, base de datos y renderer para la relación y el panel.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Implementado en `4497d7b`: `story_id`/`article_id` (migración `0003`, con `on delete set null` y check de exclusividad), verificación de fuente en el servicio, bloqueo fuera de `pending`, selector Source agrupado y panel de fuente que renderiza Story o Article.
- Suite final: 43 suites / 646 tests.
