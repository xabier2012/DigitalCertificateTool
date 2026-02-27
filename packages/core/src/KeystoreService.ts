import * as path from 'path';
import * as fs from 'fs';
import { KeytoolRunner } from './KeytoolRunner';
import type { OperationResult } from '@cert-manager/shared';
import type {
  KeystoreInfo,
  KeystoreEntry,
  KeystoreType,
  CreateKeystoreOptions,
  OpenKeystoreOptions,
  GenerateKeypairOptions,
  GenerateCSRFromKeystoreOptions,
  ImportCertOptions,
  ImportP12Options,
  ImportSignedCertOptions,
  ExportCertOptions,
  DeleteAliasOptions,
  RenameAliasOptions,
  ConvertKeystoreOptions,
  ChangePasswordOptions,
} from '@cert-manager/shared';

export class KeystoreService {
  private runner: KeytoolRunner;

  constructor(jdkRootPath: string) {
    this.runner = new KeytoolRunner({ jdkRootPath });
  }

  setJdkRootPath(jdkRootPath: string): void {
    this.runner.setJdkRootPath(jdkRootPath);
  }

  async checkAvailable(): Promise<OperationResult<string>> {
    const result = await this.runner.checkAvailable();
    if (result.success) {
      return { success: true, data: result.version || 'keytool disponible' };
    }
    return {
      success: false,
      error: { code: 'KEYTOOL_NOT_CONFIGURED', message: result.error || 'keytool no disponible' },
    };
  }

  async createKeystore(options: CreateKeystoreOptions): Promise<OperationResult<string>> {
    const { path: keystorePath, type, password } = options;

    const args = [
      '-genkeypair',
      '-alias', 'temp_init_alias',
      '-keyalg', 'RSA',
      '-keysize', '2048',
      '-validity', '1',
      '-dname', 'CN=Temp,O=Temp,C=XX',
      '-keystore', keystorePath,
      '-storetype', type,
      '-storepass', password,
      '-keypass', password,
    ];

    const result = await this.runner.runDirect(args);

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    const deleteArgs = [
      '-delete',
      '-alias', 'temp_init_alias',
      '-keystore', keystorePath,
      '-storepass', password,
    ];

    const deleteResult = await this.runner.runDirect(deleteArgs);

    if (!deleteResult.success) {
      console.warn('[KeystoreService] No se pudo eliminar alias temporal:', deleteResult.stderr);
    }

    return { success: true, data: keystorePath };
  }

  async openKeystore(options: OpenKeystoreOptions): Promise<OperationResult<KeystoreInfo>> {
    const { path: keystorePath, password } = options;

    if (!fs.existsSync(keystorePath)) {
      return {
        success: false,
        error: { code: 'KEYSTORE_NOT_FOUND', message: 'El archivo keystore no existe.' },
      };
    }

    const args = ['-list', '-v', '-keystore', keystorePath];
    const result = await this.runner.runInteractive(args, { storePass: password });

    if (!result.success) {
      if (result.stderr.includes('password was incorrect') || result.stderr.includes('wrong password')) {
        return {
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Contraseña del keystore incorrecta.' },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    const entries = this.parseKeystoreList(result.stdout);
    const type = this.detectKeystoreType(result.stdout, keystorePath);

    return {
      success: true,
      data: {
        path: keystorePath,
        type,
        entries,
        entryCount: entries.length,
      },
    };
  }

  async listAliases(keystorePath: string, password: string): Promise<OperationResult<string[]>> {
    const args = ['-list', '-keystore', keystorePath];
    const result = await this.runner.runInteractive(args, { storePass: password });

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    const aliases: string[] = [];
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^,]+),\s+/);
      if (match && !line.includes('Keystore type:') && !line.includes('Keystore provider:')) {
        aliases.push(match[1].trim());
      }
    }

