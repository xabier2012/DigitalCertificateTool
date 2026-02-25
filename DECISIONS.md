# Decisiones de Arquitectura

Este documento registra las decisiones técnicas tomadas durante el desarrollo de Certificate Manager Tool.

## Índice

1. [Estructura del proyecto](#1-estructura-del-proyecto)
2. [Tecnologías seleccionadas](#2-tecnologías-seleccionadas)
3. [Arquitectura de seguridad](#3-arquitectura-de-seguridad)
4. [Manejo de certificados](#4-manejo-de-certificados)
5. [Interfaz de usuario](#5-interfaz-de-usuario)

---

## 1. Estructura del proyecto

### Decisión: Monorepo con workspaces

**Contexto**: Se necesita separar la lógica de negocio (core) de la UI y compartir tipos entre packages.

**Decisión**: Usar npm workspaces con la siguiente estructura:
- `packages/shared`: Tipos TypeScript y helpers
- `packages/core`: Lógica de certificados y ejecución de comandos
- `apps/desktop`: Aplicación Electron con React

**Razón**: 
- Permite reutilizar `core` en futuras aplicaciones (CLI, servidor)
- Separación clara de responsabilidades
- Facilita testing independiente del core

---

## 2. Tecnologías seleccionadas

### Decisión: Electron + React + Vite

**Alternativas consideradas**: 
- Tauri (Rust): Descartado por requisito de Node.js
- NW.js: Menos soporte y comunidad

**Razón**: Requerimiento explícito del proyecto.

### Decisión: Material UI (MUI)

**Razón**: 
- Componentes listos para producción
- Excelente documentación en español
- Consistencia visual

### Decisión: Zustand para estado

**Alternativas consideradas**:
- Redux: Demasiado boilerplate para esta aplicación
- Context API: Menos features para persistencia

**Razón**: 
- API simple y minimalista
- Fácil integración con TypeScript
- Sin boilerplate excesivo

### Decisión: electron-store para persistencia

**Razón**:
- Persistencia automática en formato JSON
- Cifrado opcional para datos sensibles
- API síncrona simple

---

## 3. Arquitectura de seguridad

### Decisión: spawn() en lugar de exec()

**Contexto**: Necesidad de ejecutar OpenSSL y keytool.

**Decisión**: Usar exclusivamente `child_process.spawn()` con arrays de argumentos.

**Razón**:
- `exec()` con strings es vulnerable a inyección de comandos
- `spawn()` con arrays separa comando de argumentos
- Mayor control sobre el proceso

### Decisión: No persistir contraseñas por defecto

**Contexto**: Las contraseñas de PKCS#12 y claves privadas.

**Decisión**: 
- OFF por defecto
- Si se activa, usar cifrado de electron-store
- Limpiar de memoria tras uso

**Razón**: Principio de mínimo privilegio.

### Decisión: Sanitización de logs

**Contexto**: Los comandos OpenSSL pueden contener contraseñas.

**Decisión**: Implementar `sanitizeLog()` que redacta:
- Parámetros `-passin`, `-passout`
- Contenido de claves privadas
- Patrones `password=*`

**Razón**: Evitar fugas de información sensible en logs.

### Decisión: Context Isolation + Sandbox en Electron

**Decisión**: 
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Comunicación solo via `contextBridge`

**Razón**: Mejores prácticas de seguridad de Electron.

---

## 4. Manejo de certificados

### Decisión: Detección de formato por contenido

**Contexto**: Las extensiones de archivo no siempre son fiables.

**Decisión**: `FileFormatDetector` analiza:
1. Extensión del archivo
2. Contenido (headers PEM, bytes DER)

**Razón**: Mayor robustez ante archivos mal nombrados.

### Decisión: Archivos temporales con limpieza automática

**Contexto**: OpenSSL requiere archivos de configuración (.cnf).

**Decisión**:
- Crear en `os.tmpdir()/cert-manager-temp/`
- Prefijo con timestamp para unicidad
- Eliminar inmediatamente tras uso

**Razón**: No dejar archivos sensibles en el sistema.

### Decisión: Mostrar EKU con OIDs desconocidos

**Contexto**: Algunos certificados tienen EKU con OIDs no estándar.

**Decisión**: Mostrar el OID tal como lo reporta OpenSSL (ej: `1.2.3.4.5`).

**Razón**: 
- No ocultar información al usuario
- Algunos OIDs son específicos de organizaciones

### Decisión: CSR como opción recomendada

**Contexto**: Los usuarios pueden no saber qué método usar.

**Decisión**: 
- "Generate CSR" como opción principal y recomendada
- "Generate Self-Signed" como opción secundaria con warnings

**Razón**: Guiar al usuario hacia la práctica correcta.

---

## 5. Interfaz de usuario

### Decisión: Wizard para setup inicial

**Contexto**: La aplicación necesita OpenSSL configurado.

**Decisión**: Setup wizard obligatorio al primer arranque con:
1. Bienvenida
2. Configuración OpenSSL (con test)
3. Configuración JDK (con test)
4. Carpeta de salida
5. Preferencias de seguridad

**Razón**: 
- Guía paso a paso para usuarios novatos
- Validación antes de usar la app

### Decisión: Navegación con sidebar fijo

**Decisión**: Drawer permanente con secciones colapsables.

**Razón**: 
- Navegación siempre visible
- Familiar para usuarios de aplicaciones de escritorio

### Decisión: Mensajes en español

**Contexto**: Requisito del proyecto.

**Decisión**: Todos los mensajes de UI, errores y ayuda en español.

**Razón**: Requisito explícito.

### Decisión: Tabs en Inspect Certificate

**Decisión**: Tres tabs:
1. Resumen (información estructurada)
2. Texto completo (salida raw de OpenSSL)
3. Acciones rápidas (copiar, extraer)

**Razón**: Separar información resumida de técnica.

---

## Decisiones pendientes (Fases futuras)

- [ ] Soporte para keystores JKS (Fase 3)
- [ ] Importación de certificados a keystores
- [ ] Cadenas de certificados
- [ ] Validación de certificados contra CA

---

*Última actualización: Febrero 2026*
