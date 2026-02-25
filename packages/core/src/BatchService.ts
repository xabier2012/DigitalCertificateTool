import * as fs from 'fs';
import * as path from 'path';
import { OpenSSLService } from './OpenSSLService';
import { KeystoreService } from './KeystoreService';
import { FileFormatDetector } from './FileFormatDetector';
import type { OperationResult } from '@cert-manager/shared';
import type {
  BatchJobItem,
  BatchConvertOptions,
  BatchExtractPublicOptions,
  ExpirationReportOptions,
  ExpirationReport,
  ExpirationReportItem,
  BatchImportTruststoreOptions,
  BatchResult,
  BatchProgress,
} from '@cert-manager/shared';

type ProgressCallback = (progress: BatchProgress) => void;

export class BatchService {
  private opensslService: OpenSSLService;
  private keystoreService: KeystoreService;
  private formatDetector: FileFormatDetector;
  private cancelledJobs: Set<string> = new Set();

  constructor(opensslPath: string, jdkRootPath: string) {
    this.opensslService = new OpenSSLService(opensslPath);
    this.keystoreService = new KeystoreService(jdkRootPath);
    this.formatDetector = new FileFormatDetector();
  }

  setOpensslPath(opensslPath: string): void {
    this.opensslService.setOpensslPath(opensslPath);
  }

  setJdkRootPath(jdkRootPath: string): void {
    this.keystoreService.setJdkRootPath(jdkRootPath);
  }

  cancelJob(jobId: string): void {
    this.cancelledJobs.add(jobId);
  }

  private isJobCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  async batchConvert(
    options: BatchConvertOptions,
    onProgress?: ProgressCallback
  ): Promise<OperationResult<BatchResult>> {
    const jobId = `convert-${Date.now()}`;
    const { inputDir, outputDir, inputExtensions, outputFormat, recursive } = options;

    const files = this.findFiles(inputDir, inputExtensions, recursive);
    const items: BatchJobItem[] = files.map((f, i) => ({
      id: `item-${i}`,
      inputPath: f,
      status: 'pending' as const,
    }));

    if (items.length === 0) {
      return {
        success: true,
        data: {
          jobId,
          success: true,
          totalItems: 0,
          successCount: 0,
          failedCount: 0,
          items: [],
        },
      };
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let successCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      if (this.isJobCancelled(jobId)) {
        break;
      }

      const item = items[i];
      item.status = 'processing';

      if (onProgress) {
        onProgress({
          jobId,
          currentItem: i + 1,
          totalItems: items.length,
          currentFile: path.basename(item.inputPath),
          percentComplete: Math.round(((i + 1) / items.length) * 100),
        });
      }

      try {
        const baseName = path.basename(item.inputPath, path.extname(item.inputPath));
        const outputExt = outputFormat === 'PEM' ? '.pem' : '.der';
        const outputPath = path.join(outputDir, baseName + outputExt);

        // Detect actual input format instead of hardcoding PEM
        const detection = await this.formatDetector.detectFormat(item.inputPath);
        const inputFormat = detection.format === 'DER' ? 'DER' : 'PEM';

        const result = await this.opensslService.convertCertificate({
          inputPath: item.inputPath,
          outputPath,
          inputFormat,
          outputFormat,
        });

        if (result.success) {
          item.status = 'success';
          item.outputPath = outputPath;
          successCount++;
        } else {
          item.status = 'error';
          item.errorMessage = result.error?.message || 'Error de conversión';
          failedCount++;
        }
      } catch (error) {
        item.status = 'error';
        item.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        failedCount++;
      }

      await this.delay(10);
    }

    this.cancelledJobs.delete(jobId);

    return {
      success: true,
      data: {
        jobId,
        success: failedCount === 0,
        totalItems: items.length,
        successCount,
        failedCount,
        items,
        duration: Date.now() - startTime,
      },
    };
  }

  async batchExtractPublicKeys(
    options: BatchExtractPublicOptions,
    onProgress?: ProgressCallback
  ): Promise<OperationResult<BatchResult>> {
    const jobId = `extract-${Date.now()}`;
    const { inputDir, outputDir, inputExtensions, recursive } = options;

    const files = this.findFiles(inputDir, inputExtensions, recursive);
    const items: BatchJobItem[] = files.map((f, i) => ({
      id: `item-${i}`,
      inputPath: f,
      status: 'pending' as const,
    }));

    if (items.length === 0) {
      return {
        success: true,
        data: {
          jobId,
          success: true,
          totalItems: 0,
          successCount: 0,
          failedCount: 0,
          items: [],
        },
      };
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let successCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      if (this.isJobCancelled(jobId)) break;

      const item = items[i];
      item.status = 'processing';

      if (onProgress) {
        onProgress({
          jobId,
          currentItem: i + 1,
          totalItems: items.length,
          currentFile: path.basename(item.inputPath),
          percentComplete: Math.round(((i + 1) / items.length) * 100),
        });
      }

      try {
        const baseName = path.basename(item.inputPath, path.extname(item.inputPath));
        const outputPath = path.join(outputDir, baseName + '_public.pem');

        const result = await this.opensslService.extractPublicKeyFromCert(item.inputPath, outputPath);

        if (result.success) {
          item.status = 'success';
          item.outputPath = outputPath;
          successCount++;
        } else {
          item.status = 'error';
          item.errorMessage = result.error?.message || 'Error de extracción';
          failedCount++;
        }
      } catch (error) {
        item.status = 'error';
        item.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        failedCount++;
      }

      await this.delay(10);
    }

    this.cancelledJobs.delete(jobId);

    return {
      success: true,
      data: {
        jobId,
        success: failedCount === 0,
        totalItems: items.length,
        successCount,
        failedCount,
        items,
        duration: Date.now() - startTime,
      },
    };
  }

