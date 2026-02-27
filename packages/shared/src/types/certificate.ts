import type { KeyUsageFlags, SignatureHash } from './templates';

export interface CertificateInfo {
  subject: SubjectInfo;
  issuer: SubjectInfo;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  algorithm: string;
  keySize: number;
  version: number;
  isCA: boolean;
  keyUsage: string[];
  extendedKeyUsage: string[];
  fingerprints: {
    sha256: string;
    sha1: string;
  };
  subjectAltNames: SubjectAltName[];
  rawText: string;
}

export interface SubjectInfo {
  CN?: string;
  O?: string;
  OU?: string;
  C?: string;
  ST?: string;
  L?: string;
  emailAddress?: string;
  raw: string;
}

export interface SubjectAltName {
  type: 'DNS' | 'IP' | 'email' | 'URI' | 'other';
  value: string;
}

export type CertificateFormat = 'PEM' | 'DER' | 'PKCS12' | 'PKCS7' | 'UNKNOWN';

export interface CertificateDetectionResult {
  format: CertificateFormat;
  hasMultipleBlocks: boolean;
  isEncrypted: boolean;
  blockTypes: string[];
}

export type KeyAlgorithm = 'RSA-2048' | 'RSA-4096' | 'ECC-P256' | 'ECC-P384';

export interface CSRGenerationOptions {
  subject: {
    CN: string;
    C?: string;
    ST?: string;
    L?: string;
    O?: string;
    OU?: string;
    emailAddress?: string;
    serialNumber?: string;
  };
  sanList: SubjectAltName[];
  algorithm: KeyAlgorithm;
  keyPassword?: string;
  outputDir: string;
  keyFileName?: string;
  csrFileName?: string;
  signatureHash?: SignatureHash;
  keyUsage?: KeyUsageFlags;
  extendedKeyUsage?: string[];
}

export interface SelfSignedGenerationOptions extends CSRGenerationOptions {
  validityDays: number;
  certFileName?: string;
  isCA?: boolean;
  pathLenConstraint?: number;
}

export interface CSRInfo {
  subject: SubjectInfo;
  algorithm: string;
  keySize: number;
  subjectAltNames: SubjectAltName[];
  keyUsage: string[];
  extendedKeyUsage: string[];
  isCA: boolean;
  rawText: string;
}

export interface ConversionOptions {
  inputPath: string;
  inputFormat: CertificateFormat;
  outputFormat: 'PEM' | 'DER';
  outputPath: string;
  password?: string;
}
