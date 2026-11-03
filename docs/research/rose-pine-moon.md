# Rosé Pine Moon para interfaz, editor y preview

Fecha: 2026-11-03. Investigación inicial y decisiones confirmadas. La spec y el ticket se publicaron después de la entrevista; el usuario solicitó posteriormente su implementación.

## Conclusión

La aplicación puede compartir una sola paleta Rosé Pine Moon entre la interfaz, Markdown crudo y Markdown renderizado. Ya existe la integración necesaria de CodeMirror; no hace falta cambiar de editor ni incorporar el sistema de plugins de Inkdrop. La recomendación es mantener los tokens semánticos de daisyUI, sustituir sus valores y añadir variables específicas de Markdown cuando los colores de sintaxis deban diferenciarse de los estados de la interfaz.

`syntax.css` y `preview.css` son una organización válida, pero sus nombres no activan funciones automáticamente en CodeMirror: hay que importar esos archivos y conectar las clases o variables con el editor y el preview.

## Evidencia del repositorio

- [global.css](../../src/renderer/src/global.css#L1) activa `dracula` mediante daisyUI; además sobrescribe radios y declara cinco colores propios para líneas, gutter y fondos. [index.html](../../src/renderer/index.html#L2) fija `data-theme="dracula"`.
- [editor/theme.ts](../../src/renderer/src/editor/theme.ts#L5) ya define `EditorView.theme`, con modo oscuro, cursor, selección, gutter y línea activa. Su `HighlightStyle` consume variables CSS semánticas para encabezados, énfasis, enlaces, listas y código.
- [MarkdownPreview.tsx](../../src/renderer/src/workspace/MarkdownPreview/MarkdownPreview.tsx#L50) utiliza componentes de react-markdown y utilidades de Tailwind/daisyUI. Comparte varias correspondencias con el editor: encabezados/secondary, strong/accent, em/warning, enlaces/info y código/success. No consume un archivo `preview.css` propio.
- El [ADR 0007](../adr/0007-design-tokens-from-daisyui-theme.md) establece una fuente de verdad de colores mediante tokens semánticos; duplicar hexadecimales en componentes o en el editor contradiría ese criterio. Cambiar el tema requiere actualizar su descripción de Dracula, conservando el principio.

## Qué tomar de Inkdrop

Inkdrop 6 reúne UI, sintaxis y preview en un tema. Su convención separa `ui.css`, `syntax.css` y `preview.css`, y permite un `palette.css` común. Los archivos de cada área sobrescriben variables semánticas; el CSS base de Inkdrop y sus clases de resaltado aplican esas variables. El editor usa CodeMirror 6. Por eso copiar un `syntax.css` de Inkdrop a Draftwrite no basta: aquí faltaría implementar los mismos nombres y conexiones. Sus capas CSS pertenecen a su propia cascada; deben adaptarse al orden de Tailwind/daisyUI, no copiarse sin revisión. Fuente: [Creating a theme](https://developers.inkdrop.app/guides/create-a-theme).

La idea aprovechable es separar paleta y roles de cada superficie. No se propone instalar paquetes de Inkdrop, su gestor de temas ni carga de CSS externo.

## Cómo funciona CodeMirror 6

CodeMirror distingue el aspecto del editor del resaltado de tokens. `EditorView.theme` define estilos del contenedor y sus elementos. `HighlightStyle.define` asocia tags de Lezer con estilos o con una propiedad `class` estable; `syntaxHighlighting` registra ese resaltador como extensión. Cuando se proporciona `class`, las reglas CSS deben definirse aparte. Fuente: [implementación y documentación de HighlightStyle y syntaxHighlighting](https://github.com/codemirror/language/blob/main/src/highlight.ts#L46-L108).

Hay dos rutas viables:

1. **Cambio mínimo recomendado:** conservar `theme.ts` y hacer que lea variables `--editor-*` y `--md-*` definidas en `syntax.css`. Así los colores viven en CSS y TypeScript conserva únicamente el puente hacia CodeMirror y sus reglas existentes.
2. **CSS con selectores explícitos:** configurar `HighlightStyle` con clases estables, por ejemplo `dw-md-heading`, y pintarlas desde `syntax.css`. Permite controlar el resaltado con reglas CSS directas, pero exige mantener el mapa tag/clase además de las reglas.

Ambas permiten cambiar colores desde CSS. No se deben seleccionar las clases anónimas generadas por el resaltador. La primera requiere menos cambios respecto del código actual. La segunda se justifica si el objetivo incluye editar todas las reglas de sintaxis directamente en una hoja CSS.

## Paleta verificada

Valores de la variante `moon` del [repositorio oficial de Rosé Pine](https://github.com/rose-pine/palette/blob/main/palette.json#L75-L147):

| Rol     | Valor     |
| ------- | --------- |
| base    | `#232136` |
| surface | `#2a273f` |
| overlay | `#393552` |
| muted   | `#6e6a86` |
| subtle  | `#908caa` |
| text    | `#e0def4` |
| love    | `#eb6f92` |
| gold    | `#f6c177` |
| rose    | `#ea9a97` |
| pine    | `#3e8fb0` |
| foam    | `#9ccfd8` |
| iris    | `#c4a7e7` |

La [página oficial de paleta](https://rosepinetheme.com/palette/) distingue además tres roles de highlight. Esta tabla recoge los doce valores disponibles en el JSON consultado; no pretende enumerar los quince roles de la web. La guía de Rosé Pine permite interpretaciones de la paleta: [Create a theme](https://rosepinetheme.com/en/create/create-a-theme/).

## Organización propuesta

Si el objetivo fuera únicamente recolorear toda la app conservando exactamente sus correspondencias actuales, bastaría reemplazar los tokens daisyUI y los cinco colores propios: el editor y el preview ya los consumen. Es la alternativa de menor tamaño. Separar hojas por superficie agrega control específico de Markdown y una organización similar a Inkdrop, a cambio de extraer reglas existentes y mantener su conexión. Esta segunda organización es la propuesta para el objetivo expresado; no requiere un sistema de plugins. daisyUI permite definir un tema propio mediante `@plugin "daisyui/theme"`: [documentación oficial](https://daisyui.com/docs/themes/).

Directorio propuesto: `src/renderer/src/styles/themes/rose-pine-moon/`.

| Archivo       | Responsabilidad propuesta                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `palette.css` | Único lugar con valores crudos `--rp-*`.                                                                  |
| `ui.css`      | Tema personalizado daisyUI: bases, contenido, primary, secondary, estados y tokens propios de Draftwrite. |
| `syntax.css`  | Variables de fondo, texto, cursor, selección y roles Markdown consumidas por `theme.ts`.                  |
| `preview.css` | Estilos acotados al preview y variables compartidas para encabezados, enlaces, citas, código y tablas.    |

Los cuatro archivos se importarían desde la entrada de estilos. `index.html` y la configuración daisyUI deberían seleccionar el mismo nombre de tema. Los colores de estado deben seguir siendo semánticos: error no debe cambiar porque se quiera recolorear un encabezado. Por eso conviene añadir roles Markdown independientes, aunque inicialmente compartan valores con la UI.

Para el preview, se recomienda añadir un selector raíz estable y extraer solamente sus colores de las clases actuales hacia `preview.css`; preservar estructura, anclas de scroll, fuentes y medidas. El código renderizado puede recibir fondo y color con CSS. Resaltar tokens de lenguajes dentro de bloques cercados es una función adicional: requiere un resaltador conectado al renderizado y no debe introducirse como parte implícita del cambio de paleta.

## Decisiones confirmadas durante la entrevista

- Rosé Pine Moon reemplazará a Dracula como tema único de la aplicación. No se agregará un selector de temas ni una preferencia para alternarlos. Confirmado por el usuario el 2026-11-03.
- El editor y el preview compartirán el color de cada elemento Markdown: títulos en iris, enlaces en foam y código en gold. Inicialmente se acordaron signos tenues; durante la implementación el usuario aclaró, con capturas de Inkdrop, que los símbolos también deben usar colores de la paleta según su función, en lugar de un gris uniforme. Los colores del contenido se mantienen.
- El usuario confirmó el cierre de la entrevista, aprobó la spec y el ticket único, y solicitó su implementación. Las decisiones confirmadas y la aclaración posterior sobre símbolos delimitan el alcance; las alternativas técnicas de esta investigación siguen siendo recomendaciones.
- El alcance visual se limita a colores. Se conservarán las fuentes, tamaños, espaciado y distribución actuales. Confirmado por el usuario el 2026-11-03.
- `syntax.css` y `preview.css` serán hojas internas del proyecto. No se agregará carga de CSS personalizado desde la aplicación. Confirmado por el usuario el 2026-11-03.
- Los bloques de código del preview conservarán un color uniforme: fondo Moon y texto gold, sin incorporar resaltado por lenguaje. Confirmado por el usuario el 2026-11-03.

## Validación de una futura implementación

Comprobar en Electron o Chromium la UI completa y un documento Markdown con encabezados, énfasis, enlaces, listas, citas, código, tablas y tareas. Revisar foco, hover, selección, cursor y contraste de texto y controles, incluyendo colores con opacidad. El hecho de pertenecer a una paleta no garantiza contraste suficiente para cualquier combinación.

Confirmar además que siguen funcionando edición, Vim, selección, deshacer y sincronización del preview. Ejecutar typecheck, lint y las pruebas pertinentes. jsdom puede verificar estructura, pero no demuestra el resultado visual ni el contraste. Esta investigación no ejecutó una validación visual del tema propuesto porque todavía no existe una implementación.
