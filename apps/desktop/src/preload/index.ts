import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  OperationResult,
  CertificateInfo,
  CSRInfo,
  CertificateDetectionResult,
  CSRGenerationOptions,
  SelfSignedGenerationOptions,
  ConversionOptions,
  OperationLogEntry,
  RootCAGenerationOptions,
  IntermediateCAGenerationOptions,
  SignCSROptions,
  RootCAResult,
  IntermediateCAResult,
  SignCSRResult,
  PKCS12CreateOptions,
  PKCS12Info,
  PKCS12ExtractOptions,
  PKCS12ExtractResult,
  PKCS7CreateOptions,
  PKCS7Info,
  PKCS7ExtractOptions,
  PKCS7ExtractResult,
  KeystoreInfo,
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
  ExpirationReport,
  BatchImportTruststoreOptions,
  BatchResult,
} from '@cert-manager/shared';

export interface ElectronAPI {
  settings: {
    get: () => Promise<AppSettings>;
    set: (settings: Partial<AppSettings>) => Promise<void>;
    getOutputDir: () => Promise<string>;
  };
  openssl: {
    test: (path: string) => Promise<OperationResult<string>>;
    inspect: (filePath: string, password?: string) => Promise<OperationResult<CertificateInfo>>;
    detectFormat: (filePath: string) => Promise<OperationResult<CertificateDetectionResult>>;
    convert: (options: ConversionOptions) => Promise<OperationResult<string>>;
    extractPublicKey: (certPath: string, outputPath: string) => Promise<OperationResult<string>>;
    generateCSR: (
      options: CSRGenerationOptions
    ) => Promise<OperationResult<{ keyPath: string; csrPath: string; readmePath: string }>>;
    generateSelfSigned: (
      options: SelfSignedGenerationOptions
    ) => Promise<OperationResult<{ keyPath: string; certPath: string }>>;
    inspectCSR: (filePath: string) => Promise<OperationResult<CSRInfo>>;
    findInDirectory: (dirPath: string) => Promise<OperationResult<string>>;
    detect: () => Promise<OperationResult<{ path: string; version: string } | { canInstall: boolean; method: string }>>;
    install: () => Promise<OperationResult<{ message: string; expectedPath: string }>>;
  };
  ca: {
    generateRoot: (options: RootCAGenerationOptions) => Promise<OperationResult<RootCAResult>>;
    generateIntermediate: (options: IntermediateCAGenerationOptions) => Promise<OperationResult<IntermediateCAResult>>;
    signCSR: (options: SignCSROptions) => Promise<OperationResult<SignCSRResult>>;
  };
  pkcs12: {
    create: (options: PKCS12CreateOptions) => Promise<OperationResult<string>>;
    inspect: (p12Path: string, password: string) => Promise<OperationResult<PKCS12Info>>;
    extract: (options: PKCS12ExtractOptions) => Promise<OperationResult<PKCS12ExtractResult>>;
  };
  pkcs7: {
    create: (options: PKCS7CreateOptions) => Promise<OperationResult<string>>;
    createFromChain: (chainPath: string, outputPath: string) => Promise<OperationResult<string>>;
    inspect: (p7bPath: string) => Promise<OperationResult<PKCS7Info>>;
    extract: (options: PKCS7ExtractOptions) => Promise<OperationResult<PKCS7ExtractResult>>;
  };
  jdk: {
    test: (path: string) => Promise<OperationResult<string>>;
  };
  dialog: {
    selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<OperationResult<string>>;
    selectDirectory: () => Promise<OperationResult<string>>;
    saveFile: (
      defaultPath?: string,
      filters?: { name: string; extensions: string[] }[]
    ) => Promise<OperationResult<string>>;
  };
  shell: {
    openPath: (path: string) => Promise<void>;
    showItemInFolder: (path: string) => Promise<void>;
  };
  logs: {
    get: () => Promise<OperationLogEntry[]>;
    clear: () => Promise<void>;
  };
  keystore: {
    create: (options: CreateKeystoreOptions) => Promise<OperationResult<string>>;
    open: (options: OpenKeystoreOptions) => Promise<OperationResult<KeystoreInfo>>;
    generateKeypair: (options: GenerateKeypairOptions) => Promise<OperationResult<string>>;
    generateCSR: (options: GenerateCSRFromKeystoreOptions) => Promise<OperationResult<string>>;
    importCert: (options: ImportCertOptions) => Promise<OperationResult<string>>;
    importP12: (options: ImportP12Options) => Promise<OperationResult<string>>;
    importSignedCert: (options: ImportSignedCertOptions) => Promise<OperationResult<string>>;
    exportCert: (options: ExportCertOptions) => Promise<OperationResult<string>>;
    deleteAlias: (options: DeleteAliasOptions) => Promise<OperationResult<void>>;
    renameAlias: (options: RenameAliasOptions) => Promise<OperationResult<string>>;
    convert: (options: ConvertKeystoreOptions) => Promise<OperationResult<string>>;
  };
  batch: {
    convert: (options: BatchConvertOptions) => Promise<OperationResult<BatchResult>>;
    extractPublicKeys: (options: BatchExtractPublicOptions) => Promise<OperationResult<BatchResult>>;
    expirationReport: (options: ExpirationReportOptions) => Promise<OperationResult<ExpirationReport>>;
    importTruststore: (options: BatchImportTruststoreOptions) => Promise<OperationResult<BatchResult>>;
  };
}

