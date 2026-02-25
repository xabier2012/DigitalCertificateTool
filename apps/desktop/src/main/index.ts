import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import {
  OpenSSLService,
  KeytoolService,
  FileFormatDetector,
  LocalCAService,
  PKCS12Service,
  PKCS7Service,
  KeystoreService,
  BatchService,
} from '@cert-manager/core';
import type {
  AppSettings,
  OperationLogEntry,
  CSRGenerationOptions,
  SelfSignedGenerationOptions,
  ConversionOptions,
  RootCAGenerationOptions,
  IntermediateCAGenerationOptions,
  SignCSROptions,
  PKCS12CreateOptions,
  PKCS12ExtractOptions,
  PKCS7CreateOptions,
  PKCS7ExtractOptions,
  CreateKeystoreOptions,
  OpenKeystoreOptions,
  GenerateKeypairOptions,
  GenerateCSRFromKeystoreOptions,
  ImportCertOptions,
  ImportP12Options,
  ImportSignedCertOptions,
  ExportCertOptions,
  DeleteAliasOptions,
  RenameAliasOptions,
  ConvertKeystoreOptions,
  BatchConvertOptions,
  BatchExtractPublicOptions,
  ExpirationReportOptions,
  BatchImportTruststoreOptions,
} from '@cert-manager/shared';
import { DEFAULT_SETTINGS } from '@cert-manager/shared';

const store = new Store<AppSettings>({
  defaults: DEFAULT_SETTINGS,
});

let mainWindow: BrowserWindow | null = null;
let opensslService: OpenSSLService;
let keytoolService: KeytoolService;
let fileFormatDetector: FileFormatDetector;
let localCAService: LocalCAService;
let pkcs12Service: PKCS12Service;
let pkcs7Service: PKCS7Service;
let keystoreService: KeystoreService;
let batchService: BatchService;
const operationLogs: OperationLogEntry[] = [];

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // Try multiple ports in case 5173 is in use
    const tryPorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
    const loadDevServer = async () => {
      for (const port of tryPorts) {
        try {
          await mainWindow!.loadURL(`http://localhost:${port}`);
          console.log(`Loaded dev server on port ${port}`);
          return;
        } catch {
          console.log(`Port ${port} not available, trying next...`);
        }
      }
      console.error('Could not connect to any dev server port');
    };
    loadDevServer();
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeServices(): void {
  const settings = store.store as AppSettings;
  opensslService = new OpenSSLService(settings.opensslPath || '');
  keytoolService = new KeytoolService(settings.jdkRootPath || '');
  fileFormatDetector = new FileFormatDetector();
  localCAService = new LocalCAService(settings.opensslPath || '');
  pkcs12Service = new PKCS12Service(settings.opensslPath || '');
  pkcs7Service = new PKCS7Service(settings.opensslPath || '');
  keystoreService = new KeystoreService(settings.jdkRootPath || '');
  batchService = new BatchService(settings.opensslPath || '', settings.jdkRootPath || '');
}

function addLogEntry(entry: Omit<OperationLogEntry, 'id' | 'timestamp'>): void {
  const logEntry: OperationLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  operationLogs.unshift(logEntry);
  if (operationLogs.length > 100) {
    operationLogs.pop();
  }
}

