# Certificate Manager Tool — User Manual

## Table of Contents

1. [Introduction](#1-introduction)
2. [Prerequisites](#2-prerequisites)
3. [First launch: Setup Wizard](#3-first-launch-setup-wizard)
4. [Dashboard (Main screen)](#4-dashboard-main-screen)
5. [Certificates — Generate certificates](#5-certificates--generate-certificates)
6. [Certificates — Inspect certificate / CSR](#6-certificates--inspect-certificate--csr)
7. [Certificates — Convert / Export](#7-certificates--convert--export)
8. [Certificates — PKCS#12 Manager](#8-certificates--pkcs12-manager)
9. [Certificates — PKCS#7 Manager](#9-certificates--pkcs7-manager)
10. [CA Manager (Certificate Authorities)](#10-ca-manager-certificate-authorities)
11. [Certificate templates](#11-certificate-templates)
12. [Keystores — Open / Create](#12-keystores--open--create)
13. [Keystores — Entries](#13-keystores--entries)
14. [Batch operations](#14-batch-operations)
15. [Settings](#15-settings)
16. [Activity / Logs](#16-activity--logs)
17. [Help](#17-help)
18. [Frequently Asked Questions](#18-frequently-asked-questions)
19. [Glossary](#19-glossary)

---

## 1. Introduction

**Certificate Manager Tool** is a desktop application to manage digital certificates in a **secure, offline, and portable** way.

### Main features

- **100% Offline**: no network calls and no telemetry.
- **Portable**: can run directly from a USB drive or folder without installation. If you move the executable to another PC, the app starts as a fresh instance with no previous data.
- **Secure**: passwords stay in memory only as long as needed and are not stored by default. Temporary files are removed after each operation.
- **Comprehensive**: covers the full certificate lifecycle: CSR generation, self-signed certificates, local CA issuance, inspection, conversion, PKCS#12/PKCS#7 packaging, Java keystore management, and batch operations.

### Navigation

The app has a **left sidebar menu** with these main sections:

| Section | Description |
|---------|-------------|
| **Dashboard** | Quick actions and recent files |
| **Certificates** | Generate, inspect, convert, PKCS#12, PKCS#7 |
| **Keystores** | Open/create Java keystores, manage entries |
| **CA Manager** | Manage local CAs (Root and Intermediate) |
| **Templates** | Built-in and custom certificate templates |
| **Batch** | Bulk operations for multiple files |
| **Settings** | Path and preference configuration |
| **Activity/Logs** | History of performed operations |
| **Help** | In-app help documentation |

---

## 2. Prerequisites

### OpenSSL (required)

OpenSSL is the cryptographic engine used by the tool for all certificate-related operations.

- **Windows**: download from [slproweb.com](https://slproweb.com/products/Win32OpenSSL.html) or install with `winget install OpenSSL`.
- Typical path: `C:\Program Files\OpenSSL-Win64\bin\openssl.exe`

### JDK (optional)

Required only for Java keystore operations (JKS, JCEKS). It provides `keytool`.

- Typical path: `C:\Program Files\Java\jdk-17`
- Must point to the **JDK root folder** (the one containing the `bin` subfolder).

---

## 3. First launch: Setup Wizard

When you run the app for the first time, a **6-step setup wizard** is shown.

### Step 1 — Welcome

Intro screen explaining that the tool works 100% offline.

- Click **Start** to continue.

### Step 2 — Configure OpenSSL

The app will try to **auto-detect** OpenSSL on your system.

- If found, it shows a green message with the detected version.
- If not found:
  - Click **Select** to manually locate `openssl.exe`.
  - Click **Install Online** (if `winget` is available) to install automatically.
- Click **Test** to validate the path. If successful, the OpenSSL version is displayed.

### Step 3 — Configure JDK

Select the JDK root folder to enable Java keystore operations.

- Click **Select** and choose the JDK folder.
- Click **Test** to verify that `keytool` works.
- **This step is optional** if you do not need Java keystores.

### Step 4 — Default output folder

Choose where generated files will be saved (certificates, keys, CSRs, etc.).

- Example: `C:\Users\your_user\Documents\Certificates`
- Can be changed per operation.

### Step 5 — Security preferences

- **Save passwords**: disabled by default (recommended). If enabled, passwords are stored locally in encrypted form.

### Step 6 — Completed

Click **Finish** to save settings and open the application.

---

## 4. Dashboard (Main screen)

The Dashboard is the first screen after initial setup.

### Quick actions

Three cards with common operations:

| Action | Description |
|--------|-------------|
| **Inspect certificate** | Opens inspection screen to analyze a certificate |
| **Convert certificate** | Opens PEM ↔ DER converter |
| **Generate CSR** | Opens certificate generation wizard |

Click any card to navigate directly to that feature.

### Recent files

Shows the last 10 inspected files with:

- File **name**
- Last access **date/time**
- File **type** (CER, PEM, PKCS#12, CSR, etc.)

Clicking a recent file opens it directly in the inspection screen.

> **Portability note**: recent files are stored per PC/user. If you copy the portable `.exe` to another machine, this list will be empty.

---

## 5. Certificates — Generate certificates

**Path**: Certificates → Generate

This screen provides a **step-by-step wizard** to generate certificates with three operation modes.

### Step 1 — Select mode

| Mode | Description | Typical use |
|------|-------------|-------------|
| **CSR for external CA** | Generates a private key and CSR (Certificate Signing Request) | Send to public CA (FNMT, DigiCert, Let's Encrypt, etc.) |
| **Self-signed** | Generates a certificate signed by itself | Local development, testing, isolated environments |
| **Issued by my CA** | Generates a certificate signed by a local CA | Internal PKI, enterprise environments |

Each mode automatically suggests a suitable **template** with default values.

### Step 2 — Certificate configuration

#### Subject data

| Field | Description | Example |
|-------|-------------|---------|
| **Common Name (CN)** | Main certificate name (required) | `www.mycompany.com` |
| **Organization (O)** | Organization name | `My Company Ltd.` |
| **Organizational Unit (OU)** | Department | `IT` |
| **Locality (L)** | City | `Madrid` |
| **State (ST)** | State/Province | `Madrid` |
| **Country (C)** | 2-letter country code | `ES` |
| **Email** | Contact email | `admin@mycompany.com` |
| **Serial Number** | Custom serial value | `001` |

#### Subject Alternative Names (SAN)

SAN allows a certificate to be valid for multiple names, IPs, or addresses.

To add a SAN:

1. Select **type** (DNS, IP, Email, URI).
2. Enter **value**.
3. Click **Add**.

The tool validates entries automatically:

| Type | Valid format | Example |
|------|--------------|---------|
| **DNS** | RFC 1123 hostname, wildcard supported | `www.example.com`, `*.example.com` |
| **IP** | IPv4 or IPv6 | `192.168.1.1`, `::1` |
| **Email** | Email address | `admin@example.com` |
| **URI** | Full URL with protocol | `https://example.com` |

> **Important**: modern browsers **require SAN** for server certificates. CN alone is no longer enough.

#### Technical settings

| Parameter | Description |
|-----------|-------------|
| **Algorithm** | RSA-2048, RSA-4096, ECC-P256, ECC-P384 |
| **Signature hash** | SHA-256 (recommended), SHA-384, SHA-512 |
| **Validity days** | Certificate duration (e.g., 365 = 1 year) |
| **Key password** | Protects private key with a password (recommended) |
| **Output folder** | Where generated files are saved |

#### CA options (only in "Issued by my CA" mode)

| Field | Description |
|-------|-------------|
| **CA to use** | Select one local CA configured in CA Manager |
| **CA password** | Password for selected CA private key |

### Step 3 — Advanced options

When expanded, advanced options allow customizing:

- **Is CA**: marks certificate as Certificate Authority.
- **pathLen constraint**: limits subordinate CA chain depth (0 = cannot sign other CAs).
- **Key Usage**: individual flags like `digitalSignature`, `keyEncipherment`, `keyCertSign`, etc.
- **Extended Key Usage (EKU)**: certificate purposes such as `serverAuth`, `clientAuth`, `codeSigning`, etc.
- **Custom OIDs**: add extension OIDs (numeric format, e.g., `1.3.6.1.5.5.7.3.2`).

### Step 4 — Generate

Review summary and click **Generate**. After completion, a dialog shows paths for created files:

- **CSR mode**: private key (`.key`) + CSR (`.csr`) + README file
- **Self-signed mode**: private key (`.key`) + certificate (`.pem`)
- **CA-issued mode**: private key (`.key`) + certificate (`.pem`) + full chain (`.chain.pem`)

---

## 6. Certificates — Inspect certificate / CSR

**Path**: Certificates → Inspect

Analyze any certificate or CSR file and view complete details.

### Supported files

| Extension | Type |
|-----------|------|
| `.cer`, `.crt`, `.pem` | PEM certificate |
| `.der` | DER binary certificate |
| `.p12`, `.pfx` | PKCS#12 container (password required) |
| `.key` | Private key (type is identified) |
| `.csr` | Certificate Signing Request |

### How to use

1. Click **Select** to choose file, or type path manually.
2. For `.p12` / `.pfx`, a **password** field appears.
3. Click **Analyze**.

> The tool automatically detects if a `.pem` file contains a CSR instead of a certificate and switches to the appropriate view.

### Certificate view

Displayed in three tabs:

#### "Summary" tab

Structured information including:

- **Subject**: CN, O, OU, L, ST, C, and full DN.
- **Issuer**: same fields for issuer.
- **Validity**: not-before and not-after dates.
- **Technical details**: serial number, signature algorithm, key size, version.
- **Basic constraints**: whether it is a CA.
- **Key usage**: key usage flags.
- **Extended key usage**: certificate purposes.
- **Subject Alternative Names**: SAN list.
- **Fingerprints**: SHA-256 and SHA-1.

Most values include a **Copy** button.

#### "Full text" tab

Shows complete OpenSSL output in plain monospaced text.

#### "Quick actions" tab

- **Copy Subject**: copies full DN.
- **Copy SHA-256 fingerprint**: copies fingerprint value.
- **Extract public key**: generates `.pem` file with certificate public key.

### CSR view

When a `.csr` file is loaded, a dedicated view (blue highlighted) includes:

- **Subject**: all DN fields.
- **Technical details**: algorithm, key size, whether it requests CA usage.
- **Key Usage** and **Extended Key Usage** (if present in requested extensions).
- **Requested Subject Alternative Names**.
- **Full request text**.

---

## 7. Certificates — Convert / Export

**Path**: Certificates → Convert / Export

Convert certificates between PEM (Base64 text) and DER (binary) using a 3-step wizard.

### Step 1 — Select input file

1. Click **Select** to choose certificate.
2. Format is **auto-detected** (PEM or DER).
3. If input is non-convertible (e.g., PKCS#12), a warning is shown.

### Step 2 — Select output format

1. Select destination format (**PEM** or **DER**).
2. Choose output file location with **Select**.
3. If input and output format are the same, a warning indicates conversion is unnecessary.

### Step 3 — Convert

Review summary (source file, detected format, target file, target format) and click **Convert**.

After completion:

- **Open folder**: opens directory containing output file.
- **New conversion**: resets wizard.

---

## 8. Certificates — PKCS#12 Manager

**Path**: Certificates → PKCS#12 Manager

Manage `.p12` / `.pfx` files, which are containers for certificate + private key + optional chain, protected by password.

### "Create P12" tab

Package individual components into a single PKCS#12 file.

| Field | Description | Required |
|-------|-------------|:--------:|
| **Certificate** | `.pem`, `.crt`, or `.cer` file | Yes |
| **Private key** | `.pem` or `.key` file | Yes |
| **Key password** | If private key is encrypted | If applicable |
| **Certificate chain** | PEM file with intermediate/root certs | No |
| **P12 password** | Protects output file | Yes |
| **Confirm password** | Must match | Yes |
| **Friendly Name / Alias** | Display name inside P12 | No |
| **Output file** | Where to save `.p12` | Yes |

### "Open P12" tab

Inspect PKCS#12 content without extracting it.

1. Select `.p12` or `.pfx` file.
2. Enter **password**.
3. Click **Open**.

Displayed details:

- Contains **certificate**: Yes/No
- Contains **private key**: Yes/No
- Contains **chain**: Yes/No (and number of certs)
- Main certificate **Subject**, **Issuer**, **Valid from/to**

### "Extract from P12" tab

Extract individual components from PKCS#12.

| Field | Description |
|-------|-------------|
| **PKCS#12 file** | Input `.p12` / `.pfx` |
| **P12 password** | Password to open file |
| **Output folder** | Where extracted files are saved |
| **Components to extract** | Certificate / Private key / Chain (switches) |
| **Certificate format** | PEM (text) or DER (binary) |
| **Password for private key** | Optionally encrypt extracted private key |

> **Security warning**: extracting private key without password leaves it unprotected. Store it safely.

---

## 9. Certificates — PKCS#7 Manager

**Path**: Certificates → PKCS#7 Manager

Manage `.p7b` / `.p7c` files, which are multi-certificate containers **without private keys**. Typically used for trust chain distribution.

### "Create PKCS#7" tab

Two creation modes:

#### From individual certificates

1. Click **Add certificate** to add `.cer`, `.crt`, `.pem`, or `.der` files.
2. Repeat until full chain is included.
3. Choose **output file** (`.p7b`).
4. Click **Create PKCS#7**.

#### From PEM chain file

1. Select one PEM file containing concatenated certificates.
2. Choose **output file** (`.p7b`).
3. Click **Create PKCS#7**.

### "Inspect" tab

1. Select `.p7b` or `.p7c` file.
2. Click **Inspect**.

Displays:

- **Total number** of certificates.
- For each certificate: **Subject**, **Issuer**, **Serial Number**.

### "Extract" tab

Extract certificates from a PKCS#7 file.

| Field | Description |
|-------|-------------|
| **PKCS#7 file** | Input `.p7b` / `.p7c` |
| **Output folder** | Where extracted certificates are saved |
| **Output format** | **Individual** (one file per cert: `cert_1.pem`, `cert_2.pem`...) or **Chain** (all concatenated in `chain.pem`) |

---

## 10. CA Manager (Certificate Authorities)

**Path**: CA Manager

Create and manage local **Certificate Authorities (CA)** to issue internal certificates.

### Configured CAs

Top section shows one card per registered CA with:

- **Name** and **type** (Root / Intermediate)
- **Creation date**
- **Certificate path**
- Buttons to **open folder** or **remove entry** (removes reference only, does not delete files)

### "Create Root CA" tab

A Root CA is a trust anchor. It is self-signed.

| Field | Description | Required |
|-------|-------------|:--------:|
| **Common Name (CN)** | CA name (e.g., `My Root CA`) | Yes |
| **Organization (O)** | Organization name | No |
| **Country (C)** | 2-letter country code | No |
| **Algorithm** | RSA-4096 recommended for CAs | Yes |
| **Validity days** | Recommended: 3650 (10 years) | Yes |
| **Key password** | Protects private key (mandatory for CAs) | Yes |
| **Confirm password** | Must match | Yes |
| **Output folder** | Where files are saved | Yes |

> **Important**: store CA private key and password in an extremely secure place. If lost, you will not be able to issue more certificates with that CA.

### "Create Intermediate CA" tab

An Intermediate CA is signed by a Root CA. It is used to issue end-entity certificates and protect the Root CA.

This tab is enabled only if at least one Root CA exists.

| Additional field | Description |
|------------------|-------------|
| **Root CA to sign with** | Select Root CA used to sign this Intermediate |
| **Root CA password** | Required to sign |
| **pathLen constraint** | `0` = cannot sign subordinate CAs |

---

## 11. Certificate templates

**Path**: Templates

Manage templates that prefill certificate generation values.

### Built-in templates

The tool includes 5 built-in templates (cannot be edited or deleted, but can be duplicated):

| Template | Description |
|----------|-------------|
| **TLS Server** | For web servers (`serverAuth`) |
| **TLS Client** | For client authentication (`clientAuth`) |
| **Root CA** | For Root CA certificates |
| **Intermediate CA** | For Intermediate CA certificates |
| **CSR for external CA** | For requests to public CAs |

### Custom templates

To create a custom template:

1. Click **New template**.
2. Fill in:
   - **Name** and **Description**
   - **Category**: Server, Client, CA, CSR, or Custom
   - **Algorithm**, **Validity days**, **Signature hash**
   - **Is CA** flag
   - **SAN required** flag
   - **Extended Key Usage** values
   - **Advanced Key Usage** flags
3. Click **Save**.

### Template actions

| Action | Description |
|--------|-------------|
| **Duplicate** | Creates editable copy (useful from built-in template) |
| **Export JSON** | Downloads template as `.json` |
| **Import** | Loads template from `.json` |
| **Edit** | Modifies custom template |
| **Delete** | Removes custom template |

---

## 12. Keystores — Open / Create

**Path**: Keystores → Open / Create

> **Requirement**: JDK must be configured in Settings.

### Open an existing keystore

1. Select keystore file (`.jks`, `.jceks`, `.p12`, `.pfx`, `.keystore`).
2. Enter keystore **password**.
3. Click **Open**.
4. On success, app navigates to **Entries** screen showing keystore content.

### Create a new keystore

1. Click **Create new keystore**.
2. Select type: JKS, JCEKS, or PKCS12.
3. Choose file location and name.
4. Set **password** (and confirm it).
5. Click **Create**.

---

## 13. Keystores — Entries

**Path**: Keystores → Entries

After opening a keystore, this screen shows all entries (aliases) and allows management.

### Available actions per entry

| Action | Description |
|--------|-------------|
| **Generate key pair** | Creates new key pair (private key + self-signed cert) in keystore |
| **Generate CSR** | Generates CSR for existing alias |
| **Import certificate** | Imports trusted certificate into keystore |
| **Import PKCS#12** | Imports full `.p12` (key + cert) into keystore |
| **Import signed certificate** | Imports CA response for previously generated CSR |
| **Export certificate** | Exports alias certificate to file |
| **Delete alias** | Removes entry from keystore |
| **Rename alias** | Renames entry alias |
| **Convert keystore** | Converts between JKS ↔ PKCS12 |

---

## 14. Batch operations

**Path**: Batch

Process multiple certificate files in bulk. Includes 4 tabs.

### "Convert" tab

Convert all certificates in a folder to target format.

| Field | Description |
|-------|-------------|
| **Input folder** | Directory with source certificates |
| **Output folder** | Directory for converted files |
| **Extensions** | File types to process (comma-separated): `cer,crt,pem,der` |
| **Output format** | PEM or DER |
| **Include subfolders** | Recursive processing |

### "Extract public keys" tab

Extract public key from each certificate in folder.

| Field | Description |
|-------|-------------|
| **Input folder** | Directory with certificates |
| **Output folder** | Directory for extracted public keys |
| **Extensions** | `cer,crt,pem` |
| **Include subfolders** | Recursive processing |

### "Expiration report" tab

Generate full report of certificate expiration dates.

| Field | Description |
|-------|-------------|
| **Folder to scan** | Root directory |
| **Warning days** | Days before expiration marked as "Expiring soon" (default: 30) |
| **Include subfolders** | Recursive processing |
| **Extensions** | `cer,crt,pem,der,p12,pfx` |

Report table includes:

- **File**, **Subject**, **Valid until**, **Days remaining**
- **Status**: Valid (green), Expiring soon (yellow), Expired (red)
- Summary totals

**Export CSV** button downloads report as CSV for Excel or spreadsheet tools.

### "Import to truststore" tab

Bulk import certificates from folder into Java keystore/truststore.

| Field | Description |
|-------|-------------|
| **Target keystore** | Existing `.jks`, `.jceks`, `.p12`, or `.pfx` file |
| **Keystore password** | Keystore password |
| **Certificates folder** | Directory containing certs to import |
| **Alias prefix** | Prefix for generated aliases (e.g., `cert_`) |
| **Include subfolders** | Recursive processing |

After any batch operation, a summary is shown:

- **Processed** / **Success** / **Error**
- Execution **time**

---

## 15. Settings

**Path**: Settings

Modify the same parameters from initial wizard at any time.

### Sections

#### OpenSSL

- **Executable path**: text field + Select button.
- **Test**: validates path and shows detected version.

#### JDK (for keytool)

- **JDK root folder**: text field + Select button.
- **Test**: validates `keytool` execution.

#### Output folder

- **Default directory** for generated files. Can still be overridden per operation.

#### Security

- **Save passwords**: switch to enable/disable local encrypted password storage. **Recommendation: keep disabled.**

Click **Save changes** to apply. A temporary green confirmation is shown.

---

## 16. Activity / Logs

**Path**: Activity / Logs

Shows chronological history of operations performed in the app.

### Operations table

Each row includes:

| Column | Description |
|--------|-------------|
| **Date/Time** | When operation was performed |
| **Operation** | Type (e.g., Generate CSR, Inspect, Convert...) |
| **Input** | Input file name |
| **Output** | Output file name (if applicable) |
| **Status** | OK (green), Error (red), Pending, In progress |
| **Details** | Button for technical info |

### Details dialog

Click **Details** icon to view:

- Exact date/time
- Operation type
- Status
- Error message (if failed)
- OpenSSL stdout
- OpenSSL stderr

### Actions

| Button | Description |
|--------|-------------|
| **Refresh** | Reload logs list |
| **Clear** | Removes all history (asks for confirmation) |

---

## 17. Help

**Path**: Help

In-app help section with information about:

- **Inspect certificates**: supported formats and displayed fields.
- **Convert certificates**: PEM and DER format explanation.
- **Generate CSR**: step-by-step process to request certificates from a CA.
- **Self-signed certificates**: when to use and limitations.
- **Security**: protections implemented in the app.
- **Requirements**: OpenSSL (required) and JDK (optional).

---

## 18. Frequently Asked Questions

### Does the application require internet access?

**No.** Certificate Manager Tool works 100% offline. The only exception is using "Install Online" during OpenSSL setup, which uses `winget`.

### If I share the portable .exe to another PC, will it include my data?

**No.** Configuration is stored in the Windows user profile `%APPDATA%`, which is specific to each machine and user. On another computer:

- Setup Wizard appears again.
- No recent files, custom templates, or registered CAs are present.

### Where is configuration stored?

On Windows: `%APPDATA%\certificate-manager-tool\config.json`

This file contains:

- OpenSSL and JDK paths
- Default output folder
- Recent files
- Custom templates
- Registered local CAs
- Security preferences

### Are private keys or passwords stored?

- **Private keys**: app only generates and saves them in the folder you choose.
- **Passwords**: by default, NOT stored. They remain only in memory during operation. Encrypted local storage can be enabled in Settings, but is not recommended.

### What is the difference between PEM and DER?

| Format | Type | Content |
|--------|------|---------|
| **PEM** | Text (Base64) | Starts with `-----BEGIN CERTIFICATE-----` |
| **DER** | Binary | Not human-readable in text editors |

Both contain the same information. PEM is usually easier to handle and more portable.

### What is a CSR and when do I need one?

A **CSR (Certificate Signing Request)** is a request sent to a Certificate Authority (CA) to obtain a signed certificate. You need it when:

- You want a certificate trusted by browsers and operating systems.
- Your company uses an internal corporate CA.
- You need a certificate for a public web server.

### When should I use a self-signed certificate?

Self-signed certificates are suitable for:

- Local development (`localhost`)
- Testing environments
- Internal communications where both endpoints are controlled

**Do not use in production**, since browsers will show trust warnings.

### What is CA Manager for?

CA Manager lets you build your own internal PKI:

1. Create a **Root CA** (trust anchor).
2. Optionally create an **Intermediate CA** signed by Root.
3. Issue certificates for your services with those CAs.

Useful in enterprise or lab environments where multiple certificates must trust each other.

---

## 19. Glossary

| Term | Definition |
|------|------------|
| **CA (Certificate Authority)** | Entity that issues and signs digital certificates |
| **CN (Common Name)** | Main certificate subject field, typically domain name |
| **CSR (Certificate Signing Request)** | Request sent to a CA to obtain signed certificate |
| **DER** | Binary certificate format |
| **DN (Distinguished Name)** | Full subject/issuer name (e.g., `CN=example.com, O=Corp, C=ES`) |
| **EKU (Extended Key Usage)** | Extension defining allowed certificate purposes |
| **Fingerprint** | Unique certificate hash (SHA-256 or SHA-1) |
| **Intermediate CA** | CA signed by Root CA, used for end-entity issuance |
| **JKS** | Java KeyStore format |
| **Key Usage** | Extension defining permitted cryptographic operations |
| **Keystore** | Store for keys and certificates (JKS, JCEKS, PKCS#12) |
| **OpenSSL** | Open-source toolkit for cryptographic operations |
| **PEM** | Base64 text certificate format with BEGIN/END headers |
| **PKCS#7 (.p7b)** | Container format for multiple certs without private key |
| **PKCS#12 (.p12/.pfx)** | Container format for cert + private key + chain, password-protected |
| **Root CA** | Self-signed trust anchor certificate |
| **SAN (Subject Alternative Name)** | Extension allowing multiple valid names/IPs in one certificate |
| **Self-Signed** | Certificate signed with its own private key, no external CA |
| **Truststore** | Keystore containing trusted certificates only (no private keys) |

---

*Certificate Manager Tool v1.0.0 — User Manual*
