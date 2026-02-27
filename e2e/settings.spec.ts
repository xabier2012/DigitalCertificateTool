import { test, expect, type ElectronApplication } from '@playwright/test';
import { launchApp, closeApp, skipSetupWizard } from './helpers/electron';

let electronApp: ElectronApplication | undefined;

test.afterEach(async () => {
  await closeApp(electronApp);
  electronApp = undefined;
});

test.describe('Settings Page', () => {
  test('shows OpenSSL configuration section', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-settings').click();

    await expect(page.getByTestId('page-title')).toContainText('Configuración');

    // OpenSSL section heading should be visible
    await expect(page.getByRole('heading', { name: 'OpenSSL' })).toBeVisible();

    // The path input and test button should exist
    await expect(page.getByTestId('openssl-path-input')).toBeVisible();
    await expect(page.getByTestId('openssl-test-btn')).toBeVisible();
  });

  test('Test button is disabled when OpenSSL path is empty', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-settings').click();

    // Clear the OpenSSL path input (it should be empty after fresh setup)
    const input = page.getByTestId('openssl-path-input').locator('input');
    await input.fill('');

    // Test button should be disabled
    const testBtn = page.getByTestId('openssl-test-btn');
    await expect(testBtn).toBeDisabled();
  });

  test('shows error when testing invalid OpenSSL path', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-settings').click();

    // Type an invalid path
    const input = page.getByTestId('openssl-path-input').locator('input');
    await input.fill('C:\\invalid\\path\\openssl.exe');

    // Click Test
    await page.getByTestId('openssl-test-btn').click();

    // Should show an error alert
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /error|no se encontr/i });
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
  });

  test('Save button saves settings and shows confirmation', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-settings').click();

    // Click save
    await page.getByTestId('save-settings-btn').click();

    // Confirmation message should appear
    await expect(page.getByText('Cambios guardados')).toBeVisible({ timeout: 5_000 });
  });

  test('JDK section is visible', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-settings').click();

    // JDK section heading should be visible
    await expect(page.getByText('JDK (para keytool)')).toBeVisible();
  });
});
