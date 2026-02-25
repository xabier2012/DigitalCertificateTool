import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommandRunner } from './CommandRunner';
import { FileFormatDetector } from './FileFormatDetector';
import { CertificateParser } from './CertificateParser';
import type {
  CertificateInfo,
  CertificateFormat,
  CSRGenerationOptions,
  SelfSignedGenerationOptions,
  ConversionOptions,
  OperationResult,
  KeyAlgorithm,
} from '@cert-manager/shared';
import { ERROR_CODES, ERROR_MESSAGES } from '@cert-manager/shared';

export class OpenSSLService {
  private opensslPath: string;
  private commandRunner: CommandRunner;
  private formatDetector: FileFormatDetector;
  private certParser: CertificateParser;
  private tempDir: string;

  constructor(opensslPath: string) {
    this.opensslPath = opensslPath;
    this.commandRunner = new CommandRunner();
    this.formatDetector = new FileFormatDetector();
    this.certParser = new CertificateParser();
    this.tempDir = path.join(os.tmpdir(), 'cert-manager-temp');
  }

  setOpensslPath(newPath: string): void {
    this.opensslPath = newPath;
  }

  async checkAvailable(): Promise<OperationResult<string>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    const result = await this.commandRunner.execute(this.opensslPath, ['version']);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: ERROR_MESSAGES.OPENSSL_EXECUTION_FAILED,
          technicalDetails: result.error || result.stderr,
        },
      };
    }

    return {
      success: true,
      data: result.stdout.trim(),
    };
  }

  async inspectCertificate(
    filePath: string,
    password?: string
  ): Promise<OperationResult<CertificateInfo>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) return { success: false, error: checkResult.error };

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    const detection = await this.formatDetector.detectFormat(filePath);
    let result;

    if (detection.format === 'PKCS12') {
      result = await this.inspectPKCS12(filePath, password);
    } else if (detection.format === 'DER') {
      result = await this.inspectDER(filePath);
    } else {
      result = await this.inspectPEM(filePath);
    }

    if (!result.success) return result;

    const fingerprints = await this.getFingerprints(filePath, detection.format, password);
    if (result.data) {
      result.data.fingerprints = fingerprints;
    }

    return result;
  }

  private async inspectPEM(filePath: string): Promise<OperationResult<CertificateInfo>> {
    const args = ['x509', '-in', filePath, '-noout', '-text'];
    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      // Check if it's a private key instead of certificate
      const keyCheckArgs = ['rsa', '-in', filePath, '-check', '-noout'];
      const keyCheck = await this.commandRunner.execute(this.opensslPath, keyCheckArgs);
      
      if (keyCheck.success || keyCheck.stderr.includes('RSA key ok')) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'El archivo es una clave privada RSA, no un certificado. Selecciona un archivo de certificado (.cer, .crt, .pem con certificado).',
            technicalDetails: 'File detected as RSA private key',
          },
        };
      }

      // Check if it's an EC key
      const ecKeyArgs = ['ec', '-in', filePath, '-noout'];
      const ecCheck = await this.commandRunner.execute(this.opensslPath, ecKeyArgs);
      if (ecCheck.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'El archivo es una clave privada EC, no un certificado. Selecciona un archivo de certificado.',
            technicalDetails: 'File detected as EC private key',
          },
        };
      }

      // Check if it's a CSR
      const csrArgs = ['req', '-in', filePath, '-noout', '-text'];
      const csrCheck = await this.commandRunner.execute(this.opensslPath, csrArgs);
      if (csrCheck.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'El archivo es una solicitud de certificado (CSR), no un certificado firmado. Usa la opción de inspeccionar CSR.',
            technicalDetails: 'File detected as Certificate Signing Request',
          },
        };
      }

      // Generic error with more details
      let errorMessage = 'Error al analizar el certificado PEM.';
      if (result.stderr.includes('unable to load certificate')) {
        errorMessage = 'No se pudo cargar el certificado. El archivo puede estar corrupto o no ser un certificado válido.';
      } else if (result.stderr.includes('no start line')) {
        errorMessage = 'El archivo no contiene un certificado PEM válido. Verifica que el archivo comienza con "-----BEGIN CERTIFICATE-----".';
      } else if (result.stderr.includes('bad decrypt')) {
        errorMessage = 'El archivo está cifrado. Proporciona la contraseña correcta.';
      }

      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: errorMessage,
          technicalDetails: `OpenSSL stderr: ${result.stderr}\nOpenSSL stdout: ${result.stdout}`,
        },
      };
    }

    return {
      success: true,
      data: this.certParser.parseOpenSSLOutput(result.stdout),
    };
  }

  private async inspectDER(filePath: string): Promise<OperationResult<CertificateInfo>> {
    const args = ['x509', '-inform', 'der', '-in', filePath, '-noout', '-text'];
    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al analizar el certificado DER.',
          technicalDetails: result.stderr,
        },
      };
    }

    return {
      success: true,
      data: this.certParser.parseOpenSSLOutput(result.stdout),
    };
  }

  private async inspectPKCS12(
    filePath: string,
    password?: string
  ): Promise<OperationResult<CertificateInfo>> {
    const pass = password || '';
    const env: Record<string, string> = { CERT_P12_PASS: pass };
    const args = ['pkcs12', '-in', filePath, '-nokeys', '-clcerts', '-passin', 'env:CERT_P12_PASS'];
    const result = await this.commandRunner.execute(this.opensslPath, args, { env });

    if (!result.success) {
      if (
        result.stderr.includes('mac verify failure') ||
        result.stderr.includes('invalid password')
      ) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.INVALID_PASSWORD,
            message: ERROR_MESSAGES.INVALID_PASSWORD,
          },
        };
      }
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al extraer el certificado del archivo PKCS#12.',
          technicalDetails: result.stderr,
        },
      };
    }

    const tempPem = await this.createTempFile('cert.pem');
    try {
      await fs.promises.writeFile(tempPem, result.stdout);
      const inspectResult = await this.inspectPEM(tempPem);
      return inspectResult;
    } finally {
      await this.cleanupTempFile(tempPem);
    }
  }

  private async getFingerprints(
    filePath: string,
    format: CertificateFormat,
    password?: string
  ): Promise<{ sha256: string; sha1: string }> {
    let args256: string[];
    let args1: string[];

    if (format === 'DER') {
      args256 = ['x509', '-inform', 'der', '-in', filePath, '-noout', '-fingerprint', '-sha256'];
      args1 = ['x509', '-inform', 'der', '-in', filePath, '-noout', '-fingerprint', '-sha1'];
    } else if (format === 'PKCS12') {
      const pass = password || '';
      const fpEnv: Record<string, string> = { CERT_P12_PASS: pass };
      const extractArgs = ['pkcs12', '-in', filePath, '-nokeys', '-clcerts', '-passin', 'env:CERT_P12_PASS'];
      const extractResult = await this.commandRunner.execute(this.opensslPath, extractArgs, { env: fpEnv });

      if (!extractResult.success) {
        return { sha256: '', sha1: '' };
      }

      const tempPem = await this.createTempFile('cert_fp.pem');
      try {
        await fs.promises.writeFile(tempPem, extractResult.stdout);
        args256 = ['x509', '-in', tempPem, '-noout', '-fingerprint', '-sha256'];
        args1 = ['x509', '-in', tempPem, '-noout', '-fingerprint', '-sha1'];

        const [result256, result1] = await Promise.all([
          this.commandRunner.execute(this.opensslPath, args256),
          this.commandRunner.execute(this.opensslPath, args1),
        ]);

        return this.certParser.parseFingerprints(result256.stdout, result1.stdout);
      } finally {
        await this.cleanupTempFile(tempPem);
      }
    } else {
      args256 = ['x509', '-in', filePath, '-noout', '-fingerprint', '-sha256'];
      args1 = ['x509', '-in', filePath, '-noout', '-fingerprint', '-sha1'];
    }

    const [result256, result1] = await Promise.all([
      this.commandRunner.execute(this.opensslPath, args256),
      this.commandRunner.execute(this.opensslPath, args1),
    ]);

    return this.certParser.parseFingerprints(result256.stdout, result1.stdout);
  }

  async convertCertificate(options: ConversionOptions): Promise<OperationResult<string>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) return checkResult as OperationResult<string>;

    if (!fs.existsSync(options.inputPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    if (options.inputFormat !== 'PEM' && options.inputFormat !== 'DER') {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: `No se puede convertir desde formato ${options.inputFormat}. Solo se soporta conversión entre PEM y DER.`,
        },
      };
    }

    const args: string[] = ['x509'];

    if (options.inputFormat === 'DER') {
      args.push('-inform', 'der');
    }

    args.push('-in', options.inputPath);

    if (options.outputFormat === 'DER') {
      args.push('-outform', 'der');
    } else {
      args.push('-outform', 'pem');
    }

    args.push('-out', options.outputPath);

    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al convertir el certificado.',
          technicalDetails: result.stderr,
        },
      };
    }

    return {
      success: true,
      data: options.outputPath,
    };
  }

  async extractPublicKeyFromCert(
    certPath: string,
    outputPath: string
  ): Promise<OperationResult<string>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) return checkResult as OperationResult<string>;

    if (!fs.existsSync(certPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    const args = ['x509', '-in', certPath, '-pubkey', '-noout'];
    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al extraer la clave pública.',
          technicalDetails: result.stderr,
        },
      };
    }

    await fs.promises.writeFile(outputPath, result.stdout);

    return {
      success: true,
      data: outputPath,
    };
  }

  async generateKeyPair(
    algorithm: KeyAlgorithm,
    outputKeyPath: string,
    keyPassword?: string
  ): Promise<OperationResult<string>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) return checkResult as OperationResult<string>;

    let args: string[];

    switch (algorithm) {
      case 'RSA-2048':
        args = ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048'];
        break;
      case 'RSA-4096':
        args = ['genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:4096'];
        break;
      case 'ECC-P256':
        args = ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-256'];
        break;
      case 'ECC-P384':
        args = ['genpkey', '-algorithm', 'EC', '-pkeyopt', 'ec_paramgen_curve:P-384'];
        break;
      default:
        return {
          success: false,
          error: {
            code: ERROR_CODES.INVALID_FORMAT,
            message: `Algoritmo no soportado: ${algorithm}`,
          },
        };
    }

    args.push('-out', outputKeyPath);

    const keyEnv: Record<string, string> = {};
    if (keyPassword) {
      keyEnv['CERT_KEY_PASS'] = keyPassword;
      args.push('-aes256', '-pass', 'env:CERT_KEY_PASS');
    }

    const result = await this.commandRunner.execute(this.opensslPath, args, { env: keyEnv });

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al generar el par de claves.',
          technicalDetails: result.stderr,
        },
      };
    }

    return {
      success: true,
      data: outputKeyPath,
    };
  }

  async generateCSR(
    options: CSRGenerationOptions
  ): Promise<OperationResult<{ keyPath: string; csrPath: string; readmePath: string }>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) {
      return { success: false, error: checkResult.error };
    }

    const keyFileName = options.keyFileName || 'private_key.pem';
    const csrFileName = options.csrFileName || 'request.csr';
    const keyPath = path.join(options.outputDir, keyFileName);
    const csrPath = path.join(options.outputDir, csrFileName);
    const configPath = await this.createTempFile('req.cnf');

    try {
      await fs.promises.mkdir(options.outputDir, { recursive: true });

      const keyResult = await this.generateKeyPair(
        options.algorithm,
        keyPath,
        options.keyPassword
      );
      if (!keyResult.success) return { success: false, error: keyResult.error };

      const configContent = this.generateOpenSSLConfig(options.subject, options.sanList);
      await fs.promises.writeFile(configPath, configContent);

      const args = ['req', '-new', '-key', keyPath, '-out', csrPath, '-config', configPath];

      const csrEnv: Record<string, string> = {};
      if (options.keyPassword) {
        csrEnv['CERT_KEY_PASS'] = options.keyPassword;
        args.push('-passin', 'env:CERT_KEY_PASS');
      }

      const result = await this.commandRunner.execute(this.opensslPath, args, { env: csrEnv });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar el CSR.',
            technicalDetails: result.stderr,
          },
        };
      }

      const readmePath = path.join(options.outputDir, 'README_CSR.txt');
      await this.createCSRReadme(readmePath, csrFileName, keyFileName);

      return {
        success: true,
        data: { keyPath, csrPath, readmePath },
      };
    } finally {
      await this.cleanupTempFile(configPath);
    }
  }

  async generateSelfSigned(
    options: SelfSignedGenerationOptions
  ): Promise<OperationResult<{ keyPath: string; certPath: string }>> {
    const checkResult = await this.checkAvailable();
    if (!checkResult.success) {
      return { success: false, error: checkResult.error };
    }

    const keyFileName = options.keyFileName || 'private_key.pem';
    const certFileName = options.certFileName || 'certificate.pem';
    const keyPath = path.join(options.outputDir, keyFileName);
    const certPath = path.join(options.outputDir, certFileName);
    const configPath = await this.createTempFile('self_signed.cnf');

    try {
      await fs.promises.mkdir(options.outputDir, { recursive: true });

      const keyResult = await this.generateKeyPair(
        options.algorithm,
        keyPath,
        options.keyPassword
      );
      if (!keyResult.success) return { success: false, error: keyResult.error };

      const configContent = this.generateOpenSSLConfig(options.subject, options.sanList);
      await fs.promises.writeFile(configPath, configContent);

      const hasSAN = options.sanList && options.sanList.length > 0;
      
      const args = [
        'req',
        '-x509',
        '-new',
        '-key',
        keyPath,
        '-out',
        certPath,
        '-days',
        options.validityDays.toString(),
        '-config',
        configPath,
        '-sha256',  // Explicitly use SHA256
      ];

      // CRITICAL: -extensions flag is required for v3 extensions to be included in cert
      if (hasSAN) {
        args.push('-extensions', 'v3_req');
      }

      const selfSignEnv: Record<string, string> = {};
      if (options.keyPassword) {
        selfSignEnv['CERT_KEY_PASS'] = options.keyPassword;
        args.push('-passin', 'env:CERT_KEY_PASS');
      }

      const result = await this.commandRunner.execute(this.opensslPath, args, { env: selfSignEnv });

      if (!result.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar el certificado autofirmado.',
            technicalDetails: result.stderr,
          },
        };
      }

      return {
        success: true,
        data: { keyPath, certPath },
      };
    } finally {
      await this.cleanupTempFile(configPath);
    }
  }

  private generateOpenSSLConfig(
    subject: CSRGenerationOptions['subject'],
    sanList: CSRGenerationOptions['sanList']
  ): string {
    const hasSAN = sanList && sanList.length > 0;

    // Always include x509_extensions for self-signed certs and req_extensions for CSRs
    let config = `[req]
default_bits = 2048
prompt = no
default_md = sha256
utf8 = yes
string_mask = utf8only
distinguished_name = req_distinguished_name
req_extensions = v3_req
x509_extensions = v3_req

[req_distinguished_name]
CN = ${this.escapeConfigValue(subject.CN)}
`;

    if (subject.C) config += `C = ${this.escapeConfigValue(subject.C)}\n`;
    if (subject.O) config += `O = ${this.escapeConfigValue(subject.O)}\n`;
    if (subject.OU) config += `OU = ${this.escapeConfigValue(subject.OU)}\n`;
    if (subject.ST) config += `ST = ${this.escapeConfigValue(subject.ST)}\n`;
    if (subject.L) config += `L = ${this.escapeConfigValue(subject.L)}\n`;
    if (subject.emailAddress) config += `emailAddress = ${this.escapeConfigValue(subject.emailAddress)}\n`;

    config += `
[v3_req]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
`;

    if (hasSAN) {
      config += `subjectAltName = @alt_names

[alt_names]
`;

      let dnsIndex = 1;
      let ipIndex = 1;
      let emailIndex = 1;
      let uriIndex = 1;

      for (const san of sanList) {
        switch (san.type) {
          case 'DNS':
            config += `DNS.${dnsIndex++} = ${san.value}\n`;
            break;
          case 'IP':
            config += `IP.${ipIndex++} = ${san.value}\n`;
            break;
          case 'email':
            config += `email.${emailIndex++} = ${san.value}\n`;
            break;
          case 'URI':
            config += `URI.${uriIndex++} = ${san.value}\n`;
            break;
        }
      }
    }

    return config;
  }

  private escapeConfigValue(value: string): string {
    // Escape special characters in OpenSSL config values
    if (!value) return '';
    // If value contains special chars, wrap in quotes
    if (/[,=+<>#;\\"]/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  private async createCSRReadme(
    readmePath: string,
    csrFileName: string,
    keyFileName: string
  ): Promise<void> {
    const content = `=== INSTRUCCIONES DE USO DEL CSR ===

Archivos generados:
- ${csrFileName}: Solicitud de firma de certificado (CSR)
- ${keyFileName}: Clave privada (¡MANTENER EN SECRETO!)

PASOS A SEGUIR:

1. Envía el archivo "${csrFileName}" a tu Autoridad de Certificación (CA).
   - Puede ser una CA corporativa, FNMT, Let's Encrypt, etc.

2. La CA verificará tu identidad y firmará el certificado.

3. Cuando recibas el certificado firmado (.cer, .crt o .pem),
   podrás importarlo en esta aplicación.

IMPORTANTE:
- NUNCA compartas ni pierdas el archivo "${keyFileName}".
- Si la clave privada está cifrada, necesitarás la contraseña
  para usar el certificado.
- Guarda una copia de seguridad de estos archivos en un lugar seguro.

Generado por Certificate Manager Tool
`;

    await fs.promises.writeFile(readmePath, content, 'utf-8');
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
