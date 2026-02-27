import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { sanitizeLog } from '@cert-manager/shared';

export interface KeytoolRunnerOptions {
  jdkRootPath: string;
  timeout?: number;
}

export interface KeytoolResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: Error;
}

const PASSWORD_PROMPTS = [
  /Enter keystore password:\s*$/i,
  /Enter source keystore password:\s*$/i,
  /Enter destination keystore password:\s*$/i,
  /Re-enter new password:\s*$/i,
  /Enter key password for .+:\s*$/i,
  /same as keystore password\):\s*$/i,
  /Enter the password again:\s*$/i,
  /New keystore password:\s*$/i,
  /Keystore password:\s*$/i,
  /Password:\s*$/i,
  /Trust this certificate\? \[no\]:\s*$/i,
];

export class KeytoolRunner {
  private jdkRootPath: string;
  private timeout: number;

  constructor(options: KeytoolRunnerOptions) {
    this.jdkRootPath = options.jdkRootPath;
    this.timeout = options.timeout || 30000;
  }

  setJdkRootPath(jdkRootPath: string): void {
    this.jdkRootPath = jdkRootPath;
  }

  getKeytoolPath(): string {
    if (!this.jdkRootPath) {
      throw new Error('JDK path not configured');
    }

    const platform = os.platform();
    let keytoolName = 'keytool';

    if (platform === 'win32') {
      keytoolName = 'keytool.exe';
    }

    let jdkBinPath = this.jdkRootPath;
    if (platform === 'darwin') {
      if (!jdkBinPath.includes('/Contents/Home')) {
        const possiblePath = path.join(jdkBinPath, 'Contents', 'Home', 'bin');
        if (require('fs').existsSync(possiblePath)) {
          jdkBinPath = path.join(jdkBinPath, 'Contents', 'Home');
        }
      }
    }

    return path.join(jdkBinPath, 'bin', keytoolName);
  }

  async runInteractive(
    args: string[],
    passwords: { storePass?: string; keyPass?: string; srcStorePass?: string; destStorePass?: string; trustCert?: boolean }
  ): Promise<KeytoolResult> {
    let keytoolPath: string;
    try {
      keytoolPath = this.getKeytoolPath();
    } catch (err) {
      return {
        success: false,
        stdout: '',
        stderr: err instanceof Error ? err.message : 'JDK path not configured',
        exitCode: null,
        error: err instanceof Error ? err : new Error('JDK path not configured'),
      };
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let currentBuffer = '';
      let passwordsProvided = new Set<string>();

      const sanitizedArgs = args.map((arg) =>
        arg.includes('pass') ? '[REDACTED]' : sanitizeLog(arg)
      );
      console.log(`[KeytoolRunner] Executing: keytool ${sanitizedArgs.join(' ')}`);

      const child: ChildProcess = spawn(keytoolPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nTimeout exceeded',
          exitCode: null,
          error: new Error('Keytool execution timeout'),
        });
      }, this.timeout);

      const handleOutput = (data: Buffer, isStderr: boolean) => {
        const text = data.toString();
        if (isStderr) {
          stderr += text;
        } else {
          stdout += text;
        }
        currentBuffer += text;

        for (const prompt of PASSWORD_PROMPTS) {
          if (prompt.test(currentBuffer)) {
            const promptKey = prompt.source;

            if (passwordsProvided.has(promptKey)) {
              continue;
            }

            let passwordToSend: string | null = null;

            if (/Trust this certificate/i.test(currentBuffer)) {
              if (passwords.trustCert) {
                passwordToSend = 'yes';
              } else {
                passwordToSend = 'no';
              }
            } else if (/source keystore password/i.test(currentBuffer)) {
              passwordToSend = passwords.srcStorePass || passwords.storePass || '';
            } else if (/destination keystore password/i.test(currentBuffer)) {
              passwordToSend = passwords.destStorePass || passwords.storePass || '';
            } else if (/key password for/i.test(currentBuffer) || /same as keystore password/i.test(currentBuffer)) {
              passwordToSend = passwords.keyPass || passwords.storePass || '';
            } else if (/Re-enter|again/i.test(currentBuffer)) {
              passwordToSend = passwords.storePass || '';
            } else {
              passwordToSend = passwords.storePass || '';
            }

            if (passwordToSend !== null && child.stdin) {
              child.stdin.write(passwordToSend + '\n');
              passwordsProvided.add(promptKey);
              currentBuffer = '';
            }
            break;
          }
        }
      };

      child.stdout?.on('data', (data: Buffer) => handleOutput(data, false));
      child.stderr?.on('data', (data: Buffer) => handleOutput(data, true));

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const success = code === 0;
        resolve({
          success,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
          error,
        });
      });
    });
  }

  async runWithStorePass(args: string[], storePass: string): Promise<KeytoolResult> {
    let keytoolPath: string;
    try {
      keytoolPath = this.getKeytoolPath();
    } catch (err) {
      return {
        success: false,
        stdout: '',
        stderr: err instanceof Error ? err.message : 'JDK path not configured',
        exitCode: null,
        error: err instanceof Error ? err : new Error('JDK path not configured'),
      };
    }
    const fullArgs = [...args, '-storepass', storePass];

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const sanitizedArgs = fullArgs.map((arg, i) =>
        fullArgs[i - 1] === '-storepass' ? '[REDACTED]' : sanitizeLog(arg)
      );
      console.log(`[KeytoolRunner] Executing (fallback): keytool ${sanitizedArgs.join(' ')}`);
      console.warn('[KeytoolRunner] WARNING: Using -storepass argument (less secure)');

      const child = spawn(keytoolPath, fullArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nTimeout exceeded',
          exitCode: null,
          error: new Error('Keytool execution timeout'),
        });
      }, this.timeout);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
          error,
        });
      });
    });
  }

  async runDirect(args: string[]): Promise<KeytoolResult> {
    let keytoolPath: string;
    try {
      keytoolPath = this.getKeytoolPath();
    } catch (err) {
      return {
        success: false,
        stdout: '',
        stderr: err instanceof Error ? err.message : 'JDK path not configured',
        exitCode: null,
        error: err instanceof Error ? err : new Error('JDK path not configured'),
      };
    }

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // Log sin mostrar contraseñas
      const sanitizedArgs = args.map((arg, i) => {
        const prevArg = args[i - 1] || '';
        if (prevArg.toLowerCase().includes('pass')) {
          return '[REDACTED]';
        }
        return sanitizeLog(arg);
      });
      console.log(`[KeytoolRunner] Executing (direct): keytool ${sanitizedArgs.join(' ')}`);

      const child = spawn(keytoolPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nTimeout exceeded',
          exitCode: null,
          error: new Error('Keytool execution timeout'),
        });
      }, this.timeout);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\n' + error.message,
          exitCode: null,
          error,
        });
      });
    });
  }

  async checkAvailable(): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      const keytoolPath = this.getKeytoolPath();

      if (!require('fs').existsSync(keytoolPath)) {
        return {
          success: false,
          error: `keytool no encontrado en: ${keytoolPath}`,
        };
      }

      const result = await this.runInteractive(['-help'], {});

      if (result.stdout.includes('keytool') || result.stderr.includes('keytool')) {
        const versionMatch = (result.stdout + result.stderr).match(/keytool\s+(\d+)/i);
        return {
          success: true,
          version: versionMatch ? versionMatch[1] : 'unknown',
        };
      }

      return {
        success: false,
        error: 'keytool no responde correctamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }
}
