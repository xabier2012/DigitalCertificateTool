import * as fs from 'fs';
import * as path from 'path';
import { CommandRunner } from './CommandRunner';
import type { OperationResult } from '@cert-manager/shared';
import { ERROR_CODES, ERROR_MESSAGES } from '@cert-manager/shared';

export class KeytoolService {
  private jdkRootPath: string;
  private keytoolPath: string;
  private commandRunner: CommandRunner;

  constructor(jdkRootPath: string) {
    this.jdkRootPath = jdkRootPath;
    this.keytoolPath = this.resolveKeytoolPath(jdkRootPath);
    this.commandRunner = new CommandRunner();
  }

  private resolveKeytoolPath(jdkRoot: string): string {
    if (!jdkRoot) return '';

    const platform = process.platform;
    const keytoolName = platform === 'win32' ? 'keytool.exe' : 'keytool';

    const possiblePaths = [
      path.join(jdkRoot, 'bin', keytoolName),
      path.join(jdkRoot, 'Contents', 'Home', 'bin', keytoolName),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return path.join(jdkRoot, 'bin', keytoolName);
  }

  setJdkRootPath(newPath: string): void {
    this.jdkRootPath = newPath;
    this.keytoolPath = this.resolveKeytoolPath(newPath);
  }

  async checkAvailable(): Promise<OperationResult<string>> {
    if (!this.jdkRootPath) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.JDK_NOT_CONFIGURED,
          message: ERROR_MESSAGES.JDK_NOT_CONFIGURED,
        },
      };
    }

    if (!fs.existsSync(this.keytoolPath)) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.KEYTOOL_EXECUTION_FAILED,
          message: `No se encontró keytool en: ${this.keytoolPath}`,
        },
      };
    }

    const result = await this.commandRunner.execute(this.keytoolPath, ['-help']);

    const success = result.exitCode === 0 || result.stdout.includes('keytool') || result.stderr.includes('keytool');

    if (!success) {
      return {
        success: false,
        error: {
          code: ERROR_CODES.KEYTOOL_EXECUTION_FAILED,
          message: ERROR_MESSAGES.KEYTOOL_EXECUTION_FAILED,
          technicalDetails: result.error || result.stderr,
        },
      };
    }

    return {
      success: true,
      data: `keytool encontrado en: ${this.keytoolPath}`,
    };
  }

  getKeytoolPath(): string {
    return this.keytoolPath;
  }
}
