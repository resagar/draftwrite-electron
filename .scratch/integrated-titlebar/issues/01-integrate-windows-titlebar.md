# 01: Integrar la barra de título de la ventana principal en Windows

**What to build:** Una ventana principal con encabezado integrado al tema, sin la fila nativa duplicada, con controles nativos y arrastre funcionales, incluido el modo Zen y los estados de maximización.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] La ventana principal en Windows usa una barra integrada con controles nativos de minimizar, maximizar/restaurar y cerrar.
- [ ] Los controles son legibles, respetan el tema y no se superponen al contenido en los tamaños admitidos ni en modo Zen.
- [ ] El área libre permite arrastrar y maximizar/restaurar mediante doble clic; los botones del encabezado conservan su interacción.
- [ ] El cierre y guardado existentes conservan su comportamiento.
- [ ] Linux, macOS y la ventana Settings conservan su configuración actual.
- [ ] Typecheck, lint y pruebas pertinentes pasan; la evidencia distingue verificación real de Windows y comprobaciones parciales desde Linux.

## Comments

Spec: [Barra de título integrada](../spec.md). Alcance, frontera de pruebas y ticket único aprobados por el usuario.

Implementación realizada y revisada. Typecheck, lint, build y 557 tests correctos. Smoke Electron Linux correcto. La aceptación nativa en Windows sigue pendiente; no se marca como comprobada. Ver [evidencia y revisión contra la spec](../verification.md).
