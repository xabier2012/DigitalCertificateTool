import { test, expect, type ElectronApplication } from '@playwright/test';
import { launchApp, closeApp, skipSetupWizard } from './helpers/electron';

let electronApp: ElectronApplication | undefined;

test.afterEach(async () => {
  await closeApp(electronApp);
  electronApp = undefined;
});

test.describe('Certificate Generation Flow', () => {
  test('shows generation mode selection on first step', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    await expect(page.getByTestId('page-title')).toContainText('Generar Certificado');

    // Step 1 should show the three generation modes (use heading role to avoid matching template chips)
    await expect(page.getByRole('heading', { name: /CSR para CA externa/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('heading', { name: /Autofirmado/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Emitido por mi CA/ })).toBeVisible();
  });

  test('requires Common Name before proceeding to step 3', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    // Step 0 → Step 1
    await page.getByTestId('cert-next-btn').click();

    // Step 1: leave CN empty and try to proceed
    // Clear CN if there's a default
    const cnInput = page.getByTestId('cn-input').locator('input');
    await cnInput.fill('');

    await page.getByTestId('cert-next-btn').click();

    // Should show error about CN being required
    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /Common Name.*obligatorio/i });
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
  });

  test('can navigate through wizard steps with valid data', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    // Step 0: Select generation mode (CSR is default), click Next
    await page.getByTestId('cert-next-btn').click();

    // Step 1: Fill CN
    const cnInput = page.getByTestId('cn-input').locator('input');
    await cnInput.fill('test.example.com');

    // Click Next to step 2 (Summary)
    await page.getByTestId('cert-next-btn').click();

    // Step 2: Verify summary shows the CN
    await expect(page.getByText('test.example.com')).toBeVisible();
    await expect(page.getByText('Resumen y generación')).toBeVisible();
  });

  test('can go back from step 2 to step 1', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    // Step 0 → Step 1
    await page.getByTestId('cert-next-btn').click();

    // Fill CN
    const cnInput = page.getByTestId('cn-input').locator('input');
    await cnInput.fill('test.example.com');

    // Step 1 → Step 2
    await page.getByTestId('cert-next-btn').click();
    await expect(page.getByText('Resumen y generación')).toBeVisible();

    // Step 2 → Step 1 (Back)
    await page.getByTestId('cert-back-btn').click();

    // CN should still have the value we entered
    await expect(cnInput).toHaveValue('test.example.com');
  });

  test('self-signed mode shows validity days field', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    // Select self-signed mode
    await page.getByText('Autofirmado (desarrollo)').click();

    // Go to step 1
    await page.getByTestId('cert-next-btn').click();

    // Validity days field should be enabled (not disabled like in CSR mode)
    const validityInput = page.getByLabel('Días de validez');
    await expect(validityInput).toBeVisible();
    await expect(validityInput).toBeEnabled();
  });

  test('CA-issued mode shows warning when no CAs configured', async () => {
    const ctx = await launchApp();
    electronApp = ctx.electronApp;
    const { page } = ctx;

    await skipSetupWizard(page);
    await page.getByTestId('nav-generate').click();

    // Select CA-issued mode
    await page.getByText('Emitido por mi CA').click();

    // Try to proceed — should show error about no CAs
    await page.getByTestId('cert-next-btn').click();

    const errorAlert = page.locator('[role="alert"]').filter({ hasText: /CA local/i });
    await expect(errorAlert).toBeVisible({ timeout: 5_000 });
  });
});
