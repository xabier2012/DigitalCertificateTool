# E2E Testing con Playwright

## Requisitos previos

- Node.js >= 20
- Dependencias instaladas: `npm install`

## Ejecutar tests

### Local (Windows)

```bash
# Ejecutar build + todos los tests E2E
npm run test:e2e

# Solo ejecutar tests (sin build, si ya compilaste)
npx playwright test

# Ejecutar un archivo de test específico
npx playwright test e2e/smoke.spec.ts

# Modo UI interactivo (abre el visor de Playwright)
npm run test:e2e:ui

# Modo debug (paso a paso con inspector)
npm run test:e2e:debug
```

### CI (Linux con Xvfb)

El workflow de GitHub Actions (`.github/workflows/e2e.yml`) ejecuta:

```bash
xvfb-run --auto-servernum npx playwright test
```

Los traces/artifacts se suben automáticamente cuando hay fallos.

## Estructura

```
e2e/
├── helpers/
│   └── electron.ts       # Helper para lanzar/cerrar Electron
├── smoke.spec.ts          # Tests básicos: arranque, wizard, ventana
├── navigation.spec.ts     # Navegación por sidebar entre secciones
├── settings.spec.ts       # Flujo de configuración (OpenSSL, guardar)
└── certificate-generation.spec.ts  # Wizard de generación de certificados
```

## Selectores

Los tests usan selectores robustos en este orden de prioridad:

1. `page.getByTestId('...')` — atributos `data-testid` en componentes clave
2. `page.getByRole('button', { name: '...' })` — roles ARIA
3. `page.getByLabel('...')` — labels de formularios
4. `page.getByText('...')` — texto visible (último recurso)

### data-testid disponibles

| Componente | testid | Descripción |
|---|---|---|
| MainLayout | `sidebar-header` | Cabecera del sidebar |
| MainLayout | `main-content` | Área de contenido principal |
| MainLayout | `nav-dashboard` | Nav item Dashboard |
| MainLayout | `nav-certificates` | Nav item Certificates (padre) |
| MainLayout | `nav-generate` | Nav item Generate |
| MainLayout | `nav-inspect` | Nav item Inspect |
| MainLayout | `nav-settings` | Nav item Settings |
| MainLayout | `nav-help` | Nav item Help |
| MainLayout | `nav-keystores` | Nav item Keystores (padre) |
| Dashboard | `page-title` | Título de la página |
| Dashboard | `quick-action-*` | Cards de acciones rápidas |
| Settings | `page-title` | Título de la página |
| Settings | `openssl-path-input` | Input ruta OpenSSL |
| Settings | `openssl-test-btn` | Botón Probar OpenSSL |
| Settings | `save-settings-btn` | Botón Guardar cambios |
| SetupWizard | `wizard-welcome-title` | Título de bienvenida |
| SetupWizard | `wizard-completed-title` | Título de completado |
| SetupWizard | `wizard-next-btn` | Botón Siguiente/Empezar |
| SetupWizard | `wizard-back-btn` | Botón Atrás |
| SetupWizard | `wizard-finish-btn` | Botón Finalizar |
| GenerateCert | `page-title` | Título de la página |
| GenerateCert | `cn-input` | Input Common Name |
| GenerateCert | `cert-next-btn` | Botón Siguiente |
| GenerateCert | `cert-back-btn` | Botón Atrás |
| GenerateCert | `generate-btn` | Botón Generar CSR/Certificado |

## Notas

- Los tests son secuenciales (`workers: 1`) porque cada test lanza su propia instancia de Electron.
- Cada test cierra la app en `afterEach` para evitar procesos colgados.
- El SetupWizard se muestra en la primera ejecución. El helper `skipSetupWizard()` lo salta automáticamente para los tests que necesitan la app principal.
- No se usan archivos reales del usuario. Los tests interactúan solo con la UI.
- Timeout global: 60 segundos por test. Timeout de `expect`: 10 segundos.
