# 01: Prefactor: panel de fuente genérico

**Qué construir:** el panel de fuente de un Article pasa a modelarse como una unión explícita de fuente (Story o vacío), sin cambiar nada de lo que se ve hoy. Deja el panel listo para añadir la rama Article en el ticket 04, sin introducir aún esa rama ni ningún uso nuevo.

**Blocked by:** — (puede empezar ya)

**Status:** resolved

- [x] El panel de fuente de un Article abierto muestra el mismo contenido y los mismos controles que antes: colapsar/expandir, resizer y copiar.
- [x] El panel recibe una fuente discriminada (`story` o vacío) en lugar de un estado específico de Story, sin alterar su comportamiento visible.
- [x] La suite existente sigue verde sin cambiar ninguna expectativa de comportamiento; los ajustes, si los hay, son mecánicos.
- [x] `pnpm test`, `pnpm typecheck` y `pnpm lint` pasan.

## Comments

- Implementado en `88bf6ba`.
- La revisión de código detectó que `kind: 'story'` mezclaba origen y estado de carga; se separó en `SourceContent` (hoy solo `story`) y variantes de estado (`empty`, `loading`, `error`, `missing`, `ready`). La rama de contenido es ahora un `ready` explícito, no el `else` final, para que la rama Article del ticket 04 no herede el render de Story.
- Se conservaron `storageKey: 'story'` (cambiarlo resetea el ancho persistido), las etiquetas visibles y el helper `sourceStory`; el vocabulario `storyPaneExpanded` y el `SourcePane` genérico se alinearán cuando el 04 añada la fuente Article.
- Suite final: 40 suites / 590 tests; `pnpm typecheck` y `pnpm lint` limpios.
