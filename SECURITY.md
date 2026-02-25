# Consideraciones de Seguridad

Este documento describe las amenazas identificadas y las mitigaciones implementadas en Certificate Manager Tool.

## Principios de seguridad

1. **Offline first**: La aplicación no realiza conexiones de red
2. **Mínimo privilegio**: No se almacenan datos sensibles por defecto
3. **Defense in depth**: Múltiples capas de protección
4. **Fail secure**: Errores no exponen información sensible

---

## Amenazas y mitigaciones

### 1. Inyección de comandos

**Amenaza**: Un atacante podría inyectar comandos maliciosos a través de rutas de archivo o parámetros.

**Mitigación**:
- ✅ Uso exclusivo de `spawn()` con arrays de argumentos (nunca `exec()` con strings)
- ✅ Validación de rutas de archivo
- ✅ No se concatenan strings para formar comandos

```typescript
// ❌ NUNCA hacer esto
exec(`openssl x509 -in ${filePath} -noout -text`);

// ✅ Correcto
spawn('openssl', ['x509', '-in', filePath, '-noout', '-text']);
```

### 2. Exposición de contraseñas

**Amenaza**: Las contraseñas podrían quedar expuestas en logs, memoria o almacenamiento.

**Mitigación**:
- ✅ Contraseñas no se persisten por defecto
- ✅ Si se activa persistencia, se usa cifrado de electron-store
- ✅ Contraseñas se pasan como parámetros (no stdin cuando es posible)
- ✅ Logs sanitizados (patrones de contraseña redactados)
- ✅ Contraseñas se limpian de memoria tras uso

### 3. Exposición de claves privadas

**Amenaza**: Las claves privadas podrían filtrarse en logs o interfaces.

**Mitigación**:
- ✅ Regex de sanitización para bloques `-----BEGIN PRIVATE KEY-----`
- ✅ Rutas completas no se muestran en logs (solo nombre de archivo)
- ✅ Las claves privadas nunca se envían al renderer

### 4. Archivos temporales

**Amenaza**: Archivos temporales con información sensible podrían quedar en el sistema.

**Mitigación**:
- ✅ Directorio dedicado: `os.tmpdir()/cert-manager-temp/`
- ✅ Nombres únicos con timestamp
- ✅ Eliminación inmediata tras uso (en bloque `finally`)
- ✅ No se almacenan claves privadas en archivos temporales

### 5. Ataques desde el renderer

**Amenaza**: Código malicioso en el renderer podría acceder a APIs de Node.js.

**Mitigación**:
- ✅ `contextIsolation: true`
- ✅ `nodeIntegration: false`
- ✅ `sandbox: true`
- ✅ Solo APIs específicas expuestas via `contextBridge`
- ✅ IPC handlers validan parámetros

### 6. Path traversal

**Amenaza**: Rutas maliciosas podrían acceder a archivos fuera de lo esperado.

**Mitigación**:
- ✅ Uso de `path.normalize()` para rutas
- ✅ Validación de existencia de archivos antes de procesar
- ✅ Diálogos nativos para selección de archivos

### 7. Errores informativos

**Amenaza**: Mensajes de error podrían revelar información del sistema.

**Mitigación**:
- ✅ Mensajes de error genéricos para el usuario
- ✅ Detalles técnicos solo en panel dedicado
- ✅ Sanitización de stderr de OpenSSL

---

## Configuración de seguridad

### Preferencias recomendadas

| Configuración | Recomendado | Razón |
|--------------|-------------|-------|
| Guardar contraseñas | OFF | Evita persistencia de datos sensibles |
| Carpeta de salida | Directorio específico | Control sobre ubicación de archivos generados |

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com;">
```

---

## Seguridad de Keystores (Fase 3)

### 8. Manejo de contraseñas con keytool

**Amenaza**: keytool puede exponer contraseñas en argumentos de línea de comandos.

**Mitigación**:
- ✅ Uso preferente de stdin interactivo para contraseñas
- ✅ KeytoolRunner detecta prompts y envía passwords por stdin
- ✅ Fallback a `-storepass` solo cuando es necesario con warning
- ✅ Logs sanitizan cualquier argumento que contenga "pass"

```typescript
// Modo preferido: stdin interactivo
const result = await runner.runInteractive(args, { storePass: password });

// Fallback con warning de seguridad
const result = await runner.runWithStorePass(args, password);
// Console: "[WARNING] Using -storepass argument (less secure)"
```

### 9. Operaciones batch

**Amenaza**: Operaciones en lote podrían procesar archivos maliciosos o consumir recursos excesivos.

**Mitigación**:
- ✅ Límite de archivos procesados por operación
- ✅ Cancelación de jobs en progreso
- ✅ Validación de extensiones permitidas
- ✅ No se procesan enlaces simbólicos por defecto
- ✅ Progreso reportado para evitar bloqueo de UI

### 10. Detección de keytool path

**Amenaza**: Path injection al detectar keytool.

**Mitigación**:
- ✅ Solo se usa el JDK root configurado por el usuario
- ✅ Validación de existencia del ejecutable
- ✅ Path normalizado según OS (win32, darwin, linux)

---

## Limitaciones conocidas

1. **Contraseñas en memoria**: Las contraseñas permanecen en memoria durante la operación. JavaScript no permite limpieza segura de memoria.

2. **Cifrado de electron-store**: Usa cifrado simétrico. La clave se deriva del sistema. No es equivalente a un gestor de contraseñas dedicado.

3. **OpenSSL externo**: Dependemos de la instalación de OpenSSL del sistema. La seguridad de las operaciones criptográficas depende de esa instalación.

4. **keytool interactivo**: El modo interactivo de keytool puede no funcionar en todas las versiones de JDK. Se recomienda JDK 11+.

5. **Limitaciones de keytool**: keytool no soporta todas las extensiones de certificados (SANs limitados, no custom OIDs). Para certificados avanzados, usar OpenSSL.

---

## Reporte de vulnerabilidades

Si descubres una vulnerabilidad de seguridad, por favor:

1. NO la reportes públicamente
2. Contacta al equipo de desarrollo directamente
3. Proporciona detalles para reproducir el problema

---

## Auditoría

Última revisión de seguridad: Febrero 2026

Áreas revisadas:
- [x] Ejecución de comandos
- [x] Manejo de contraseñas
- [x] Sanitización de logs
- [x] Configuración de Electron
- [x] Archivos temporales

---

*Este documento debe actualizarse con cada cambio significativo en la arquitectura de seguridad.*
