# 01: Integrar la barra de título de la ventana principal en Windows y Linux

**What to build:** Una ventana principal con encabezado integrado al tema, sin la fila nativa duplicada, con controles nativos y arrastre funcionales, incluido el modo Zen y los estados de maximización.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] La ventana principal en Windows y Linux usa una barra integrada con controles nativos de minimizar, maximizar/restaurar y cerrar.
- [ ] Los controles son legibles, respetan el tema y no se superponen al contenido en los tamaños admitidos ni en modo Zen.
- [ ] El área libre permite arrastrar y maximizar/restaurar mediante doble clic; los botones del encabezado conservan su interacción.
- [ ] El cierre y guardado existentes conservan su comportamiento.
- [x] macOS y la ventana Settings conservan su configuración actual.
- [x] Typecheck, lint y pruebas pertinentes pasan; la evidencia distingue verificación real de Windows y comprobaciones parciales desde Linux.

## Comments

Spec: [Barra de título integrada](../spec.md). Alcance, frontera de pruebas y ticket único aprobados por el usuario.

Implementación realizada y revisada. Typecheck, lint, build y 557 tests correctos. Smoke Electron Linux correcto. La aceptación nativa en Windows sigue pendiente; no se marca como comprobada. Ver [evidencia y revisión contra la spec](../verification.md).

Corrección solicitada por el usuario: habilitar también Linux/WSLg. La regresión nativa falló antes del cambio (overlay invisible) y pasó después (overlay visible y encabezado dentro del área segura), con Zen activado/desactivado a 900/1280 px. Verificador reutilizable: scripts/verify-titlebar.browser.js. La validación del binario nativo Windows sigue pendiente.

Las casillas abiertas requieren completar la validación nativa y las interacciones manuales; no indican ausencia de código. Status conserva el vocabulario de triage del tracker, que no define un estado de cierre. La revisión final de estándares y spec no detectó defectos de implementación.
