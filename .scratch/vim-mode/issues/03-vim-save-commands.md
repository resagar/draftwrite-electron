# 03: Guardar con :w y rechazar comandos de cierre

**What to build:** Guardar el documento activo con :w usando el flujo habitual y recibir un aviso seguro al intentar comandos de cierre no disponibles.

**Blocked by:** 01: Activar Vim mode global desde Settings. No depende de 02.

**Status:** ready-for-agent

- [x] :w ejecuta la acción manual existente sobre la Story, Article o Post activo y conserva sus validaciones y avisos.
- [x] Un borrador incompleto recibe el mismo aviso que al guardar manualmente y permanece abierto con su texto intacto.
- [x] El resultado asíncrono y los errores se reflejan mediante el feedback existente, sin anunciar guardado exitoso antes de confirmarlo.
- [x] El autoguardado sigue funcionando y no se introduce persistencia paralela ni se duplica la acción manual por un mismo comando.
- [x] :q, :q! y :wq muestran un aviso visible de comando no disponible; no cierran ventanas o documentos, no descartan borradores y no ejecutan guardados parciales.
- [x] Los comandos se resuelven sobre el documento activo y no dejan callbacks de guardado asociados a un documento anterior.
- [x] Pruebas de interacción cubren documento válido, borrador incompleto y error; una comprobación nativa verifica las secuencias de comandos y la ausencia de efectos de cierre.
- [x] Las comprobaciones habituales de tipos, lint, tests y build pasan sin modificar tests existentes para adaptar sus expectativas.

## Comments

Implementado y revisado el 2026-10-31. Validación: 511 tests en 42 suites,
tipos, lint y build correctos; harness de Electron real sobre perfil temporal.
Ver la revisión de implementación para la correspondencia con la spec y los límites.
