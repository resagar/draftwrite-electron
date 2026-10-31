# Revisión de implementación: Vim mode

Fecha: 2026-10-31. Base: 9c905f5112c5d6f1f7113e7177bc08c3c74cb12f.
Revisión directa, sin subagentes, según la instrucción del usuario.

## Standards

Sin incumplimientos pendientes en los cambios de esta funcionalidad.
Se conservaron las capas de dominio e IPC, la ventana Settings existente y el
store de estado de alta frecuencia. No se agregaron transporte, base de datos,
store externo ni motor modal propio. El nuevo booleano se valida en el contrato
compartido usado por main. La ausencia del campo equivale a desactivado y conserva
la forma compatible con los tests y datos anteriores.

La extensión se configura mediante un Compartment sin remontar CodeMirror.
Los comandos resuelven el guardado activo al ejecutarse; no capturan documentos.
Los avisos usan texto DOM sin interpretar HTML. Los cambios ajenos a Vim mode
presentes en el checkout se conservaron fuera del commit.

## Spec

| Historias | Resultado                                                                  | Evidencia                                                                                                    |
| --------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1–5       | Control global accesible, desactivado por defecto, persistido y reversible | Settings/App, preferencias/IPC y reinicio del proceso Electron                                               |
| 6–8       | Text de Story, Article y Post                                              | Edición, :w, autoguardado y lectura IPC de las tres entidades en Electron                                    |
| 9–11      | Títulos, formularios, Settings y preview conservan su función              | Extensión limitada al editor compartido; Topic conserva el atajo global; preview de solo lectura actualizado |
| 12–14     | Inicio en Normal, i/Esc y selección Visual con indicador                   | Teclado real e indicador; cambio de documento desde Insert y desde Visual                                    |
| 15–18     | Cambio inmediato con conservación del estado y ocultación del indicador    | Identidad DOM, selección nativa, scroll 700, undo previo y alternancia desde Insert                          |
| 19–20     | Prioridad de teclas consumidas y atajos fuera del Text                     | Ctrl+N mueve dentro del Text sin crear documento y crea un borrador desde Topic                              |
| 21–25     | Navegación, operadores, búsqueda, repetición y undo/redo                   | w/b, dd, ciw, Visual, /, n/N, punto, u y Ctrl+R sobre textos con resultados concretos                        |
| 26        | :w usa el guardado manual activo y su feedback                             | Tests de guardado inmediato, escritura pendiente, error y navegación; guardado nativo en tres entidades      |
| 27        | Autoguardado preservado                                                    | Inserción modal Auto en las tres entidades y comprobación de persistencia real                               |
| 28        | Rechazo visible de :q, :q! y :wq sin efectos laterales                     | Tests de aplicación y teclado real sobre borrador incompleto                                                 |
| 29–30     | Migración compatible y error de persistencia visible                       | Tests de preferencias/IPC y almacenamiento bloqueado en Electron; reapertura conserva el valor de sesión     |

Restaurar valores del editor desactiva Vim mode, como se aprobó en el desglose.
La extensión seleccionada es @replit/codemirror-vim 6.4.0; sus peers usan las
mismas versiones CodeMirror 6 ya resueltas en el proyecto. No hay Neovim, Lua,
plugins ni mappings personalizados. No se promete paridad completa con Vim.

## Verificación ejecutada

- pnpm test --runInBand: 511 tests, 42 suites, sin fallos.
- pnpm typecheck: correcto; repetido también dentro del build final.
- pnpm lint: correcto.
- pnpm build: correcto.
- git diff --check: correcto.
- Harness nativo completo: comandos, entidades, toggle, selección, undo, scroll,
  prioridad de teclado y fallo de almacenamiento correctos; sin errores de renderer.
- Reinicio del proceso con el mismo perfil temporal: elección activada conservada,
  documento abierto en Normal.
- Comprobaciones adicionales nativas: cambio de documento desde Visual y
  alternancia desde Insert vuelven a Normal. Settings no desborda a 560 px de ancho;
  captura visual inspeccionada.

La comprobación inicial de Settings falló antes de agregar el control. La prueba
inicial de guardado inmediato falló con cero llamadas antes de conectar :w; se evitó
que el autoguardado diera un falso positivo. Las pruebas de comandos de cierre
fallaron antes de agregar los avisos correspondientes. No se alteraron las
expectativas de los tests anteriores.

## Límites y dependencia previa

La validación nativa corresponde a Linux headless. No se ejecutaron Windows,
macOS ni una auditoría completa con lector de pantalla. La receta reproducible
queda en docs/testing/vim-mode.md y scripts/verify-vim.browser.js.

pnpm audit --prod detecta un aviso high ya presente en la base: Electron 44.9.0,
[GHSA-jr5w-w6x2-84p9](https://github.com/advisories/GHSA-jr5w-w6x2-84p9), relativo
a certificados intermedios eMudhra; el parche indicado es 44.9.1. No afecta las
nuevas dependencias Vim. El renderer de producción carga archivos locales y la
navegación externa se entrega al navegador del sistema; en desarrollo existe la
carga del servidor de Vite. No se amplió esta tarea a actualizar Electron.
Revisión del aviso: 2026-10-31; resolver antes de la siguiente distribución.
