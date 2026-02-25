import type {
  CertificateValidation,
  ValidationWarning,
  ValidationError,
  KeyUsageFlags,
  SubjectAltName,
} from '@cert-manager/shared';
import { VALIDATION_CODES, VALIDATION_MESSAGES } from '@cert-manager/shared';

export interface ValidationOptions {
  templateType?: 'server' | 'client' | 'ca' | 'csr' | 'custom';
  isCA?: boolean;
  sanList?: SubjectAltName[];
  keyUsage?: KeyUsageFlags;
  extendedKeyUsage?: string[];
  validityDays?: number;
  algorithm?: string;
}

export class ValidationService {
  validateCertificateOptions(options: ValidationOptions): CertificateValidation {
    const warnings: ValidationWarning[] = [];
    const errors: ValidationError[] = [];

    if (options.templateType === 'server' || 
        options.extendedKeyUsage?.includes('serverAuth')) {
      if (!options.sanList || options.sanList.length === 0) {
        warnings.push({
          code: VALIDATION_CODES.SERVER_WITHOUT_SAN,
          message: VALIDATION_MESSAGES.SERVER_WITHOUT_SAN,
          field: 'sanList',
        });
      }
    }

    if (!options.sanList || options.sanList.length === 0) {
      if (options.templateType !== 'ca' && options.templateType !== 'client') {
        warnings.push({
          code: VALIDATION_CODES.SAN_RECOMMENDED,
          message: VALIDATION_MESSAGES.SAN_RECOMMENDED,
          field: 'sanList',
        });
      }
    }

    if (options.isCA && options.keyUsage) {
      if (!options.keyUsage.keyCertSign) {
        errors.push({
          code: VALIDATION_CODES.CA_WITHOUT_KEYCERTSIGN,
          message: VALIDATION_MESSAGES.CA_WITHOUT_KEYCERTSIGN,
          field: 'keyUsage',
        });
      }
    }

    if (options.validityDays) {
      if (options.validityDays < 30) {
        warnings.push({
          code: VALIDATION_CODES.SHORT_VALIDITY,
          message: VALIDATION_MESSAGES.SHORT_VALIDITY,
          field: 'validityDays',
        });
      }

      if (options.templateType !== 'ca' && options.validityDays > 825) {
        warnings.push({
          code: VALIDATION_CODES.LONG_VALIDITY,
          message: VALIDATION_MESSAGES.LONG_VALIDITY,
          field: 'validityDays',
        });
      }
    }

    if (options.algorithm) {
      if (options.algorithm === 'RSA-1024' || options.algorithm.includes('MD5')) {
        errors.push({
          code: VALIDATION_CODES.WEAK_ALGORITHM,
          message: VALIDATION_MESSAGES.WEAK_ALGORITHM,
          field: 'algorithm',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  validateOID(oid: string): boolean {
    const oidRegex = /^[0-9]+(\.[0-9]+)+$/;
    return oidRegex.test(oid);
  }

  validateSAN(san: SubjectAltName): ValidationError | null {
    switch (san.type) {
      case 'DNS':
        if (!this.isValidDNS(san.value)) {
          return {
            code: 'INVALID_DNS',
            message: `DNS inválido: ${san.value}`,
            field: 'sanList',
          };
        }
        break;
      case 'IP':
        if (!this.isValidIP(san.value)) {
          return {
            code: 'INVALID_IP',
            message: `Dirección IP inválida: ${san.value}`,
            field: 'sanList',
          };
        }
        break;
      case 'email':
        if (!this.isValidEmail(san.value)) {
          return {
            code: 'INVALID_EMAIL',
            message: `Email inválido: ${san.value}`,
            field: 'sanList',
          };
        }
        break;
      case 'URI':
        if (!this.isValidURI(san.value)) {
          return {
            code: 'INVALID_URI',
            message: `URI inválido: ${san.value}`,
            field: 'sanList',
          };
        }
        break;
    }
    return null;
  }

  private isValidDNS(value: string): boolean {
    const dnsRegex = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)$/;
    return dnsRegex.test(value);
  }

  private isValidIP(value: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    
    if (ipv4Regex.test(value)) {
      const parts = value.split('.').map(Number);
      return parts.every(part => part >= 0 && part <= 255);
    }
    
    return ipv6Regex.test(value);
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidURI(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  formatValidationMessage(validation: CertificateValidation): string {
    const messages: string[] = [];

    for (const error of validation.errors) {
      messages.push(`❌ Error: ${error.message}`);
    }

    for (const warning of validation.warnings) {
      messages.push(`⚠️ Advertencia: ${warning.message}`);
    }

    return messages.join('\n');
  }
}
