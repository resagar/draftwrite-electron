# 01: conservar la continuidad de edición de Story, Article y Post

**What to build:** permitir que la persona siga escribiendo en Topic o Title después del primer autoguardado y de los siguientes, con el mismo foco, selección y contenido reciente. Completar la transición a entidad persistida para Story, Article y Post sin reemplazar el editor activo.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] El primer autoguardado conserva foco, cursor y selección de Topic en Story/Post y Title en Article; se puede seguir escribiendo sin clic.
- [x] Las actualizaciones posteriores conservan ese comportamiento en las tres entidades.
- [x] Completar un guardado respeta el foco que la persona movió a otro campo mientras esperaba.
- [x] Escribir durante la creación en vuelo conserva el borrador más reciente; los cambios siguientes actualizan el ID creado sin crear duplicados.
- [x] La entidad aparece seleccionada en la biblioteca y sus encabezados, acciones, fuentes y Target se actualizan sin interrumpir la edición.
- [x] Seleccionar otra entidad o iniciar una creación muestra el contenido correcto y mantiene aisladas las sesiones.
- [x] Se mantienen debounce, requisitos de creación, validación, error/reintento, descarte, guardado manual y navegación existentes.
- [x] La composición mantiene la identidad del editor durante creación y persistencia; cualquier memoización añadida tiene un motivo verificable y dependencias correctas.
- [x] Las regresiones se ejercitan desde la aplicación con el DataPort fake, incluyendo respuestas de creación controladas, y fallan antes de corregir el problema.
- [x] Se verifica en Electron/Chromium la continuidad de foco, selección y CodeMirror, incluido undo, o se documenta expresamente la limitación pendiente.
- [x] Pasan los tests pertinentes, typecheck y lint; se revisa la implementación contra cada criterio de la spec.

## Comments

Spec y desglose aprobados; implementación iniciada. No requiere cambios de dominio, esquema ni IPC.


2026-11-03: implementación completada y revisada contra todos los criterios. 43 suites / 526 tests, typecheck y lint pasan. Chromium headless verifica foco, selección y continuidad de undo de los tres editores. Standards y Spec sin hallazgos pendientes tras corregir procedencia de Article y persistencia de State/ScheduledAt de Post. Evidencia detallada en el informe de verificación de esta feature; no se ejecutó el paquete Electron instalado.
