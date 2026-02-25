import type { AppSettings } from './settings';
import type {
  CertificateInfo,
  CertificateDetectionResult,
  CSRGenerationOptions,
  SelfSignedGenerationOptions,
  ConversionOptions,
} from './certificate';
import type { OperationResult, OperationLogEntry } from './operations';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface IpcChannels {
  'settings:get': () => Promise<AppSettings>;
  'settings:set': (settings: Partial<AppSettings>) => Promise<void>;
  'settings:getOutputDir': () => Promise<string>;

  'openssl:test': (path: string) => Promise<OperationResult<string>>;
  'openssl:inspect': (
    filePath: string,
    password?: string
  ) => Promise<OperationResult<CertificateInfo>>;
  'openssl:convert': (options: ConversionOptions) => Promise<OperationResult<string>>;
  'openssl:extractPublicKey': (
    certPath: string,
    outputPath: string
  ) => Promise<OperationResult<string>>;
  'openssl:generateCSR': (
    options: CSRGenerationOptions
  ) => Promise<OperationResult<{ keyPath: string; csrPath: string; readmePath: string }>>;
  'openssl:generateSelfSigned': (
    options: SelfSignedGenerationOptions
  ) => Promise<OperationResult<{ keyPath: string; certPath: string }>>;
  'openssl:detectFormat': (
    filePath: string
  ) => Promise<OperationResult<CertificateDetectionResult>>;

  'jdk:test': (path: string) => Promise<OperationResult<string>>;

  'dialog:selectFile': (
    filters?: FileFilter[]
  ) => Promise<OperationResult<string>>;
  'dialog:selectDirectory': () => Promise<OperationResult<string>>;
  'dialog:saveFile': (
    defaultPath?: string,
    filters?: FileFilter[]
  ) => Promise<OperationResult<string>>;

  'shell:openPath': (path: string) => Promise<void>;
  'shell:showItemInFolder': (path: string) => Promise<void>;

  'logs:get': () => Promise<OperationLogEntry[]>;
  'logs:clear': () => Promise<void>;
}

export type IpcChannel = keyof IpcChannels;
