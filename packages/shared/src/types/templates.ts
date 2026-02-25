export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  isBuiltIn: boolean;
  defaults: TemplateDefaults;
}

export type TemplateCategory =
  | 'server'
  | 'client'
  | 'ca'
  | 'csr'
  | 'custom';

export interface TemplateDefaults {
  isCA: boolean;
  pathLenConstraint?: number;
  keyUsage: KeyUsageFlags;
  extendedKeyUsage: string[];
  validityDays: number;
  algorithm: import('./certificate').KeyAlgorithm;
  sanRequired: boolean;
  signatureHash: SignatureHash;
  subject?: Partial<SubjectDN>;
}

export interface KeyUsageFlags {
  digitalSignature: boolean;
  contentCommitment: boolean;
  keyEncipherment: boolean;
  dataEncipherment: boolean;
  keyAgreement: boolean;
  keyCertSign: boolean;
  cRLSign: boolean;
  encipherOnly: boolean;
  decipherOnly: boolean;
}

export interface SubjectDN {
  CN: string;
  O?: string;
  OU?: string;
  L?: string;
  ST?: string;
  C?: string;
  emailAddress?: string;
  serialNumber?: string;
}

export type SignatureHash = 'SHA-256' | 'SHA-384' | 'SHA-512';

export const DEFAULT_KEY_USAGE: KeyUsageFlags = {
  digitalSignature: false,
  contentCommitment: false,
  keyEncipherment: false,
  dataEncipherment: false,
  keyAgreement: false,
  keyCertSign: false,
  cRLSign: false,
  encipherOnly: false,
  decipherOnly: false,
};

export const BUILT_IN_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tls-server',
    name: 'TLS Servidor (serverAuth)',
    description: 'Certificado para servidor web HTTPS',
    category: 'server',
    isBuiltIn: true,
    defaults: {
      isCA: false,
      keyUsage: {
        ...DEFAULT_KEY_USAGE,
        digitalSignature: true,
        keyEncipherment: true,
      },
      extendedKeyUsage: ['serverAuth'],
      validityDays: 365,
      algorithm: 'RSA-2048',
      sanRequired: true,
      signatureHash: 'SHA-256',
    },
  },
  {
    id: 'tls-client',
    name: 'TLS Cliente / Certificado personal (clientAuth)',
    description: 'Certificado para autenticación de cliente',
    category: 'client',
    isBuiltIn: true,
    defaults: {
      isCA: false,
      keyUsage: {
        ...DEFAULT_KEY_USAGE,
        digitalSignature: true,
        contentCommitment: true,
        keyEncipherment: true,
      },
      extendedKeyUsage: ['clientAuth'],
      validityDays: 365,
      algorithm: 'RSA-2048',
      sanRequired: false,
      signatureHash: 'SHA-256',
    },
  },
  {
    id: 'root-ca',
    name: 'Root CA',
    description: 'Autoridad de Certificación raíz autofirmada',
    category: 'ca',
    isBuiltIn: true,
    defaults: {
      isCA: true,
      pathLenConstraint: undefined,
      keyUsage: {
        ...DEFAULT_KEY_USAGE,
        keyCertSign: true,
        cRLSign: true,
      },
      extendedKeyUsage: [],
      validityDays: 3650,
      algorithm: 'RSA-4096',
      sanRequired: false,
      signatureHash: 'SHA-256',
    },
  },
  {
    id: 'intermediate-ca',
    name: 'Intermediate CA',
    description: 'Autoridad de Certificación intermedia',
    category: 'ca',
    isBuiltIn: true,
    defaults: {
      isCA: true,
      pathLenConstraint: 0,
      keyUsage: {
        ...DEFAULT_KEY_USAGE,
        keyCertSign: true,
        cRLSign: true,
      },
      extendedKeyUsage: [],
      validityDays: 1825,
      algorithm: 'RSA-4096',
      sanRequired: false,
      signatureHash: 'SHA-256',
    },
  },
  {
    id: 'csr-external',
    name: 'CSR para CA externa (recomendado)',
    description: 'Solicitud de certificado para enviar a CA externa (FNMT, Let\'s Encrypt, etc.)',
    category: 'csr',
    isBuiltIn: true,
    defaults: {
      isCA: false,
      keyUsage: {
        ...DEFAULT_KEY_USAGE,
        digitalSignature: true,
        keyEncipherment: true,
      },
      extendedKeyUsage: ['serverAuth', 'clientAuth'],
      validityDays: 365,
      algorithm: 'RSA-2048',
      sanRequired: true,
      signatureHash: 'SHA-256',
    },
  },
];

export const EKU_OPTIONS: { value: string; label: string; oid: string }[] = [
  { value: 'serverAuth', label: 'TLS Web Server Authentication', oid: '1.3.6.1.5.5.7.3.1' },
  { value: 'clientAuth', label: 'TLS Web Client Authentication', oid: '1.3.6.1.5.5.7.3.2' },
  { value: 'codeSigning', label: 'Code Signing', oid: '1.3.6.1.5.5.7.3.3' },
  { value: 'emailProtection', label: 'Email Protection (S/MIME)', oid: '1.3.6.1.5.5.7.3.4' },
  { value: 'timeStamping', label: 'Time Stamping', oid: '1.3.6.1.5.5.7.3.8' },
  { value: 'OCSPSigning', label: 'OCSP Signing', oid: '1.3.6.1.5.5.7.3.9' },
];
