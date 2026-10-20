# 01: Panel «Source story» durante la creación, con la Story del borrador

**Qué construir:** al iniciar la creación de un Article desde la lista, el sidebar o el atajo, el panel «Source story» aparece expandido junto al editor de creación. Si la creación trae una Story preseleccionada, el panel muestra Topic, Titles, Tags y Text desde el primer render; si no, muestra un estado vacío explícito (`No source story yet`) que no es un error. Mientras el writer elige o cambia la Story en la banda, el panel sigue ese `StoryID` en vivo sin esperar al guardado. La creación y el Article guardado comparten la misma composición del workspace: al guardar, el panel no se remonta, conserva su contenido y su posición, y el editor no se reduce de golpe. Durante la creación el panel es de solo lectura: no muestra `Open story in editor` ni `Delete story`; `Copy source text` solo está disponible cuando hay una Story.

**Blocked by:** ninguna (puede empezar de inmediato)

**Status:** resolved

- [x] Al iniciar `New Article` desde la lista, el sidebar o el atajo, el panel «Source story» está presente y expandido junto al editor de creación.
- [x] Con una Story preseleccionada, el panel muestra su Topic, Titles, Tags y Text antes de guardar.
- [x] Sin Story seleccionada, el panel muestra `No source story yet` y no muestra el mensaje de Story inexistente.
- [x] Al elegir una Story en la banda, el panel se actualiza sin guardar.
- [x] Al cambiar a otra Story, el panel muestra la nueva; al limpiar el selector, vuelve al estado vacío.
- [x] Al guardar el Article, el panel sigue en la misma posición, conserva su contenido y no se remonta; la región del panel es la misma instancia antes y después del guardado.
- [x] El guardado no provoca el salto visual que hoy ocurre cuando el panel aparece después del guardado automático.
- [x] Durante la creación no se ofrecen acciones de Article guardado; el panel no navega ni borra la Story.
- [x] `Copy source text` solo está disponible cuando hay una Story.
- [x] La Story del borrador se comparte sin mover el texto del editor ni re-renderizar CodeMirror en cada tecla.
- [x] Tests de integración en el seam de App cubren las tres entradas de creación, preselección, cambio, vacío y continuidad al guardar.
- [x] No se modifican los tests existentes para hacer pasar la implementación; los cambios de contrato quedan en el ticket 02.

## Comments

- 2026-10-20: Implementado en `8123619`. La composición de creación y Article guardado quedó unificada; el panel sigue el `StoryID` del borrador y conserva la instancia al guardar. Verificado con `pnpm test --runInBand` (239 tests), `pnpm lint`, `pnpm typecheck` y `pnpm build`.
