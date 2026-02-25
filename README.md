# Certificate Manager Tool

<p align="center">
  <strong>Herramienta de escritorio profesional para gestión integral de certificados digitales</strong><br>
  100% offline &bull; Multiplataforma &bull; OpenSSL + keytool integrados
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20_LTS-green?logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/Electron-40-blue?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Offline-100%25-orange" alt="Offline">
</p>

---

## Descripción

**Certificate Manager Tool** es una aplicación de escritorio construida con Electron que permite gestionar certificados digitales X.509, keystores Java y paquetes criptográficos de forma visual e intuitiva, sin necesidad de memorizar comandos de OpenSSL o keytool.

Está diseñada para **administradores de sistemas, desarrolladores y equipos DevOps** que trabajan habitualmente con certificados SSL/TLS, PKI corporativa y keystores Java.

### Características principales

- **Inspección visual** de certificados con desglose completo de campos, extensiones y cadenas
- **Generación de CSR, certificados autofirmados y certificados firmados por CA** con wizard guiado
- **CA local completa** (Root + Intermediate) para entornos de desarrollo y pruebas
- **Gestión de keystores** JKS, JCEKS y PKCS#12 con operaciones CRUD sobre aliases
- **Empaquetado PKCS#12 y PKCS#7** para distribución de certificados y cadenas
- **Operaciones en lote** (conversión, extracción, reportes de expiración)
- **Plantillas reutilizables** para estandarizar la generación de certificados
- **100% offline** — no realiza conexiones de red ni envía telemetría
- **Seguridad reforzada** — contraseñas vía variables de entorno, sandbox de Electron, sanitización de logs

---

## Requisitos

| Requisito | Versión | Notas |
|-----------|---------|-------|
| **Node.js** | 20 LTS o superior | Requerido para desarrollo |
| **OpenSSL** | 1.1+ o 3.x | Debe estar instalado y accesible en el sistema |
| **JDK** | 11+ (opcional) | Necesario para operaciones con keystores JKS/JCEKS |

> **Nota**: En Windows, el Setup Wizard puede detectar e instalar OpenSSL automáticamente vía `winget`.

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/<tu-usuario>/DigitalCertificateTool.git
cd DigitalCertificateTool

# Instalar dependencias
npm install

# Compilar packages (orden importante)
npm run build -w packages/shared
npm run build -w packages/core
```

## Ejecución en desarrollo

```bash
cd apps/desktop
npm run electron:dev
```

Esto iniciará simultáneamente:
1. **Vite dev server** — frontend React con hot reload en `http://localhost:5173`
2. **Electron** — proceso principal conectado al dev server

## Compilar para producción

```bash
cd apps/desktop
npm run electron:build
```

Los instaladores se generarán en `apps/desktop/release/`:
- **Windows**: `.exe` (NSIS installer) + portable
- **macOS**: `.dmg` (x64 y arm64)
- **Linux**: `.AppImage` + `.deb`

---

## Funcionalidades detalladas

### Setup Wizard (Configuración inicial)

Al primer arranque, un asistente paso a paso guía la configuración:

| Paso | Descripción |
|------|-------------|
| **OpenSSL** | Auto-detección de ruta, validación con test real, opción de instalar vía `winget` (Windows) |
| **JDK** | Configuración del JDK root para keytool, validación de accesibilidad |
| **Carpeta de salida** | Directorio por defecto para certificados y claves generados |
| **Seguridad** | Preferencias de persistencia de contraseñas (OFF por defecto) |

---

### Inspeccionar certificados

Analiza cualquier certificado digital con desglose visual completo:

