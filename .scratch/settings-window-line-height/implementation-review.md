# Revisión de implementación: ventana de configuración e interlineado

Fecha: 2026-10-31
Spec: [Ventana de configuración e interlineado](spec.md)
Base: `dfbb46b8d47b1b1f314f10ca5166c02447051c2e`.

Implementación de ambos tickets y revisión realizadas directamente, sin subagentes.
Se revisaron por separado estándares y correspondencia con las 30 historias de la spec.

## Standards

- Main conserva la composición de la aplicación; un adapter de plataforma administra
  la ventana auxiliar, los frames autorizados y los permisos compartidos de sesión.
- Las preferencias son presentación, no entidades de dominio. Se reutilizan React,
  DataPort, preload, la envoltura IpcResult y la clave local existente. No se cambia
  SQLite ni se incorpora una librería de estado, transporte o UI.
- El contrato puro compartido contiene tipos, defaults, normalización de datos
  anteriores y validación de patches. El renderer no importa Electron o Node.
- Una sesión ordenada en main acepta patches por campo. Solo el renderer principal
  persiste. Las notificaciones no se reenvían y las revisiones antiguas se ignoran,
  incluso cuando cambia el estado de error de guardado.
- Los nuevos handlers verifican el frame y su rol. Una ventana ajena con el mismo
  preload y la misma URL fue rechazada por IPC y por la política de fuentes locales.
- Se mantienen fuentes locales, tokens y controles accesibles. El interlineado no
  altera contenido, identidad de entidades ni preferencias de otros contextos.
- Los tests de preferencias existentes se amplían explícitamente con el nuevo campo.
  Las pruebas de navegación reflejan el cambio de pantalla a ventana, conservando
  las garantías de borrador, selección y documento. La geometría se mide en Electron.

Hallazgos resueltos durante la implementación/revisión:

1. La recepción de snapshots de hidratación podía llegar después de una edición.
   La suscripción antecede al fetch y la comparación de revisión descarta resultados
   viejos; hay una prueba de integración para ese orden.
2. Cambiar el estado de guardado también debe ordenar las notificaciones. Se avanza
   la revisión de sesión al cambiar ese estado y se ignoran acuses obsoletos.
3. El catálogo de la principal debe refrescarse al reabrir configuración para recuperar
   una fuente que vuelve a estar disponible. La apertura publica la instantánea
   vigente y las ventanas actualizan su catálogo; se comprobó recuperación simulando
   únicamente la frontera de enumeración, sin desinstalar fuentes reales.
4. El título HTML reemplazaba el título nativo; la entrada auxiliar fija
   Settings — DraftWrite y el harness lo verifica.
5. El foco inicial se intentaba antes de que la hidratación montara el encabezado.
   Ahora se enfoca cuando los controles están listos, con regresión red/green y
   comprobación en la ventana real.

Resultado: sin hallazgos pendientes de estándares en el alcance revisado.

## Spec

