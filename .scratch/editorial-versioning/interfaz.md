# Propuesta básica de interfaz editorial

Estado: referencia del diseño implementado; ver implementation-review.md para la evidencia y los límites. El uso de popovers de anotación sin oscurecimiento fue solicitado por el usuario; la distribución siguiente es una propuesta.

## Dirección

Mantener el tema y la navegación existentes. La escritura es la superficie principal; versiones y revisión aparecen bajo demanda, sin agregar paneles permanentes que reduzcan el editor. Las etiquetas de la interfaz siguen en inglés.

## Escritura

```text
+-------------------------------------------------------------+
| Existing navigation | Title / Subtitle / Target              |
| Stories unchanged   | [Main v]  Last version 1.2.0           |
| Articles / Posts    | Draft: Saved   [Save version] [More]   |
|                     |---------------------------------------|
|                     | Article text                          |
|                     |                                       |
|                     | Selected paragraph...  [Add note]     |
|                     |                                       |
|                     |                         [Notes 3]     |
+-------------------------------------------------------------+
```

`Last version` identifica la última versión guardada y se distingue del estado del borrador. Al iniciar, el borrador indica `0.0.0` y todavía no hay versiones. En Post, sus controles existentes de estado/programación permanecen a nivel de pieza. El selector de variante muestra nombre y principal; `More` agrupa acceso a variantes, archivo, conversión y publicaciones para evitar una barra saturada.

`Save version` abre un formulario compacto con el incremento elegido, número resultante y descripción. `Notes` abre la lista de observaciones; una nota general se puede crear desde esa lista y editar en un popover sin oscurecimiento.

## Anotaciones junto al texto

```text
 Selected paragraph text................................ [note]
                  +-------------------------------------+
                  | Note                              x |
                  | "Selected paragraph text..."        |
                  |                                     |
                  | Strengthen this opening...          |
                  |                  [Cancel] [Save]    |
                  +-------------------------------------+
 Other paragraphs remain visible and usable.
```

1. Seleccionar un párrafo o fragmento habilita `Add note`, accesible también mediante teclado.
2. Activarlo conserva la selección y abre el popover cerca de ella. No hay backdrop, oscurecimiento ni bloqueo del documento completo.
3. Guardar deja un marcador discreto de nota; activarlo vuelve a abrir la observación con acciones de edición y resolución.
4. El popover se recoloca si no cabe junto al fragmento; su contenido puede desplazarse si es largo. No debe tapar innecesariamente el texto citado.
5. Escape cierra y devuelve el foco al editor o al indicador. Un cierre no puede descartar silenciosamente una anotación en edición; su protección se verifica al implementar.
6. Cita sin anclaje seguro: se muestra en la lista de notas como pendiente de reubicación. No se finge un marcador en un párrafo distinto.

Propuesta inicial: crear anotaciones desde el editor Markdown y conservar sus rangos en el contenido fuente. La creación desde selección en preview requiere mapear texto renderizado a Markdown; no se da por aprobada ni implementada por este esquema.

## Historial y comparación

`History` abre un panel bajo demanda con versiones de la variante, descripción y acciones de consulta, comparación, creación de variante y recuperación. La vista de comparación usa el área central completa; el panel auxiliar se puede cerrar para recuperar ancho.

```text
+------------------------------------------------------------+
| Compare: [Main - 1.2.0 v]   [Narrative - 1.3.0 v]   [Close] |
|-----------------------------+------------------------------|
| Version A                   | Version B                    |
| Removed / modified text     | Added / modified text        |
|                             |                              |
+-----------------------------+------------------------------+
```

Comparar no modifica contenido. Integrar activa selección de cambios y confirmación; los conflictos se resuelven en una vista dedicada con base, propuestas y resultado, conservando espacio suficiente para leer. Recuperar y convertir muestran la confirmación y protección de cambios requeridas por la especificación.

## Edición paralela

```text
+------------------------------------------------------------+
| Main v | Last 1.2.0         | Narrative v | Last 1.3.0        |
| Draft: Saved [Save version] | Draft: Saved [Save version]    |
|----------------------------+-------------------------------|
| Editable draft A           | Editable draft B              |
| Notes anchored to A        | Notes anchored to B           |
+----------------------------+-------------------------------+
```

Cada editor conserva su foco, selección, notas y guardado. Es un modo distinto de comparar. En ventanas estrechas se alterna entre variantes sin forzar dos columnas ilegibles; cerrar navegación y paneles recupera espacio.

Propuesta de espacio: en modo paralelo, el preview se consulta para el editor activo mediante un control conmutable; no se muestran dos editores y dos previews a la vez. El historial es contextual a la pieza, no un reemplazo de la navegación global ni de la fuente Story.

## Validación prevista

Verificar en Electron/Chromium posicionamiento de popovers, selección CodeMirror, navegación por teclado, devolución de foco, scroll y aislamiento de dos editores. Este diagrama no constituye validación del comportamiento real.
