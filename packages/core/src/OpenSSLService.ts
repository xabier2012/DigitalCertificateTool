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
  KeyUsageFlags,
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
    this._opensslModulesDir = undefined;
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

    try {
      const stat = fs.statSync(this.opensslPath);
      if (!stat.isFile()) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: `La ruta "${this.opensslPath}" no es un archivo ejecutable. Es un directorio. Selecciona el archivo openssl.exe dentro de la carpeta (normalmente en bin/).`,
            technicalDetails: `Path is a directory, not an executable file`,
          },
        };
      }
    } catch {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: `No se encontró el archivo "${this.opensslPath}". Verifica que la ruta sea correcta.`,
          technicalDetails: `File not found: ${this.opensslPath}`,
        },
      };
    }

    const result = await this.commandRunner.execute(this.opensslPath, ['version']);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: `No se pudo ejecutar OpenSSL. Verifica que el archivo sea un ejecutable válido de OpenSSL.`,
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

  async inspectCSR(
    filePath: string
  ): Promise<OperationResult<import('@cert-manager/shared').CSRInfo>> {
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

    const args = ['req', '-in', filePath, '-noout', '-text'];
    const result = await this.commandRunner.execute(this.opensslPath, args);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'El archivo no es un CSR válido o está corrupto.',
          technicalDetails: result.stderr,
        },
      };
    }

    const rawText = result.stdout;
    const parsed = this.certParser.parseOpenSSLOutput(rawText);

    return {
      success: true,
      data: {
        subject: parsed.subject,
        algorithm: parsed.algorithm,
        keySize: parsed.keySize,
        subjectAltNames: parsed.subjectAltNames,
        keyUsage: parsed.keyUsage,
        extendedKeyUsage: parsed.extendedKeyUsage,
        isCA: parsed.isCA,
        rawText,
      },
    };
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

  private isPKCS12PasswordError(stderr: string): boolean {
    return stderr.includes('mac verify failure') || stderr.includes('invalid password');
  }

  private hasCertPEM(stdout: string): boolean {
    return stdout.includes('-----BEGIN CERTIFICATE-----');
  }

  private _opensslModulesDir: string | null | undefined = undefined;

  private findOpenSSLModulesDir(): string | null {
    if (this._opensslModulesDir !== undefined) return this._opensslModulesDir;

    const binDir = path.dirname(this.opensslPath);
    const dllName = process.platform === 'win32' ? 'legacy.dll' : 'legacy.so';

    const candidates = [
      binDir,
      path.join(binDir, '..', 'lib', 'ossl-modules'),
      path.join(binDir, '..', 'lib64', 'ossl-modules'),
      path.join(binDir, 'ossl-modules'),
      path.join(binDir, '..', 'ossl-modules'),
    ];

    for (const dir of candidates) {
      const resolved = path.resolve(dir);
      if (fs.existsSync(path.join(resolved, dllName))) {
        console.log(`[OpenSSL] Found legacy module at: ${resolved}`);
        this._opensslModulesDir = resolved;
        return resolved;
      }
    }

    console.log(`[OpenSSL] Legacy module not found in any candidate path`);
    this._opensslModulesDir = null;
    return null;
  }

  private async tryPKCS12Extract(
    filePath: string,
    password: string
  ): Promise<import('@cert-manager/shared').CommandResult | null> {
    const baseEnv: Record<string, string> = { CERT_P12_PASS: password };

    const modulesDir = this.findOpenSSLModulesDir();
    const legacyEnv: Record<string, string> = { ...baseEnv };
    if (modulesDir) {
      legacyEnv['OPENSSL_MODULES'] = modulesDir;
    }

    const strategies: Array<{ label: string; args: string[]; opts: { env?: Record<string, string> } }> = [
      {
        label: 'env + clcerts',
        args: ['pkcs12', '-in', filePath, '-nokeys', '-clcerts', '-passin', 'env:CERT_P12_PASS'],
        opts: { env: baseEnv },
      },
      {
        label: 'env + clcerts + legacy',
        args: ['pkcs12', '-legacy', '-in', filePath, '-nokeys', '-clcerts', '-passin', 'env:CERT_P12_PASS'],
        opts: { env: legacyEnv },
      },
      {
        label: 'env + nokeys + legacy',
        args: ['pkcs12', '-legacy', '-in', filePath, '-nokeys', '-passin', 'env:CERT_P12_PASS'],
        opts: { env: legacyEnv },
      },
      {
        label: 'pass: + clcerts + legacy',
        args: ['pkcs12', '-legacy', '-in', filePath, '-nokeys', '-clcerts', '-passin', `pass:${password}`],
        opts: { env: modulesDir ? { OPENSSL_MODULES: modulesDir } : {} },
      },
    ];

    for (const strategy of strategies) {
      console.log(`[PKCS12 inspect] Trying strategy: ${strategy.label}`);
      const result = await this.commandRunner.execute(this.opensslPath, strategy.args, strategy.opts);

      if (this.hasCertPEM(result.stdout)) {
        console.log(`[PKCS12 inspect] Strategy '${strategy.label}' succeeded (cert found in stdout, exitCode=${result.exitCode})`);
        return { ...result, success: true };
      }

      if (this.isPKCS12PasswordError(result.stderr)) {
        console.log(`[PKCS12 inspect] Strategy '${strategy.label}' → password error`);
        return result;
      }

      console.log(`[PKCS12 inspect] Strategy '${strategy.label}' failed: exitCode=${result.exitCode}, stderr=${result.stderr.substring(0, 300)}`);
    }

    return null;
  }

  private async inspectPKCS12(
    filePath: string,
    password?: string
  ): Promise<OperationResult<CertificateInfo>> {
    const pass = password || '';

    const result = await this.tryPKCS12Extract(filePath, pass);

    if (!result) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'No se pudo extraer el certificado del archivo PKCS#12. Ninguna estrategia de extracción tuvo éxito. Verifica que el archivo no esté corrupto.',
        },
      };
    }

    if (this.isPKCS12PasswordError(result.stderr)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.INVALID_PASSWORD,
          message: ERROR_MESSAGES.INVALID_PASSWORD,
        },
      };
    }

    if (!this.hasCertPEM(result.stdout)) {
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
      const extractResult = await this.tryPKCS12Extract(filePath, pass);

      if (!extractResult || !this.hasCertPEM(extractResult.stdout)) {
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

      const configContent = this.generateOpenSSLConfig(options.subject, options.sanList, options.keyUsage, options.extendedKeyUsage);
      await fs.promises.writeFile(configPath, configContent);

      const mdFlag = `-${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}`;
      const args = ['req', '-new', '-key', keyPath, '-out', csrPath, '-config', configPath, mdFlag];

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

      const configContent = this.generateOpenSSLConfig(options.subject, options.sanList, options.keyUsage, options.extendedKeyUsage, options.isCA, options.pathLenConstraint);
      await fs.promises.writeFile(configPath, configContent);

      const mdFlag = `-${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}`;
      
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
        mdFlag,
        '-extensions',
        'v3_req',
      ];

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
    sanList: CSRGenerationOptions['sanList'],
    keyUsage?: KeyUsageFlags,
    extendedKeyUsage?: string[],
    isCA?: boolean,
    pathLenConstraint?: number
  ): string {
    const hasSAN = sanList && sanList.length > 0;

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
    if (subject.serialNumber) config += `serialNumber = ${this.escapeConfigValue(subject.serialNumber)}\n`;

    config += `\n[v3_req]\n`;

    if (isCA) {
      const pathLen = pathLenConstraint !== undefined ? `, pathlen:${pathLenConstraint}` : '';
      config += `basicConstraints = critical, CA:TRUE${pathLen}\n`;
    } else {
      config += `basicConstraints = critical, CA:FALSE\n`;
    }

    const kuFlags = keyUsage ? this.formatKeyUsage(keyUsage) : '';
    if (kuFlags) {
      config += `keyUsage = critical, ${kuFlags}\n`;
    } else if (!keyUsage) {
      config += `keyUsage = critical, digitalSignature, keyEncipherment\n`;
    }

    if (extendedKeyUsage && extendedKeyUsage.length > 0) {
      config += `extendedKeyUsage = ${extendedKeyUsage.join(', ')}\n`;
    } else if (!extendedKeyUsage) {
      config += `extendedKeyUsage = serverAuth, clientAuth\n`;
    }

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

  private formatKeyUsage(ku: KeyUsageFlags): string {
    const flags: string[] = [];
    if (ku.digitalSignature) flags.push('digitalSignature');
    if (ku.contentCommitment) flags.push('nonRepudiation');
    if (ku.keyEncipherment) flags.push('keyEncipherment');
    if (ku.dataEncipherment) flags.push('dataEncipherment');
    if (ku.keyAgreement) flags.push('keyAgreement');
    if (ku.keyCertSign) flags.push('keyCertSign');
    if (ku.cRLSign) flags.push('cRLSign');
    if (ku.encipherOnly) flags.push('encipherOnly');
    if (ku.decipherOnly) flags.push('decipherOnly');
    return flags.join(', ');
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
