# 01: Activar Vim mode global desde Settings

**What to build:** Activar o desactivar la edición modal desde Settings y usar Normal, Insert y Visual en el Text del documento actual, conservando la elección entre sesiones.

**Blocked by:** Ninguno; puede comenzar inmediatamente.

**Status:** ready-for-agent

- [x] Un control Vim mode accesible en la ventana Settings está desactivado por defecto y se conserva al reiniciar.
- [x] La preferencia afecta exclusivamente al Text de Story, Article y Post; títulos, formularios y previews mantienen el comportamiento actual.
- [x] Activar entra en Normal; i entra en Insert, Esc vuelve a Normal y Visual permite seleccionar; la barra de estado refleja el modo y oculta el indicador al desactivar.
- [x] Cada documento se abre en Normal con la preferencia activa, sin heredar el modo del anterior.
- [x] Los cambios se aplican inmediatamente sin remontar el editor y conservan texto, selección, scroll e historial de deshacer.
- [x] Preferencias antiguas conservan fuentes, tamaños e interlineado y migran con Vim mode desactivado; las escrituras rechazan valores no booleanos o contextos incorrectos.
- [x] Al fallar el almacenamiento se mantiene el cambio durante la sesión y se muestra el aviso existente; reabrir Settings refleja el valor efectivo.
- [x] Restaurar valores del editor desactiva Vim mode.
- [x] La integración reutiliza una extensión compatible con el CodeMirror instalado y las fronteras de preferencias e IPC actuales; no ejecuta Neovim ni añade un motor propio.
- [x] Pruebas de interacción y contratos cubren preferencias y estados; una comprobación nativa demuestra alternancia en vivo, cambio de documento y preservación del estado.

## Comments

Implementado y revisado el 2026-10-31. Validación: 511 tests en 42 suites,
tipos, lint y build correctos; harness de Electron real sobre perfil temporal.
Ver la revisión de implementación para la correspondencia con la spec y los límites.
