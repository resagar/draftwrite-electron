# Arquitectura hexagonal por dominio/feature

Organizamos el código en hexagonal (ports & adapters) por dominio/feature: el dominio puro vive en `src/main/<domain>/`, los adaptadores de entrada (IPC) y de salida (SQLite) en `src/main/adapters/`, y el composition root en `src/main/main.ts`. La dependencia va siempre hacia adentro: los adapters (`src/main/adapters/*`) importan a `src/main/<domain>/`, nunca al revés.

Lo decidimos así porque esta arquitectura permite código testeable — sobre todo la lógica de negocio, lo más importante — y al tener todo desacoplado es más fácil de organizar y usar. Los puertos comunes permiten generar adaptadores y conectar código modificando poco o nada de código de negocio. Ordenar por feature hace el código más navegable: el autor revisa todo lo que se escribe y prefiere que sea fácil navegarlo.
