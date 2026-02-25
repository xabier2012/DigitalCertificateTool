export interface PKCS12CreateOptions {
  certPath: string;
  keyPath: string;
  keyPassword?: string;
  chainPath?: string;
  outputPath: string;
  p12Password: string;
  friendlyName?: string;
}

export interface PKCS12Info {
  hasCertificate: boolean;
  hasPrivateKey: boolean;
  hasChain: boolean;
  chainLength: number;
  friendlyName?: string;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
}

export interface PKCS12ExtractOptions {
  p12Path: string;
  p12Password: string;
  outputDir: string;
  extractCert?: boolean;
  extractKey?: boolean;
  extractChain?: boolean;
  keyPassword?: string;
  certFormat?: 'PEM' | 'DER';
}

export interface PKCS12ExtractResult {
  certPath?: string;
  keyPath?: string;
  chainPath?: string;
  chainCerts?: string[];
}

export interface PKCS7CreateOptions {
  certPaths: string[];
  outputPath: string;
}

export interface PKCS7Info {
  certificateCount: number;
  certificates: PKCS7CertInfo[];
}

export interface PKCS7CertInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
}

export interface PKCS7ExtractOptions {
  p7bPath: string;
  outputDir: string;
  outputFormat?: 'individual' | 'chain';
}

export interface PKCS7ExtractResult {
  certPaths: string[];
  chainPath?: string;
}

export interface CertificateValidation {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export const VALIDATION_CODES = {
  SAN_MISSING: 'SAN_MISSING',
  SAN_RECOMMENDED: 'SAN_RECOMMENDED',
  WEAK_ALGORITHM: 'WEAK_ALGORITHM',
  SHORT_VALIDITY: 'SHORT_VALIDITY',
  LONG_VALIDITY: 'LONG_VALIDITY',
  CA_WITHOUT_KEYCERTSIGN: 'CA_WITHOUT_KEYCERTSIGN',
  SERVER_WITHOUT_SAN: 'SERVER_WITHOUT_SAN',
  INVALID_OID: 'INVALID_OID',
  NO_PRIVATE_KEY: 'NO_PRIVATE_KEY',
  CHAIN_INCOMPLETE: 'CHAIN_INCOMPLETE',
  CHAIN_INVALID: 'CHAIN_INVALID',
  CA_NOT_CONFIGURED: 'CA_NOT_CONFIGURED',
} as const;

export const VALIDATION_MESSAGES: Record<string, string> = {
  SAN_MISSING: 'Los navegadores modernos requieren SAN. CN no es suficiente.',
  SAN_RECOMMENDED: 'Se recomienda añadir Subject Alternative Names (SAN).',
  WEAK_ALGORITHM: 'El algoritmo seleccionado se considera débil.',
  SHORT_VALIDITY: 'El período de validez es muy corto.',
  LONG_VALIDITY: 'El período de validez es muy largo para este tipo de certificado.',
  CA_WITHOUT_KEYCERTSIGN: 'Un certificado CA debe tener el flag keyCertSign.',
  SERVER_WITHOUT_SAN: 'Un certificado de servidor requiere al menos un SAN (DNS o IP).',
  INVALID_OID: 'OID inválido. Ejemplo válido: 1.3.6.1.5.5.7.3.2',
  NO_PRIVATE_KEY: 'Un archivo .cer no contiene clave privada.',
  CHAIN_INCOMPLETE: 'La cadena de certificados está incompleta.',
  CHAIN_INVALID: 'La cadena de certificados no es válida.',
  CA_NOT_CONFIGURED: 'Primero crea o importa una CA local (Root/Intermediate).',
};
