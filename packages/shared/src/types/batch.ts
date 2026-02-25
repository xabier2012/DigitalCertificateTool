export interface BatchJobItem {
  id: string;
  inputPath: string;
  outputPath?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  progress?: number;
}

export interface BatchJob {
  id: string;
  type: BatchJobType;
  items: BatchJobItem[];
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  startTime?: string;
  endTime?: string;
}

export type BatchJobType =
  | 'convert'
  | 'extract_public'
  | 'expiration_report'
  | 'import_truststore';

export interface BatchConvertOptions {
  inputDir: string;
  outputDir: string;
  inputExtensions: string[];
  outputFormat: 'PEM' | 'DER';
  recursive?: boolean;
}

export interface BatchExtractPublicOptions {
  inputDir: string;
  outputDir: string;
  inputExtensions: string[];
  recursive?: boolean;
}

export interface ExpirationReportItem {
  path: string;
  fileName: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiration: number;
  status: 'valid' | 'expiring_soon' | 'expired';
  serialNumber?: string;
}

export interface ExpirationReportOptions {
  inputDir: string;
  extensions: string[];
  recursive?: boolean;
  warningDays?: number;
}

export interface ExpirationReport {
  generatedAt: string;
  scannedDir: string;
  totalCertificates: number;
  validCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  items: ExpirationReportItem[];
}

export interface BatchImportTruststoreOptions {
  keystorePath: string;
  keystorePassword: string;
  inputDir: string;
  extensions: string[];
  aliasPrefix: string;
  recursive?: boolean;
}

export interface BatchResult {
  jobId: string;
  success: boolean;
  totalItems: number;
  successCount: number;
  failedCount: number;
  items: BatchJobItem[];
  duration?: number;
}

export interface BatchProgress {
  jobId: string;
  currentItem: number;
  totalItems: number;
  currentFile?: string;
  percentComplete: number;
}
