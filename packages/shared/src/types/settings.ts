export interface AppSettings {
  opensslPath: string;
  jdkRootPath: string;
  defaultOutputDir: string;
  savePasswords: boolean;
  setupCompleted: boolean;
  recentFiles: RecentFile[];
  language: 'es' | 'en';
  customTemplates: import('./templates').CertificateTemplate[];
  localCAs: import('./ca').LocalCAInfo[];
}

export interface RecentFile {
  path: string;
  name: string;
  type: CertificateFileType;
  lastAccessed: string;
}

export type CertificateFileType =
  | 'cer'
  | 'crt'
  | 'pem'
  | 'der'
  | 'p12'
  | 'pfx'
  | 'key'
  | 'csr'
  | 'unknown';

export const DEFAULT_SETTINGS: AppSettings = {
  opensslPath: '',
  jdkRootPath: '',
  defaultOutputDir: '',
  savePasswords: false,
  setupCompleted: false,
  recentFiles: [],
  language: 'es',
  customTemplates: [],
  localCAs: [],
};

export interface SecurityPreferences {
  savePasswords: boolean;
  clearPasswordsOnExit: boolean;
}
