import { test, expect, type ElectronApplication } from '@playwright/test';
import { launchApp, closeApp, skipSetupWizard, resetToWizard, getWindowSize } from './helpers/electron';

let electronApp: ElectronApplication | undefined;

test.afterEach(async () => {
  await closeApp(electronApp);
  electronApp = undefined;
});

test.describe('Smoke Tests', () => {
  test('launches and shows the setup wizard on fresh state', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    // Force wizard state via the app's own settings API
    await resetToWizard(page);

    const welcomeTitle = page.getByTestId('wizard-welcome-title');
    await expect(welcomeTitle).toBeVisible({ timeout: 15_000 });
    await expect(welcomeTitle).toContainText('Bienvenido a Certificate Manager Tool');
  });

  test('completes setup wizard and shows main dashboard', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    // Force wizard state, then complete it
    await resetToWizard(page);
    await skipSetupWizard(page);

    // After the wizard, the main layout with sidebar should be visible
    const sidebarHeader = page.getByTestId('sidebar-header');
    await expect(sidebarHeader).toBeVisible({ timeout: 15_000 });

    // Dashboard page title should be visible
    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText('Dashboard');
  });

  test('window has a reasonable size', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;

    const { width, height } = await getWindowSize(electronApp);
    expect(width).toBeGreaterThan(800);
    expect(height).toBeGreaterThan(500);
  });
});
