export interface AppSettings {
  opensslPath: string;
  jdkRootPath: string;
  defaultOutputDir: string;
  savePasswords: boolean;
  setupCompleted: boolean;
  recentFiles: RecentFile[];
  language: 'es' | 'en';
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
};

export interface SecurityPreferences {
  savePasswords: boolean;
  clearPasswordsOnExit: boolean;
}
