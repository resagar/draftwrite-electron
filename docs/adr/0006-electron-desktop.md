# Electron como framework de escritorio

La app de escritorio usa Electron (versión estable) con electron-vite para el desarrollo y el build, y electron-builder para el empaquetado. El backend en TypeScript vive dentro del proceso `main`, y el renderer habla con él por IPC directo (`contextBridge` + `ipcRenderer.invoke`), sin servidor.

Se eligió porque el equipo conoce TypeScript mucho más que otros lenguajes de backend para escritorio, Electron es la opción más madura y la UI se ve igual en todas las plataformas. El costo aceptado es un runtime más pesado; además, los módulos nativos (`better-sqlite3`) exigen reconstrucción contra el ABI de Electron (`electron-builder install-app-deps`).
