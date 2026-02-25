const SENSITIVE_PATTERNS = [
  /password[=:]\s*\S+/gi,
  /pass[=:]\s*\S+/gi,
  /-passin\s+\S+/gi,
  /-passout\s+\S+/gi,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
  /-----BEGIN\s+ENCRYPTED\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+ENCRYPTED\s+PRIVATE\s+KEY-----/gi,
];

export function sanitizeLog(text: string): string {
  let sanitized = text;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

export function sanitizePath(fullPath: string): string {
  const parts = fullPath.split(/[/\\]/);
  if (parts.length <= 2) {
    return fullPath;
  }
  const fileName = parts[parts.length - 1];
  return `.../${fileName}`;
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeLog(error.message);
  }
  if (typeof error === 'string') {
    return sanitizeLog(error);
  }
  return 'Error desconocido';
}

export function maskPassword(password: string): string {
  if (!password) return '';
  return '*'.repeat(Math.min(password.length, 8));
}
