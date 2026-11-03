# Verificación y revisión de implementación

Fecha: 2026-11-03. Base de revisión: `6676942c10bd8e07ab272f6cb95acb228347d66a`.

## Comprobaciones ejecutadas

- `pnpm typecheck`: correcto para main/preload y renderer.
- `pnpm build`: correcto, incluidas las migraciones copiadas.
- `pnpm lint`: correcto.
- Prettier sobre los cuatro archivos de implementación: correcto.
- `pnpm test src/renderer/src/App.test.tsx --runInBand`: 149 tests correctos.
- `pnpm test --runInBand`: 46 suites y 557 tests correctos. Se mantienen avisos existentes de React sobre act y el aviso experimental de VM Modules.
- Detector de diseño sobre TitleBar y su CSS: sin hallazgos.
- Electron real en Linux/WSLg, con perfil y base de datos aislados: ventanas de 900 y 1280 px, Zen activado/desactivado, búsqueda, apertura/cierre de Settings y listado de Stories mediante IPC/SQLite. Sin errores del renderer. Encabezado de 36 px y botones dentro de sus límites.
- Inspección visual de la captura Linux: encabezado y tema conservados. La captura del renderer no demuestra el marco nativo del sistema.

## Revisión contra la spec

| Requisito                                                        | Implementación y evidencia                                                                         | Estado                                                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Integración visual y eliminación de la fila duplicada en Windows | Opciones de barra oculta y overlay limitadas a Windows; colores iguales a los tokens actuales      | Implementado; comprobación visual Windows pendiente                                                  |
| Minimizar, maximizar/restaurar y cerrar                          | Controles nativos de Electron, sin handlers personalizados ni cambios al cierre/guardado           | Configurado; interacción nativa Windows pendiente                                                    |
| Arrastre y doble clic sin interferir con botones                 | Región drag en encabezado integrado y no-drag en botones                                           | Implementado; comprobación con mouse en Windows pendiente                                            |
| Reserva de espacio, tamaños admitidos y Zen                      | Geometría CSS env(titlebar-area-*) y altura mínima; TitleBar permanece en Zen                      | Implementado; geometría WCO Windows pendiente. Regresión Linux comprobada a 900/1280 px y Zen on/off |
| Conservar acciones existentes                                    | Búsqueda, Zen y Settings comprobados en Electron Linux; suite existente correcta                   | Verificado en Linux                                                                                  |
| Mantener otras plataformas y Settings                            | Opciones nativas nuevas solo en Windows; CSS integrado condicionado a plataforma; Settings intacto | Revisado en código; smoke Linux correcto; macOS no ejecutado                                         |
| Sin nuevas dependencias, IPC, dominio ni persistencia            | Diff limitado a creación de ventana, encabezado y CSS                                              | Verificado por revisión                                                                              |

Las revisiones independientes de estándares y spec no encontraron defectos demostrables ni ampliaciones de alcance. El eje spec identifica como pendiente la validación nativa de Windows.

## Límites y validación pendiente

La frontera principal aprobada es Electron real sobre Windows. Este entorno ejecuta Electron Linux; no permite declarar verificados el arrastre, doble clic, controles nativos, DPI ni la geometría del overlay en Windows.

Un harness temporal intentó activar WCO sobre Linux para comprobar sus variables CSS, pero ese entorno devolvió overlay invisible y rectángulo vacío. No se contabiliza como validación del overlay ni se alteró la configuración Linux de producción para forzarlo.

En Windows, abrir un build actualizado y comprobar a tamaño mínimo y maximizado, con Zen activado/desactivado: ausencia de fila duplicada, legibilidad, ausencia de solapamientos, botones del encabezado, arrastre, doble clic, minimizar, maximizar/restaurar y cerrar. Repetir la comprobación de geometría con escalado de pantalla si está disponible.

No se añadieron tests de layout a Jest ni mocks de BrowserWindow: no demostrarían el comportamiento nativo. No se modificaron tests existentes para acomodar la implementación. Los harnesses y capturas temporales permanecen fuera del repositorio.
