import * as path from 'path';

export function normalizePathForOS(inputPath: string): string {
  return path.normalize(inputPath);
}

export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}

export function getDirectoryName(filePath: string): string {
  return path.dirname(filePath);
}

export function joinPaths(...paths: string[]): string {
  return path.join(...paths);
}

export function isAbsolutePath(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

export function ensureExtension(filePath: string, extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  if (filePath.toLowerCase().endsWith(ext.toLowerCase())) {
    return filePath;
  }
  return `${filePath}${ext}`;
}

export function replaceExtension(filePath: string, newExtension: string): string {
  const ext = newExtension.startsWith('.') ? newExtension : `.${newExtension}`;
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, `${parsed.name}${ext}`);
}
