# Certificate Manager Tool — Manual de Usuario

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos previos](#2-requisitos-previos)
3. [Primer inicio: Asistente de configuración](#3-primer-inicio-asistente-de-configuración)
4. [Dashboard (Pantalla principal)](#4-dashboard-pantalla-principal)
5. [Certificates — Generar certificados](#5-certificates--generar-certificados)
6. [Certificates — Inspeccionar certificado / CSR](#6-certificates--inspeccionar-certificado--csr)
7. [Certificates — Convertir / Exportar](#7-certificates--convertir--exportar)
8. [Certificates — PKCS#12 Manager](#8-certificates--pkcs12-manager)
9. [Certificates — PKCS#7 Manager](#9-certificates--pkcs7-manager)
10. [CA Manager (Autoridades de Certificación)](#10-ca-manager-autoridades-de-certificación)
11. [Plantillas de certificados](#11-plantillas-de-certificados)
12. [Keystores — Abrir / Crear](#12-keystores--abrir--crear)
13. [Keystores — Entries (Entradas)](#13-keystores--entries-entradas)
14. [Operaciones Batch (por lotes)](#14-operaciones-batch-por-lotes)
15. [Configuración](#15-configuración)
16. [Activity / Logs](#16-activity--logs)
17. [Ayuda](#17-ayuda)
18. [Preguntas frecuentes](#18-preguntas-frecuentes)
19. [Glosario de términos](#19-glosario-de-términos)

---

## 1. Introducción

**Certificate Manager Tool** es una aplicación de escritorio para gestionar certificados digitales de forma **segura, offline y portable**.

### Características principales

- **100% Offline**: no realiza conexiones de red ni envía telemetría.
- **Portable**: puede ejecutarse directamente desde un USB o carpeta sin instalación. Al mover el ejecutable a otro PC, la aplicación arranca como nueva sin datos previos.
- **Segura**: las contraseñas permanecen en memoria solo el tiempo necesario y no se almacenan por defecto. Los archivos temporales se eliminan tras cada operación.
- **Completa**: cubre todo el ciclo de vida de certificados: generación de CSR, certificados autofirmados, emisión por CA local, inspección, conversión, empaquetado PKCS#12/PKCS#7, gestión de keystores Java y operaciones masivas.

### Navegación

La aplicación presenta un **menú lateral izquierdo** con las siguientes secciones principales:

| Sección | Descripción |
|---------|-------------|
| **Dashboard** | Accesos rápidos y archivos recientes |
| **Certificates** | Generar, inspeccionar, convertir, PKCS#12, PKCS#7 |
| **Keystores** | Abrir/crear keystores Java, gestionar entradas |
| **CA Manager** | Gestionar CAs locales (Root e Intermediate) |
| **Templates** | Plantillas de certificados predefinidas y personalizadas |
| **Batch** | Operaciones masivas sobre múltiples archivos |
| **Settings** | Configuración de rutas y preferencias |
| **Activity/Logs** | Historial de todas las operaciones realizadas |
| **Help** | Ayuda integrada en la aplicación |

---

## 2. Requisitos previos

### OpenSSL (obligatorio)

OpenSSL es el motor criptográfico que utiliza la herramienta para todas las operaciones con certificados.

- **Windows**: descárgalo desde [slproweb.com](https://slproweb.com/products/Win32OpenSSL.html) o instálalo con `winget install OpenSSL`.
- Ruta típica: `C:\Program Files\OpenSSL-Win64\bin\openssl.exe`

### JDK (opcional)

Necesario únicamente para operaciones con keystores Java (JKS, JCEKS). Proporciona la herramienta `keytool`.

- Ruta típica: `C:\Program Files\Java\jdk-17`
- Debe apuntar a la **carpeta raíz** del JDK (la que contiene la subcarpeta `bin`).

---

## 3. Primer inicio: Asistente de configuración

Al ejecutar la aplicación por primera vez se muestra un **asistente de configuración** de 6 pasos:

### Paso 1 — Bienvenida

Pantalla introductoria que explica que la herramienta funciona 100% offline.

- Pulsa **Empezar** para continuar.

### Paso 2 — Configurar OpenSSL

La aplicación intentará **detectar automáticamente** OpenSSL en el sistema.

- Si lo encuentra, mostrará un mensaje verde con la versión detectada.
- Si no lo encuentra:
  - Pulsa **Seleccionar** para localizar manualmente el ejecutable `openssl.exe`.
  - Pulsa **Instalar Online** (si tienes `winget` disponible) para instalarlo automáticamente.
- Pulsa **Probar** para verificar que la ruta es correcta. Aparecerá la versión de OpenSSL si todo va bien.

### Paso 3 — Configurar JDK

Selecciona la carpeta raíz del JDK para habilitar operaciones con keystores.

- Pulsa **Seleccionar** y navega hasta la carpeta del JDK.
- Pulsa **Probar** para verificar que `keytool` funciona.
- **Este paso es opcional**: puedes saltarlo si no necesitas gestionar keystores Java.

### Paso 4 — Carpeta de salida por defecto

Elige dónde se guardarán los archivos generados (certificados, claves, CSRs, etc.).

- Ejemplo: `C:\Users\tu_usuario\Documents\Certificates`
- Se puede cambiar individualmente en cada operación.

### Paso 5 — Preferencias de seguridad

- **Guardar contraseñas**: por defecto está **desactivado** (recomendado). Si lo activas, las contraseñas se almacenarán localmente cifradas.

### Paso 6 — Completado

Pulsa **Finalizar** para guardar la configuración y acceder a la aplicación.

---

## 4. Dashboard (Pantalla principal)

El Dashboard es la primera pantalla tras la configuración inicial. Presenta:

### Acciones rápidas

Tres tarjetas con las operaciones más comunes:

| Acción | Descripción |
|--------|-------------|
| **Inspeccionar certificado** | Abre la pantalla de inspección para analizar un certificado |
| **Convertir certificado** | Abre el convertidor PEM ↔ DER |
| **Generar CSR** | Abre el asistente de generación de certificados |

Haz clic en cualquier tarjeta para navegar a la función correspondiente.

### Archivos recientes

Lista los últimos 10 archivos inspeccionados, mostrando:

- **Nombre** del archivo
- **Fecha y hora** del último acceso
- **Tipo** de archivo (CER, PEM, PKCS#12, CSR, etc.)

Al hacer clic en un archivo reciente, se abre directamente en la pantalla de inspección.

> **Nota sobre portabilidad**: los archivos recientes se almacenan por PC/usuario. Si copias el `.exe` portable a otro ordenador, esta lista estará vacía.

---

## 5. Certificates — Generar certificados

**Ruta**: Certificates → Generate

Esta pantalla ofrece un **asistente paso a paso** para generar certificados con tres modos de operación.

### Paso 1 — Seleccionar modo

| Modo | Descripción | Uso típico |
|------|-------------|------------|
| **CSR para CA externa** | Genera una clave privada y un CSR (Certificate Signing Request) | Enviar a una CA pública (FNMT, DigiCert, Let's Encrypt, etc.) |
| **Autofirmado** | Genera un certificado firmado por sí mismo | Desarrollo local, pruebas, entornos aislados |
| **Emitido por mi CA** | Genera un certificado firmado por una CA local | Infraestructura PKI interna, entornos corporativos |

Cada modo sugiere automáticamente una **plantilla** con valores predeterminados adecuados.

### Paso 2 — Configuración del certificado

#### Datos del sujeto (Subject)

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Common Name (CN)** | Nombre principal del certificado (obligatorio) | `www.miempresa.com` |
| **Organization (O)** | Nombre de la organización | `Mi Empresa S.L.` |
| **Organizational Unit (OU)** | Departamento | `IT` |
| **Locality (L)** | Ciudad | `Madrid` |
| **State (ST)** | Provincia/Estado | `Madrid` |
| **Country (C)** | Código de país (2 letras) | `ES` |
| **Email** | Correo electrónico | `admin@miempresa.com` |
| **Serial Number** | Número de serie personalizado | `001` |

#### Subject Alternative Names (SAN)

Los SAN permiten que un certificado sea válido para múltiples nombres, IPs o direcciones.

Para añadir un SAN:

1. Selecciona el **tipo** (DNS, IP, Email, URI).
2. Escribe el **valor**.
3. Pulsa **Añadir**.

La herramienta valida automáticamente cada entrada:

| Tipo | Formato válido | Ejemplo |
|------|---------------|---------|
| **DNS** | Hostname RFC 1123, soporta wildcard | `www.example.com`, `*.example.com` |
| **IP** | IPv4 o IPv6 | `192.168.1.1`, `::1` |
| **Email** | Dirección de correo | `admin@example.com` |
| **URI** | URL completa con protocolo | `https://example.com` |

> **Importante**: los navegadores modernos **requieren SAN** para certificados de servidor. El CN por sí solo ya no es suficiente.

#### Configuración técnica

| Parámetro | Descripción |
|-----------|-------------|
| **Algoritmo** | RSA-2048, RSA-4096, ECC-P256, ECC-P384 |
| **Hash de firma** | SHA-256 (recomendado), SHA-384, SHA-512 |
| **Días de validez** | Duración del certificado (ej: 365 para 1 año) |
| **Contraseña de la clave** | Protege la clave privada con contraseña (recomendado) |
| **Carpeta de salida** | Dónde se guardarán los archivos generados |

#### Opciones de CA (solo modo "Emitido por mi CA")

| Campo | Descripción |
|-------|-------------|
| **CA a usar** | Selecciona una de las CAs locales configuradas en el CA Manager |
| **Contraseña de la CA** | Contraseña de la clave privada de la CA seleccionada |

### Paso 3 — Opciones avanzadas

Expandiendo la sección avanzada se puede personalizar:

- **Es CA**: marca el certificado como Autoridad de Certificación.
- **pathLen constraint**: limita la profundidad de la cadena de CAs subordinadas (0 = no puede firmar otras CAs).
- **Key Usage**: flags individuales como `digitalSignature`, `keyEncipherment`, `keyCertSign`, etc.
- **Extended Key Usage (EKU)**: propósitos del certificado como `serverAuth`, `clientAuth`, `codeSigning`, etc.
- **OIDs personalizados**: añade extensiones con OIDs específicos (formato numérico, ej: `1.3.6.1.5.5.7.3.2`).

### Paso 4 — Generar

Revisa el resumen y pulsa **Generar**. Al completar se mostrará un diálogo con las rutas de los archivos creados:

- **Modo CSR**: clave privada (`.key`) + CSR (`.csr`) + archivo README
- **Modo Autofirmado**: clave privada (`.key`) + certificado (`.pem`)
- **Modo CA-issued**: clave privada (`.key`) + certificado (`.pem`) + cadena completa (`.chain.pem`)

---

## 6. Certificates — Inspeccionar certificado / CSR

**Ruta**: Certificates → Inspect

Permite analizar cualquier archivo de certificado o CSR para visualizar todos sus detalles.

### Archivos soportados

| Extensión | Tipo |
|-----------|------|
| `.cer`, `.crt`, `.pem` | Certificado PEM |
| `.der` | Certificado binario DER |
| `.p12`, `.pfx` | Contenedor PKCS#12 (requiere contraseña) |
| `.key` | Clave privada (se informa del tipo) |
| `.csr` | Solicitud de certificado (CSR) |

### Cómo usar

1. Pulsa **Seleccionar** para elegir el archivo o escribe la ruta manualmente.
2. Si el archivo es `.p12` o `.pfx`, aparecerá un campo para la **contraseña**.
3. Pulsa **Analizar**.

> La herramienta detecta automáticamente si un archivo `.pem` contiene un CSR en lugar de un certificado y ajusta la vista en consecuencia.

### Vista de certificado

Se muestra en tres pestañas:

#### Pestaña "Resumen"

Presenta toda la información estructurada:

- **Subject**: CN, O, OU, L, ST, C y DN completo.
- **Issuer**: los mismos campos del emisor.
- **Validity**: fechas de inicio y fin de validez.
- **Technical Details**: número de serie, algoritmo de firma, tamaño de clave, versión.
- **Basic Constraints**: si es CA o no.
- **Key Usage**: flags de uso de clave.
- **Extended Key Usage**: propósitos del certificado.
- **Subject Alternative Names**: listado de SANs.
- **Fingerprints**: huellas SHA-256 y SHA-1.

Todos los valores relevantes disponen de un botón **Copiar** al portapapeles.

#### Pestaña "Texto completo"

Muestra la salida completa de OpenSSL en formato texto plano (monoespaciado).

#### Pestaña "Acciones rápidas"

- **Copiar Subject**: copia el DN completo.
- **Copiar Fingerprint SHA-256**: copia la huella digital.
- **Extraer clave pública**: genera un archivo `.pem` con la clave pública del certificado.

### Vista de CSR

Cuando se carga un archivo `.csr`, se muestra una vista dedicada con fondo azul identificativo que incluye:

- **Subject**: todos los campos del DN.
- **Detalles técnicos**: algoritmo, tamaño de clave, si solicita ser CA.
- **Key Usage** y **Extended Key Usage** (si están presentes en las extensiones solicitadas).
- **Subject Alternative Names** solicitados.
- **Texto completo** de la solicitud.

---

## 7. Certificates — Convertir / Exportar

**Ruta**: Certificates → Convert / Export

Convierte certificados entre formatos PEM (texto Base64) y DER (binario) mediante un asistente de 3 pasos.

### Paso 1 — Seleccionar archivo

1. Pulsa **Seleccionar** para elegir el certificado.
2. El formato se **detecta automáticamente** (PEM o DER).
3. Si se detecta un formato no convertible (como PKCS#12), se muestra una advertencia.

### Paso 2 — Formato de salida

1. Selecciona el formato destino (**PEM** o **DER**).
2. Elige la ubicación del archivo de salida con **Seleccionar**.
3. Si el formato de entrada y salida son iguales, se muestra una advertencia indicando que la conversión no es necesaria.

### Paso 3 — Convertir

Revisa el resumen (archivo origen, formato detectado, archivo destino, formato salida) y pulsa **Convertir**.

Al completar, se ofrece:
- **Abrir carpeta**: abre el directorio donde se guardó el archivo.
- **Nueva conversión**: reinicia el asistente.

---

## 8. Certificates — PKCS#12 Manager

**Ruta**: Certificates → PKCS#12 Manager

Gestiona archivos `.p12` / `.pfx`, que son contenedores que agrupan un certificado + clave privada + cadena de certificados opcional, todo protegido con contraseña.

### Pestaña "Crear P12"

Empaqueta componentes individuales en un único archivo PKCS#12.

| Campo | Descripción | Obligatorio |
|-------|-------------|:-----------:|
| **Certificado** | Archivo `.pem`, `.crt` o `.cer` | Sí |
| **Clave privada** | Archivo `.pem` o `.key` | Sí |
| **Contraseña de la clave** | Si la clave privada está cifrada | Solo si aplica |
| **Cadena de certificados** | Archivo PEM con certificados intermedios/raíz | No |
| **Contraseña del P12** | Protege el archivo resultante | Sí |
| **Confirmar contraseña** | Debe coincidir | Sí |
| **Friendly Name / Alias** | Nombre descriptivo dentro del P12 | No |
| **Archivo de salida** | Ruta donde guardar el `.p12` | Sí |

### Pestaña "Abrir P12"

Inspecciona el contenido de un archivo PKCS#12 sin extraerlo.

1. Selecciona el archivo `.p12` o `.pfx`.
2. Introduce la **contraseña**.
3. Pulsa **Abrir**.

Se muestra una tabla con:
- Si contiene **certificado**: Sí/No
- Si contiene **clave privada**: Sí/No
- Si contiene **cadena**: Sí/No (y cuántos certificados)
- **Subject**, **Issuer**, **Válido desde/hasta** del certificado principal.

### Pestaña "Extraer desde P12"

Extrae componentes individuales desde un archivo PKCS#12.

| Campo | Descripción |
|-------|-------------|
| **Archivo PKCS#12** | El `.p12` o `.pfx` a desempaquetar |
| **Contraseña del P12** | Contraseña para abrirlo |
| **Carpeta de salida** | Dónde guardar los archivos extraídos |
| **Componentes a extraer** | Certificado / Clave privada / Cadena (switches) |
| **Formato del certificado** | PEM (texto) o DER (binario) |
| **Contraseña para la clave** | Opcionalmente cifra la clave privada extraída |

> **Advertencia de seguridad**: extraer la clave privada sin contraseña la dejará desprotegida. Guárdala en un lugar seguro.

---

## 9. Certificates — PKCS#7 Manager

**Ruta**: Certificates → PKCS#7 Manager

Gestiona archivos `.p7b` / `.p7c`, que son contenedores de múltiples certificados **sin clave privada**. Se usan típicamente para distribuir cadenas de confianza.

### Pestaña "Crear PKCS#7"

Dos modos de creación:

#### Desde certificados individuales

1. Pulsa **Añadir certificado** para agregar archivos `.cer`, `.crt`, `.pem` o `.der` uno por uno.
2. Repite hasta tener todos los certificados de la cadena.
3. Selecciona el **archivo de salida** (`.p7b`).
4. Pulsa **Crear PKCS#7**.

#### Desde archivo de cadena PEM

1. Selecciona un único archivo PEM que contenga múltiples certificados concatenados.
2. Selecciona el **archivo de salida** (`.p7b`).
3. Pulsa **Crear PKCS#7**.

### Pestaña "Inspeccionar"

1. Selecciona un archivo `.p7b` o `.p7c`.
2. Pulsa **Inspeccionar**.

Se muestra:
- **Número total** de certificados contenidos.
- Para cada certificado: **Subject**, **Issuer** y **Serial Number**.

### Pestaña "Extraer"

Extrae los certificados contenidos en un archivo PKCS#7.

| Campo | Descripción |
|-------|-------------|
| **Archivo PKCS#7** | El `.p7b` o `.p7c` de entrada |
| **Carpeta de salida** | Dónde guardar los certificados |
| **Formato de salida** | **Individual** (un archivo por certificado: `cert_1.pem`, `cert_2.pem`...) o **Cadena** (todos concatenados en `chain.pem`) |

---

## 10. CA Manager (Autoridades de Certificación)

**Ruta**: CA Manager

Permite crear y gestionar tus propias **Autoridades de Certificación (CA)** locales para emitir certificados internos.

### CAs configuradas

La parte superior muestra una tarjeta por cada CA registrada con:
- **Nombre** y **tipo** (Root / Intermediate)
- **Fecha de creación**
- **Ruta** al archivo del certificado
- Botones para **abrir la carpeta** o **eliminar el registro** (no borra los archivos, solo la referencia)

### Pestaña "Crear Root CA"

Una Root CA es el certificado raíz de confianza. Se firma a sí misma.

| Campo | Descripción | Obligatorio |
|-------|-------------|:-----------:|
| **Common Name (CN)** | Nombre de la CA (ej: `Mi Root CA`) | Sí |
| **Organización (O)** | Nombre de la organización | No |
| **País (C)** | Código de 2 letras | No |
| **Algoritmo** | RSA-4096 recomendado para CAs | Sí |
| **Días de validez** | Recomendado: 3650 (10 años) | Sí |
| **Contraseña de la clave** | Protege la clave privada (obligatoria para CAs) | Sí |
| **Confirmar contraseña** | Debe coincidir | Sí |
| **Carpeta de salida** | Dónde guardar los archivos | Sí |

> **Importante**: guarda la clave privada y su contraseña en un lugar extremadamente seguro. Si se pierden, no podrás emitir más certificados con esta CA.

### Pestaña "Crear Intermediate CA"

Una Intermediate CA se firma con la Root CA. Se usa para emitir certificados finales, protegiendo así la Root CA.

Esta pestaña solo está habilitada si ya existe al menos una Root CA configurada.

| Campo adicional | Descripción |
|-----------------|-------------|
| **Root CA para firmar** | Selecciona cuál Root CA firmará esta Intermediate |
| **Contraseña de la Root CA** | Necesaria para firmar |
| **pathLen constraint** | `0` = no puede firmar otras CAs subordinadas |

---

## 11. Plantillas de certificados

**Ruta**: Templates

Gestiona plantillas que preconfiguran los valores del formulario de generación de certificados.

### Plantillas predefinidas

La herramienta incluye 5 plantillas integradas (no se pueden editar ni eliminar, pero sí duplicar):

| Plantilla | Descripción |
|-----------|-------------|
| **TLS Servidor** | Para servidores web (`serverAuth`) |
| **TLS Cliente** | Para autenticación de cliente (`clientAuth`) |
| **Root CA** | Para crear CAs raíz |
| **Intermediate CA** | Para crear CAs intermedias |
| **CSR para CA externa** | Para solicitudes a CAs públicas |

### Plantillas personalizadas

Para crear una plantilla personalizada:

1. Pulsa **Nueva plantilla**.
2. Completa los campos:
   - **Nombre** y **Descripción**
   - **Categoría**: Servidor, Cliente, CA, CSR o Personalizada
   - **Algoritmo**, **Días de validez**, **Hash de firma**
   - **Es CA**: si es un certificado de autoridad
   - **SAN requerido**: si obliga a añadir SANs
   - **Extended Key Usage**: selecciona los propósitos aplicables
   - **Key Usage avanzado**: activa flags individuales
3. Pulsa **Guardar**.

### Acciones sobre plantillas

| Acción | Descripción |
|--------|-------------|
| **Duplicar** | Crea una copia editable (útil para partir de una predefinida) |
| **Exportar JSON** | Descarga la plantilla como archivo `.json` |
| **Importar** | Carga una plantilla desde un archivo `.json` |
| **Editar** | Modifica una plantilla personalizada |
| **Eliminar** | Borra una plantilla personalizada |

---

## 12. Keystores — Abrir / Crear

**Ruta**: Keystores → Open / Create

> **Requisito**: necesitas tener configurado el JDK en la sección de Configuración.

### Abrir un keystore existente

1. Selecciona el archivo keystore (`.jks`, `.jceks`, `.p12`, `.pfx`, `.keystore`).
2. Introduce la **contraseña** del keystore.
3. Pulsa **Abrir**.
4. Si es correcto, navega automáticamente a la pantalla de **Entries** mostrando el contenido.

### Crear un keystore nuevo

1. Pulsa **Crear nuevo keystore**.
2. Selecciona el **tipo**: JKS, JCEKS o PKCS12.
3. Elige la **ubicación** y nombre del archivo.
4. Define una **contraseña** (y confírmala).
5. Pulsa **Crear**.

---

## 13. Keystores — Entries (Entradas)

**Ruta**: Keystores → Entries

Una vez abierto un keystore, esta pantalla muestra todas sus entradas (aliases) y permite gestionarlas.

### Acciones disponibles por entrada

| Acción | Descripción |
|--------|-------------|
| **Generar par de claves** | Crea un nuevo keypair (clave privada + certificado autofirmado) dentro del keystore |
| **Generar CSR** | Genera una solicitud de certificado para un alias existente |
| **Importar certificado** | Importa un certificado de confianza (trusted cert) al keystore |
| **Importar PKCS#12** | Importa un `.p12` completo (clave + cert) al keystore |
| **Importar certificado firmado** | Importa la respuesta de una CA para un CSR previamente generado |
| **Exportar certificado** | Exporta el certificado de un alias a un archivo |
| **Eliminar alias** | Elimina una entrada del keystore |
| **Renombrar alias** | Cambia el nombre de un alias |
| **Convertir keystore** | Convierte entre formatos JKS ↔ PKCS12 |

---

## 14. Operaciones Batch (por lotes)

**Ruta**: Batch

Procesa múltiples archivos de certificados de forma masiva. Contiene 4 pestañas:

### Pestaña "Convertir"

Convierte todos los certificados de una carpeta al formato seleccionado.

| Campo | Descripción |
|-------|-------------|
| **Carpeta entrada** | Directorio con los certificados originales |
| **Carpeta salida** | Directorio donde guardar los convertidos |
| **Extensiones** | Tipos de archivo a procesar (separados por coma): `cer,crt,pem,der` |
| **Formato salida** | PEM o DER |
| **Incluir subcarpetas** | Procesa recursivamente los subdirectorios |

### Pestaña "Extraer públicas"

Extrae la clave pública de cada certificado de una carpeta.

| Campo | Descripción |
|-------|-------------|
| **Carpeta entrada** | Directorio con los certificados |
| **Carpeta salida** | Directorio para las claves públicas extraídas |
| **Extensiones** | `cer,crt,pem` |
| **Incluir subcarpetas** | Procesamiento recursivo |

### Pestaña "Reporte de expiraciones"

Genera un informe completo de las fechas de expiración de todos los certificados encontrados.

| Campo | Descripción |
|-------|-------------|
| **Carpeta a escanear** | Directorio raíz |
| **Días de advertencia** | Cuántos días antes de expirar se marca como "Por expirar" (defecto: 30) |
| **Incluir subcarpetas** | Procesamiento recursivo |
| **Extensiones** | `cer,crt,pem,der,p12,pfx` |

El reporte muestra una tabla con:
- **Archivo**, **Subject**, **Válido hasta**, **Días restantes**
- **Estado**: Válido (verde), Por expirar (amarillo), Expirado (rojo)
- Resumen con contadores totales

Botón **Exportar CSV**: descarga el reporte como archivo CSV para abrirlo en Excel u otra herramienta de hojas de cálculo.

### Pestaña "Importar a truststore"

Importa masivamente certificados de una carpeta a un keystore/truststore Java.

| Campo | Descripción |
|-------|-------------|
| **Keystore destino** | Archivo `.jks`, `.jceks`, `.p12` o `.pfx` existente |
| **Contraseña keystore** | Contraseña del keystore |
| **Carpeta certificados** | Directorio con los certificados a importar |
| **Prefijo alias** | Prefijo para los nombres de alias generados (ej: `cert_`) |
| **Subcarpetas** | Si se procesan recursivamente |

Al completar cualquier operación batch se muestra un resumen:
- **Procesados** / **Éxito** / **Error**
- **Tiempo** de ejecución

---

## 15. Configuración

**Ruta**: Settings

Permite modificar en cualquier momento los mismos parámetros del asistente inicial.

### Secciones

#### OpenSSL

- **Ruta al ejecutable**: campo de texto + botón Seleccionar.
- **Probar**: verifica que la ruta es correcta y muestra la versión detectada.

#### JDK (para keytool)

- **Carpeta raíz del JDK**: campo de texto + botón Seleccionar.
- **Probar**: verifica que `keytool` funciona correctamente.

#### Carpeta de salida

- **Directorio por defecto**: la carpeta predeterminada para todos los archivos generados. Se puede cambiar en cada operación individualmente.

#### Seguridad

- **Guardar contraseñas**: switch para activar/desactivar el almacenamiento local cifrado de contraseñas. **Recomendación: mantener desactivado.**

Pulsa **Guardar cambios** para aplicar. Aparecerá una confirmación temporal en verde.

---

## 16. Activity / Logs

**Ruta**: Activity / Logs

Muestra un historial cronológico de todas las operaciones realizadas en la aplicación.

### Tabla de operaciones

Cada fila muestra:

| Columna | Descripción |
|---------|-------------|
| **Fecha/Hora** | Cuándo se realizó |
| **Operación** | Tipo de operación (ej: Generar CSR, Inspeccionar, Convertir...) |
| **Entrada** | Nombre del archivo de entrada |
| **Salida** | Nombre del archivo de salida (si aplica) |
| **Estado** | OK (verde), Error (rojo), Pendiente, En progreso |
| **Detalles** | Botón para ver información técnica |

### Diálogo de detalles

Al pulsar el icono de **Detalles** se muestra:
- Fecha y hora exacta
- Tipo de operación
- Estado
- Mensaje de error (si hubo fallo)
- Salida de OpenSSL (stdout)
- Errores de OpenSSL (stderr)

### Acciones

| Botón | Descripción |
|-------|-------------|
| **Actualizar** | Recarga la lista de logs |
| **Limpiar** | Borra todo el historial (pide confirmación) |

---

## 17. Ayuda

**Ruta**: Help

Sección de ayuda integrada con información sobre:

- **Inspeccionar certificados**: formatos soportados y datos mostrados.
- **Convertir certificados**: explicación de formatos PEM y DER.
- **Generar CSR**: el proceso paso a paso para solicitar certificados a una CA.
- **Certificados autofirmados**: cuándo usarlos y sus limitaciones.
- **Seguridad**: medidas implementadas en la aplicación.
- **Requisitos**: OpenSSL (obligatorio) y JDK (opcional).

---

## 18. Preguntas frecuentes

### ¿La aplicación necesita conexión a internet?

**No.** Certificate Manager Tool funciona 100% offline. La única excepción es si utilizas el botón "Instalar Online" durante la configuración de OpenSSL, que usa `winget` para descargarlo.

### ¿Si comparto el .exe portable a otro PC, verá mis datos?

**No.** La configuración se almacena en `%APPDATA%` del usuario de Windows, que es específica de cada PC y usuario. Al ejecutar el portable en otro ordenador:
- Se mostrará el Asistente de Configuración.
- No habrá archivos recientes, plantillas personalizadas ni CAs registradas.

### ¿Dónde se guardan mis datos de configuración?

En Windows: `%APPDATA%\certificate-manager-tool\config.json`

Este archivo contiene:
- Rutas de OpenSSL y JDK
- Carpeta de salida predeterminada
- Archivos recientes
- Plantillas personalizadas
- CAs locales registradas
- Preferencias de seguridad

### ¿Se almacenan las claves privadas o contraseñas?

- **Claves privadas**: la aplicación solo las genera y las guarda en la carpeta que tú elijas. No se copian a ningún otro lugar.
- **Contraseñas**: por defecto NO se almacenan. Solo permanecen en memoria durante la operación. Puedes activar el almacenamiento cifrado en Configuración, pero no se recomienda.

### ¿Qué diferencia hay entre PEM y DER?

| Formato | Tipo | Contenido |
|---------|------|-----------|
| **PEM** | Texto (Base64) | Comienza con `-----BEGIN CERTIFICATE-----` |
| **DER** | Binario | No legible en un editor de texto |

Ambos contienen exactamente la misma información. PEM es más portable y fácil de trabajar con editores de texto.

### ¿Qué es un CSR y cuándo lo necesito?

Un **CSR (Certificate Signing Request)** es una solicitud que envías a una Autoridad de Certificación (CA) para que emita un certificado firmado. Lo necesitas cuando:

- Quieres un certificado reconocido por navegadores y sistemas operativos.
- Tu empresa usa una CA corporativa interna.
- Necesitas un certificado para un servidor web público.

### ¿Cuándo usar un certificado autofirmado?

Los certificados autofirmados son apropiados para:
- Desarrollo local (`localhost`)
- Entornos de pruebas
- Comunicaciones internas donde controlas ambos extremos

**No los uses en producción** ya que los navegadores mostrarán advertencias de seguridad.

### ¿Para qué sirve el CA Manager?

El CA Manager te permite crear tu propia infraestructura PKI:

1. Creas una **Root CA** (certificado raíz de confianza).
2. Opcionalmente creas una **Intermediate CA** firmada por la Root.
3. Emites certificados para tus servicios usando esas CAs.

Es útil en entornos corporativos o de laboratorio donde necesitas múltiples certificados que confíen entre sí.

---

## 19. Glosario de términos

| Término | Definición |
|---------|------------|
| **CA (Certificate Authority)** | Entidad que emite y firma certificados digitales |
| **CN (Common Name)** | Campo principal del sujeto de un certificado, típicamente el nombre de dominio |
| **CSR (Certificate Signing Request)** | Solicitud enviada a una CA para obtener un certificado firmado |
| **DER** | Formato binario para certificados |
| **DN (Distinguished Name)** | Nombre completo del sujeto o emisor (ej: `CN=example.com, O=Corp, C=ES`) |
| **EKU (Extended Key Usage)** | Extensión que define para qué se puede usar un certificado |
| **Fingerprint** | Huella digital única de un certificado (hash SHA-256 o SHA-1) |
| **Intermediate CA** | CA subordinada firmada por una Root CA, usada para emitir certificados finales |
| **JKS** | Java KeyStore, formato de almacén de claves de Java |
| **Key Usage** | Extensión que define las operaciones criptográficas permitidas |
| **Keystore** | Almacén de claves y certificados (JKS, JCEKS, PKCS#12) |
| **OpenSSL** | Herramienta de código abierto para operaciones criptográficas |
| **PEM** | Formato de texto Base64 para certificados, delimitado por headers BEGIN/END |
| **PKCS#7 (.p7b)** | Formato contenedor de múltiples certificados sin clave privada |
| **PKCS#12 (.p12/.pfx)** | Formato contenedor de certificado + clave privada + cadena, protegido con contraseña |
| **Root CA** | Certificado raíz de confianza que se firma a sí mismo |
| **SAN (Subject Alternative Name)** | Extensión que permite que un certificado sea válido para múltiples nombres/IPs |
| **Self-Signed** | Certificado firmado por su propia clave privada, sin CA externa |
| **Truststore** | Keystore que contiene solo certificados de confianza (sin claves privadas) |

---

*Certificate Manager Tool v1.0.0 — Manual de Usuario*
