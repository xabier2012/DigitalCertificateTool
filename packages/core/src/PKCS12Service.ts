import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommandRunner } from './CommandRunner';
import type {
  OperationResult,
  PKCS12CreateOptions,
  PKCS12Info,
  PKCS12ExtractOptions,
  PKCS12ExtractResult,
} from '@cert-manager/shared';
import { ERROR_CODES, ERROR_MESSAGES } from '@cert-manager/shared';
import type { CommandResult } from '@cert-manager/shared';

export class PKCS12Service {
  private opensslPath: string;
  private commandRunner: CommandRunner;
  private tempDir: string;

  constructor(opensslPath: string) {
    this.opensslPath = opensslPath;
    this.commandRunner = new CommandRunner();
    this.tempDir = path.join(os.tmpdir(), 'cert-manager-p12-temp');
  }

  setOpensslPath(newPath: string): void {
    this.opensslPath = newPath;
    this._opensslModulesDir = undefined;
  }

  private isPKCS12PasswordError(stderr: string): boolean {
    return stderr.includes('mac verify failure') || stderr.includes('invalid password');
  }

  private hasPEMContent(stdout: string): boolean {
    return stdout.includes('-----BEGIN ');
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
        this._opensslModulesDir = resolved;
        return resolved;
      }
    }

    this._opensslModulesDir = null;
    return null;
  }

  private getLegacyEnv(baseEnv?: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = { ...baseEnv };
    const modulesDir = this.findOpenSSLModulesDir();
    if (modulesDir) {
      env['OPENSSL_MODULES'] = modulesDir;
    }
    return env;
  }

  private async executePKCS12Command(
    args: string[],
    options: { env?: Record<string, string> } = {}
  ): Promise<CommandResult> {
    const result = await this.commandRunner.execute(this.opensslPath, args, options);

    if (result.success) return result;

    if (this.hasPEMContent(result.stdout) && !this.isPKCS12PasswordError(result.stderr)) {
      return { ...result, success: true };
    }

    if (!this.isPKCS12PasswordError(result.stderr)) {
      const legacyArgs = [...args];
      const pkcs12Idx = legacyArgs.indexOf('pkcs12');
      if (pkcs12Idx !== -1) {
        legacyArgs.splice(pkcs12Idx + 1, 0, '-legacy');
      }
      const legacyOpts = { env: this.getLegacyEnv(options.env) };
      const legacyResult = await this.commandRunner.execute(this.opensslPath, legacyArgs, legacyOpts);
      if (legacyResult.success || this.hasPEMContent(legacyResult.stdout)) {
        return { ...legacyResult, success: true };
      }

      const passArgs = args.map(a => {
        if (a === 'env:P12_PASS') return `pass:${options.env?.['P12_PASS'] || ''}`;
        if (a === 'env:KEY_PASS_OUT') return `pass:${options.env?.['KEY_PASS_OUT'] || ''}`;
        if (a === 'env:P12_PASS_OUT') return `pass:${options.env?.['P12_PASS_OUT'] || ''}`;
        return a;
      });
      const passLegacyArgs = [...passArgs];
      const pkcs12Idx2 = passLegacyArgs.indexOf('pkcs12');
      if (pkcs12Idx2 !== -1) {
        passLegacyArgs.splice(pkcs12Idx2 + 1, 0, '-legacy');
      }
      const passLegacyOpts = { env: this.getLegacyEnv() };
      const passLegacyResult = await this.commandRunner.execute(this.opensslPath, passLegacyArgs, passLegacyOpts);
      if (passLegacyResult.success || this.hasPEMContent(passLegacyResult.stdout)) {
        return { ...passLegacyResult, success: true };
      }
    }

    return result;
  }

  async createPKCS12(options: PKCS12CreateOptions): Promise<OperationResult<string>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(options.certPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: 'El archivo de certificado no existe.',
        },
      };
    }

    if (!fs.existsSync(options.keyPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: 'El archivo de clave privada no existe.',
        },
      };
    }

    const args = [
      'pkcs12', '-export',
      '-in', options.certPath,
      '-inkey', options.keyPath,
      '-out', options.outputPath,
    ];

    if (options.chainPath && fs.existsSync(options.chainPath)) {
      args.push('-certfile', options.chainPath);
    }

    if (options.friendlyName) {
      args.push('-name', options.friendlyName);
    }

    const env: Record<string, string> = {
      P12_PASS_OUT: options.p12Password,
    };
    args.push('-passout', 'env:P12_PASS_OUT');

    if (options.keyPassword) {
      env['KEY_PASS_IN'] = options.keyPassword;
      args.push('-passin', 'env:KEY_PASS_IN');
    }

    const result = await this.commandRunner.execute(this.opensslPath, args, { env });

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
          message: 'Error al crear el archivo PKCS#12.',
          technicalDetails: result.stderr,
        },
      };
    }

    return {
      success: true,
      data: options.outputPath,
    };
  }

  async inspectPKCS12(p12Path: string, password: string): Promise<OperationResult<PKCS12Info>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(p12Path)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    const env: Record<string, string> = {
      P12_PASS: password,
    };

    const infoArgs = [
      'pkcs12', '-info',
      '-in', p12Path,
      '-passin', 'env:P12_PASS',
      '-passout', 'env:P12_PASS',
      '-noout',
    ];

    const infoResult = await this.executePKCS12Command(infoArgs, { env });

    if (!infoResult.success) {
      if (this.isPKCS12PasswordError(infoResult.stderr)) {
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
          message: 'Error al leer el archivo PKCS#12.',
          technicalDetails: infoResult.stderr,
        },
      };
    }

    const certArgs = [
      'pkcs12',
      '-in', p12Path,
      '-passin', 'env:P12_PASS',
      '-nokeys',
    ];

    const certResult = await this.executePKCS12Command(certArgs, { env });
    const hasCertificate = certResult.success && certResult.stdout.includes('-----BEGIN CERTIFICATE-----');

    const keyArgs = [
      'pkcs12',
      '-in', p12Path,
      '-passin', 'env:P12_PASS',
      '-passout', 'env:P12_PASS',
      '-nocerts',
    ];

    const keyResult = await this.executePKCS12Command(keyArgs, { env });
    const hasPrivateKey = keyResult.success && 
      (keyResult.stdout.includes('-----BEGIN PRIVATE KEY-----') ||
       keyResult.stdout.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----') ||
       keyResult.stdout.includes('-----BEGIN RSA PRIVATE KEY-----'));

    const chainArgs = [
      'pkcs12',
      '-in', p12Path,
      '-passin', 'env:P12_PASS',
      '-nokeys',
      '-cacerts',
    ];

    const chainResult = await this.executePKCS12Command(chainArgs, { env });
    const chainCertCount = (chainResult.stdout.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
    const hasChain = chainCertCount > 0;

    let subject: string | undefined;
    let issuer: string | undefined;
    let validFrom: string | undefined;
    let validTo: string | undefined;

    if (hasCertificate) {
      const certDetailsArgs = [
        'pkcs12',
        '-in', p12Path,
        '-passin', 'env:P12_PASS',
        '-nokeys',
        '-clcerts',
      ];

      const certDetailsResult = await this.executePKCS12Command(certDetailsArgs, { env });
      
      if (certDetailsResult.success) {
        const tempCert = await this.createTempFile('temp_cert.pem');
        try {
          await fs.promises.writeFile(tempCert, certDetailsResult.stdout);
          
          const textArgs = ['x509', '-in', tempCert, '-noout', '-subject', '-issuer', '-dates'];
          const textResult = await this.commandRunner.execute(this.opensslPath, textArgs);
          
          if (textResult.success) {
            const subjectMatch = textResult.stdout.match(/subject\s*=\s*(.+)/i);
            const issuerMatch = textResult.stdout.match(/issuer\s*=\s*(.+)/i);
            const notBeforeMatch = textResult.stdout.match(/notBefore\s*=\s*(.+)/i);
            const notAfterMatch = textResult.stdout.match(/notAfter\s*=\s*(.+)/i);
            
            if (subjectMatch) subject = subjectMatch[1].trim();
            if (issuerMatch) issuer = issuerMatch[1].trim();
            if (notBeforeMatch) validFrom = notBeforeMatch[1].trim();
            if (notAfterMatch) validTo = notAfterMatch[1].trim();
          }
        } finally {
          await this.cleanupTempFile(tempCert);
        }
      }
    }

    return {
      success: true,
      data: {
        hasCertificate,
        hasPrivateKey,
        hasChain,
        chainLength: chainCertCount,
        subject,
        issuer,
        validFrom,
        validTo,
      },
    };
  }

  async extractFromPKCS12(options: PKCS12ExtractOptions): Promise<OperationResult<PKCS12ExtractResult>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(options.p12Path)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: ERROR_MESSAGES.FILE_NOT_FOUND,
        },
      };
    }

    await fs.promises.mkdir(options.outputDir, { recursive: true });

    const result: PKCS12ExtractResult = {};
    const baseName = path.basename(options.p12Path, path.extname(options.p12Path));

    const env: Record<string, string> = {
      P12_PASS: options.p12Password,
    };

    if (options.keyPassword) {
      env['KEY_PASS_OUT'] = options.keyPassword;
    }

    if (options.extractCert !== false) {
      const certPath = path.join(options.outputDir, `${baseName}_cert.${options.certFormat === 'DER' ? 'der' : 'pem'}`);
      
      const certArgs = [
        'pkcs12',
        '-in', options.p12Path,
        '-passin', 'env:P12_PASS',
        '-nokeys',
        '-clcerts',
      ];

      const certResult = await this.executePKCS12Command(certArgs, { env });
      
      if (certResult.success && certResult.stdout.includes('-----BEGIN CERTIFICATE-----')) {
        if (options.certFormat === 'DER') {
          const tempPem = await this.createTempFile('temp.pem');
          try {
            await fs.promises.writeFile(tempPem, certResult.stdout);
            const derArgs = ['x509', '-in', tempPem, '-outform', 'DER', '-out', certPath];
            await this.commandRunner.execute(this.opensslPath, derArgs);
          } finally {
            await this.cleanupTempFile(tempPem);
          }
        } else {
          await fs.promises.writeFile(certPath, certResult.stdout);
        }
        result.certPath = certPath;
      }
    }

    if (options.extractKey !== false) {
      const keyPath = path.join(options.outputDir, `${baseName}_key.pem`);
      
      const keyArgs = [
        'pkcs12',
        '-in', options.p12Path,
        '-passin', 'env:P12_PASS',
        '-nocerts',
      ];

      if (options.keyPassword) {
        keyArgs.push('-passout', 'env:KEY_PASS_OUT');
      } else {
        keyArgs.push('-nodes');
      }

      const keyResult = await this.executePKCS12Command(keyArgs, { env });
      
      if (keyResult.success && 
          (keyResult.stdout.includes('-----BEGIN PRIVATE KEY-----') ||
           keyResult.stdout.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----') ||
           keyResult.stdout.includes('-----BEGIN RSA PRIVATE KEY-----'))) {
        await fs.promises.writeFile(keyPath, keyResult.stdout);
        result.keyPath = keyPath;
      }
    }

    if (options.extractChain !== false) {
      const chainPath = path.join(options.outputDir, `${baseName}_chain.pem`);
      
      const chainArgs = [
        'pkcs12',
        '-in', options.p12Path,
        '-passin', 'env:P12_PASS',
        '-nokeys',
        '-cacerts',
      ];

      const chainResult = await this.executePKCS12Command(chainArgs, { env });
      
      if (chainResult.success && chainResult.stdout.includes('-----BEGIN CERTIFICATE-----')) {
        await fs.promises.writeFile(chainPath, chainResult.stdout);
        result.chainPath = chainPath;

        const certMatches = chainResult.stdout.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
        if (certMatches && certMatches.length > 0) {
          result.chainCerts = [];
          for (let i = 0; i < certMatches.length; i++) {
            const certPath = path.join(options.outputDir, `${baseName}_chain_${i + 1}.pem`);
            await fs.promises.writeFile(certPath, certMatches[i]);
            result.chainCerts.push(certPath);
          }
        }
      }
    }

    return {
      success: true,
      data: result,
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