const electronAPI: ElectronAPI = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings),
    getOutputDir: () => ipcRenderer.invoke('settings:getOutputDir'),
  },
  openssl: {
    test: (path) => ipcRenderer.invoke('openssl:test', path),
    inspect: (filePath, password) => ipcRenderer.invoke('openssl:inspect', filePath, password),
    detectFormat: (filePath) => ipcRenderer.invoke('openssl:detectFormat', filePath),
    convert: (options) => ipcRenderer.invoke('openssl:convert', options),
    extractPublicKey: (certPath, outputPath) =>
      ipcRenderer.invoke('openssl:extractPublicKey', certPath, outputPath),
    generateCSR: (options) => ipcRenderer.invoke('openssl:generateCSR', options),
    generateSelfSigned: (options) => ipcRenderer.invoke('openssl:generateSelfSigned', options),
    inspectCSR: (filePath) => ipcRenderer.invoke('openssl:inspectCSR', filePath),
    findInDirectory: (dirPath) => ipcRenderer.invoke('openssl:findInDirectory', dirPath),
    detect: () => ipcRenderer.invoke('openssl:detect'),
    install: () => ipcRenderer.invoke('openssl:install'),
  },
  ca: {
    generateRoot: (options) => ipcRenderer.invoke('ca:generateRoot', options),
    generateIntermediate: (options) => ipcRenderer.invoke('ca:generateIntermediate', options),
    signCSR: (options) => ipcRenderer.invoke('ca:signCSR', options),
  },
  pkcs12: {
    create: (options) => ipcRenderer.invoke('pkcs12:create', options),
    inspect: (p12Path, password) => ipcRenderer.invoke('pkcs12:inspect', p12Path, password),
    extract: (options) => ipcRenderer.invoke('pkcs12:extract', options),
  },
  pkcs7: {
    create: (options) => ipcRenderer.invoke('pkcs7:create', options),
    createFromChain: (chainPath, outputPath) => ipcRenderer.invoke('pkcs7:createFromChain', chainPath, outputPath),
    inspect: (p7bPath) => ipcRenderer.invoke('pkcs7:inspect', p7bPath),
    extract: (options) => ipcRenderer.invoke('pkcs7:extract', options),
  },
  jdk: {
    test: (path) => ipcRenderer.invoke('jdk:test', path),
  },
  dialog: {
    selectFile: (filters) => ipcRenderer.invoke('dialog:selectFile', filters),
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
    saveFile: (defaultPath, filters) => ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
    showItemInFolder: (path) => ipcRenderer.invoke('shell:showItemInFolder', path),
  },
  logs: {
    get: () => ipcRenderer.invoke('logs:get'),
    clear: () => ipcRenderer.invoke('logs:clear'),
  },
  keystore: {
    create: (options) => ipcRenderer.invoke('keystore:create', options),
    open: (options) => ipcRenderer.invoke('keystore:open', options),
    generateKeypair: (options) => ipcRenderer.invoke('keystore:generateKeypair', options),
    generateCSR: (options) => ipcRenderer.invoke('keystore:generateCSR', options),
    importCert: (options) => ipcRenderer.invoke('keystore:importCert', options),
    importP12: (options) => ipcRenderer.invoke('keystore:importP12', options),
    importSignedCert: (options) => ipcRenderer.invoke('keystore:importSignedCert', options),
    exportCert: (options) => ipcRenderer.invoke('keystore:exportCert', options),
    deleteAlias: (options) => ipcRenderer.invoke('keystore:deleteAlias', options),
    renameAlias: (options) => ipcRenderer.invoke('keystore:renameAlias', options),
    convert: (options) => ipcRenderer.invoke('keystore:convert', options),
  },
  batch: {
    convert: (options) => ipcRenderer.invoke('batch:convert', options),
    extractPublicKeys: (options) => ipcRenderer.invoke('batch:extractPublicKeys', options),
    expirationReport: (options) => ipcRenderer.invoke('batch:expirationReport', options),
    importTruststore: (options) => ipcRenderer.invoke('batch:importTruststore', options),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
