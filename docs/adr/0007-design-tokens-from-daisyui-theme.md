# Los tokens de diseño salen de una paleta compartida y un tema semántico daisyUI

## Decisión actual: Rosé Pine Moon

Rosé Pine Moon reemplaza a Dracula como tema único. Los valores crudos se declaran una sola vez en `palette.css`; `ui.css` los traduce al tema semántico de daisyUI 5. Los componentes siguen usando sus utilidades (`bg-base-100`, `text-secondary`, `border-error`) y los cinco tokens propios para líneas, gutter y fondos también se derivan de esa paleta.

`syntax.css` define los roles del editor y los elementos Markdown. `preview.css` consume esos mismos roles en una superficie acotada. CodeMirror conserva su puente TypeScript hacia las variables CSS. Los roles Markdown son independientes de los estados de la interfaz: compartir un valor inicial no acopla el color de un título con una alerta.

Esta separación permite coherencia entre interfaz, Markdown crudo y preview sin duplicar hexadecimales en componentes ni introducir un gestor de temas. Las hojas son internas; no se cargan paquetes de Inkdrop ni CSS proporcionado por el usuario. Los nombres de las hojas son una convención de organización, no una API de carga de CodeMirror.

Se mantienen los radios, tamaños, bordes, profundidad y ruido anteriores. La migración solo cambia colores y conserva las preferencias tipográficas.

## Antecedente: Dracula

Originalmente se habilitó el tema `dracula` incluido en daisyUI 5. El mockup de referencia declaraba esos mismos colores como hex en un `tailwind.config`; comprobamos contra la fuente del tema que **eran los mismos valores**, así que repetirlos solo habría creado una segunda fuente de verdad que se desincroniza.

Dos cosas sí se sobrescriben, con `@plugin "daisyui/theme"`: los radios (`--radius-box`, `--radius-selector`, `--radius-field`), porque el tema trae 1rem y el diseño es plano con líneas de 1px; y `--depth`/`--noise`, por lo mismo.

Al tema se le añaden cinco tokens propios, que son los únicos colores del mockup sin equivalente semántico: el color de línea divisoria, su variante fuerte, el color del gutter del editor y dos fondos elevados. También se redefinen los tamaños de texto `xs`, `sm` y `base` y se añade `2xs`, con la consecuencia asumida de que eso altera el tamaño de los componentes de daisyUI. Ningún otro hex del mockup se copia: para eso están los tokens.

Las tres familias tipográficas se empaquetan con `@fontsource` en lugar de cargarse de un CDN, porque es una aplicación de escritorio y debe arrancar sin red y sin depender de una política de seguridad permisiva.
