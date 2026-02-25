import { describe, it, expect } from 'vitest';
import { sanitizeLog, sanitizePath, sanitizeError, maskPassword } from './sanitize';

describe('sanitizeLog', () => {
  it('should redact password parameters', () => {
    const input = 'openssl pkcs12 -in file.p12 -passin pass:secretPassword123';
    const result = sanitizeLog(input);

    expect(result).not.toContain('secretPassword123');
    expect(result).toContain('[REDACTED]');
  });

  it('should redact password= patterns', () => {
    const input = 'command password=mySecret123 other=value';
    const result = sanitizeLog(input);

    expect(result).not.toContain('mySecret123');
    expect(result).toContain('[REDACTED]');
  });

  it('should redact private keys', () => {
    const input = `Some text
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC
-----END PRIVATE KEY-----
More text`;
    const result = sanitizeLog(input);

    expect(result).not.toContain('MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC');
    expect(result).toContain('[REDACTED]');
  });

  it('should redact RSA private keys', () => {
    const input = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA
-----END RSA PRIVATE KEY-----`;
    const result = sanitizeLog(input);

    expect(result).toContain('[REDACTED]');
  });

  it('should redact encrypted private keys', () => {
    const input = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFHDBOBgkqhkiG9w0BBQ0wQTApBgkqhkiG9w0BBQwwHAQI
-----END ENCRYPTED PRIVATE KEY-----`;
    const result = sanitizeLog(input);

    expect(result).toContain('[REDACTED]');
  });

  it('should not modify text without sensitive data', () => {
    const input = 'Certificate loaded successfully from /path/to/cert.pem';
    const result = sanitizeLog(input);

    expect(result).toBe(input);
  });
});

describe('sanitizePath', () => {
  it('should show only filename for long paths', () => {
    const input = 'C:\\Users\\username\\Documents\\certificates\\mycert.pem';
    const result = sanitizePath(input);

    expect(result).toBe('.../mycert.pem');
  });

  it('should show only filename for Unix paths', () => {
    const input = '/home/user/documents/certs/certificate.crt';
    const result = sanitizePath(input);

    expect(result).toBe('.../certificate.crt');
  });

  it('should return short paths as-is', () => {
    const input = 'cert.pem';
    const result = sanitizePath(input);

    expect(result).toBe('cert.pem');
  });
});

describe('sanitizeError', () => {
  it('should sanitize Error objects', () => {
    const error = new Error('Failed with password=secret123');
    const result = sanitizeError(error);

    expect(result).not.toContain('secret123');
    expect(result).toContain('[REDACTED]');
  });

  it('should sanitize string errors', () => {
    const error = 'Operation failed: -passin pass:mypassword';
    const result = sanitizeError(error);

    expect(result).not.toContain('mypassword');
  });

  it('should handle unknown error types', () => {
    const error = { code: 123 };
    const result = sanitizeError(error);

    expect(result).toBe('Error desconocido');
  });
});

describe('maskPassword', () => {
  it('should mask password with asterisks', () => {
    const result = maskPassword('mypassword');

    expect(result).toBe('********');
    expect(result).not.toContain('mypassword');
  });

  it('should handle empty password', () => {
    const result = maskPassword('');

    expect(result).toBe('');
  });

  it('should limit mask length', () => {
    const result = maskPassword('verylongpasswordthatismorethan8chars');

    expect(result).toBe('********');
  });
});
