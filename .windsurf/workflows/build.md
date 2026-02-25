---
description: Compilar y reiniciar la aplicación después de cambios
---

# Proceso de Build Completo

Cuando hay cambios en el proyecto, sigue estos pasos en orden:

## 1. Compilar paquete shared (si hay cambios en types)
```bash
cd "c:\proyectos\certificate manager tool\packages\shared"
npm run build
```

## 2. Compilar paquete core (si hay cambios en servicios)
```bash
cd "c:\proyectos\certificate manager tool\packages\core"
npm run build
```

## 3. Compilar main process de desktop
```bash
cd "c:\proyectos\certificate manager tool\apps\desktop"
npm run build:main
```

## 4. Ejecutar la aplicación
```bash
cd "c:\proyectos\certificate manager tool\apps\desktop"
npm run electron:dev
```

## Comando rápido (todo en uno)

Para PowerShell, ejecuta cada línea por separado:
```powershell
cd "c:\proyectos\certificate manager tool\packages\shared"; npm run build
cd "c:\proyectos\certificate manager tool\packages\core"; npm run build
cd "c:\proyectos\certificate manager tool\apps\desktop"; npm run build:main
cd "c:\proyectos\certificate manager tool\apps\desktop"; npm run electron:dev
```

## Limpiar caché de Vite (si hay problemas de módulos)
```bash
cd "c:\proyectos\certificate manager tool\apps\desktop"
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
```

## Notas importantes
- **NO abras la URL del navegador directamente** (ej: http://localhost:5173). La app necesita ejecutarse dentro de Electron para que funcione el preload.
- Si ves errores de importación después de cambios en shared/core, asegúrate de recompilar en orden: shared → core → desktop
- El puerto de Vite puede variar (5173, 5174, etc.) si hay otros procesos usando el puerto.
