# Los tokens de diseño salen del tema dracula de daisyUI

La paleta de la interfaz no se declara en el proyecto: se habilita el tema `dracula` que ya trae daisyUI 5 y se usan sus utilidades semánticas (`bg-base-100`, `text-secondary`, `border-error`). El mockup de referencia declaraba esos mismos colores como hex en un `tailwind.config`; comprobamos contra la fuente del tema que **son los mismos valores**, así que repetirlos solo habría creado una segunda fuente de verdad que se desincroniza.

Dos cosas sí se sobrescriben, con `@plugin "daisyui/theme"`: los radios (`--radius-box`, `--radius-selector`, `--radius-field`), porque el tema trae 1rem y el diseño es plano con líneas de 1px; y `--depth`/`--noise`, por lo mismo.

Al tema se le añaden cinco tokens propios, que son los únicos colores del mockup sin equivalente semántico: el color de línea divisoria, su variante fuerte, el color del gutter del editor y dos fondos elevados. También se redefinen los tamaños de texto `xs`, `sm` y `base` y se añade `2xs`, con la consecuencia asumida de que eso altera el tamaño de los componentes de daisyUI. Ningún otro hex del mockup se copia: para eso están los tokens.

Las tres familias tipográficas se empaquetan con `@fontsource` en lugar de cargarse de un CDN, porque es una aplicación de escritorio y debe arrancar sin red y sin depender de una política de seguridad permisiva.
