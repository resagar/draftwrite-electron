# Verificación de continuidad del autoguardado

Fecha: 2026-11-03. Baseline de revisión: `0d663eb01e5676634493be11f2c07804ff1f2d1d`.

## Implementación

La sesión del editor conserva su identidad al completar la creación. La finalización es una única acción que selecciona el registro sin reiniciar la sesión; una respuesta de otra sesión no altera la selección actual. Los panes mantienen su editor montado al incorporar encabezados y acciones de la entidad guardada.

El ID se adopta sin reemplazar el contenido reciente. La cola de persistencia resuelve el ID cuando ejecuta cada escritura, evitando que cambios encolados durante una creación lenta creen duplicados. Un resultado anterior conserva el indicador de borrador pendiente o incompleto.

No fue necesario añadir memoización: la causa era la identidad del árbol. Se conservan los hooks existentes y se agrega una referencia al último borrador de Post para persistir State/ScheduledAt elegidos antes del primer guardado.

## Revisión contra el ticket

| Criterio | Evidencia |
| --- | --- |
| Foco, cursor y selección en la creación | Regresiones de aplicación para Story, Article y Post; Chromium confirma foco y selección nativos. |
| Actualizaciones posteriores | Las tres regresiones continúan escribiendo y verifican el update y el foco. |
| Foco elegido durante la espera | Creación diferida en los tres tipos; el foco movido a Settings permanece allí. |
| Texto reciente e ID sin duplicados | Creación diferida más allá del siguiente debounce, seguido de dos actualizaciones; una sola creación por sesión. |
| Biblioteca, encabezados y proyecciones | La aplicación real completa la selección y actualiza encabezados; la suite de App cubre fuente y Target. La procedencia de Article queda bloqueada al iniciar la creación y se desbloquea ante un error. |
| Sesiones aisladas | Nueva creación durante una respuesta pendiente en los tres tipos. Re-seleccionar la Story actual conserva las ediciones pendientes. Las pruebas existentes cubren selección entre registros. |
| Validación, errores, guardado y navegación | Regresión de Story incompleta mientras finaliza un guardado anterior; Article falla, cambia su Story y reintenta con Ctrl+S conservando foco. La suite existente cubre los flujos restantes. |
| Identidad del editor y memoización justificada | Misma sesión durante creación y persistencia; nuevas sesiones solo al cambiar de entidad, descartar o iniciar otra creación. No se agregó memoización. |
| Regresiones reproducidas antes de corregir | Foco inicial, duplicación con creación lenta, estado incompleto, re-selección, procedencia de Article y estado inicial de Post se observaron en rojo antes de corregir sus causas. |
| Chromium y CodeMirror | Foco y selección de input/editor y undo de cambios anteriores a la creación: pasan para los tres tipos. Resultado estructurado en chromium-results.json. |
| Checks y revisión | Dos revisiones independientes: Standards y Spec. Los dos hallazgos iniciales quedaron corregidos y las segundas revisiones no encontraron problemas funcionales pendientes. Resultados de comandos al final de este documento. |

## Verificación nativa

Se compiló un harness temporal con Vite y el App, los editores, CodeMirror y el DataPort fake reales. Chromium headless cargó ese bundle con un perfil aislado. Para cada tipo se escribió contenido antes de crear, se comprobó la selección y el foco del campo tras el autoguardado, luego se escribió en CodeMirror, se comprobó foco/selección después del update y se deshicieron cambios hasta eliminar también el contenido escrito antes de la creación.

El harness y su build están en `/tmp/draftwrite-autosave-browser/`; no agregan dependencias ni infraestructura permanente al proyecto. El resultado final se conserva junto a este documento. La prueba usa Chromium real, no una medición de layout en jsdom.

Límites: no se ejecutó el paquete Electron instalado ni se comprobó IPC/SQLite desde este harness; su límite de datos es el fake acordado. Tampoco se hizo una auditoría visual de la interfaz, porque el cambio preserva la composición existente.

## Checks

- `pnpm test --runInBand`: 43 suites y 526 tests pasados en los proyectos main y renderer; aproximadamente 69 segundos.
- `pnpm typecheck`: main/preload y renderer sin errores.
- `pnpm lint`: sin errores.
- Chromium headless sobre el bundle final: pasan las comprobaciones de foco, selección y undo para Story, Article y Post.
- Regresiones nuevas: 15 casos en la frontera de aplicación acordada, incluidos Published/Scheduled y desbloqueo/reintento de Article.
- Standards: 0 hallazgos pendientes. Spec: 0 hallazgos funcionales pendientes; se incorporaron también las dos mejoras puntuales de cobertura sugeridas.
