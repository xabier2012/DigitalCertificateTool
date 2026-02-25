import type { KeyAlgorithm, SubjectAltName } from './certificate';
import type { KeyUsageFlags, SignatureHash, SubjectDN } from './templates';

export interface LocalCAInfo {
  id: string;
  name: string;
  type: 'root' | 'intermediate';
  subject: SubjectDN;
  certPath: string;
  keyPath: string;
  createdAt: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  parentCAId?: string;
}

export interface RootCAGenerationOptions {
  subject: SubjectDN;
  algorithm: KeyAlgorithm;
  validityDays: number;
  keyPassword: string;
  outputDir: string;
  signatureHash?: SignatureHash;
}

export interface IntermediateCAGenerationOptions {
  subject: SubjectDN;
  algorithm: KeyAlgorithm;
  validityDays: number;
  keyPassword: string;
  rootCAKeyPath: string;
  rootCACertPath: string;
  rootCAKeyPassword: string;
  outputDir: string;
  pathLenConstraint?: number;
  signatureHash?: SignatureHash;
}

export interface SignCSROptions {
  csrPath: string;
  caCertPath: string;
  caKeyPath: string;
  caKeyPassword: string;
  outputDir: string;
  validityDays: number;
  isCA?: boolean;
  pathLenConstraint?: number;
  keyUsage?: KeyUsageFlags;
  extendedKeyUsage?: string[];
  sanList?: SubjectAltName[];
  signatureHash?: SignatureHash;
  serialNumber?: string;
  chainCertPath?: string;
}

export interface SignCSRResult {
  certPath: string;
  chainPath?: string;
}

export interface RootCAResult {
  keyPath: string;
  certPath: string;
  derCertPath?: string;
  p7bPath?: string;
}

export interface IntermediateCAResult {
  keyPath: string;
  certPath: string;
  chainPath: string;
}
