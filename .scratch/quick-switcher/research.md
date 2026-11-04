# Investigación: divisores del Quick Switcher

Worktree: `/home/resagar/.herdr/worktrees/draftwrite-electron/quickswitcher-dividers`.
Rama comprobada durante la investigación: `fix/quickswitcher-dividers`.

## Hallazgos y evidencia

La causa probable es una jerarquía visual débil, inferida del código; no fue confirmada en pantalla.

- **Componente y estilos:** `src/renderer/src/search/QuickSwitcher.tsx:286-293` renderiza los encabezados de grupo como párrafos con `text-2xs`, `text-base-content/50`, espaciado compacto y sin fondo ni línea. Los resultados repiten el tipo en una etiqueta de igual tamaño, mayor opacidad y borde (`QuickSwitcher.tsx:345-348`). La repetición del tipo y la escasa separación pueden hacer que el encabezado se perciba como parte de un resultado.
- **Agrupación:** `src/renderer/src/search/search.ts:254-261` agrupa en orden Story → Article → Post, conservando el orden de los resultados dentro de cada tipo. `QuickSwitcher.tsx:92-110` construye los grupos y aplana sus resultados en el orden mostrado. No se encontró evidencia de un defecto de agrupación que explique la confusión visual.
- **Estados:** `QuickSwitcher.tsx:135-144` oculta los grupos vacíos cuando están listos y conserva los que cargan o fallaron. Los estados generales sin contenido y sin coincidencias aparecen en `QuickSwitcher.tsx:267-284`; los mensajes por grupo y el botón Retry, en `QuickSwitcher.tsx:295-311`.
- **Teclado:** `QuickSwitcher.tsx:108-113` construye el recorrido únicamente con resultados, excluyendo encabezados. `QuickSwitcher.tsx:148-184` implementa flechas sin envolver, Home/End y Enter para abrir el activo; `QuickSwitcher.tsx:187-190` cierra con Escape. El activo se desplaza a la vista en `QuickSwitcher.tsx:127-133`.
- **Selección:** `QuickSwitcher.tsx:320-330` diferencia la opción activa con `aria-selected`, borde izquierdo primario y fondo `bg-neutral`; las restantes usan hover `bg-neutral/40`.
- **Cobertura existente:** `src/renderer/src/search/quick-switcher.test.tsx:48` y los casos siguientes cubren comportamiento como grupos, navegación, ausencia de coincidencias y reintento; no demuestran apariencia renderizada.

Todas las rutas anteriores son relativas al worktree indicado. Las líneas corresponden al código leído durante la investigación original.

## Cambio mínimo recomendado

Añadir una línea horizontal sutil y algo más de separación vertical al encabezado de grupo usando tokens existentes. El cambio previsto puede limitarse a `src/renderer/src/search/QuickSwitcher.tsx`, sin alterar agrupación, etiquetas, semántica ni teclado. No parece necesario modificar los tokens de tema.

Riesgos: aumentar demasiado la altura de la lista o dar al divisor más protagonismo que a los resultados. Evitar reutilizar el fondo y el borde que identifican la selección.

## Verificaciones visuales necesarias y límites

Validar posteriormente en Electron o Chromium con datos sintéticos: tres grupos, un único tipo filtrado, selección junto a un divisor, desplazamiento y grupos cargando o con error. Comprobar legibilidad, separación perceptible y continuidad del teclado.

No se abrió la aplicación, no se ejecutaron tests ni builds y no se midieron geometría o contraste renderizados. La causa visual es una inferencia sustentada en estructura y clases, no una observación directa. No se consultaron fuentes externas. La exploración del repositorio fue delegada al subagente explorer conforme a las instrucciones locales; el agente principal contrastó las referencias centrales en el código.

## Permisos efectivos y alcance

El entorno declaraba `danger-full-access`, red habilitada y política de aprobación `never`. `id` devolvió usuario `resagar`, UID 1000, sin ejecución como root. Las comprobaciones `test -w` indicaron acceso de escritura al worktree y a `/home/resagar`, sin crear archivos para comprobarlo. Full Access no amplió el alcance autorizado de solo lectura.

La investigación no modificó archivos, instaló dependencias, inició migraciones, abrió la aplicación ni tocó datos reales. El fallo editorial de navegación quedó fuera del alcance. No hubo commits ni merges.

