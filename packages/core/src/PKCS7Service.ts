import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommandRunner } from './CommandRunner';
import type {
  OperationResult,
  PKCS7CreateOptions,
  PKCS7Info,
  PKCS7CertInfo,
  PKCS7ExtractOptions,
  PKCS7ExtractResult,
} from '@cert-manager/shared';
import { ERROR_CODES, ERROR_MESSAGES } from '@cert-manager/shared';

export class PKCS7Service {
  private opensslPath: string;
  private commandRunner: CommandRunner;
  private tempDir: string;

  constructor(opensslPath: string) {
    this.opensslPath = opensslPath;
    this.commandRunner = new CommandRunner();
    this.tempDir = path.join(os.tmpdir(), 'cert-manager-p7-temp');
  }

  setOpensslPath(newPath: string): void {
    this.opensslPath = newPath;
  }

  async createPKCS7(options: PKCS7CreateOptions): Promise<OperationResult<string>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    for (const certPath of options.certPaths) {
      if (!fs.existsSync(certPath)) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.FILE_NOT_FOUND,
            message: `El archivo de certificado no existe: ${path.basename(certPath)}`,
          },
        };
      }
    }

    const tempChain = await this.createTempFile('chain.pem');

    try {
      let chainContent = '';
      for (const certPath of options.certPaths) {
        const certContent = await fs.promises.readFile(certPath, 'utf-8');
        chainContent += certContent + '\n';
      }
      await fs.promises.writeFile(tempChain, chainContent);

      const args = [
        'crl2pkcs7', '-nocrl',
        '-certfile', tempChain,
        '-out', options.outputPath,
      ];

      const result = await this.commandRunner.execute(this.opensslPath, args);

      if (!result.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al crear el archivo PKCS#7.',
            technicalDetails: result.stderr,
          },
        };
      }

      return {
        success: true,
        data: options.outputPath,
      };
    } finally {
      await this.cleanupTempFile(tempChain);
    }
  }

  async createPKCS7FromChain(chainPath: string, outputPath: string): Promise<OperationResult<string>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(chainPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    const args = [
      'crl2pkcs7', '-nocrl',
      '-certfile', chainPath,
      '-out', outputPath,
    ];

    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al crear el archivo PKCS#7.',
          technicalDetails: result.stderr,
        },
      };
    }

    return {
      success: true,
      data: outputPath,
    };
  }

  async inspectPKCS7(p7bPath: string): Promise<OperationResult<PKCS7Info>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(p7bPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    const args = [
      'pkcs7',
      '-in', p7bPath,
      '-print_certs',
      '-noout',
    ];

    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      const derArgs = [
        'pkcs7',
        '-in', p7bPath,
        '-inform', 'DER',
        '-print_certs',
        '-noout',
      ];
      
      const derResult = await this.commandRunner.execute(this.opensslPath, derArgs);
      
      if (!derResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al leer el archivo PKCS#7.',
            technicalDetails: result.stderr,
          },
        };
      }

      return this.parsePKCS7Info(derResult.stdout);
    }

    return this.parsePKCS7Info(result.stdout);
  }

  private parsePKCS7Info(output: string): OperationResult<PKCS7Info> {
    const certificates: PKCS7CertInfo[] = [];
    
    const certBlocks = output.split(/subject=/i).filter(Boolean);
    
    for (const block of certBlocks) {
      const subjectMatch = block.match(/^([^\n]+)/);
      const issuerMatch = block.match(/issuer=([^\n]+)/i);
      const serialMatch = block.match(/serial=([^\n]+)/i);

      if (subjectMatch) {
        certificates.push({
          subject: subjectMatch[1].trim(),
          issuer: issuerMatch ? issuerMatch[1].trim() : '',
          serialNumber: serialMatch ? serialMatch[1].trim() : '',
        });
      }
    }

    return {
      success: true,
      data: {
        certificateCount: certificates.length,
        certificates,
      },
    };
  }

  async extractFromPKCS7(options: PKCS7ExtractOptions): Promise<OperationResult<PKCS7ExtractResult>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(options.p7bPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    await fs.promises.mkdir(options.outputDir, { recursive: true });

    let args = [
      'pkcs7',
      '-in', options.p7bPath,
      '-print_certs',
    ];

    let result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      args = [
        'pkcs7',
        '-in', options.p7bPath,
        '-inform', 'DER',
        '-print_certs',
      ];
      result = await this.commandRunner.execute(this.opensslPath, args);
    }

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al extraer certificados del archivo PKCS#7.',
          technicalDetails: result.stderr,
        },
      };
    }

    const baseName = path.basename(options.p7bPath, path.extname(options.p7bPath));
    const extractResult: PKCS7ExtractResult = { certPaths: [] };

    const certMatches = result.stdout.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);

    if (!certMatches || certMatches.length === 0) {
      return {
        success: true,
        data: extractResult,
      };
    }

    if (options.outputFormat === 'chain') {
      const chainPath = path.join(options.outputDir, `${baseName}_chain.pem`);
      await fs.promises.writeFile(chainPath, certMatches.join('\n'));
      extractResult.chainPath = chainPath;
      extractResult.certPaths = [chainPath];
    } else {
      for (let i = 0; i < certMatches.length; i++) {
        const certPath = path.join(options.outputDir, `${baseName}_cert_${i + 1}.pem`);
        await fs.promises.writeFile(certPath, certMatches[i]);
        extractResult.certPaths.push(certPath);
      }
    }

    return {
      success: true,
      data: extractResult,
    };
  }

  private async createTempFile(filename: string): Promise<string> {
    await fs.promises.mkdir(this.tempDir, { recursive: true });
    return path.join(this.tempDir, `${Date.now()}_${filename}`);
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
