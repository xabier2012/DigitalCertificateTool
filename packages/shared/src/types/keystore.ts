export type KeystoreType = 'JKS' | 'JCEKS' | 'PKCS12';

export type KeystoreEntryType = 'PrivateKeyEntry' | 'TrustedCertEntry' | 'SecretKeyEntry';

export interface KeystoreEntry {
  alias: string;
  type: KeystoreEntryType;
  creationDate: string;
  algorithm?: string;
  keySize?: number;
  certificateChainLength?: number;
  expirationDate?: string;
  daysUntilExpiration?: number;
  subject?: string;
  issuer?: string;
  serialNumber?: string;
}

export interface KeystoreInfo {
  path: string;
  type: KeystoreType;
  entries: KeystoreEntry[];
  entryCount: number;
}

export interface CreateKeystoreOptions {
  path: string;
  type: KeystoreType;
  password: string;
}

export interface OpenKeystoreOptions {
  path: string;
  password: string;
}

export interface GenerateKeypairOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
  algorithm: 'RSA' | 'EC';
  keySize?: number;
  curve?: string;
  validity: number;
  dname: string;
  keyPassword?: string;
}

export interface GenerateCSRFromKeystoreOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
  keyPassword?: string;
  outputPath: string;
}

export interface ImportCertOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
  certPath: string;
  trustCACerts?: boolean;
}

export interface ImportP12Options {
  keystorePath: string;
  keystorePassword: string;
  p12Path: string;
  p12Password: string;
  destAlias?: string;
  srcAlias?: string;
}

export interface ImportSignedCertOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
  certPath: string;
  keyPassword?: string;
}

export interface ExportCertOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
  outputPath: string;
  format?: 'PEM' | 'DER';
}

export interface DeleteAliasOptions {
  keystorePath: string;
  keystorePassword: string;
  alias: string;
}

export interface RenameAliasOptions {
  keystorePath: string;
  keystorePassword: string;
  oldAlias: string;
  newAlias: string;
  keyPassword?: string;
}

export interface ConvertKeystoreOptions {
  srcPath: string;
  srcPassword: string;
  srcType: KeystoreType;
  destPath: string;
  destPassword: string;
  destType: KeystoreType;
}

export interface ChangePasswordOptions {
  keystorePath: string;
  oldPassword: string;
  newPassword: string;
  alias?: string;
}

export const KEYSTORE_ERROR_CODES = {
  KEYSTORE_NOT_FOUND: 'KEYSTORE_NOT_FOUND',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  ALIAS_EXISTS: 'ALIAS_EXISTS',
  ALIAS_NOT_FOUND: 'ALIAS_NOT_FOUND',
  KEYTOOL_NOT_CONFIGURED: 'KEYTOOL_NOT_CONFIGURED',
  KEYTOOL_EXECUTION_FAILED: 'KEYTOOL_EXECUTION_FAILED',
  UNSUPPORTED_KEYSTORE_TYPE: 'UNSUPPORTED_KEYSTORE_TYPE',
  CERTIFICATE_NOT_VALID: 'CERTIFICATE_NOT_VALID',
  KEY_PASSWORD_REQUIRED: 'KEY_PASSWORD_REQUIRED',
} as const;

export const KEYSTORE_ERROR_MESSAGES: Record<string, string> = {
  KEYSTORE_NOT_FOUND: 'El archivo keystore no existe.',
  INVALID_PASSWORD: 'Contraseña del keystore incorrecta.',
  ALIAS_EXISTS: 'El alias ya existe en el keystore.',
  ALIAS_NOT_FOUND: 'El alias no existe en el keystore.',
  KEYTOOL_NOT_CONFIGURED: 'keytool no está configurado. Configura la ruta del JDK.',
  KEYTOOL_EXECUTION_FAILED: 'Error al ejecutar keytool.',
  UNSUPPORTED_KEYSTORE_TYPE: 'Tipo de keystore no soportado.',
  CERTIFICATE_NOT_VALID: 'El certificado no es válido.',
  KEY_PASSWORD_REQUIRED: 'Se requiere la contraseña de la clave privada.',
};