| Historia | Requisito                               | Evidencia                                                                                                                        |
| -------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Ventana nativa aparte                   | Harness de Electron observa dos ventanas con entradas distintas.                                                                 |
| 2        | Principal sigue editable                | Se escribe texto mientras configuración permanece abierta.                                                                       |
| 3        | Documento, borrador, selección y scroll | Integración conserva selección e instancia; Electron conserva scroll 700 al abrir y un borrador incompleto al cerrar.            |
| 4        | Reabrir enfoca sin duplicar             | Aperturas repetidas conservan dos ventanas; comprobación nativa de foco.                                                         |
| 5        | Restaurar minimizada                    | APIs públicas de BrowserWindow confirmaron minimized y luego restored/focused con dos ventanas.                                  |
| 6        | Cierre auxiliar sin cerrar app          | Cierre por acción visible y cierre nativo; la principal sigue abierta.                                                           |
| 7        | Cerrar y reabrir                        | Harness cierra y crea una auxiliar nueva con valores vigentes.                                                                   |
| 8        | Sin auxiliar huérfana                   | Cerrar la principal también destruye la auxiliar y finaliza la instancia de prueba.                                              |
| 9        | Instantánea efectiva actual             | Reapertura conserva cambios incluso cuando falló almacenamiento.                                                                 |
| 10       | Cambios inmediatos entre ventanas       | Fuentes, tamaños, escala e interlineados medidos en la principal sin recargar.                                                   |
| 11       | Interfaz de auxiliar coherente          | Monaspace Argon se aplica en ambas ventanas y la escala se comparte.                                                             |
| 12       | Fuentes incluidas y sistema             | Cargan las cinco Monaspace y una familia instalada C059, sin override de permisos.                                               |
| 13       | Fallback y recuperación                 | Tests de catálogo/Settings y comprobación adicional de recuperación en la principal al reabrir.                                  |
| 14       | Interlineado del editor                 | Control dedicado y filas reales de 24 px con fuente 16 e interlineado 1,5.                                                       |
| 15       | Interlineado independiente del preview  | Cuerpo real de 25 px con fuente 20 e interlineado 1,25.                                                                          |
| 16       | Default 2                               | Migración de preferencias anteriores y defaults compartidos.                                                                     |
| 17       | Botones y entrada exacta                | Test de incremento 1,5 a 1,6 y entrada decimal 1,25.                                                                             |
| 18       | Valores inválidos                       | Tests de almacenamiento, UI y rechazo de patch IPC fuera de rango.                                                               |
| 19       | Gutters alineados                       | Contenido y gutters miden 24 px en Electron.                                                                                     |
| 20       | Interlineado de bloques del preview     | CSS compartido sustituye leading-loose en los bloques; se mide cuerpo y código en Electron.                                      |
| 21       | Títulos y código                        | H1 conserva 30 px con cuerpo de 20; código mantiene Fira Code.                                                                   |
| 22       | Independencia de ajustes                | Patches parciales rápidos combinan fuente, tamaño e interlineado sin perder campos.                                              |
| 23       | Compatibilidad de preferencias          | Lectura de datos sin lineHeight conserva fuente, tamaño y escala.                                                                |
| 24       | Persistencia entre sesiones             | Reinicio completo del proceso restaura editor 1,5 y preview 1,25.                                                                |
| 25       | Restaurar por contexto                  | Restaurar editor vuelve a 2 y mantiene preview 1,25.                                                                             |
| 26       | Global para Story, Article y Post       | Variables compartidas en TextEditor/MarkdownPreview; ningún campo tipográfico por entidad.                                       |
| 27       | Orden sin regresiones                   | Pruebas de hidratación tardía, acuses antiguos y cambios concurrentes; sin ecos de persistencia.                                 |
| 28       | Fallo de guardado visible               | Error de almacenamiento inducido: se aplica el cambio, aparece el aviso y sobrevive a reapertura durante la sesión.              |
| 29       | Geometría y scroll actualizados         | Verificación de sincronización por línea tras el cambio: editor 26 y preview 25, con fallback para líneas sin texto renderizado. |
| 30       | Teclado, etiquetas y ventana pequeña    | Foco inicial correcto, controles nativos etiquetados y ventana de 560 × 480 desplazable sin overflow horizontal.                 |

Resultado: las 30 historias tienen implementación y evidencia de revisión. No se
añaden preferencias por documento, temas, instalación de fuentes ni un framework
general de ventanas o configuración.

## Verificación

- Suite completa: 41 suites y 501 tests aprobados. Las últimas comprobaciones de
  Settings también pasan con sus acciones asíncronas envueltas en act.
- Typecheck, lint, build de main/preload/renderer, copia de migraciones, Prettier
  sobre archivos modificados y git diff --check: aprobados.
- Harness de Electron real con perfil y SQLite temporales: dos ventanas, edición
  simultánea, fuentes, interlineados, escalas 80/150 %, tamaños 10/40 px, límites
  1/3, foco, cierre/reapertura, fallo de guardado y cambios parciales ordenados.
- Reinicio completo, restauración tras minimizar, permisos frente a una ventana
  ajena y cierre de la principal comprobados sobre la instancia aislada.
- Copy source text confirma Copied con un Article enlazado a una Story.
- Borrador incompleto conservado y sin diálogo de descarte al abrir/cerrar configuración.
- Recuperación de una fuente del sistema sin cambiar la elección, simulando solo
  el catálogo del renderer principal; las fuentes instaladas no se modificaron.
- Detector mecánico de UI: sin hallazgos. Capturas inspeccionadas en los tamaños
  de configuración normal y mínimo.

## Límites de la verificación

Las ejecuciones nativas se realizaron en Linux headless. No acreditan Windows,
macOS ni una auditoría exhaustiva con lector de pantalla. Los pasos adicionales
de ciclo de vida y permisos utilizaron el inspector de main solo en la instancia
temporal; la aplicación no habilita un inspector en producción.
