import { describe, it, expect } from 'vitest';
import { ValidationService } from './ValidationService';

describe('ValidationService', () => {
  const validator = new ValidationService();

  describe('validateCertificateOptions', () => {
    it('should warn when server cert has no SAN', () => {
      const result = validator.validateCertificateOptions({
        extendedKeyUsage: ['serverAuth'],
        sanList: [],
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'SERVER_WITHOUT_SAN' })
      );
    });

    it('should not warn when server cert has SAN', () => {
      const result = validator.validateCertificateOptions({
        extendedKeyUsage: ['serverAuth'],
        sanList: [{ type: 'DNS', value: 'example.com' }],
      });

      expect(result.warnings.find(w => w.code === 'SERVER_WITHOUT_SAN')).toBeUndefined();
    });

    it('should error when CA cert missing keyCertSign', () => {
      const result = validator.validateCertificateOptions({
        isCA: true,
        keyUsage: {
          digitalSignature: true,
          contentCommitment: false,
          keyEncipherment: false,
          dataEncipherment: false,
          keyAgreement: false,
          keyCertSign: false,
          cRLSign: true,
          encipherOnly: false,
          decipherOnly: false,
        },
      });

      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'CA_WITHOUT_KEYCERTSIGN' })
      );
      expect(result.isValid).toBe(false);
    });

    it('should pass when CA cert has keyCertSign', () => {
      const result = validator.validateCertificateOptions({
        isCA: true,
        keyUsage: {
          digitalSignature: false,
          contentCommitment: false,
          keyEncipherment: false,
          dataEncipherment: false,
          keyAgreement: false,
          keyCertSign: true,
          cRLSign: true,
          encipherOnly: false,
          decipherOnly: false,
        },
      });

      expect(result.errors.find(e => e.code === 'CA_WITHOUT_KEYCERTSIGN')).toBeUndefined();
    });

    it('should warn for short validity', () => {
      const result = validator.validateCertificateOptions({
        validityDays: 7,
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'SHORT_VALIDITY' })
      );
    });

    it('should warn for long validity on non-CA', () => {
      const result = validator.validateCertificateOptions({
        templateType: 'server',
        validityDays: 1000,
      });

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'LONG_VALIDITY' })
      );
    });

    it('should not warn for long validity on CA', () => {
      const result = validator.validateCertificateOptions({
        templateType: 'ca',
        validityDays: 3650,
      });

      expect(result.warnings.find(w => w.code === 'LONG_VALIDITY')).toBeUndefined();
    });
  });

  describe('validateOID', () => {
    it('should accept valid OIDs', () => {
      expect(validator.validateOID('1.3.6.1.5.5.7.3.1')).toBe(true);
      expect(validator.validateOID('2.16.840.1.113730.4.1')).toBe(true);
      expect(validator.validateOID('1.2.3')).toBe(true);
    });

    it('should reject invalid OIDs', () => {
      expect(validator.validateOID('1')).toBe(false);
      expect(validator.validateOID('1.2.3.a')).toBe(false);
      expect(validator.validateOID('abc')).toBe(false);
      expect(validator.validateOID('')).toBe(false);
    });
  });

  describe('validateSAN', () => {
    it('should accept valid DNS names', () => {
      expect(validator.validateSAN({ type: 'DNS', value: 'example.com' })).toBeNull();
      expect(validator.validateSAN({ type: 'DNS', value: 'www.example.com' })).toBeNull();
      expect(validator.validateSAN({ type: 'DNS', value: '*.example.com' })).toBeNull();
    });

    it('should reject invalid DNS names', () => {
      const result = validator.validateSAN({ type: 'DNS', value: 'invalid..dns' });
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DNS');
    });

    it('should accept valid IP addresses', () => {
      expect(validator.validateSAN({ type: 'IP', value: '192.168.1.1' })).toBeNull();
      expect(validator.validateSAN({ type: 'IP', value: '10.0.0.1' })).toBeNull();
    });

    it('should reject invalid IP addresses', () => {
      const result = validator.validateSAN({ type: 'IP', value: '999.999.999.999' });
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_IP');
    });

    it('should accept valid emails', () => {
      expect(validator.validateSAN({ type: 'email', value: 'user@example.com' })).toBeNull();
    });

    it('should reject invalid emails', () => {
      const result = validator.validateSAN({ type: 'email', value: 'invalid-email' });
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_EMAIL');
    });

    it('should accept valid URIs', () => {
      expect(validator.validateSAN({ type: 'URI', value: 'https://example.com' })).toBeNull();
    });

    it('should reject invalid URIs', () => {
      const result = validator.validateSAN({ type: 'URI', value: 'not-a-uri' });
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_URI');
    });
  });
});
