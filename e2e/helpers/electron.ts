import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const DESKTOP_DIR = path.resolve(__dirname, '..', '..', 'apps', 'desktop');
const MAIN_JS = path.join(DESKTOP_DIR, 'dist', 'main', 'index.js');

export interface ElectronTestContext {
  electronApp: ElectronApplication;
  page: Page;
}

/**
 * Launches the Electron app for E2E testing.
 * Requires a prior build (npm run build:e2e).
 * Returns the ElectronApplication and the first BrowserWindow page.
 */
export async function launchApp(): Promise<ElectronTestContext> {
  if (!fs.existsSync(MAIN_JS)) {
    throw new Error(
      `Compiled main not found at ${MAIN_JS}. Run "npm run build:e2e" first.`
    );
  }

  const electronApp = await electron.launch({
    args: [DESKTOP_DIR],
    env: {
      ...process.env,
      ELECTRON_IS_E2E: '1',
    },
  });

  const page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  return { electronApp, page };
}

/**
 * Resets app state so the SetupWizard is shown on next load.
 * Uses the app's own settings IPC to set setupCompleted = false, then reloads.
 */
export async function resetToWizard(page: Page): Promise<void> {
  // Wait for the preload API to be available
  await page.waitForFunction(
    () => !!(window as any).electronAPI?.settings?.set,
    { timeout: 15_000 }
  );
  await page.evaluate(async () => {
    await (window as any).electronAPI.settings.set({ setupCompleted: false });
  });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Ensures the app is past the SetupWizard and shows the main layout.
 * If the wizard is visible, clicks through it. If already on main, does nothing.
 */
export async function skipSetupWizard(page: Page): Promise<void> {
  // Wait a moment for the app to decide which view to show
  await page.waitForTimeout(1_000);

  const wizardBtn = page.getByTestId('wizard-next-btn');
  const isWizard = await wizardBtn.isVisible({ timeout: 3_000 }).catch(() => false);

  if (!isWizard) {
    // Already past the wizard — just wait for sidebar
    await page.getByTestId('sidebar-header').waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }

  // Step 0 → 1 (Bienvenido → OpenSSL)
  await wizardBtn.click();

  // Step 1 → 2 (OpenSSL → JDK)
  await page.getByTestId('wizard-next-btn').click();

  // Step 2 → 3 (JDK → Output dir)
  await page.getByTestId('wizard-next-btn').click();

  // Step 3 → 4 (Output → Security)
  await page.getByTestId('wizard-next-btn').click();

  // Step 4 → 5 (Security → Completed)
  await page.getByTestId('wizard-next-btn').click();

  // Finalizar → reloads the page
  await page.getByTestId('wizard-finish-btn').click();

  // Wait for reload and main layout to appear
  await page.waitForLoadState('domcontentloaded');
  await page.getByTestId('sidebar-header').waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * Gets the BrowserWindow dimensions from the main process.
 */
export async function getWindowSize(electronApp: ElectronApplication): Promise<{ width: number; height: number }> {
  return electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return { width: 0, height: 0 };
    const [width, height] = win.getSize();
    return { width, height };
  });
}

/**
 * Safely closes the Electron app. Use in afterEach / afterAll.
 */
export async function closeApp(electronApp: ElectronApplication | undefined): Promise<void> {
  if (electronApp) {
    try {
      await electronApp.close();
    } catch {
      // App may already be closed
    }
  }
}
