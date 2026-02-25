import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommandRunner } from './CommandRunner';
import type {
  OperationResult,
  RootCAGenerationOptions,
  IntermediateCAGenerationOptions,
  SignCSROptions,
  RootCAResult,
  IntermediateCAResult,
  SignCSRResult,
  KeyUsageFlags,
} from '@cert-manager/shared';
import { ERROR_CODES, ERROR_MESSAGES } from '@cert-manager/shared';

export class LocalCAService {
  private opensslPath: string;
  private commandRunner: CommandRunner;
  private tempDir: string;

  constructor(opensslPath: string) {
    this.opensslPath = opensslPath;
    this.commandRunner = new CommandRunner();
    this.tempDir = path.join(os.tmpdir(), 'cert-manager-ca-temp');
  }

  setOpensslPath(newPath: string): void {
    this.opensslPath = newPath;
  }

  async generateRootCA(options: RootCAGenerationOptions): Promise<OperationResult<RootCAResult>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    const keyPath = path.join(options.outputDir, 'root_ca_key.pem');
    const certPath = path.join(options.outputDir, 'root_ca_cert.pem');
    const configPath = await this.createTempFile('root_ca.cnf');

    try {
      await fs.promises.mkdir(options.outputDir, { recursive: true });

      const keyArgs = [
        'genpkey',
        '-algorithm', options.algorithm.startsWith('RSA') ? 'RSA' : 'EC',
      ];

      if (options.algorithm.startsWith('RSA')) {
        const bits = options.algorithm === 'RSA-4096' ? '4096' : '2048';
        keyArgs.push('-pkeyopt', `rsa_keygen_bits:${bits}`);
      } else {
        const curve = options.algorithm === 'ECC-P384' ? 'P-384' : 'P-256';
        keyArgs.push('-pkeyopt', `ec_paramgen_curve:${curve}`);
      }

      keyArgs.push('-out', keyPath);

      if (options.keyPassword) {
        keyArgs.push('-aes256');
      }

      const keyEnv: Record<string, string> = {};
      if (options.keyPassword) {
        keyEnv['CERT_KEY_PASS'] = options.keyPassword;
        keyArgs.push('-pass', 'env:CERT_KEY_PASS');
      }

      const keyResult = await this.commandRunner.execute(this.opensslPath, keyArgs, { env: keyEnv });
      if (!keyResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar la clave de la Root CA.',
            technicalDetails: keyResult.stderr,
          },
        };
      }

      const configContent = this.generateRootCAConfig(options);
      await fs.promises.writeFile(configPath, configContent);

      const certArgs = [
        'req', '-x509', '-new',
        '-key', keyPath,
        '-out', certPath,
        '-days', options.validityDays.toString(),
        '-config', configPath,
        '-extensions', 'v3_ca',
        `-${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}`,
      ];

      const certEnv: Record<string, string> = {};
      if (options.keyPassword) {
        certEnv['CERT_KEY_PASS'] = options.keyPassword;
        certArgs.push('-passin', 'env:CERT_KEY_PASS');
      }

      const certResult = await this.commandRunner.execute(this.opensslPath, certArgs, { env: certEnv });
      if (!certResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar el certificado de la Root CA.',
            technicalDetails: certResult.stderr,
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

  async generateIntermediateCA(
    options: IntermediateCAGenerationOptions
  ): Promise<OperationResult<IntermediateCAResult>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    const keyPath = path.join(options.outputDir, 'intermediate_key.pem');
    const csrPath = await this.createTempFile('intermediate.csr');
    const certPath = path.join(options.outputDir, 'intermediate_cert.pem');
    const chainPath = path.join(options.outputDir, 'intermediate_chain.pem');
    const configPath = await this.createTempFile('intermediate_ca.cnf');
    const signingConfigPath = await this.createTempFile('signing.cnf');

    try {
      await fs.promises.mkdir(options.outputDir, { recursive: true });

      const keyArgs = [
        'genpkey',
        '-algorithm', options.algorithm.startsWith('RSA') ? 'RSA' : 'EC',
      ];

      if (options.algorithm.startsWith('RSA')) {
        const bits = options.algorithm === 'RSA-4096' ? '4096' : '2048';
        keyArgs.push('-pkeyopt', `rsa_keygen_bits:${bits}`);
      } else {
        const curve = options.algorithm === 'ECC-P384' ? 'P-384' : 'P-256';
        keyArgs.push('-pkeyopt', `ec_paramgen_curve:${curve}`);
      }

      keyArgs.push('-out', keyPath);

      if (options.keyPassword) {
        keyArgs.push('-aes256');
      }

      const keyEnv: Record<string, string> = {};
      if (options.keyPassword) {
        keyEnv['CERT_KEY_PASS'] = options.keyPassword;
        keyArgs.push('-pass', 'env:CERT_KEY_PASS');
      }

      const keyResult = await this.commandRunner.execute(this.opensslPath, keyArgs, { env: keyEnv });
      if (!keyResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar la clave de la Intermediate CA.',
            technicalDetails: keyResult.stderr,
          },
        };
      }

      const csrConfig = this.generateIntermediateCSRConfig(options);
      await fs.promises.writeFile(configPath, csrConfig);

      const csrArgs = ['req', '-new', '-key', keyPath, '-out', csrPath, '-config', configPath];
      const csrEnv: Record<string, string> = {};
      if (options.keyPassword) {
        csrEnv['CERT_KEY_PASS'] = options.keyPassword;
        csrArgs.push('-passin', 'env:CERT_KEY_PASS');
      }

      const csrResult = await this.commandRunner.execute(this.opensslPath, csrArgs, { env: csrEnv });
      if (!csrResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al generar el CSR de la Intermediate CA.',
            technicalDetails: csrResult.stderr,
          },
        };
      }

      const signingConfig = this.generateCASigningConfig(options.pathLenConstraint);
      await fs.promises.writeFile(signingConfigPath, signingConfig);

      const signArgs = [
        'x509', '-req',
        '-in', csrPath,
        '-CA', options.rootCACertPath,
        '-CAkey', options.rootCAKeyPath,
        '-CAcreateserial',
        '-out', certPath,
        '-days', options.validityDays.toString(),
        '-extfile', signingConfigPath,
        '-extensions', 'v3_intermediate_ca',
        `-${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}`,
      ];

      const signEnv: Record<string, string> = {};
      if (options.rootCAKeyPassword) {
        signEnv['CA_KEY_PASS'] = options.rootCAKeyPassword;
        signArgs.push('-passin', 'env:CA_KEY_PASS');
      }

      const signResult = await this.commandRunner.execute(this.opensslPath, signArgs, { env: signEnv });
      if (!signResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al firmar el certificado de la Intermediate CA.',
            technicalDetails: signResult.stderr,
          },
        };
      }

      const intermediateCert = await fs.promises.readFile(certPath, 'utf-8');
      const rootCert = await fs.promises.readFile(options.rootCACertPath, 'utf-8');
      await fs.promises.writeFile(chainPath, intermediateCert + rootCert);

      return {
        success: true,
        data: { keyPath, certPath, chainPath },
      };
    } finally {
      await this.cleanupTempFile(configPath);
      await this.cleanupTempFile(signingConfigPath);
      await this.cleanupTempFile(csrPath);
    }
  }

  async signCSR(options: SignCSROptions): Promise<OperationResult<SignCSRResult>> {
    if (!this.opensslPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.OPENSSL_NOT_CONFIGURED,
          message: ERROR_MESSAGES.OPENSSL_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(options.csrPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.FILE_NOT_FOUND,
          message: 'El archivo CSR no existe.',
        },
      };
    }

    if (!fs.existsSync(options.caCertPath) || !fs.existsSync(options.caKeyPath)) {
      return {
        success: false,
        error: {
          code: 'CA_NOT_CONFIGURED',
          message: ERROR_MESSAGES.CA_NOT_CONFIGURED,
        },
      };
    }

    const csrName = path.basename(options.csrPath, path.extname(options.csrPath));
    const certPath = path.join(options.outputDir, `${csrName}_cert.pem`);
    const configPath = await this.createTempFile('sign_csr.cnf');

    try {
      await fs.promises.mkdir(options.outputDir, { recursive: true });

      const configContent = this.generateSignCSRConfig(options);
      await fs.promises.writeFile(configPath, configContent);

      const signArgs = [
        'x509', '-req',
        '-in', options.csrPath,
        '-CA', options.caCertPath,
        '-CAkey', options.caKeyPath,
        '-CAcreateserial',
        '-out', certPath,
        '-days', options.validityDays.toString(),
        '-extfile', configPath,
        '-extensions', 'v3_req',
        `-${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}`,
      ];

      if (options.serialNumber) {
        signArgs.push('-set_serial', `0x${options.serialNumber.replace(/:/g, '')}`);
      }

      const signEnv: Record<string, string> = {};
      if (options.caKeyPassword) {
        signEnv['CA_KEY_PASS'] = options.caKeyPassword;
        signArgs.push('-passin', 'env:CA_KEY_PASS');
      }

      const signResult = await this.commandRunner.execute(this.opensslPath, signArgs, { env: signEnv });
      if (!signResult.success) {
        return {
          success: false,
          error: {
            code: ERROR_CODES.OPENSSL_EXECUTION_FAILED,
            message: 'Error al firmar el CSR.',
            technicalDetails: signResult.stderr,
          },
        };
      }

      let chainPath: string | undefined;
      if (options.chainCertPath) {
        chainPath = path.join(options.outputDir, `${csrName}_chain.pem`);
        const issuedCert = await fs.promises.readFile(certPath, 'utf-8');
        const chainCert = await fs.promises.readFile(options.chainCertPath, 'utf-8');
        await fs.promises.writeFile(chainPath, issuedCert + chainCert);
      }

      return {
        success: true,
        data: { certPath, chainPath },
      };
    } finally {
      await this.cleanupTempFile(configPath);
    }
  }

  private generateRootCAConfig(options: RootCAGenerationOptions): string {
    const { subject } = options;
    return `[req]
default_bits = 4096
prompt = no
default_md = ${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[req_distinguished_name]
CN = ${subject.CN}
${subject.O ? `O = ${subject.O}` : ''}
${subject.OU ? `OU = ${subject.OU}` : ''}
${subject.L ? `L = ${subject.L}` : ''}
${subject.ST ? `ST = ${subject.ST}` : ''}
${subject.C ? `C = ${subject.C}` : ''}
${subject.emailAddress ? `emailAddress = ${subject.emailAddress}` : ''}

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
`.replace(/^\s*\n/gm, '');
  }

  private generateIntermediateCSRConfig(options: IntermediateCAGenerationOptions): string {
    const { subject } = options;
    return `[req]
default_bits = 4096
prompt = no
default_md = ${options.signatureHash?.toLowerCase().replace('-', '') || 'sha256'}
distinguished_name = req_distinguished_name

[req_distinguished_name]
CN = ${subject.CN}
${subject.O ? `O = ${subject.O}` : ''}
${subject.OU ? `OU = ${subject.OU}` : ''}
${subject.L ? `L = ${subject.L}` : ''}
${subject.ST ? `ST = ${subject.ST}` : ''}
${subject.C ? `C = ${subject.C}` : ''}
${subject.emailAddress ? `emailAddress = ${subject.emailAddress}` : ''}
`.replace(/^\s*\n/gm, '');
  }

  private generateCASigningConfig(pathLenConstraint?: number): string {
    const pathLen = pathLenConstraint !== undefined ? `, pathlen:${pathLenConstraint}` : '';
    return `[v3_intermediate_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:TRUE${pathLen}
keyUsage = critical, keyCertSign, cRLSign
`;
  }

  private generateSignCSRConfig(options: SignCSROptions): string {
    let config = `[v3_req]
`;

    if (options.isCA) {
      const pathLen = options.pathLenConstraint !== undefined ? `, pathlen:${options.pathLenConstraint}` : '';
      config += `basicConstraints = critical, CA:TRUE${pathLen}\n`;
    } else {
      config += `basicConstraints = CA:FALSE\n`;
    }

    if (options.keyUsage) {
      const kuFlags = this.formatKeyUsage(options.keyUsage);
      if (kuFlags) {
        config += `keyUsage = critical, ${kuFlags}\n`;
      }
    }

    if (options.extendedKeyUsage && options.extendedKeyUsage.length > 0) {
      config += `extendedKeyUsage = ${options.extendedKeyUsage.join(', ')}\n`;
    }

    config += `subjectKeyIdentifier = hash\n`;
    config += `authorityKeyIdentifier = keyid,issuer\n`;

    if (options.sanList && options.sanList.length > 0) {
      config += `subjectAltName = @alt_names\n\n[alt_names]\n`;
      let dnsIdx = 1, ipIdx = 1, emailIdx = 1, uriIdx = 1;
      for (const san of options.sanList) {
        switch (san.type) {
          case 'DNS':
            config += `DNS.${dnsIdx++} = ${san.value}\n`;
            break;
          case 'IP':
            config += `IP.${ipIdx++} = ${san.value}\n`;
            break;
          case 'email':
            config += `email.${emailIdx++} = ${san.value}\n`;
            break;
          case 'URI':
            config += `URI.${uriIdx++} = ${san.value}\n`;
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
