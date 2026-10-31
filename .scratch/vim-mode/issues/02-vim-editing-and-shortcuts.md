# 02: Editar con comandos Vim sin conflictos de teclado

**What to build:** Escribir con movimientos, operadores, búsqueda, repetición y deshacer de Vim mientras el resto de la aplicación conserva sus atajos y sus vistas sincronizadas.

**Blocked by:** 01: Activar Vim mode global desde Settings.

**Status:** ready-for-agent

- [x] w/b navegan por palabras, dd elimina una línea y ciw cambia una palabra con los resultados esperados sobre textos de prueba.
- [x] Visual permite seleccionar y operar sobre el rango; / busca y n/N recorren coincidencias en ambas direcciones.
- [x] El comando punto repite una edición, u deshace y Ctrl+R rehace sin perder el historial previo a una alternancia de la preferencia.
- [x] Con foco en Text y Vim mode activo, una tecla manejada por Vim no dispara además un atajo global; se prueba una colisión real del motor integrado.
- [x] Los atajos globales mantienen su comportamiento fuera del editor y al desactivar Vim mode; no se bloquean indiscriminadamente por la preferencia.
- [x] Las ediciones modales actualizan el preview, las métricas y el cursor y siguen usando el autoguardado existente en Story, Article y Post.
- [x] Las comprobaciones de teclado usan Electron real y verifican resultados observables; los tests existentes, tipos, lint y build siguen pasando.
- [x] No se incorporan mappings personalizados ni promesas de compatibilidad completa con Vim.

## Comments

Implementado y revisado el 2026-10-31. Validación: 511 tests en 42 suites,
tipos, lint y build correctos; harness de Electron real sobre perfil temporal.
Ver la revisión de implementación para la correspondencia con la spec y los límites.