  async generateExpirationReport(
    options: ExpirationReportOptions,
    onProgress?: ProgressCallback
  ): Promise<OperationResult<ExpirationReport>> {
    const jobId = `report-${Date.now()}`;
    const { inputDir, extensions, recursive, warningDays = 30 } = options;

    const files = this.findFiles(inputDir, extensions, recursive);

    if (files.length === 0) {
      return {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          scannedDir: inputDir,
          totalCertificates: 0,
          validCount: 0,
          expiringSoonCount: 0,
          expiredCount: 0,
          items: [],
        },
      };
    }

    const items: ExpirationReportItem[] = [];
    let validCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (this.isJobCancelled(jobId)) break;

      const filePath = files[i];

      if (onProgress) {
        onProgress({
          jobId,
          currentItem: i + 1,
          totalItems: files.length,
          currentFile: path.basename(filePath),
          percentComplete: Math.round(((i + 1) / files.length) * 100),
        });
      }

      try {
        const result = await this.opensslService.inspectCertificate(filePath);

        if (result.success && result.data) {
          const certInfo = result.data;
          const now = new Date();
          let daysUntilExpiration = 0;
          let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';

          if (certInfo.validTo) {
            const expDate = new Date(certInfo.validTo);
            daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiration <= 0) {
              status = 'expired';
              expiredCount++;
            } else if (daysUntilExpiration <= warningDays) {
              status = 'expiring_soon';
              expiringSoonCount++;
            } else {
              validCount++;
            }
          }

          items.push({
            path: filePath,
            fileName: path.basename(filePath),
            subject: certInfo.subject?.CN || certInfo.subject?.O || 'Desconocido',
            issuer: certInfo.issuer?.CN || certInfo.issuer?.O || 'Desconocido',
            validFrom: certInfo.validFrom || '',
            validTo: certInfo.validTo || '',
            daysUntilExpiration,
            status,
            serialNumber: certInfo.serialNumber,
          });
        }
      } catch (error) {
        // Skip files that can't be parsed
        console.warn(`[BatchService] Could not parse: ${filePath}`);
      }

      await this.delay(10);
    }

    this.cancelledJobs.delete(jobId);

    items.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        scannedDir: inputDir,
        totalCertificates: items.length,
        validCount,
        expiringSoonCount,
        expiredCount,
        items,
      },
    };
  }

  async batchImportToTruststore(
    options: BatchImportTruststoreOptions,
    onProgress?: ProgressCallback
  ): Promise<OperationResult<BatchResult>> {
    const jobId = `import-${Date.now()}`;
    const { keystorePath, keystorePassword, inputDir, extensions, aliasPrefix, recursive } = options;

    const files = this.findFiles(inputDir, extensions, recursive);
    const items: BatchJobItem[] = files.map((f, i) => ({
      id: `item-${i}`,
      inputPath: f,
      status: 'pending' as const,
    }));

    if (items.length === 0) {
      return {
        success: true,
        data: {
          jobId,
          success: true,
          totalItems: 0,
          successCount: 0,
          failedCount: 0,
          items: [],
        },
      };
    }

    let successCount = 0;
    let failedCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < items.length; i++) {
      if (this.isJobCancelled(jobId)) break;

      const item = items[i];
      item.status = 'processing';

      if (onProgress) {
        onProgress({
          jobId,
          currentItem: i + 1,
          totalItems: items.length,
          currentFile: path.basename(item.inputPath),
          percentComplete: Math.round(((i + 1) / items.length) * 100),
        });
      }

      try {
        const baseName = path.basename(item.inputPath, path.extname(item.inputPath));
        const alias = `${aliasPrefix}${baseName}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        const result = await this.keystoreService.importCertificate({
          keystorePath,
          keystorePassword,
          alias,
          certPath: item.inputPath,
          trustCACerts: true,
        });

        if (result.success) {
          item.status = 'success';
          item.outputPath = alias;
          successCount++;
        } else {
          item.status = 'error';
          item.errorMessage = result.error?.message || 'Error de importación';
          failedCount++;
        }
      } catch (error) {
        item.status = 'error';
        item.errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        failedCount++;
      }

      await this.delay(50);
    }

    this.cancelledJobs.delete(jobId);

    return {
      success: true,
      data: {
        jobId,
        success: failedCount === 0,
        totalItems: items.length,
        successCount,
        failedCount,
        items,
        duration: Date.now() - startTime,
      },
    };
  }

  exportReportToCSV(report: ExpirationReport): string {
    const headers = ['Archivo', 'Subject', 'Issuer', 'Válido desde', 'Válido hasta', 'Días restantes', 'Estado'];
    const rows = report.items.map((item) => [
      item.fileName,
      `"${item.subject}"`,
      `"${item.issuer}"`,
      item.validFrom,
      item.validTo,
      item.daysUntilExpiration.toString(),
      item.status === 'valid' ? 'Válido' : item.status === 'expiring_soon' ? 'Por expirar' : 'Expirado',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private findFiles(dir: string, extensions: string[], recursive?: boolean): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const normalizedExts = extensions.map((e) => (e.startsWith('.') ? e.toLowerCase() : '.' + e.toLowerCase()));

    const scanDir = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory() && recursive) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (normalizedExts.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDir(dir);
    return files;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