## Estado Git antes y después

Durante la investigación original, `git status --short` / `git status --porcelain` no devolvieron entradas al comienzo ni al final: árbol limpio en ambos momentos. La rama comprobada fue `fix/quickswitcher-dividers`.

## Actualización aprobada: color distinto por tipo

El usuario aprobó la separación visual y exige colores diferentes para Story, Article y Post, elegidos entre los tokens existentes. Solo este documento está autorizado como escritura en el repositorio; la implementación sigue pendiente.

### Convención de ubicación

`docs/agents/issue-tracker.md:3-9` establece documentación por feature en `.scratch/<feature-slug>/`. Los precedentes `.scratch/typewriter-scroll/research.md` y `.scratch/delete-story/research.md` usan el nombre research.md. Se guarda este informe en `.scratch/quick-switcher/research.md`, junto a la documentación existente del Quick Switcher.

### Propuesta visual concreta

Mantener los encabezados actuales como rótulos de sección, añadirles un borde superior horizontal de 1 px con `border-line` y aumentar el espacio vertical previo entre grupos (aproximadamente 4 px adicionales). Evitar espacio extra antes del primer grupo. Colorear únicamente el texto del encabezado a opacidad completa, sin fondo de selección ni borde izquierdo de acento. Conservar las etiquetas de los resultados y su selección actual.

| Tipo    | Utilidad existente propuesta | Paleta    | Contraste calculado sobre base |
| ------- | ---------------------------- | --------- | ------------------------------ |
| Story   | `text-accent`                | `#f6c177` | 9.55:1                         |
| Article | `text-secondary`             | `#c4a7e7` | 7.47:1                         |
| Post    | `text-success`               | `#9ccfd8` | 9.19:1                         |

Evidencia: `src/renderer/src/styles/themes/rose-pine-moon/palette.css:2-13` define los valores; `ui.css:6-24` mapea base-100 a base, accent a gold, secondary a iris y success a foam. El panel usa `bg-base-100` en `src/renderer/src/search/QuickSwitcher.tsx:237`. Los cocientes se calcularon a partir de luminancia relativa sRGB de los valores declarados, con opacidad completa; superan 4.5:1 para texto pequeño. No son mediciones de una captura o de estilos computados.

Se evita primary (rose), usado por el borde de la opción activa en `QuickSwitcher.tsx:326-330`. El token success comparte color con estados exitosos y accent con warning: el riesgo de asociación semántica se limita usando solo texto de encabezado, sin iconos de estado, badges ni fondos. Los nombres de tipo y la línea aportan identificación independiente del color.

`docs/adr/0007-design-tokens-from-daisyui-theme.md:5-9` prescribe consumir utilidades del tema sin duplicar hexadecimales en componentes. Los hex anteriores son evidencia documental, no valores propuestos para introducir en código.

### Archivos y validación previstos

Implementación prevista únicamente en `src/renderer/src/search/QuickSwitcher.tsx`: clases del encabezado y asignación explícita de clases estáticas por tipo para que Tailwind las detecte. No modificar paleta, tokens, búsqueda, orden ni recorrido de teclado. El informe es el único archivo escrito en esta etapa.

Validar en Electron o Chromium con datos sintéticos los tres grupos, búsqueda de un solo tipo, títulos largos, carga/error, lista desplazable, opción activa junto a cada encabezado y zoom. Comprobar contraste computado y separación respecto de selección/hover. Verificar flechas, Home/End, Enter, Escape y retorno del foco con la cobertura existente; ejecutar los tests pertinentes, typecheck y lint tras una futura implementación. No añadir pruebas de geometría en jsdom. No iniciar la aplicación contra datos reales.

### Estado y límites de esta actualización

Al comenzar esta actualización, `git status --short` estaba vacío. Después de guardarlo, `git status --short` mostró únicamente `?? .scratch/quick-switcher/research.md`. `git check-ignore` no identificó el archivo como ignorado (salida vacía, código 1). No aparecieron cambios adicionales. No se ha ejecutado la aplicación, tests, builds, instalaciones ni migraciones. No hubo commits ni merges. Los permisos Full Access no amplían esta autorización documental. El fallo editorial de navegación sigue fuera del alcance.
