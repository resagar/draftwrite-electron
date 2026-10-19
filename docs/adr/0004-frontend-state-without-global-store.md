# Estado del frontend sin store global

La interfaz no usa una librería de estado global (Redux, Zustand) ni una de datos remotos (React Query). El estado vive en tres piezas separadas:

1. **Un reducer de workspace** con la selección, el filtro, el orden, el modo de vista y el diálogo abierto, expuesto por dos contextos: el estado y el `dispatch`. Separarlos evita que un componente que solo despacha acciones se vuelva a renderizar cuando cambia el estado.
2. **Un proveedor de datos de la biblioteca** que carga stories y artículos una sola vez y reparte la instantánea, para que las dos listas, la barra lateral y el workspace miren los mismos datos y no se pisen entre sí con peticiones duplicadas.
3. **Un store mínimo** para la barra de estado, consumido con `useSyncExternalStore`.

Elegimos esto porque el tamaño del problema no justifica una dependencia: la superficie son siete métodos y una sola ventana. La pieza clave es el tercer punto. El texto del editor y sus métricas cambian en cada pulsación, y si vivieran en el estado del shell, cada tecla volvería a renderizar el árbol entero —incluido CodeMirror—. Con el store aislado, escribir solo vuelve a renderizar la barra inferior.

El costo aceptado es que el store de estado es un singleton de módulo: hay un solo editor en toda la aplicación, y las pruebas lo reinician al desmontar. Si algún día hay más de un editor, esa decisión hay que revisarla.
