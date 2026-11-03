# Verificación de Rosé Pine Moon

La frontera de prueba es la aplicación real en Electron con perfil y datos aislados. El harness crea documentos Story, Article y Post, y modifica sus textos; no debe ejecutarse sobre una sesión personal.

## Ejecución

Después de `pnpm build`, iniciar una instancia de prueba:

```sh
XDG_CONFIG_HOME=/tmp/draftwrite-rose-pine-config \
XDG_DATA_HOME=/tmp/draftwrite-rose-pine-data \
pnpm exec electron --ozone-platform=headless --disable-gpu \
  --remote-debugging-port=9226 out/main/main.js
```

En entornos que no admitan el sandbox de Chromium, agregar `--no-sandbox` solo a ese proceso aislado. En un escritorio con pantalla, omitir `--ozone-platform=headless` para comprobar también el hover del dispositivo real.

```sh
playwright-cli -s=rose-pine attach --cdp=http://127.0.0.1:9226
playwright-cli -s=rose-pine run-code --filename=scripts/verify-rose-pine.browser.js
playwright-cli -s=rose-pine detach
```

## Cobertura

- Fondo Moon en la ventana principal y Settings nativo.
- Encabezados iris, enlaces foam y código gold en editor y preview, incluidos los seis niveles de encabezado.
- Símbolos Markdown por función: encabezados y código rose; listas, tareas y citas foam; énfasis y enlaces iris. Incluye numeración y ambos estados de tareas.
- Negrita, enlace, código y énfasis anidados en citas y listas, conservando la precedencia de los roles inline.
- Colores calculados de citas y listas equivalentes en las dos vistas.
- Contraste efectivo de muestras de texto, componiendo fondos y colores con alfa. Es una comprobación representativa, no una auditoría exhaustiva de accesibilidad.
- Selección de texto, color de selección con el editor enfocado y deshacer en Story, Article y Post.
- Ausencia de errores del renderer durante la comprobación.

Para comparar contra Dracula, ejecutar el mismo harness antes de aplicar el cambio con idénticos datos y preferencias. En Dracula guarda medidas y una captura antes de fallar por el color de títulos esperado. En Moon compara esas medidas si existen; el resultado `geometryMatchesBaseline: false` indica que no había referencia anterior y no demuestra conservación de geometría.

Las capturas se guardan en `/tmp/draftwrite-moon-before.png`, `/tmp/draftwrite-moon-after.png` y `/tmp/draftwrite-moon-settings.png`. Las medidas comparan fuentes, tamaños, pesos, interlineado, márgenes, padding y dimensiones de ocho superficies a 1440 × 900.

Para regresiones de tipografía, sincronización de scroll, Vim mode y guardado, reutilizar los harnesses existentes de tipografía y Vim en el mismo perfil aislado, después de la comparación de Moon. Modifican las preferencias, por lo que repetir la comparación de geometría requiere restaurar los valores de la captura inicial.

## Evidencia de esta implementación

En Electron sobre Linux headless se verificaron los colores, los símbolos, la ventana de Settings, la selección enfocada y el contenido anidado. Las medidas coincidieron con la referencia Dracula. Las muestras de contraste estuvieron entre 4,71:1 y 11,86:1.

También se comprobaron el foco rose de 2 px, el cursor rose, el gutter con su opacidad existente, la línea activa highlight-low, la selección highlight-med y el hover del enlace. Las tareas del preview continuaron deshabilitadas con controles nativos oscuros. El botón de creación conserva texto Moon sobre overlay y borde highlight-high; su contraste de texto sobre fondo es 8,82:1.

El entorno reporta `(hover: hover)` y `(pointer: fine)` como falsos: el hover de botones condicionado por esa media query requiere confirmación en un escritorio con mouse. No se lo considera probado por mover el puntero en headless. No se verificaron paquetes de Windows/macOS.

Los harnesses existentes de tipografía y Vim pasaron: tipografía persistente, ventana auxiliar, fuentes, scroll sincronizado, selección, deshacer, guardado manual y automático en Story, Article y Post. Los controles finales de tipos, build, lint y Jest se registran en la revisión de implementación de esta funcionalidad.
