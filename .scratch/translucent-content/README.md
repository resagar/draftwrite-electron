# Fondo transparente — alcance final

## Estado

Implementado y verificado. Linux conserva su fallback actual por decisión del usuario;
el difuminado nativo de Linux queda fuera del alcance de cierre.

## Resultado

- Windows 11 22H2 o posterior: Acrylic nativo con controles de ventana del sistema.
- Tinte Rosé Pine Moon al 84%, con una sola capa por región principal.
- Sidebar, lista, contenido y barras participan del acabado; texto e iconos permanecen nítidos.
- Cabeceras y paneles estructurales transparentes para evitar capas de tinte apiladas.
- Barras superior e inferior continuas; pie con guardado, atajo y métricas.
- Resaltado de línea activa continuo, incluido el margen del número de línea.
- Barra de formato Markdown eliminada de Story, Article y Post.
- WSLg/Xwayland conserva alpha tenue y controles propios. Otros entornos conservan fondo sólido.
- `--opaque-window` permite forzar el fondo opaco.

## Documentación

- [Verificación e integración](integration-report.md).
- [Hallazgos de Linux y límite aceptado](linux-blur-feasibility.md).
- [Contrato IPC](../../docs/api/ipc-contract.md).
- Nota canónica y capturas: [Fondo transparente](inkdrop://note/2F22byUG).

Los prototipos y las capturas temporales no forman parte del código de la aplicación.
No se modificaron la instalación nativa existente de Windows ni sus datos.
