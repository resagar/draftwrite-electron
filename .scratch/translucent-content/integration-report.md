# Integración y verificación del acabado de ventana

Fecha: 2026-11-10. Rama: `feat/translucent-content`, base `2286636`.

## Implementación

Windows 11 22H2 o posterior usa `backgroundMaterial: 'acrylic'` desde el constructor
de BrowserWindow, sin `transparent: true`. El renderer recibe `backdrop: 'acrylic'`
y conserva Window Controls Overlay; no dibuja controles propios en ese modo.

Workspace y barras usan una sola capa `base-100` al 84%; navegación y lista usan
`base-200` al 84%. Las capas estructurales internas quedan transparentes. Texto,
iconos, cursor y selección conservan su tratamiento; no hay opacidad global.

Las barras superior e inferior no tienen bordes divisorios. El pie conserva guardado,
atajo y métricas. La línea activa se extiende al gutter sin mover el texto. La barra
de formato y su slot se retiraron de los tres editores.

WSLg/Xwayland conserva alpha al 98% y controles propios. Los otros entornos y
`--opaque-window` conservan fondos sólidos. No hay dependencias ni migraciones nuevas.

## Comprobaciones automáticas

- 60 suites y 632 tests aprobados.
- Build con ambos typechecks y copia de migraciones aprobados.
- Lint, formato y `git diff --check` aprobados.
- Detector de UI sobre las superficies modificadas: sin hallazgos.
- Revisión independiente de plataforma, IPC y composición: sin bloqueantes.

Las pruebas de la UI anterior se ajustaron al requisito explícito de retirar
metadatos del pie y la barra de formato. Las pruebas de Vim comprueban el adaptador
real de CodeMirror; las transformaciones Markdown conservan sus tests puros.

## Windows nativo

Se ejecutó el build real con Electron 44.9.1 win32/x64 y SQLite real en una carpeta
temporal, con perfil e identidad separados. No se usaron CSS inyectado ni activación
externa del material. El wrapper de verificación solo aisló datos/identidad, título,
posición y temporización del proceso para comprobarlo también en segundo plano.

| Caso                  | Resultado                                                        |
| --------------------- | ---------------------------------------------------------------- |
| Estado de ventana     | `translucent: true`, `backdrop: 'acrylic'`                       |
| Controles             | WCO visible; sin botones propios                                 |
| Story, Article y Post | Edit, Split y Preview verificados                                |
| Cabeceras y fuente    | Fondos transparentes sobre el workspace al 84%                   |
| Barra de formato      | Ausente en todos los modos                                       |
| Pie                   | Sin Markdown, UTF-8, LF, posición de cursor ni indicador de Vim  |
| Línea activa          | Mismo fondo que el gutter; hueco de 0px                          |
| Escritura y Ctrl+S    | Edición persistida mediante IPC y SQLite                         |
| Settings              | Opaco; rechaza controlar la ventana principal con `errForbidden` |
| Maximizar/restaurar   | Verificados con Windows y estado IPC sincronizado                |
| Cierre/reinicio       | Cierre normal y texto persistido tras reiniciar                  |
| `--opaque-window`     | Fondo opaco, WCO y estado sin Acrylic                            |

La aceptación visual del material y de los refinamientos se realizó con las
capturas comparativas aportadas por el usuario durante la implementación. Las
capturas de renderer se usan para verificar geometría, no para demostrar blur externo.

## Linux y límite final

En WSLg nativo se verificaron el fallback alpha, los tres controles propios, la
ausencia de barra de formato y el cierre normal con código 0.

El usuario decidió conservar ese comportamiento y excluir el blur nativo de Linux
del cierre. Los hallazgos y las rutas posibles están en `linux-blur-feasibility.md`.
No se modificaron compositores ni preferencias del sistema.

La instalación existente de Draftwrite en Windows y sus datos permanecieron intactos.
