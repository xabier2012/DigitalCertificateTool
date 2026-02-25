import * as fs from 'fs';
import * as path from 'path';
import type { CertificateDetectionResult } from '@cert-manager/shared';

const PEM_HEADER_REGEX = /-----BEGIN\s+([^-]+)-----/g;
const PEM_PATTERNS = {
  CERTIFICATE: /-----BEGIN\s+CERTIFICATE-----/,
  PRIVATE_KEY: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  ENCRYPTED_PRIVATE_KEY: /-----BEGIN\s+ENCRYPTED\s+PRIVATE\s+KEY-----/,
  PUBLIC_KEY: /-----BEGIN\s+PUBLIC\s+KEY-----/,
  CSR: /-----BEGIN\s+CERTIFICATE\s+REQUEST-----/,
};

export class FileFormatDetector {
  async detectFormat(filePath: string): Promise<CertificateDetectionResult> {
    const extension = path.extname(filePath).toLowerCase();
    const content = await this.readFileContent(filePath);

    if (extension === '.p12' || extension === '.pfx') {
      return {
        format: 'PKCS12',
        hasMultipleBlocks: false,
        isEncrypted: true,
        blockTypes: ['PKCS12'],
      };
    }

    if (extension === '.p7b' || extension === '.p7c') {
      return {
        format: 'PKCS7',
        hasMultipleBlocks: true,
        isEncrypted: false,
        blockTypes: ['PKCS7'],
      };
    }

    if (this.isPEM(content)) {
      const blockTypes = this.extractPEMBlockTypes(content);
      const textContent = content.toString('utf-8');
      const hasEncryptedKey =
        PEM_PATTERNS.ENCRYPTED_PRIVATE_KEY.test(textContent) ||
        textContent.includes('ENCRYPTED');

      return {
        format: 'PEM',
        hasMultipleBlocks: blockTypes.length > 1,
        isEncrypted: hasEncryptedKey,
        blockTypes,
      };
    }

    if (this.isDER(content)) {
      return {
        format: 'DER',
        hasMultipleBlocks: false,
        isEncrypted: false,
        blockTypes: ['CERTIFICATE'],
      };
    }

    return {
      format: 'UNKNOWN',
      hasMultipleBlocks: false,
      isEncrypted: false,
      blockTypes: [],
    };
  }

  private async readFileContent(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  private isPEM(content: Buffer): boolean {
    const text = content.toString('utf-8');
    return text.includes('-----BEGIN');
  }

  private isDER(content: Buffer): boolean {
    if (content.length < 2) return false;
    return content[0] === 0x30 && (content[1] & 0x80) !== 0;
  }

  private extractPEMBlockTypes(content: Buffer): string[] {
    const text = content.toString('utf-8');
    const types: string[] = [];
    let match;

    PEM_HEADER_REGEX.lastIndex = 0;
    while ((match = PEM_HEADER_REGEX.exec(text)) !== null) {
      types.push(match[1].trim());
    }

    return types;
  }

  getFileTypeFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.cer':
      case '.crt':
      case '.pem':
        return 'certificate';
      case '.der':
        return 'certificate-der';
      case '.p12':
      case '.pfx':
        return 'pkcs12';
      case '.p7b':
      case '.p7c':
        return 'pkcs7';
      case '.key':
        return 'private-key';
      case '.csr':
        return 'csr';
      default:
        return 'unknown';
    }
  }

  isCertificateFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.cer', '.crt', '.pem', '.der', '.p12', '.pfx', '.p7b', '.p7c'].includes(ext);
  }

  isKeyFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.key';
  }

  isPKCS12File(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.p12' || ext === '.pfx';
  }
}
