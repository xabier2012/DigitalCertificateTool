import { describe, it, expect, beforeEach } from 'vitest';
import { LocalCAService } from './LocalCAService';

describe('LocalCAService', () => {
  let caService: LocalCAService;

  beforeEach(() => {
    caService = new LocalCAService('/usr/bin/openssl');
  });

  describe('generateRootCAConfig', () => {
    it('should generate valid OpenSSL config for Root CA', () => {
      const config = (caService as any).generateRootCAConfig({
        subject: {
          CN: 'Test Root CA',
          O: 'Test Org',
          C: 'ES',
        },
        signatureHash: 'SHA-256',
      });

      expect(config).toContain('CN = Test Root CA');
      expect(config).toContain('O = Test Org');
      expect(config).toContain('C = ES');
      expect(config).toContain('CA:TRUE');
      expect(config).toContain('keyCertSign');
      expect(config).toContain('cRLSign');
    });

    it('should handle optional subject fields', () => {
      const config = (caService as any).generateRootCAConfig({
        subject: {
          CN: 'Minimal CA',
        },
        signatureHash: 'SHA-256',
      });

      expect(config).toContain('CN = Minimal CA');
      expect(config).not.toContain('O =');
      expect(config).not.toContain('C =');
    });
  });

  describe('generateCASigningConfig', () => {
    it('should generate config with pathLen constraint', () => {
      const config = (caService as any).generateCASigningConfig(0);

      expect(config).toContain('CA:TRUE, pathlen:0');
    });

    it('should generate config without pathLen when undefined', () => {
      const config = (caService as any).generateCASigningConfig(undefined);

      expect(config).toContain('CA:TRUE');
      expect(config).not.toContain('pathlen');
    });
  });

  describe('generateSignCSRConfig', () => {
    it('should generate config for end-entity certificate', () => {
      const config = (caService as any).generateSignCSRConfig({
        isCA: false,
        keyUsage: {
          digitalSignature: true,
          keyEncipherment: true,
          keyCertSign: false,
          cRLSign: false,
        },
        extendedKeyUsage: ['serverAuth', 'clientAuth'],
        sanList: [
          { type: 'DNS', value: 'example.com' },
          { type: 'IP', value: '192.168.1.1' },
        ],
      });

      expect(config).toContain('CA:FALSE');
      expect(config).toContain('digitalSignature');
      expect(config).toContain('keyEncipherment');
      expect(config).toContain('serverAuth, clientAuth');
      expect(config).toContain('DNS.1 = example.com');
      expect(config).toContain('IP.1 = 192.168.1.1');
    });

    it('should generate config for CA certificate', () => {
      const config = (caService as any).generateSignCSRConfig({
        isCA: true,
        pathLenConstraint: 0,
        keyUsage: {
          keyCertSign: true,
          cRLSign: true,
        },
      });

      expect(config).toContain('CA:TRUE, pathlen:0');
      expect(config).toContain('keyCertSign');
      expect(config).toContain('cRLSign');
    });
  });

  describe('formatKeyUsage', () => {
    it('should format key usage flags correctly', () => {
      const result = (caService as any).formatKeyUsage({
        digitalSignature: true,
        contentCommitment: true,
        keyEncipherment: true,
        dataEncipherment: false,
        keyAgreement: false,
        keyCertSign: false,
        cRLSign: false,
        encipherOnly: false,
        decipherOnly: false,
      });

      expect(result).toBe('digitalSignature, nonRepudiation, keyEncipherment');
    });

    it('should return empty string for no flags', () => {
      const result = (caService as any).formatKeyUsage({
        digitalSignature: false,
        contentCommitment: false,
        keyEncipherment: false,
        dataEncipherment: false,
        keyAgreement: false,
        keyCertSign: false,
        cRLSign: false,
        encipherOnly: false,
        decipherOnly: false,
      });

      expect(result).toBe('');
    });
  });
});
