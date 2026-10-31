# Verificación de Vim mode

## Alcance

La preferencia global vive en Settings, está desactivada por defecto y afecta
únicamente al Text de Story, Article y Post. Normal, Insert y Visual son estados
efímeros del editor; no se persisten por documento. No se ejecuta Neovim.

## Pruebas automatizadas

- Settings/App: control accesible, efecto inmediato sin remontar el editor,
  conservación de texto y selección, persistencia y restauración del valor predeterminado.
- Preferencias e IPC: migración compatible, validación de booleanos solo en editor,
  actualizaciones parciales y conservación de fuentes, tamaños e interlineado.
- Comandos desde la interfaz de la aplicación: `:w` usa el guardado manual de la
  selección actual; muestra Saving durante una escritura pendiente y los errores
  habituales al fallar. Los borradores incompletos permanecen abiertos.
- `:q`, `:q!` y `:wq`: aviso visible sin cierre, descarte ni guardado parcial.

## Electron real

Utilizar exclusivamente un perfil y una base de datos temporales. El harness crea
y modifica documentos a través del IPC real y utiliza teclado nativo en CodeMirror.
No comprobar layout o scroll con jsdom.

```sh
pnpm build
XDG_CONFIG_HOME=/tmp/draftwrite-vim-config \
XDG_DATA_HOME=/tmp/draftwrite-vim-data \
node_modules/.bin/electron --no-sandbox --ozone-platform=headless \
  --disable-gpu --remote-debugging-port=9226 out/main/main.js
```

En otra terminal:

```sh
playwright-cli -s=vim attach --cdp=http://127.0.0.1:9226
playwright-cli -s=vim run-code --filename=scripts/verify-vim.browser.js
```

El harness verifica `w/b`, `dd`, `ciw`, Visual, `/`, `n/N`, punto, `u`, `Ctrl+R`,
indicador de modo, selección, identidad del editor, undo, scroll, prioridad de
`Ctrl+N`, guardado manual y autoguardado de las tres entidades, preview y fallo de
persistencia al reabrir Settings. Usa la ventana auxiliar real y la base SQLite aislada.
Las lecturas del IPC sirven para preparar datos y observar la persistencia; las
acciones de edición y los comandos se realizan por la interfaz.

Al terminar queda activado Vim mode. Reiniciar el proceso con el mismo perfil y
abrir un documento verifica la elección persistida y el inicio en Normal. Desactivar
el control y restaurar valores del editor debe ocultar el indicador.

## Límites

Estas pruebas no prometen paridad completa con Vim, ni cubren plugins, mappings,
configuración externa o Neovim. La comprobación nativa local se realiza en Linux;
Windows, macOS y una auditoría completa con lector de pantalla requieren sus
entornos correspondientes.
