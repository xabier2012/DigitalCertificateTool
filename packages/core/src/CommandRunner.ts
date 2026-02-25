import { spawn } from 'child_process';
import type { CommandResult } from '@cert-manager/shared';

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
  stdin?: string;
}

const DEFAULT_TIMEOUT = 30000;

export class CommandRunner {
  private defaultTimeout: number;

  constructor(timeout: number = DEFAULT_TIMEOUT) {
    this.defaultTimeout = timeout;
  }

  async execute(
    command: string,
    args: string[],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    const { cwd, timeout = this.defaultTimeout, env, stdin } = options;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: false,
        windowsHide: true,
      });

      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
      }, timeout);

      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      }

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          stdout,
          stderr,
          exitCode: null,
          error: err.message,
        });
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (killed) {
          resolve({
            success: false,
            stdout,
            stderr,
            exitCode: code,
            error: `Operación cancelada por timeout (${timeout}ms)`,
          });
          return;
        }

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });
    });
  }

  getSanitizedCommand(command: string, args: string[]): string {
    const sanitizedArgs = args.map((arg) => {
      if (arg.includes('pass') || arg.includes('password')) {
        return '[REDACTED]';
      }
      return arg;
    });
    return `${command} ${sanitizedArgs.join(' ')}`;
  }
}
