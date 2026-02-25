import { describe, it, expect, beforeEach } from 'vitest';
import { KeystoreService } from './KeystoreService';

describe('KeystoreService', () => {
  let keystoreService: KeystoreService;

  beforeEach(() => {
    keystoreService = new KeystoreService('/path/to/jdk');
  });

  describe('parseKeystoreList', () => {
    it('should parse PrivateKeyEntry correctly', () => {
      const output = `
Keystore type: JKS
Keystore provider: SUN

Your keystore contains 1 entry

Alias name: myserver
Creation date: Jan 15, 2024
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=localhost, O=Test Org, C=US
Issuer: CN=localhost, O=Test Org, C=US
Serial number: 123456
Valid from: Mon Jan 15 10:00:00 CET 2024 until: Tue Jan 14 10:00:00 CET 2025
`;

      const entries = (keystoreService as any).parseKeystoreList(output);

      expect(entries).toHaveLength(1);
      expect(entries[0].alias).toBe('myserver');
      expect(entries[0].type).toBe('PrivateKeyEntry');
      expect(entries[0].certificateChainLength).toBe(1);
      expect(entries[0].subject).toContain('CN=localhost');
    });

    it('should parse TrustedCertEntry correctly', () => {
      const output = `
Alias name: cacert
Creation date: Jan 1, 2024
Entry type: trustedCertEntry

Owner: CN=Root CA, O=CA Org, C=US
Issuer: CN=Root CA, O=CA Org, C=US
`;

      const entries = (keystoreService as any).parseKeystoreList(output);

      expect(entries).toHaveLength(1);
      expect(entries[0].alias).toBe('cacert');
      expect(entries[0].type).toBe('TrustedCertEntry');
    });

    it('should parse multiple entries', () => {
      const output = `
Alias name: server1
Creation date: Jan 1, 2024
Entry type: PrivateKeyEntry

Alias name: ca1
Creation date: Jan 2, 2024
Entry type: trustedCertEntry

Alias name: server2
Creation date: Jan 3, 2024
Entry type: PrivateKeyEntry
`;

      const entries = (keystoreService as any).parseKeystoreList(output);

      expect(entries).toHaveLength(3);
      expect(entries[0].alias).toBe('server1');
      expect(entries[1].alias).toBe('ca1');
      expect(entries[2].alias).toBe('server2');
    });
  });

  describe('detectKeystoreType', () => {
    it('should detect JKS from output', () => {
      const output = 'Keystore type: JKS';
      const result = (keystoreService as any).detectKeystoreType(output, '/path/to/keystore.jks');
      expect(result).toBe('JKS');
    });

    it('should detect PKCS12 from output', () => {
      const output = 'Keystore type: PKCS12';
      const result = (keystoreService as any).detectKeystoreType(output, '/path/to/keystore.p12');
      expect(result).toBe('PKCS12');
    });

    it('should fallback to extension for p12', () => {
      const output = 'Keystore type: unknown';
      const result = (keystoreService as any).detectKeystoreType(output, '/path/to/keystore.p12');
      expect(result).toBe('PKCS12');
    });

    it('should fallback to extension for pfx', () => {
      const output = '';
      const result = (keystoreService as any).detectKeystoreType(output, '/path/to/keystore.pfx');
      expect(result).toBe('PKCS12');
    });

    it('should default to JKS', () => {
      const output = '';
      const result = (keystoreService as any).detectKeystoreType(output, '/path/to/keystore');
      expect(result).toBe('JKS');
    });
  });

  describe('parseError', () => {
    it('should detect incorrect password', () => {
      const stderr = 'keytool error: java.io.IOException: Keystore password was incorrect';
      const result = (keystoreService as any).parseError(stderr);
      expect(result).toBe('Contraseña incorrecta.');
    });

    it('should detect alias already exists', () => {
      const stderr = 'keytool error: java.lang.Exception: alias <myalias> already exists';
      const result = (keystoreService as any).parseError(stderr);
      expect(result).toBe('El alias ya existe en el keystore.');
    });

    it('should detect alias not found', () => {
      const stderr = 'keytool error: java.lang.Exception: Alias <myalias> does not exist';
      const result = (keystoreService as any).parseError(stderr);
      expect(result).toBe('El alias no existe en el keystore.');
    });

    it('should detect keystore not found', () => {
      const stderr = 'keytool error: keystore file does not exist: /path/to/missing.jks';
      const result = (keystoreService as any).parseError(stderr);
      expect(result).toBe('El archivo keystore no existe.');
    });

    it('should return generic error for unknown messages', () => {
      const stderr = 'Some unknown error occurred';
      const result = (keystoreService as any).parseError(stderr);
      expect(result).toBe('Some unknown error occurred');
    });
  });
});
