import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useLogsStore } from '../store/logsStore';
import type { OperationLogEntry, OperationType, OperationStatus } from '@cert-manager/shared';

const OPERATION_LABELS: Partial<Record<OperationType, string>> = {
  inspect: 'Inspeccionar',
  convert: 'Convertir',
  extract_public_key: 'Extraer clave pública',
  generate_csr: 'Generar CSR',
  generate_self_signed: 'Generar autofirmado',
  generate_key_pair: 'Generar par de claves',
  test_openssl: 'Probar OpenSSL',
  test_keytool: 'Probar keytool',
  generate_root_ca: 'Generar Root CA',
  generate_intermediate_ca: 'Generar Intermediate CA',
  sign_csr: 'Firmar CSR',
  create_pkcs12: 'Crear PKCS#12',
  inspect_pkcs12: 'Inspeccionar PKCS#12',
  extract_pkcs12: 'Extraer PKCS#12',
  create_pkcs7: 'Crear PKCS#7',
  create_pkcs7_from_chain: 'Crear PKCS#7 desde cadena',
  inspect_pkcs7: 'Inspeccionar PKCS#7',
  extract_pkcs7: 'Extraer PKCS#7',
  create_keystore: 'Crear keystore',
  open_keystore: 'Abrir keystore',
  generate_keypair: 'Generar keypair',
  generate_csr_keystore: 'Generar CSR (keystore)',
  import_cert_keystore: 'Importar certificado',
  import_p12_keystore: 'Importar PKCS#12',
  import_signed_cert: 'Importar cert. firmado',
  export_cert_keystore: 'Exportar certificado',
  delete_alias: 'Eliminar alias',
  rename_alias: 'Renombrar alias',
  convert_keystore: 'Convertir keystore',
  batch_convert: 'Conversión por lotes',
  batch_extract_public: 'Extracción por lotes',
  batch_expiration_report: 'Reporte de expiración',
  batch_import_truststore: 'Importar a truststore',
};

const STATUS_CONFIG: Record<OperationStatus, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  pending: { label: 'Pendiente', color: 'default' },
  running: { label: 'En progreso', color: 'warning' },
  success: { label: 'OK', color: 'success' },
  error: { label: 'Error', color: 'error' },
};

export default function ActivityLogs() {
  const { logs, loading, loadLogs, clearLogs } = useLogsStore();
  const [selectedLog, setSelectedLog] = useState<OperationLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleViewDetails = (log: OperationLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleClearLogs = async () => {
    if (confirm('¿Estás seguro de que deseas borrar todos los logs?')) {
      await clearLogs();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Activity / Logs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Historial de operaciones realizadas
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadLogs()}
            disabled={loading}
          >
            Actualizar
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearLogs}
            disabled={logs.length === 0}
          >
            Limpiar
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha/Hora</TableCell>
              <TableCell>Operación</TableCell>
              <TableCell>Entrada</TableCell>
              <TableCell>Salida</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Detalles</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No hay operaciones registradas
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {formatDate(log.timestamp)}
                  </TableCell>
                  <TableCell>{OPERATION_LABELS[log.type] || log.type}</TableCell>
                  <TableCell>{log.inputFileName || '-'}</TableCell>
                  <TableCell>{log.outputFileName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_CONFIG[log.status].label}
                      color={STATUS_CONFIG[log.status].color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver detalles">
                      <IconButton size="small" onClick={() => handleViewDetails(log)}>
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de la operación</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Fecha/Hora:</Typography>
              <Typography sx={{ mb: 2 }}>{formatDate(selectedLog.timestamp)}</Typography>

              <Typography variant="subtitle2" color="text.secondary">Operación:</Typography>
              <Typography sx={{ mb: 2 }}>{OPERATION_LABELS[selectedLog.type] || selectedLog.type}</Typography>

              <Typography variant="subtitle2" color="text.secondary">Estado:</Typography>
              <Chip
                label={STATUS_CONFIG[selectedLog.status].label}
                color={STATUS_CONFIG[selectedLog.status].color}
                size="small"
                sx={{ mb: 2 }}
              />

              {selectedLog.errorMessage && (
                <>
                  <Typography variant="subtitle2" color="error">Error:</Typography>
                  <Typography color="error" sx={{ mb: 2 }}>{selectedLog.errorMessage}</Typography>
                </>
              )}

              {selectedLog.details?.stdout && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">Salida (stdout):</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={selectedLog.details.stdout}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: 'monospace', fontSize: '11px' },
                    }}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {selectedLog.details?.stderr && (
                <>
                  <Typography variant="subtitle2" color="text.secondary">Errores (stderr):</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={selectedLog.details.stderr}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: 'monospace', fontSize: '11px' },
                    }}
                  />
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