    return { success: true, data: aliases };
  }

  async generateKeypair(options: GenerateKeypairOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, alias, algorithm, keySize, curve, validity, dname, keyPassword } = options;

    const args = [
      '-genkeypair',
      '-alias', alias,
      '-keyalg', algorithm,
      '-validity', validity.toString(),
      '-dname', dname,
      '-keystore', keystorePath,
    ];

    if (algorithm === 'RSA') {
      args.push('-keysize', (keySize || 2048).toString());
    } else if (algorithm === 'EC') {
      args.push('-groupname', curve || 'secp256r1');
    }

    const result = await this.runner.runInteractive(args, {
      storePass: keystorePassword,
      keyPass: keyPassword || keystorePassword,
    });

    if (!result.success) {
      if (result.stderr.includes('alias <') && result.stderr.includes('> already exists')) {
        return {
          success: false,
          error: { code: 'ALIAS_EXISTS', message: `El alias '${alias}' ya existe en el keystore.` },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: alias };
  }

  async generateCSR(options: GenerateCSRFromKeystoreOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, alias, keyPassword, outputPath } = options;

    const args = [
      '-certreq',
      '-alias', alias,
      '-keystore', keystorePath,
      '-file', outputPath,
    ];

    const result = await this.runner.runInteractive(args, {
      storePass: keystorePassword,
      keyPass: keyPassword || keystorePassword,
    });

    if (!result.success) {
      if (result.stderr.includes('Alias <') && result.stderr.includes('> does not exist')) {
        return {
          success: false,
          error: { code: 'ALIAS_NOT_FOUND', message: `El alias '${alias}' no existe en el keystore.` },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: outputPath };
  }

  async importCertificate(options: ImportCertOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, alias, certPath, trustCACerts } = options;

    const args = [
      '-importcert',
      '-alias', alias,
      '-file', certPath,
      '-keystore', keystorePath,
      '-noprompt',
    ];

    if (trustCACerts) {
      args.push('-trustcacerts');
    }

    const result = await this.runner.runInteractive(args, {
      storePass: keystorePassword,
      trustCert: true,
    });

    if (!result.success) {
      if (result.stderr.includes('alias <') && result.stderr.includes('> already exists')) {
        return {
          success: false,
          error: { code: 'ALIAS_EXISTS', message: `El alias '${alias}' ya existe.` },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: alias };
  }

  async importP12(options: ImportP12Options): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, p12Path, p12Password, destAlias, srcAlias } = options;

    // Detect destination keystore type from extension instead of hardcoding JKS
    const destType = this.detectKeystoreTypeFromPath(keystorePath);

    // Usar argumentos de línea de comandos para contraseñas (más confiable que modo interactivo)
    const args = [
      '-importkeystore',
      '-srckeystore', p12Path,
      '-srcstoretype', 'PKCS12',
      '-srcstorepass', p12Password,
      '-destkeystore', keystorePath,
      '-deststoretype', destType,
      '-deststorepass', keystorePassword,
      '-noprompt',
    ];

    if (srcAlias) {
      args.push('-srcalias', srcAlias);
    }
    if (destAlias) {
      args.push('-destalias', destAlias);
    }

    // Usar runDirect en lugar de runInteractive para evitar problemas con prompts
    const result = await this.runner.runDirect(args);

    if (!result.success) {
      const errorMsg = result.stderr.toLowerCase();
      if (errorMsg.includes('password was incorrect') || errorMsg.includes('keystore password was incorrect')) {
        // Determinar cuál contraseña es incorrecta
        if (errorMsg.includes('srcstorepass') || errorMsg.includes('source')) {
          return {
            success: false,
            error: { code: 'INVALID_PASSWORD', message: 'Contraseña del archivo P12 incorrecta.' },
          };
        }
        return {
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Contraseña del keystore destino incorrecta.' },
        };
      }
      if (errorMsg.includes('alias') && errorMsg.includes('already exists')) {
        return {
          success: false,
          error: { code: 'ALIAS_EXISTS', message: 'Ya existe una entrada con ese alias en el keystore.' },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: destAlias || 'imported' };
  }

  async importSignedCert(options: ImportSignedCertOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, alias, certPath, keyPassword } = options;

    const args = [
      '-importcert',
      '-alias', alias,
      '-file', certPath,
      '-keystore', keystorePath,
      '-trustcacerts',
    ];

    const result = await this.runner.runInteractive(args, {
      storePass: keystorePassword,
      keyPass: keyPassword || keystorePassword,
      trustCert: true,
    });

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: alias };
  }

  async exportCertificate(options: ExportCertOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, alias, outputPath, format } = options;

    const args = [
      '-exportcert',
      '-alias', alias,
      '-keystore', keystorePath,
      '-file', outputPath,
    ];

    if (format === 'PEM') {
      args.push('-rfc');
    }

    const result = await this.runner.runInteractive(args, { storePass: keystorePassword });

    if (!result.success) {
      if (result.stderr.includes('Alias <') && result.stderr.includes('> does not exist')) {
        return {
          success: false,
          error: { code: 'ALIAS_NOT_FOUND', message: `El alias '${alias}' no existe.` },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: outputPath };
  }

  async deleteAlias(options: DeleteAliasOptions): Promise<OperationResult<void>> {
    const { keystorePath, keystorePassword, alias } = options;

    const args = [
      '-delete',
      '-alias', alias,
      '-keystore', keystorePath,
    ];

    const result = await this.runner.runInteractive(args, { storePass: keystorePassword });

    if (!result.success) {
      if (result.stderr.includes('Alias <') && result.stderr.includes('> does not exist')) {
        return {
          success: false,
          error: { code: 'ALIAS_NOT_FOUND', message: `El alias '${alias}' no existe.` },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true };
  }

  async renameAlias(options: RenameAliasOptions): Promise<OperationResult<string>> {
    const { keystorePath, keystorePassword, oldAlias, newAlias, keyPassword } = options;

    const args = [
      '-changealias',
      '-alias', oldAlias,
      '-destalias', newAlias,
      '-keystore', keystorePath,
      '-storepass', keystorePassword,
      '-keypass', keyPassword || keystorePassword,
    ];

    const result = await this.runner.runDirect(args);

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: newAlias };
  }

  async convertKeystore(options: ConvertKeystoreOptions): Promise<OperationResult<string>> {
    const { srcPath, srcPassword, srcType, destPath, destPassword, destType } = options;

    const args = [
      '-importkeystore',
      '-srckeystore', srcPath,
      '-srcstoretype', srcType,
      '-srcstorepass', srcPassword,
      '-destkeystore', destPath,
      '-deststoretype', destType,
      '-deststorepass', destPassword,
      '-noprompt',
    ];

    const result = await this.runner.runDirect(args);

    if (!result.success) {
      const errorMsg = result.stderr.toLowerCase();
      if (errorMsg.includes('password was incorrect') || errorMsg.includes('keystore password was incorrect')) {
        return {
          success: false,
          error: { code: 'INVALID_PASSWORD', message: 'Contraseña incorrecta.' },
        };
      }
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true, data: destPath };
  }

  async changeStorePassword(options: ChangePasswordOptions): Promise<OperationResult<void>> {
    const { keystorePath, oldPassword, newPassword } = options;

    const args = [
      '-storepasswd',
      '-keystore', keystorePath,
      '-new', newPassword,
    ];

    const result = await this.runner.runInteractive(args, { storePass: oldPassword });

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true };
  }

  async changeKeyPassword(options: ChangePasswordOptions): Promise<OperationResult<void>> {
    const { keystorePath, oldPassword, newPassword, alias } = options;

    if (!alias) {
      return {
        success: false,
        error: { code: 'ALIAS_NOT_FOUND', message: 'Se requiere especificar un alias.' },
      };
    }

    const args = [
      '-keypasswd',
      '-alias', alias,
      '-keystore', keystorePath,
      '-new', newPassword,
    ];

    const result = await this.runner.runInteractive(args, {
      storePass: oldPassword,
      keyPass: oldPassword,
    });

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    return { success: true };
  }

  async getEntryDetails(keystorePath: string, password: string, alias: string): Promise<OperationResult<KeystoreEntry>> {
    const args = ['-list', '-v', '-alias', alias, '-keystore', keystorePath];
    const result = await this.runner.runInteractive(args, { storePass: password });

    if (!result.success) {
      return {
        success: false,
        error: { code: 'KEYTOOL_EXECUTION_FAILED', message: this.parseError(result.stderr) },
      };
    }

    const entries = this.parseKeystoreList(result.stdout);
    if (entries.length === 0) {
      return {
        success: false,
        error: { code: 'ALIAS_NOT_FOUND', message: `El alias '${alias}' no existe.` },
      };
    }

    return { success: true, data: entries[0] };
  }

  private parseKeystoreList(output: string): KeystoreEntry[] {
    const entries: KeystoreEntry[] = [];
    const entryBlocks = output.split(/(?=Alias name:)/);

    for (const block of entryBlocks) {
      if (!block.includes('Alias name:')) continue;

      const entry: Partial<KeystoreEntry> = {};

      const aliasMatch = block.match(/Alias name:\s*(.+)/);
      if (aliasMatch) entry.alias = aliasMatch[1].trim();

      const dateMatch = block.match(/Creation date:\s*(.+)/);
      if (dateMatch) entry.creationDate = dateMatch[1].trim();

      if (block.includes('PrivateKeyEntry')) {
        entry.type = 'PrivateKeyEntry';
      } else if (block.includes('trustedCertEntry')) {
        entry.type = 'TrustedCertEntry';
      } else if (block.includes('SecretKeyEntry')) {
        entry.type = 'SecretKeyEntry';
      }

      const chainMatch = block.match(/Certificate chain length:\s*(\d+)/);
      if (chainMatch) entry.certificateChainLength = parseInt(chainMatch[1]);

      const algoMatch = block.match(/(?:Public Key|Key) Algorithm:\s*(\w+)/i);
      if (algoMatch) entry.algorithm = algoMatch[1];

      const keySizeMatch = block.match(/(\d+)[-\s]bit/i);
      if (keySizeMatch) entry.keySize = parseInt(keySizeMatch[1]);

      const validUntilMatch = block.match(/Valid from:.*until:\s*(.+)/);
      if (validUntilMatch) {
        const expirationStr = validUntilMatch[1].trim();
        entry.expirationDate = expirationStr;
        try {
          const expDate = this.parseKeytoolDate(expirationStr);
          if (expDate && !isNaN(expDate.getTime())) {
            const now = new Date();
            entry.daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        } catch {
          // Ignore date parse errors
        }
      }

      const ownerMatch = block.match(/Owner:\s*(.+)/);
      if (ownerMatch) entry.subject = ownerMatch[1].trim();

      const issuerMatch = block.match(/Issuer:\s*(.+)/);
      if (issuerMatch) entry.issuer = issuerMatch[1].trim();

      const serialMatch = block.match(/Serial number:\s*([a-f0-9]+)/i);
      if (serialMatch) entry.serialNumber = serialMatch[1];

      if (entry.alias) {
        entries.push(entry as KeystoreEntry);
      }
    }

    return entries;
  }

  private detectKeystoreTypeFromPath(keystorePath: string): KeystoreType {
    const ext = path.extname(keystorePath).toLowerCase();
    if (ext === '.p12' || ext === '.pfx') return 'PKCS12';
    if (ext === '.jceks') return 'JCEKS';
    return 'JKS';
  }

  private detectKeystoreType(output: string, keystorePath: string): KeystoreType {
    const typeMatch = output.match(/Keystore type:\s*(\w+)/i);
    if (typeMatch) {
      const type = typeMatch[1].toUpperCase();
      if (type === 'JKS' || type === 'JCEKS' || type === 'PKCS12') {
        return type as KeystoreType;
      }
    }

    const ext = path.extname(keystorePath).toLowerCase();
    if (ext === '.p12' || ext === '.pfx') return 'PKCS12';
    if (ext === '.jceks') return 'JCEKS';
    return 'JKS';
  }

  private parseError(stderr: string): string {
    if (stderr.includes('password was incorrect') || stderr.includes('wrong password')) {
      return 'Contraseña incorrecta.';
    }
    if (stderr.includes('alias <') && stderr.includes('> already exists')) {
      return 'El alias ya existe en el keystore.';
    }
    if (stderr.includes('Alias <') && stderr.includes('> does not exist')) {
      return 'El alias no existe en el keystore.';
    }
    if (stderr.includes('keystore file does not exist')) {
      return 'El archivo keystore no existe.';
    }

    const lines = stderr.split('\n').filter(l => l.trim() && !l.includes('Warning:'));
    return lines.slice(0, 3).join(' ').trim() || 'Error desconocido de keytool.';
  }

  private parseKeytoolDate(dateStr: string): Date | null {
    // Keytool format: "Fri May 14 14:15:30 CEST 2027" or "May 14 14:15:30 CEST 2027"
    // Remove timezone abbreviation (CEST, CET, GMT, etc.) that JS Date can't parse
    const cleanedStr = dateStr
      .replace(/\b[A-Z]{3,4}\b(?=\s+\d{4})/, '') // Remove timezone like CEST, CET, GMT before year
      .replace(/\s+/g, ' ')
      .trim();
    
    let parsed = new Date(cleanedStr);
    
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Try parsing with explicit format: "Fri May 14 14:15:30 2027"
    const match = dateStr.match(/(\w+)\s+(\d+)\s+(\d+:\d+:\d+)\s+(?:\w+\s+)?(\d{4})/);
    if (match) {
      const [, month, day, time, year] = match;
      const isoStr = `${month} ${day}, ${year} ${time}`;
      parsed = new Date(isoStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Fallback: try direct parse
    return new Date(dateStr);
  }
}
