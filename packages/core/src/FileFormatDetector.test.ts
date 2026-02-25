import { describe, it, expect } from 'vitest';
import { FileFormatDetector } from './FileFormatDetector';

describe('FileFormatDetector', () => {
  const detector = new FileFormatDetector();

  describe('getFileTypeFromExtension', () => {
    it('should identify certificate extensions', () => {
      expect(detector.getFileTypeFromExtension('cert.cer')).toBe('certificate');
      expect(detector.getFileTypeFromExtension('cert.crt')).toBe('certificate');
      expect(detector.getFileTypeFromExtension('cert.pem')).toBe('certificate');
    });

    it('should identify DER extension', () => {
      expect(detector.getFileTypeFromExtension('cert.der')).toBe('certificate-der');
    });

    it('should identify PKCS12 extensions', () => {
      expect(detector.getFileTypeFromExtension('keystore.p12')).toBe('pkcs12');
      expect(detector.getFileTypeFromExtension('keystore.pfx')).toBe('pkcs12');
    });

    it('should identify key extension', () => {
      expect(detector.getFileTypeFromExtension('private.key')).toBe('private-key');
    });

    it('should identify CSR extension', () => {
      expect(detector.getFileTypeFromExtension('request.csr')).toBe('csr');
    });

    it('should return unknown for unrecognized extensions', () => {
      expect(detector.getFileTypeFromExtension('file.txt')).toBe('unknown');
      expect(detector.getFileTypeFromExtension('file.xyz')).toBe('unknown');
    });

    it('should handle paths with directories', () => {
      expect(detector.getFileTypeFromExtension('/path/to/cert.pem')).toBe('certificate');
      expect(detector.getFileTypeFromExtension('C:\\Users\\test\\cert.p12')).toBe('pkcs12');
    });
  });

  describe('isCertificateFile', () => {
    it('should return true for certificate extensions', () => {
      expect(detector.isCertificateFile('cert.cer')).toBe(true);
      expect(detector.isCertificateFile('cert.crt')).toBe(true);
      expect(detector.isCertificateFile('cert.pem')).toBe(true);
      expect(detector.isCertificateFile('cert.der')).toBe(true);
      expect(detector.isCertificateFile('cert.p12')).toBe(true);
      expect(detector.isCertificateFile('cert.pfx')).toBe(true);
    });

    it('should return false for non-certificate extensions', () => {
      expect(detector.isCertificateFile('file.txt')).toBe(false);
      expect(detector.isCertificateFile('file.key')).toBe(false);
      expect(detector.isCertificateFile('file.csr')).toBe(false);
    });
  });

  describe('isKeyFile', () => {
    it('should return true for .key extension', () => {
      expect(detector.isKeyFile('private.key')).toBe(true);
    });

    it('should return false for other extensions', () => {
      expect(detector.isKeyFile('cert.pem')).toBe(false);
      expect(detector.isKeyFile('cert.p12')).toBe(false);
    });
  });

  describe('isPKCS12File', () => {
    it('should return true for PKCS12 extensions', () => {
      expect(detector.isPKCS12File('keystore.p12')).toBe(true);
      expect(detector.isPKCS12File('keystore.pfx')).toBe(true);
    });

    it('should return false for other extensions', () => {
      expect(detector.isPKCS12File('cert.pem')).toBe(false);
      expect(detector.isPKCS12File('private.key')).toBe(false);
    });
  });
});