function setupIpcHandlers(): void {
  ipcMain.handle('settings:get', () => {
    return store.store;
  });

  ipcMain.handle('settings:set', (_event, settings: Partial<AppSettings>) => {
    for (const [key, value] of Object.entries(settings)) {
      store.set(key as keyof AppSettings, value);
    }

    if (settings.opensslPath !== undefined) {
      opensslService.setOpensslPath(settings.opensslPath);
      localCAService.setOpensslPath(settings.opensslPath);
      pkcs12Service.setOpensslPath(settings.opensslPath);
      pkcs7Service.setOpensslPath(settings.opensslPath);
      batchService.setOpensslPath(settings.opensslPath);
    }
    if (settings.jdkRootPath !== undefined) {
      keytoolService.setJdkRootPath(settings.jdkRootPath);
      keystoreService.setJdkRootPath(settings.jdkRootPath);
      batchService.setJdkRootPath(settings.jdkRootPath);
    }
  });

  ipcMain.handle('settings:getOutputDir', () => {
    return store.get('defaultOutputDir') || app.getPath('documents');
  });

  ipcMain.handle('openssl:test', async (_event, opensslPath: string) => {
    const tempService = new OpenSSLService(opensslPath);
    const result = await tempService.checkAvailable();
    addLogEntry({
      type: 'test_openssl',
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('openssl:inspect', async (_event, filePath: string, password?: string) => {
    const result = await opensslService.inspectCertificate(filePath, password);
    const fileName = path.basename(filePath);

    addLogEntry({
      type: 'inspect',
      inputFileName: fileName,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
      details: {
        stdout: result.data?.rawText,
      },
    });

    if (result.success) {
      const recentFiles = store.get('recentFiles') || [];
      const newRecent = {
        path: filePath,
        name: fileName,
        type: path.extname(filePath).slice(1).toLowerCase() as any,
        lastAccessed: new Date().toISOString(),
      };
      const filtered = recentFiles.filter((f) => f.path !== filePath);
      filtered.unshift(newRecent);
      store.set('recentFiles', filtered.slice(0, 10));
    }

    return result;
  });

  ipcMain.handle('openssl:detectFormat', async (_event, filePath: string) => {
    try {
      const result = await fileFormatDetector.detectFormat(filePath);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DETECTION_FAILED',
          message: 'Error al detectar el formato del archivo',
        },
      };
    }
  });

  ipcMain.handle('openssl:convert', async (_event, options: ConversionOptions) => {
    const result = await opensslService.convertCertificate(options);
    const inputFileName = path.basename(options.inputPath);
    const outputFileName = path.basename(options.outputPath);

    addLogEntry({
      type: 'convert',
      inputFileName,
      outputFileName,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });

    return result;
  });

  ipcMain.handle(
    'openssl:extractPublicKey',
    async (_event, certPath: string, outputPath: string) => {
      const result = await opensslService.extractPublicKeyFromCert(certPath, outputPath);
      const inputFileName = path.basename(certPath);
      const outputFileName = path.basename(outputPath);

      addLogEntry({
        type: 'extract_public_key',
        inputFileName,
        outputFileName,
        status: result.success ? 'success' : 'error',
        errorMessage: result.error?.message,
      });

      return result;
    }
  );

  ipcMain.handle('openssl:generateCSR', async (_event, options: CSRGenerationOptions) => {
    const result = await opensslService.generateCSR(options);

    addLogEntry({
      type: 'generate_csr',
      outputFileName: options.csrFileName || 'request.csr',
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });

    return result;
  });

  ipcMain.handle(
    'openssl:generateSelfSigned',
    async (_event, options: SelfSignedGenerationOptions) => {
      const result = await opensslService.generateSelfSigned(options);

      addLogEntry({
        type: 'generate_self_signed',
        outputFileName: options.certFileName || 'certificate.pem',
        status: result.success ? 'success' : 'error',
        errorMessage: result.error?.message,
      });

      return result;
    }
  );

  ipcMain.handle('jdk:test', async (_event, jdkPath: string) => {
    const tempService = new KeytoolService(jdkPath);
    const result = await tempService.checkAvailable();

    addLogEntry({
      type: 'test_keytool',
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });

    return result;
  });

  ipcMain.handle('dialog:selectFile', async (_event, filters) => {
    if (!mainWindow) {
      return { success: false, error: { code: 'NO_WINDOW', message: 'Ventana principal no disponible.' } };
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: filters || [
        {
          name: 'Certificados',
          extensions: ['cer', 'crt', 'pem', 'der', 'p12', 'pfx', 'key', 'csr'],
        },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: { code: 'CANCELLED', message: 'Operación cancelada' } };
    }

    return { success: true, data: result.filePaths[0] };
  });

  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) {
      return { success: false, error: { code: 'NO_WINDOW', message: 'Ventana principal no disponible.' } };
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: { code: 'CANCELLED', message: 'Operación cancelada' } };
    }

    return { success: true, data: result.filePaths[0] };
  });

  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string, filters?) => {
    if (!mainWindow) {
      return { success: false, error: { code: 'NO_WINDOW', message: 'Ventana principal no disponible.' } };
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: filters || [
        { name: 'Certificado PEM', extensions: ['pem'] },
        { name: 'Certificado DER', extensions: ['der'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: { code: 'CANCELLED', message: 'Operación cancelada' } };
    }

    return { success: true, data: result.filePath };
  });

  ipcMain.handle('shell:openPath', async (_event, pathToOpen: string) => {
    await shell.openPath(pathToOpen);
  });

  ipcMain.handle('shell:showItemInFolder', async (_event, pathToShow: string) => {
    shell.showItemInFolder(pathToShow);
  });

  ipcMain.handle('logs:get', () => {
    return operationLogs;
  });

  ipcMain.handle('logs:clear', () => {
    operationLogs.length = 0;
  });

  ipcMain.handle('ca:generateRoot', async (_event, options: RootCAGenerationOptions) => {
    const result = await localCAService.generateRootCA(options);
    addLogEntry({
      type: 'generate_root_ca',
      outputFileName: 'root_ca_cert.pem',
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('ca:generateIntermediate', async (_event, options: IntermediateCAGenerationOptions) => {
    const result = await localCAService.generateIntermediateCA(options);
    addLogEntry({
      type: 'generate_intermediate_ca',
      outputFileName: 'intermediate_cert.pem',
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('ca:signCSR', async (_event, options: SignCSROptions) => {
    const result = await localCAService.signCSR(options);
    addLogEntry({
      type: 'sign_csr',
      inputFileName: path.basename(options.csrPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs12:create', async (_event, options: PKCS12CreateOptions) => {
    const result = await pkcs12Service.createPKCS12(options);
    addLogEntry({
      type: 'create_pkcs12',
      outputFileName: path.basename(options.outputPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs12:inspect', async (_event, p12Path: string, password: string) => {
    const result = await pkcs12Service.inspectPKCS12(p12Path, password);
    addLogEntry({
      type: 'inspect_pkcs12',
      inputFileName: path.basename(p12Path),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs12:extract', async (_event, options: PKCS12ExtractOptions) => {
    const result = await pkcs12Service.extractFromPKCS12(options);
    addLogEntry({
      type: 'extract_pkcs12',
      inputFileName: path.basename(options.p12Path),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs7:create', async (_event, options: PKCS7CreateOptions) => {
    const result = await pkcs7Service.createPKCS7(options);
    addLogEntry({
      type: 'create_pkcs7',
      outputFileName: path.basename(options.outputPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs7:createFromChain', async (_event, chainPath: string, outputPath: string) => {
    const result = await pkcs7Service.createPKCS7FromChain(chainPath, outputPath);
    addLogEntry({
      type: 'create_pkcs7_from_chain',
      inputFileName: path.basename(chainPath),
      outputFileName: path.basename(outputPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs7:inspect', async (_event, p7bPath: string) => {
    const result = await pkcs7Service.inspectPKCS7(p7bPath);
    addLogEntry({
      type: 'inspect_pkcs7',
      inputFileName: path.basename(p7bPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('pkcs7:extract', async (_event, options: PKCS7ExtractOptions) => {
    const result = await pkcs7Service.extractFromPKCS7(options);
    addLogEntry({
      type: 'extract_pkcs7',
      inputFileName: path.basename(options.p7bPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:create', async (_event, options: CreateKeystoreOptions) => {
    const result = await keystoreService.createKeystore(options);
    addLogEntry({
      type: 'create_keystore',
      outputFileName: path.basename(options.path),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:open', async (_event, options: OpenKeystoreOptions) => {
    return await keystoreService.openKeystore(options);
  });

  ipcMain.handle('keystore:generateKeypair', async (_event, options: GenerateKeypairOptions) => {
    const result = await keystoreService.generateKeypair(options);
    addLogEntry({
      type: 'generate_keypair',
      outputFileName: options.alias,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:generateCSR', async (_event, options: GenerateCSRFromKeystoreOptions) => {
    const result = await keystoreService.generateCSR(options);
    addLogEntry({
      type: 'generate_csr_keystore',
      outputFileName: path.basename(options.outputPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:importCert', async (_event, options: ImportCertOptions) => {
    const result = await keystoreService.importCertificate(options);
    addLogEntry({
      type: 'import_cert_keystore',
      inputFileName: path.basename(options.certPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:importP12', async (_event, options: ImportP12Options) => {
    const result = await keystoreService.importP12(options);
    addLogEntry({
      type: 'import_p12_keystore',
      inputFileName: path.basename(options.p12Path),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:importSignedCert', async (_event, options: ImportSignedCertOptions) => {
    const result = await keystoreService.importSignedCert(options);
    addLogEntry({
      type: 'import_signed_cert',
      inputFileName: path.basename(options.certPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:exportCert', async (_event, options: ExportCertOptions) => {
    const result = await keystoreService.exportCertificate(options);
    addLogEntry({
      type: 'export_cert_keystore',
      outputFileName: path.basename(options.outputPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:deleteAlias', async (_event, options: DeleteAliasOptions) => {
    const result = await keystoreService.deleteAlias(options);
    addLogEntry({
      type: 'delete_alias',
      inputFileName: options.alias,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:renameAlias', async (_event, options: RenameAliasOptions) => {
    const result = await keystoreService.renameAlias(options);
    addLogEntry({
      type: 'rename_alias',
      inputFileName: `${options.oldAlias} -> ${options.newAlias}`,
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('keystore:convert', async (_event, options: ConvertKeystoreOptions) => {
    const result = await keystoreService.convertKeystore(options);
    addLogEntry({
      type: 'convert_keystore',
      inputFileName: path.basename(options.srcPath),
      outputFileName: path.basename(options.destPath),
      status: result.success ? 'success' : 'error',
      errorMessage: result.error?.message,
    });
    return result;
  });

  ipcMain.handle('batch:convert', async (_event, options: BatchConvertOptions) => {
    return await batchService.batchConvert(options);
  });

  ipcMain.handle('batch:extractPublicKeys', async (_event, options: BatchExtractPublicOptions) => {
    return await batchService.batchExtractPublicKeys(options);
  });

  ipcMain.handle('batch:expirationReport', async (_event, options: ExpirationReportOptions) => {
    return await batchService.generateExpirationReport(options);
  });

  ipcMain.handle('batch:importTruststore', async (_event, options: BatchImportTruststoreOptions) => {
    return await batchService.batchImportToTruststore(options);
  });

  // OpenSSL auto-detection and installation
  ipcMain.handle('openssl:detect', async () => {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const fs = require('fs');

    // Common OpenSSL paths on Windows
    const commonPaths = [
      'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
      'C:\\Program Files\\OpenSSL\\bin\\openssl.exe',
      'C:\\Program Files (x86)\\OpenSSL\\bin\\openssl.exe',
      'C:\\OpenSSL-Win64\\bin\\openssl.exe',
      'C:\\OpenSSL\\bin\\openssl.exe',
      process.env.OPENSSL_HOME ? path.join(process.env.OPENSSL_HOME, 'bin', 'openssl.exe') : '',
    ].filter(Boolean);

    // Check common paths first
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        const tempService = new OpenSSLService(p);
        const result = await tempService.checkAvailable();
        if (result.success) {
          return { success: true, data: { path: p, version: result.data } };
        }
      }
    }

    // Try to find openssl in PATH
    try {
      const { stdout } = await execAsync('where openssl', { timeout: 5000 });
      const pathFromWhere = stdout.trim().split('\n')[0].trim();
      if (pathFromWhere && fs.existsSync(pathFromWhere)) {
        const tempService = new OpenSSLService(pathFromWhere);
        const result = await tempService.checkAvailable();
        if (result.success) {
          return { success: true, data: { path: pathFromWhere, version: result.data } };
        }
      }
    } catch {
      // openssl not in PATH
    }

    // Try winget search to check if it's available for install
    try {
      await execAsync('winget --version', { timeout: 5000 });
      return { 
        success: false, 
        data: { canInstall: true, method: 'winget' },
        error: { code: 'NOT_FOUND', message: 'OpenSSL no encontrado. Puedes instalarlo con winget.' }
      };
    } catch {
      // winget not available
    }

    return { 
      success: false, 
      error: { code: 'NOT_FOUND', message: 'OpenSSL no encontrado. Descárgalo de https://slproweb.com/products/Win32OpenSSL.html' }
    };
  });

  ipcMain.handle('openssl:install', async () => {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Check if winget is available
      await execAsync('winget --version', { timeout: 5000 });
      
      // Install OpenSSL using winget (runs in background, user sees UAC prompt)
      const installProcess = require('child_process').spawn(
        'cmd.exe',
        ['/c', 'start', '/wait', 'winget', 'install', 'ShiningLight.OpenSSL', '--accept-package-agreements', '--accept-source-agreements'],
        { detached: true, shell: true }
      );
      
      installProcess.unref();
      
      return { 
        success: true, 
        data: { 
          message: 'Instalación iniciada. Se abrirá una ventana de instalación. Una vez completada, pulsa "Detectar" para encontrar la ruta.',
          expectedPath: 'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe'
        }
      };
    } catch {
      return { 
        success: false, 
        error: { 
          code: 'INSTALL_FAILED', 
          message: 'No se pudo iniciar la instalación. Winget no está disponible. Descarga OpenSSL manualmente desde https://slproweb.com/products/Win32OpenSSL.html' 
        }
      };
    }
  });
}

app.whenReady().then(() => {
  initializeServices();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
