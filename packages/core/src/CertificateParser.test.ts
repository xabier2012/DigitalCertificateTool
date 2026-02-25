import { describe, it, expect } from 'vitest';
import { CertificateParser } from './CertificateParser';

describe('CertificateParser', () => {
  const parser = new CertificateParser();

  describe('parseOpenSSLOutput', () => {
    it('should parse subject with CN, O, C', () => {
      const output = `
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 12345678
        Subject: CN = example.com, O = Example Org, C = ES
        Issuer: CN = Test CA, O = Test Org, C = US
        Validity
            Not Before: Jan  1 00:00:00 2024 GMT
            Not After : Dec 31 23:59:59 2024 GMT
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                RSA Public-Key: (2048 bit)
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.subject.CN).toBe('example.com');
      expect(result.subject.O).toBe('Example Org');
      expect(result.subject.C).toBe('ES');
    });

    it('should parse issuer correctly', () => {
      const output = `
Certificate:
    Data:
        Subject: CN = test
        Issuer: CN = Root CA, O = Certificate Authority, OU = Security, C = US
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.issuer.CN).toBe('Root CA');
      expect(result.issuer.O).toBe('Certificate Authority');
      expect(result.issuer.OU).toBe('Security');
      expect(result.issuer.C).toBe('US');
    });

    it('should parse validity dates', () => {
      const output = `
Certificate:
    Data:
        Validity
            Not Before: Jan 15 10:30:00 2024 GMT
            Not After : Jan 15 10:30:00 2025 GMT
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.validFrom).toContain('Jan 15');
      expect(result.validTo).toContain('Jan 15');
    });

    it('should parse RSA key size', () => {
      const output = `
Certificate:
    Subject Public Key Info:
        Public Key Algorithm: rsaEncryption
            RSA Public-Key: (4096 bit)
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.keySize).toBe(4096);
    });

    it('should parse ECC key size from curve name', () => {
      const output = `
Certificate:
    Subject Public Key Info:
        Public Key Algorithm: id-ecPublicKey
            ASN1 OID: prime256v1
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.keySize).toBe(256);
    });

    it('should parse basic constraints CA:TRUE', () => {
      const output = `
Certificate:
    X509v3 extensions:
        X509v3 Basic Constraints: critical
            CA:TRUE
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.isCA).toBe(true);
    });

    it('should parse basic constraints CA:FALSE', () => {
      const output = `
Certificate:
    X509v3 extensions:
        X509v3 Basic Constraints: 
            CA:FALSE
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.isCA).toBe(false);
    });

    it('should parse key usage', () => {
      const output = `
Certificate:
    X509v3 extensions:
        X509v3 Key Usage: critical
            Digital Signature, Key Encipherment
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.keyUsage).toContain('Digital Signature');
      expect(result.keyUsage).toContain('Key Encipherment');
    });

    it('should parse extended key usage including OIDs', () => {
      const output = `
Certificate:
    X509v3 extensions:
        X509v3 Extended Key Usage: 
            TLS Web Server Authentication, TLS Web Client Authentication, 1.3.6.1.4.1.311.20.2.2

        X509v3 Subject Alternative Name:
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.extendedKeyUsage).toContain('TLS Web Server Authentication');
      expect(result.extendedKeyUsage).toContain('TLS Web Client Authentication');
      expect(result.extendedKeyUsage).toContain('1.3.6.1.4.1.311.20.2.2');
    });

    it('should parse subject alternative names', () => {
      const output = `
Certificate:
    X509v3 extensions:
        X509v3 Subject Alternative Name: 
            DNS:example.com, DNS:www.example.com, IP Address:192.168.1.1

        X509v3 Basic Constraints:
`;

      const result = parser.parseOpenSSLOutput(output);

      expect(result.subjectAltNames).toHaveLength(3);
      expect(result.subjectAltNames).toContainEqual({ type: 'DNS', value: 'example.com' });
      expect(result.subjectAltNames).toContainEqual({ type: 'DNS', value: 'www.example.com' });
      expect(result.subjectAltNames).toContainEqual({ type: 'IP', value: '192.168.1.1' });
    });

    it('should store raw output', () => {
      const output = 'Certificate:\n    Data:\n        Version: 3';

      const result = parser.parseOpenSSLOutput(output);

      expect(result.rawText).toBe(output);
    });
  });

  describe('parseFingerprints', () => {
    it('should extract SHA-256 fingerprint', () => {
      const sha256Output = 'SHA256 Fingerprint=AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
      const sha1Output = 'SHA1 Fingerprint=AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD';

      const result = parser.parseFingerprints(sha256Output, sha1Output);

      expect(result.sha256).toContain('AA:BB:CC:DD');
      expect(result.sha1).toContain('AA:BB:CC:DD');
    });
  });
});
