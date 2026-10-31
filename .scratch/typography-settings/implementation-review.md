# Revisión de implementación: configuración de tipografía

Fecha: 2026-10-31
Spec: [Configuración de tipografía](spec.md)
Base de revisión: `581674695c6372d2c53c35fe3f709abd174e0c28`.

Implementación y revisión realizadas directamente, sin subagentes. El alcance fue
la spec confirmada; el desglose de tickets propuesto no se publicó ni se usó como
una autorización adicional de alcance.

## Standards

Revisados AGENTS.md, GLOSSARY.md, los ADRs de estado de frontend y fuentes locales,
el contrato de presentación y el diff completo de esta funcionalidad.

- El estado y la persistencia son preferencias de presentación en React; no se
  modifican entidades, repositorios, esquemas SQLite ni DTOs de escritura.
- La nueva capacidad de catálogo pasa por DataPort y usa la API local de Chromium.
  Los componentes no acceden a Node, Electron ni IPC directamente.
- Los permisos de fuentes y escritura del portapapeles quedan limitados al frame
  principal de la app. Se conserva la acción existente de copiar texto fuente.
- Se mantienen tokens semánticos del tema, controles nativos etiquetados, UI en
  inglés y las fuentes existentes como defaults. No se agregan dependencias.
- Las cinco Monaspace son assets locales y su licencia acompaña los recursos de
  distribución.
- El escalado usa la base rem y los tokens de texto; los valores absolutos de
  editor y preview permanecen independientes. Se sustituyeron los tamaños fijos
  de 14 px de Source y Target por el token equivalente para que también escalen.
- Los tests existentes conservan sus expectativas. Se añadieron pruebas en los
  puntos acordados y un harness de renderer real, separado de Jest.

Hallazgos corregidos durante la revisión:

1. El zoom global alteraba el arrastre: 30 px de puntero producían 45 px al 150 %.
   Se eliminó el zoom y se verificó el arrastre correcto con escalado por tokens.
2. El primer filtro de permisos bloqueaba clipboard-write. Se preservó el permiso
   de escritura de texto para el frame de la app, se añadió una comprobación al
   harness y se verificó la acción Copy con preload, IPC y datos reales.
3. Un campo numérico controlado rechazaba el valor intermedio `2` al escribir `24`.
   Ahora conserva la entrada transitoria y aplica solo valores válidos; al salir
   restaura el último valor válido si corresponde. La regresión tiene test.

Resultado: sin hallazgos pendientes de estándares en el alcance revisado.

## Spec

| Historia | Requisito                                        | Evidencia                                                                                                           |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 1        | Acceso desde engranaje                           | TitleBar y prueba de integración de Settings.                                                                       |
| 2        | Volver al documento y posición                   | Misma instancia del editor; scroll 700 antes y después en renderer real.                                            |
| 3        | Conservar borrador incompleto                    | Test de aplicación con texto sin Topic, sin creación ni diálogo de descarte.                                        |
| 4        | Fuente de editor                                 | Monaspace Neon aplicada al editor en Electron real.                                                                 |
| 5        | Tamaño de editor de 10 a 40 px                   | Validación de preferencias y extremos medidos en renderer real.                                                     |
| 6        | Fuente de preview independiente                  | Fuente instalada C059 aplicada en Electron sin cambiar el editor.                                                   |
| 7        | Tamaño de preview de 10 a 40 px                  | Tamaño base y extremos medidos en renderer real.                                                                    |
| 8        | Proporciones de títulos                          | A base 20 px, h1 de 30 px y h2 de 22,5 px.                                                                          |
| 9        | Código monoespaciado                             | Fira Code conservada con fuente proporcional en el cuerpo del preview.                                              |
| 10       | Tamaño de código acompaña preview                | Código de 20 px con cuerpo de 20 px.                                                                                |
| 11       | Fuente de interfaz                               | Monaspace Argon aplicada al header sin alterar editor ni preview.                                                   |
| 12       | Escala de interfaz de 80 a 150 %                 | Controles y espaciados por rem/tokens; extremos y ventana de 900 × 600 comprobados.                                 |
| 13       | Independencia de tamaños                         | Editor de 24 px y preview de 20 px al 150 %; extremos de lectura comprobados con ambas escalas.                     |
| 14       | Botones y entrada exacta                         | Controles nativos, límites, incremento/decremento y regresión de entrada transitoria.                               |
| 15       | Cinco Monaspace sin instalación ni red           | Carga efectiva de las cinco WOFF2 desde archivos locales en Electron.                                               |
| 16       | Fuentes del sistema                              | Catálogo real de Electron con permiso concedido por el main, sin override del harness.                              |
| 17       | Búsqueda por familia                             | Test de aplicación filtra el selector por nombre.                                                                   |
| 18       | Distinción de origen                             | Grupos Included y System accesibles en cada selector.                                                               |
| 19       | Sin duplicados y prioridad de incluidas          | Pruebas de catálogo y aplicación para duplicados, espacios y mayúsculas.                                            |
| 20       | Aplicación y guardado inmediatos                 | Integración y renderer real; errores de escritura informados explícitamente.                                        |
| 21       | Persistencia entre sesiones                      | Tests de almacenamiento y remount; cierre y reapertura completos de Electron con los mismos directorios temporales. |
| 22       | Preferencias globales para Story, Article y Post | Variables compartidas del shell, TextEditor y MarkdownPreview; sin atributos por entidad.                           |
| 23       | Restauración independiente                       | Test restaura preview conservando editor y escala de interfaz.                                                      |
| 24       | Defaults actuales                                | Fira Code 16 px, Inter 16 px para preview e interfaz Inter al 100 %, con tokens iniciales equivalentes.             |
| 25       | Aviso por fuente ausente                         | Test de aplicación retira una familia del catálogo y comprueba el aviso.                                            |
| 26       | Conservar y recuperar elección                   | El mismo test vuelve a ofrecer la familia y verifica su recuperación sin reselección.                               |
| 27       | Fuentes incluidas ante fallo del sistema         | Prueba de rechazo del catálogo y selección posterior de Monaspace.                                                  |
| 28       | Teclado y accesibilidad de controles             | Controles nativos etiquetados, foco en título al abrir, restauración al cerrar y prueba de foco en renderer real.   |

Resultado: las 28 historias tienen implementación y evidencia de revisión. No se
introducen preferencias por documento, temas, instalación de fuentes, sincronización
ni opciones tipográficas avanzadas.

## Verificación

- `pnpm test`: 40 suites, 491 tests aprobados.
- `pnpm build`: typechecks, builds de main/preload/renderer y copia de migraciones aprobados.
- `pnpm lint`, Prettier sobre archivos modificados y `git diff --check`: aprobados.
- Harness en Chromium y Electron headless real: fuentes locales y de sistema,
  medidas, escalado, arrastre, conservación del editor y scroll, persistencia y
  límites comprobados. Capturas inspeccionadas en 1280 × 800 y 900 × 600.
- Reinicio completo de Electron: editor y preview de 40 px, escala 150 % y familia
  Monaspace Argon restaurados desde el perfil temporal; catálogo del sistema disponible.
- Acción existente Copy source text: confirma Copied en Electron real.
- Detector mecánico de UI sobre los componentes modificados: sin hallazgos.

El procedimiento reproducible está en la documentación de pruebas tipográficas.
La comprobación de Linux no acredita ejecución en Windows/macOS ni una auditoría
completa con lector de pantalla. La retirada y reinstalación de una fuente se
simula en el límite del catálogo; no se alteraron fuentes instaladas en el equipo.
