# Revisión de implementación: versionado editorial

Estado: implementación verificada, sin hallazgos pendientes en estándares ni especificación. Base de revisión: `84e276f420e00947b4d6e0dfa788083bd0baa827`.

## Cobertura contra la especificación

| Ticket | Comportamiento entregado | Evidencia |
| --- | --- | --- |
| 01 | Borrador principal de Article y migración sin historial inventado | Migración real desde el esquema anterior, servicios e IPC con SQLite; creación desde el editor existente. |
| 02 | Versiones explícitas, descripción, incrementos e historial inmutable de Article | Recorrido Electron de primera versión, versiones posteriores, consulta y comparación; numeración compartida en dominio/UI. |
| 03 | Borrador principal de Post conservando fuente, estado y programación | Migración de Post programado con timestamps anteriores; prueba integrada y reapertura. |
| 04 | Versiones explícitas de tema y texto de Post | IPC/SQLite y primera publicación en `2.0.0` desde Electron, sin alterar programación. |
| 05 | Notas generales, resolución y fotografía histórica | Pruebas de cambios solo en notas, snapshots anteriores y versiones sin diferencias. |
| 06 | Anotaciones de selección mediante popover no modal y citas conservadas | Jest de interacción y lectura archivada; Electron con CodeMirror, selección, posicionamiento y reapertura; regresiones por textos repetidos y escritura mientras se anota. |
| 07 | Variantes desde versión o borrador, herencia de notas y numeración independiente | IPC/SQLite; prueba UI de reutilización de una versión idéntica; flujo Electron. |
| 08 | Principal única, archivo y reactivación | Prueba integrada de protección de principal y archivo reversible; consulta de notas archivadas en UI. |
| 09 | Dos editores con autoguardado independiente | Electron con textos distintos, persistencia y continuidad de nodos/foco; recuperación de revisiones obsoletas sin mezclar variantes. |
| 10 | Comparación de versiones y borrador, incluidos campos de escritura | Vista de comparación por campos con agregados y eliminaciones; recorrido Electron con ambas variantes. |
| 11 | Recuperación con protección previa, notas actuales e historial conservado | IPC/SQLite rechaza pendientes; Electron recupera el contenido inicial manteniendo la numeración vigente. |
| 12 | Integración de cambios seleccionados desde versión persistida | Plan con base común y procedencia; regresión de integración parcial que conserva disponibles los cambios no seleccionados. |
| 13 | Conflictos con base, origen, destino y resultado editable | IPC rechaza conflictos sin resolver; Electron confirma el resultado antes de aplicarlo al borrador. |
| 14 | Traslado selectivo de notas relacionadas | Pruebas positivas de copia con identidad y resolución independientes; rechazo de una nota ajena a un fragmento eliminado, con rollback. |
| 15 | Article independiente con la misma Story y origen archivado | Prueba de colisión de título y rollback antes de reintentar; conversión desde Electron. |
| 16 | Post independiente pendiente, sin programación ni publicaciones propias | Prueba parametrizada para orígenes `pending`, `scheduled` y `published`; contenido, historia y vínculo conservados. |
| 17 | Historial manual de publicaciones con versión exacta | Varias publicaciones por IPC y reapertura; Electron registra versión `2.0.0`, fecha y enlace. |
| 18 | Aviso por notas pendientes sin prohibir publicar | Confirmación explícita de continuar en la UI, basada en las notas de la versión elegida; recorrido Electron. |

## Estándares

La revisión independiente detectó anclajes ambiguos, reconciliación y transiciones de variante fuera del modelo, numeración y asociación de notas duplicadas y recuperación insuficiente de revisiones obsoletas. Se corrigieron y se añadieron regresiones. El seguimiento detectó también una recuperación parcialmente aplicada: cada guardado confirmado ahora sale de los pendientes y de las superposiciones locales; el error comunica qué se aplicó y permite decidir únicamente sobre lo restante.

Las invariantes viven en el dominio; el servicio coordina transacciones y el adapter persiste. Se preservan el CRUD, las relaciones existentes, los contratos aditivos y las pruebas anteriores. El almacenamiento editorial se añade a cada pieza mediante una migración de columnas y su snapshot Drizzle.

## Especificación

La revisión independiente detectó creación de la primera versión sin cambios, ramificación de un borrador idéntico y selección de notas ajenas a una eliminación. Se corrigieron usando el estado inicial apropiado, reutilización del head y asociación por rangos en la versión fuente. El seguimiento detectó notas archivadas inaccesibles y citas desancladas ocultas: ambas se pueden consultar ahora en modo lectura.

Una pieza nueva compara su primera escritura contra los campos iniciales vacíos; una pieza migrada conserva su contenido previo como referencia inicial. El autoguardado no crea versiones. Las notas sin anclaje seguro conservan su cita, incluso si el texto se modifica mientras se redacta la anotación.

## Comprobaciones

- `pnpm build`: correcto, incluyendo typecheck de main/preload y renderer y copia de migraciones.
- ESLint: sin errores ni advertencias en el último recorrido.
- Detector Impeccable: `[]`.
- `pnpm test --runInBand`: 51 suites y 582 pruebas correctas. Ninguna prueba preexistente se modificó.
- Recorrido final de Electron/Linux: versiones, anotaciones no modales, cita conservada mientras se reescribe, notas archivadas de solo lectura, variantes, autoguardados paralelos con continuidad de nodos y foco, diferencias, conflictos, recuperación, conversión y publicación de Post en `2.0.0`; cero errores del renderer. Popovers dentro del viewport y anclados al párrafo a 1440 y 1000 px.
- Migración habitual y aislada: timestamp y hash coinciden con la migración publicada; no hay discrepancia del journal.
- Se corrigió la sincronización de una prueba nueva: al entrar en modo paralelo espera ambos editores antes de escribir. Una traza confirmó que antes intentaba editar un nodo ya desmontado.
- Las comprobaciones de layout, foco y selección se realizan en Electron/Chromium, no en jsdom.

## Límites y operación

- Las anotaciones de fragmentos se crean sobre el Markdown fuente de CodeMirror. No se presupone correspondencia exacta entre una selección del preview y los offsets del Markdown.
- El cálculo de diferencias está acotado: una reescritura muy grande usa un fragmento conservador en lugar de una matriz LCS sin límite. El autor sigue revisando y resolviendo el resultado.
- El estado editorial se conserva por pieza; historiales excepcionalmente largos aumentan el coste de serialización y guardado. No se incorporan sincronización, Git real, publicación remota ni IA.
- No se verificó el instalador nativo de Windows; las comprobaciones de runtime corresponden a Electron/Linux.

## Incidencia durante la verificación

Un arranque de Electron omitió `XDG_DATA_HOME` y aplicó la migración aditiva a la base habitual antes de cerrarse. No se crearon documentos de verificación en esa base: se comprobó que contiene cero Stories con el prefijo de las pruebas. Se conservó un respaldo **posterior** a la migración en `/tmp/draftwrite-editorial-default-after-migration.db`, con permisos `0600`. No se revirtió el esquema automáticamente. Los recorridos con documentos de prueba se ejecutan en `/tmp/draftwrite-editorial-data`.

## Evidencia visual

Capturas del recorrido aislado: `/tmp/editorial-note-1440.png`, `/tmp/editorial-note-1000.png`, `/tmp/editorial-parallel.png` y `/tmp/editorial-comparison.png`. El script reproducible es `scripts/verify-editorial.browser.js`; debe ejecutarse contra Electron con datos XDG aislados.
