# 02: Minimizar y restaurar el panel «Source story»

**Qué construir:** el panel deja de comportarse como un toggle button y pasa a ser un disclosure accesible. El botón de minimizar/restaurar vive dentro del panel, como primer control de la cabecera, y sigue visible cuando el panel se reduce a una franja de 40 px. Al minimizar, el título, el chip `Read-only`, las acciones y el contenido se ocultan; la franja mantiene el botón y el fondo/borde del panel. Al restaurar, vuelve todo el contenido sin mover el foco fuera del botón. El control funciona tanto durante la creación como con un Article guardado, y en todos los anchos: se elimina la visibilidad forzada en `xl`. El panel arranca expandido, cada Article nuevo lo expande y el estado minimizado se conserva durante la sesión al navegar entre Articles. La transición de ancho solo ocurre al minimizar o restaurar, dura entre 160 y 200 ms y se desactiva con `prefers-reduced-motion`.

**Blocked by:** 01 (necesita la composición única y la instancia persistente del panel)

**Status:** resolved

- [x] El botón `Toggle source story` está dentro de la región `Source story` y existe en creación y edición.
- [x] El botón usa `aria-expanded` y `aria-controls`; no expone `aria-pressed`.
- [x] Al minimizar, `aria-expanded` pasa a `false` y el panel queda como una franja de 40 px con el mismo botón visible.
- [x] El contenido, el título, el chip y las acciones minimizadas no son tabulables ni se anuncian a tecnologías de asistencia.
- [x] Al restaurar, el contenido vuelve a estar disponible y el foco permanece en el botón.
- [x] Enter y Space funcionan por ser un botón nativo.
- [x] El toggle cambia el panel en ventanas de 900 px y de 1280 px o más; no queda ninguna visibilidad forzada por breakpoint.
- [x] La primera apertura de un Article en la sesión muestra el panel expandido.
- [x] Si el panel estaba minimizado, cambiar a otro Article lo conserva minimizado.
- [x] Un Article nuevo abre el panel expandido aunque el anterior estuviera minimizado.
- [x] El estado no se persiste al reiniciar; la app vuelve al valor por defecto expandido.
- [x] La transición se usa solo en la acción de toggle y se desactiva con movimiento reducido; no hay animación de entrada al crear, al guardar ni al llegar datos.
- [x] `ArticleHeader` deja de mostrar el toggle duplicado.
- [x] El test existente del toggle se actualiza de forma deliberada de `aria-pressed` a `aria-expanded` y de `Toggle source pane` a `Toggle source story`; no se ajusta para hacer pasar la implementación.
- [x] Tests de integración cubren colapso, restauración, contenido oculto, foco, cambio de Article, Article nuevo y mismo nodo al guardar.

## Comments

- 2026-10-20: Implementado en `8123619`. Toggle dentro del panel con `aria-expanded`/`aria-controls`, franja de 40 px, estado de sesión y transición de 200 ms con `motion-reduce`. La transición y `prefers-reduced-motion` no se pueden verificar en jsdom; el CSS generado se comprobó en el build.
