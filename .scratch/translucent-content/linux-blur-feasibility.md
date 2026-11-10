# Viabilidad del difuminado en Linux

Fecha: 2026-11-10. Rama: feat/translucent-content.

## Entorno real revisado

La sesión actual es Linux/WSL2 con WSLg; la app usa Xwayland sobre Weston.
La consulta X11 del explorador identifica Weston WM y no encuentra el hint de blur
KWin entre las capacidades anunciadas por `_NET_SUPPORTED`. La herramienta
wayland-info no está instalada; no se afirma que se hayan enumerado los globals
Wayland ni probado el protocolo de blur de una superficie Wayland nativa.

## Fuentes primarias y alternativas

- Electron documenta backgroundMaterial para Windows y vibrancy para macOS. No
  expone una API genérica equivalente para Linux:
  https://www.electronjs.org/docs/latest/api/base-window
- CSS blur afecta al contenido de la ventana, no a otras aplicaciones detrás:
  https://www.electronjs.org/docs/latest/tutorial/custom-window-styles
- KWin implementa blur del compositor y el hint X11
  `_KDE_NET_WM_BLUR_BEHIND_REGION`:
  https://github.com/KDE/kwin/blob/master/src/plugins/blur/blur.cpp
- Wayland dispone de ext-background-effect-v1, con capacidades que anuncia el
  compositor. Su soporte debe comprobarse en la sesión concreta:
  https://gitlab.freedesktop.org/wayland/wayland-protocols/-/blob/main/staging/ext-background-effect/ext-background-effect-v1.xml
- La documentación de Mutter API 51 confirma blur solicitado mediante ese protocolo;
  no prueba soporte en todas las versiones de GNOME ni que Electron lo utilice:
  https://gnome.pages.gitlab.gnome.org/mutter/meta/method.Compositor.set_background_blur_params.html
- WSLg usa Weston, Xwayland y transporte RDP/VAIL/RAIL. Su documentación no garantiza
  traducción de los protocolos de blur al DWM de Windows:
  https://github.com/microsoft/wslg

## Resultado y decisión de implementación

El blur es posible en algunos escritorios Linux, pero no es una propiedad portable
que esta versión de Electron permita activar con un flag. No se ha validado una
vía nativa soportada en el entorno WSLg actual. No se añade código que prometa ese
efecto, no se modifican el compositor ni las preferencias del usuario y no se
captura el escritorio para simularlo dentro del editor.

Se conserva el fallback ya validado: tinte alpha tenue en WSLg y fondo sólido donde
el modo transparente no fue validado. Los cambios compartidos de barras, pie,
línea activa y eliminación de la barra de formato sí aplican a Linux.

## Siguiente validación concreta para Linux de escritorio

1. Identificar compositor y backend reales: KWin/X11, KWin/Wayland, Mutter/Wayland u otro.
2. En KWin/X11, verificar capacidades y solicitar el hint solo sobre una ventana
   descartable propia. Eliminar la propiedad al cerrar y comparar formas externas.
3. En Wayland, enumerar los globals y la capacidad blur. Una superficie de otro
   proceso no puede usarse como sustituto de la superficie de Chromium; hace falta
   que el backend de la app soporte la solicitud sobre su propia superficie.
4. Validar controles, redimensionamiento, maximización y lectura en ese compositor.
5. Solo después integrar ese backend; conservar siempre la salida opaca.

No se instaló software, no se cambiaron ajustes del sistema ni la instalación
nativa de Draftwrite en Windows. La investigación no demuestra una imposibilidad
universal de blur en Linux o WSLg.

## Decisión final del usuario

El usuario indicó que, si no se resuelve el difuminado de Linux, se conserve el
comportamiento actual. El blur nativo de Linux queda fuera del alcance de cierre.
Esta investigación no constituye un pendiente ni autoriza cambios del compositor.
