export type OperationType =
  | 'inspect'
  | 'convert'
  | 'extract_public_key'
  | 'generate_csr'
  | 'generate_self_signed'
  | 'generate_key_pair'
  | 'test_openssl'
  | 'test_keytool'
  | 'generate_root_ca'
  | 'generate_intermediate_ca'
  | 'sign_csr'
  | 'create_pkcs12'
  | 'inspect_pkcs12'
  | 'extract_pkcs12'
  | 'create_pkcs7'
  | 'create_pkcs7_from_chain'
  | 'inspect_pkcs7'
  | 'extract_pkcs7'
  | 'create_keystore'
  | 'open_keystore'
  | 'generate_keypair'
  | 'generate_csr_keystore'
  | 'import_cert_keystore'
  | 'import_p12_keystore'
  | 'import_signed_cert'
  | 'export_cert_keystore'
  | 'delete_alias'
  | 'rename_alias'
  | 'convert_keystore'
  | 'batch_convert'
  | 'batch_extract_public'
  | 'batch_expiration_report'
  | 'batch_import_truststore';

export type OperationStatus = 'pending' | 'running' | 'success' | 'error';

export interface OperationLogEntry {
  id: string;
  timestamp: string;
  type: OperationType;
  inputFileName?: string;
  outputFileName?: string;
  status: OperationStatus;
  errorMessage?: string;
  details?: OperationDetails;
}

export interface OperationDetails {
  command?: string;
  stdout?: string;
  stderr?: string;
  duration?: number;
}

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: string;
}

export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: OperationError;
}

export interface OperationError {
  code: string;
  message: string;
  technicalDetails?: string;
}

export const ERROR_CODES = {
  OPENSSL_NOT_CONFIGURED: 'OPENSSL_NOT_CONFIGURED',
  OPENSSL_EXECUTION_FAILED: 'OPENSSL_EXECUTION_FAILED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_FORMAT: 'INVALID_FORMAT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  TIMEOUT: 'TIMEOUT',
  JDK_NOT_CONFIGURED: 'JDK_NOT_CONFIGURED',
  KEYTOOL_EXECUTION_FAILED: 'KEYTOOL_EXECUTION_FAILED',
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  OPENSSL_NOT_CONFIGURED: 'OpenSSL no está configurado. Ve a Configuración para establecer la ruta.',
  OPENSSL_EXECUTION_FAILED: 'Error al ejecutar OpenSSL. Verifica que la ruta sea correcta.',
  INVALID_PASSWORD: 'Contraseña inválida o archivo PKCS#12 dañado.',
  FILE_NOT_FOUND: 'El archivo especificado no existe.',
  INVALID_FORMAT: 'El formato del archivo no es válido o no es compatible.',
  PERMISSION_DENIED: 'No se tiene permiso para acceder al archivo o directorio.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
  TIMEOUT: 'La operación ha excedido el tiempo de espera.',
  JDK_NOT_CONFIGURED: 'JDK no está configurado. Ve a Configuración para establecer la ruta raíz.',
  KEYTOOL_EXECUTION_FAILED: 'Error al ejecutar keytool. Verifica que la ruta del JDK sea correcta.',
};
