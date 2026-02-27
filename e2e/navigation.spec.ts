import { test, expect, type ElectronApplication } from '@playwright/test';
import { launchApp, closeApp, skipSetupWizard } from './helpers/electron';

let electronApp: ElectronApplication | undefined;

test.beforeEach(async () => {
  const ctx = await launchApp();
  electronApp = ctx.electronApp;
  // Store page on the test context via a workaround: we re-obtain it in each test
});

test.afterEach(async () => {
  await closeApp(electronApp);
  electronApp = undefined;
});

test.describe('Navigation', () => {
  test('navigates to Settings page via sidebar', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    await page.getByTestId('nav-settings').click();

    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toContainText('Configuración');
  });

  test('navigates to Generate Certificate page', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    // Certificates submenu should already be open (default state)
    await page.getByTestId('nav-generate').click();

    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toContainText('Generar Certificado');
  });

  test('navigates to Inspect Certificate page', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    await page.getByTestId('nav-inspect').click();

    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toBeVisible();
  });

  test('navigates to Help page', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    await page.getByTestId('nav-help').click();

    // Help page should have some content
    const mainContent = page.getByTestId('main-content');
    await expect(mainContent).toBeVisible();
  });

  test('navigates back to Dashboard', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    // Go to settings first
    await page.getByTestId('nav-settings').click();
    await expect(page.getByTestId('page-title')).toContainText('Configuración');

    // Go back to dashboard
    await page.getByTestId('nav-dashboard').click();
    await expect(page.getByTestId('page-title')).toContainText('Dashboard');
  });

  test('opens Keystores submenu and navigates to Open/Create', async () => {
    const page = await electronApp!.firstWindow();
    await skipSetupWizard(page);

    // Keystores section might need to be expanded first
    await page.getByTestId('nav-keystores').click();
    await page.getByTestId('nav-open---create').click();

    const mainContent = page.getByTestId('main-content');
    await expect(mainContent).toBeVisible();
  });
});