- **Formatos soportados**: `.cer`, `.crt`, `.pem`, `.der`, `.p12`, `.pfx`, `.key`
- **Detección automática** del formato (PEM, DER, PKCS#12) por contenido, no solo por extensión
- **Vista Resumen**: Subject, Issuer, validez, algoritmo, key size, versión, Basic Constraints, Key Usage, EKU, SANs, fingerprints SHA-256/SHA-1
- **Vista Texto completo**: Salida raw de OpenSSL para análisis detallado
- **Acciones rápidas**: Copiar Subject, copiar fingerprint, extraer clave pública

---

### Generar CSR (Certificate Signing Request)

Genera solicitudes de firma con configuración completa:

- **Subject DN**: CN, O, OU, L, ST, C, email
- **Algoritmos**: RSA-2048, RSA-4096, ECC-P256, ECC-P384
- **SANs**: DNS, IP, URI, email — con validación en tiempo real
- **Hash de firma**: SHA-256, SHA-384, SHA-512
- **Protección de clave privada** con contraseña opcional
- **Archivos generados**: CSR (`.csr`), clave privada (`.pem`), README con instrucciones

---

### Generar certificado autofirmado

Crea certificados autofirmados para desarrollo y pruebas:

- Mismas opciones de Subject, algoritmo y SANs que el CSR
- **Días de validez** configurables (1–3650)
- **Advertencias visuales** sobre las limitaciones de certificados autofirmados
- **Nombres de archivo personalizables** en opciones avanzadas

---

### Generar certificado firmado por CA

Wizard unificado para generar certificados firmados por una CA local:

- **Flujo completo**: genera CSR → firma con CA seleccionada → certificado final
- **Selección de CA** local (Root o Intermediate)
- **Contraseña de la clave CA** solicitada en el momento de firma
- **Aplicación de plantillas** para preconfigurar Key Usage, EKU y validez
- **Modo rápido y avanzado** con secciones colapsables

---

### Convertir certificados

Convierte entre formatos de certificado:

| Conversión | Descripción |
|------------|-------------|
| PEM → DER | Formato texto a binario |
| DER → PEM | Formato binario a texto Base64 |

- **Detección automática** del formato de entrada
- **Validación** de formatos compatibles antes de ejecutar

---

### CA Manager (Autoridad de Certificación local)

Gestión completa de una PKI local para entornos de desarrollo:

#### Root CA
- Genera CA raíz autofirmada con **clave cifrada AES-256**
- Subject DN completo configurable
- Algoritmo y validez personalizables (por defecto 10 años)
- Archivos generados: certificado (`.crt`), clave privada (`.key`)

#### Intermediate CA
- Firmada por la Root CA seleccionada
- **Requiere contraseña** de la clave de la Root CA para firmar
- Cadena de confianza verificable

#### Firmar CSRs
- Emite certificados finales firmados por cualquier CA local
- Soporte para CSRs generados externamente

#### Persistencia
- Lista de CAs configuradas con detalles (nombre, tipo, rutas, fecha de creación, validez, serial)
- Opción de eliminar registros de CA

---

### PKCS#12 Manager (.p12 / .pfx)

Gestión completa de contenedores PKCS#12:

| Operación | Descripción |
|-----------|-------------|
| **Crear** | Empaqueta certificado + clave privada + cadena opcional en un `.p12` con contraseña |
| **Inspeccionar** | Muestra certificado, emisor, validez y metadatos sin extraer archivos |
| **Extraer** | Exporta componentes individuales: certificado, clave privada, cadena de certificados |

- **Confirmación de contraseña** al crear (doble input)
- **Opciones de extracción**: selección individual de componentes a exportar
- **Resultados en diálogo** con rutas de archivos generados

---

### PKCS#7 (.p7b / .p7c)

Operaciones con paquetes de certificados PKCS#7:

- **Crear desde archivos**: Selecciona múltiples certificados PEM/DER
- **Crear desde cadena**: Empaqueta una cadena completa de certificados
- **Inspeccionar**: Visualiza los certificados contenidos con detalles
- **Extraer**: Exporta los certificados individuales del paquete

---

### Gestión de Keystores (JKS / JCEKS / PKCS12)

Interfaz visual completa para keystores Java:

#### Abrir / Crear
- Abrir keystore existente con contraseña
- Crear nuevo keystore vacío (JKS, JCEKS o PKCS12)
- Almacenamiento seguro de contraseña en **`sessionStorage`** (se limpia al cerrar)

#### Gestión de aliases
| Acción | Descripción |
|--------|-------------|
| **Listar** | Tabla con alias, tipo de entrada, algoritmo, key size, días hasta expiración |
| **Ver detalles** | Subject, Issuer, serial, cadena de certificados |
| **Exportar** | Certificado individual a archivo PEM/DER |
| **Renombrar** | Cambiar el nombre del alias |
| **Eliminar** | Borrar alias con confirmación |

#### Importar
- **Certificados** como `TrustedCertEntry` (certificados de confianza)
- **PKCS#12** como `PrivateKeyEntry` (certificado + clave privada)
- **Certificado firmado** para completar un alias existente con keypair

#### Generar dentro del keystore
- **Keypair**: Genera un par de claves directamente en el keystore
- **CSR**: Genera un CSR desde un alias existente para firmado externo

#### Convertir
- **JKS ↔ PKCS12** — Conversión bidireccional entre formatos de keystore

---

### Operaciones en lote (Batch)

Procesa múltiples certificados de una carpeta de forma masiva:

| Operación | Entrada | Salida |
|-----------|---------|--------|
| **Convertir carpeta** | Carpeta con PEM o DER | Archivos convertidos al formato opuesto |
| **Extraer claves públicas** | Carpeta con certificados | Claves públicas en PEM |
| **Reporte de expiración** | Carpeta con certificados | CSV con nombre, subject, emisor, fechas, días restantes, estado |
| **Importar a truststore** | Carpeta con certificados | Keystore con todos como `TrustedCertEntry` |

- **Barra de progreso** con porcentaje y archivo actual
- **Cancelación** de jobs en progreso
- **Resumen** al finalizar: éxitos, errores, archivos omitidos

---

### Plantillas de certificados

Sistema de plantillas para estandarizar la generación:

- **5 plantillas predefinidas**: TLS Server, TLS Client, Root CA, Intermediate CA, CSR externo
- **CRUD completo** para plantillas personalizadas
- **Configuración por plantilla**: algoritmo, validez, Key Usage flags, EKU, Basic Constraints, hash de firma
- **Duplicar** plantillas existentes como base para nuevas
- **Importar/Exportar** plantillas en formato JSON para compartir entre equipos

---

### Dashboard

Panel principal con acceso rápido a todas las funcionalidades:

- **Accesos directos** a las operaciones más comunes
- **Archivos recientes** con tipo, ruta y fecha de último acceso
- **Navegación** directa a inspección desde archivos recientes

---

### Activity / Logs

Historial completo de todas las operaciones realizadas:

- **34 tipos de operación** rastreados con etiquetas en español
- **Estados**: Pendiente, En progreso, OK, Error
- **Vista detalle**: stdout, stderr, mensaje de error, timestamp
- **Limpiar** historial con confirmación

---

### Settings (Configuración)

Panel de configuración persistente:

- **Rutas**: OpenSSL, JDK root, carpeta de salida por defecto
- **Seguridad**: Activar/desactivar persistencia de contraseñas
- **Test**: Validar configuración de OpenSSL y JDK con un click
- **Persistencia**: Configuración guardada en `electron-store`

---

## Arquitectura

### Monorepo con npm workspaces

```
DigitalCertificateTool/
├── apps/
│   └── desktop/                     # Aplicación Electron
│       ├── src/
│       │   ├── main/               # Proceso principal (Node.js)
│       │   │   └── index.ts        # IPC handlers + window management
│       │   ├── preload/            # Bridge seguro (contextBridge)
│       │   │   └── index.ts        # electronAPI expuesto al renderer
│       │   └── renderer/           # Aplicación React (UI)
│       │       ├── components/     # Sidebar, Layout, componentes compartidos
│       │       ├── pages/          # 16 páginas de la aplicación
│       │       │   ├── Dashboard.tsx
│       │       │   ├── certificates/
│       │       │   │   ├── InspectCertificate.tsx
│       │       │   │   ├── ConvertCertificate.tsx
│       │       │   │   ├── GenerateCSR.tsx
│       │       │   │   ├── GenerateSelfSigned.tsx
│       │       │   │   ├── GenerateCertificate.tsx
│       │       │   │   ├── CAManager.tsx
│       │       │   │   ├── PKCS12Manager.tsx
│       │       │   │   └── Batch.tsx
│       │       │   ├── keystores/
│       │       │   │   ├── KeystoreOpen.tsx
│       │       │   │   └── KeystoreEntries.tsx
│       │       │   ├── Settings.tsx
│       │       │   ├── SetupWizard.tsx
│       │       │   ├── Templates.tsx
│       │       │   ├── ActivityLogs.tsx
│       │       │   └── Help.tsx
│       │       └── store/          # Estado global (Zustand)
│       │           ├── settingsStore.ts
│       │           └── logsStore.ts
│       └── package.json
├── packages/
│   ├── core/                       # Lógica de negocio (sin dependencia de Electron)
│   │   └── src/
│   │       ├── OpenSSLService.ts   # Wrapper completo de OpenSSL CLI
│   │       ├── KeystoreService.ts  # Gestión de keystores Java
│   │       ├── KeytoolService.ts   # Detección y validación de keytool
│   │       ├── KeytoolRunner.ts    # Ejecutor de comandos keytool
│   │       ├── LocalCAService.ts   # Gestión de CA local (Root + Intermediate)
│   │       ├── PKCS12Service.ts    # Operaciones PKCS#12
│   │       ├── PKCS7Service.ts     # Operaciones PKCS#7
│   │       ├── BatchService.ts     # Operaciones en lote
│   │       ├── CommandRunner.ts    # Ejecutor seguro de comandos CLI
│   │       ├── FileFormatDetector.ts # Detección de formato por contenido
│   │       ├── CertificateParser.ts  # Parser de salida de OpenSSL
│   │       └── ValidationService.ts  # Validación de opciones de certificados
│   └── shared/                     # Tipos y utilidades compartidas
│       └── src/
│           ├── types/              # Interfaces TypeScript
│           │   ├── certificate.ts  # CertificateInfo, CertificateFormat, etc.
│           │   ├── ca.ts           # LocalCAInfo, GenerateRootCAOptions, etc.
│           │   ├── operations.ts   # OperationResult, ErrorCodes, etc.
│           │   ├── keystore.ts     # KeystoreEntry, KeystoreType, etc.
│           │   └── templates.ts    # CertificateTemplate, KeyUsageFlags, etc.
│           └── helpers/            # Utilidades (sanitize, paths)
├── DECISIONS.md                    # Decisiones de arquitectura (ADRs)
├── SECURITY.md                     # Modelo de amenazas y mitigaciones
└── README.md
```

### Stack tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Runtime** | Node.js 20 LTS | Entorno de ejecución |
| **Desktop** | Electron 40 | Contenedor de aplicación nativa |
| **Frontend** | React 18 + TypeScript 5.3 | Interfaz de usuario |
| **Build** | Vite 7 | Bundler y dev server con hot reload |
| **UI Kit** | Material UI (MUI) 5 | Componentes visuales |
| **Estado** | Zustand 4 | Gestión de estado global |
| **Persistencia** | electron-store 8 | Configuración local cifrada |
| **Routing** | React Router 6 | Navegación SPA |
| **Testing** | Vitest | Tests unitarios del core |
| **Packaging** | electron-builder 26 | Generación de instaladores |

### Comunicación entre procesos

```
┌─────────────┐    contextBridge     ┌─────────────┐    IPC handlers    ┌─────────────┐
│  Renderer    │ ◄──────────────────► │  Preload     │ ◄────────────────► │   Main       │
│  (React)     │    electronAPI       │  (Bridge)    │   ipcMain.handle  │  (Node.js)   │
│              │                      │              │                    │              │
│  MUI + React │                      │  Expone 50+  │                    │  OpenSSL,    │
│  Router +    │                      │  métodos IPC  │                    │  keytool,    │
│  Zustand     │                      │  tipados      │                    │  file I/O    │
└─────────────┘                      └─────────────┘                    └─────────────┘
```

---

## Seguridad

La aplicación implementa un modelo de seguridad en profundidad. Ver [SECURITY.md](./SECURITY.md) para el análisis completo.

### Resumen de medidas

| Área | Medida |
|------|--------|
| **Ejecución de comandos** | `spawn()` con arrays de argumentos (nunca `exec()` con strings) |
| **Contraseñas OpenSSL** | Pasadas vía variables de entorno (`env:VAR_NAME`), nunca en CLI args |
| **Contraseñas keytool** | Pasadas vía `-storepass`/`-keypass` con `runDirect` (sin stdin interactivo) |
| **Almacenamiento temporal** | `sessionStorage` para datos sensibles de sesión (limpiado al cerrar) |
| **Electron** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |
| **Logs** | Sanitización de contraseñas y claves privadas en todos los registros |
| **Archivos temporales** | Creados en directorio dedicado, eliminados inmediatamente tras uso |
| **Persistencia** | Contraseñas NO se guardan por defecto; opcionalmente cifrado con electron-store |

---

## Scripts disponibles

| Comando | Ubicación | Descripción |
|---------|-----------|-------------|
| `npm install` | Raíz | Instalar todas las dependencias del monorepo |
| `npm run build -w packages/shared` | Raíz | Compilar tipos compartidos |
| `npm run build -w packages/core` | Raíz | Compilar lógica de negocio |
| `npm run electron:dev` | `apps/desktop` | Desarrollo con hot reload |
| `npm run electron:build` | `apps/desktop` | Build de producción + instaladores |
| `npm run build:main` | `apps/desktop` | Solo compilar proceso principal |
| `npm run build:renderer` | `apps/desktop` | Solo compilar frontend React |
| `npm run test` | Raíz | Ejecutar tests del core |
| `npm run lint` | Raíz | Análisis estático de código |
| `npm run format` | Raíz | Formatear código con Prettier |

---

## Documentación adicional

- **[DECISIONS.md](./DECISIONS.md)** — Registro de decisiones de arquitectura (ADRs)
- **[SECURITY.md](./SECURITY.md)** — Modelo de amenazas y mitigaciones implementadas

---

## Licencia

Uso interno / Privado

---

<p align="center">
  <strong>Certificate Manager Tool</strong> — Gestión profesional de certificados digitales, 100% offline.<br>
  No realiza conexiones de red ni envía telemetría.
</p>
