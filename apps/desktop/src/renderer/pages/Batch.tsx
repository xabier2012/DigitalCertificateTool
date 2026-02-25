import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Folder as FolderIcon,
  SwapHoriz as ConvertIcon,
  Key as KeyIcon,
  Schedule as ExpirationIcon,
  Upload as ImportIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { BatchResult, ExpirationReport, BatchProgress } from '@cert-manager/shared';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Batch() {
  const [tabValue, setTabValue] = useState(0);

  const [convertInputDir, setConvertInputDir] = useState('');
  const [convertOutputDir, setConvertOutputDir] = useState('');
  const [convertExtensions, setConvertExtensions] = useState('cer,crt,pem,der');
  const [convertOutputFormat, setConvertOutputFormat] = useState<'PEM' | 'DER'>('PEM');
  const [convertRecursive, setConvertRecursive] = useState(false);

  const [extractInputDir, setExtractInputDir] = useState('');
  const [extractOutputDir, setExtractOutputDir] = useState('');
  const [extractExtensions, setExtractExtensions] = useState('cer,crt,pem');
  const [extractRecursive, setExtractRecursive] = useState(false);

  const [reportInputDir, setReportInputDir] = useState('');
  const [reportExtensions, setReportExtensions] = useState('cer,crt,pem,der,p12,pfx');
  const [reportRecursive, setReportRecursive] = useState(true);
  const [reportWarningDays, setReportWarningDays] = useState(30);
  const [expirationReport, setExpirationReport] = useState<ExpirationReport | null>(null);

  const [importKeystorePath, setImportKeystorePath] = useState('');
  const [importKeystorePassword, setImportKeystorePassword] = useState('');
  const [importInputDir, setImportInputDir] = useState('');
  const [importExtensions, setImportExtensions] = useState('cer,crt,pem');
  const [importAliasPrefix, setImportAliasPrefix] = useState('cert_');
  const [importRecursive, setImportRecursive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDirectory = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleSelectFile = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Keystores', extensions: ['jks', 'jceks', 'p12', 'pfx'] },
    ]);
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleBatchConvert = async () => {
    setError(null);
    setResult(null);
    setProgress(null);

    if (!convertInputDir || !convertOutputDir) {
      setError('Selecciona las carpetas de entrada y salida.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.batch.convert({
        inputDir: convertInputDir,
        outputDir: convertOutputDir,
        inputExtensions: convertExtensions.split(',').map(e => e.trim()),
        outputFormat: convertOutputFormat,
        recursive: convertRecursive,
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error?.message || 'Error en conversión batch.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBatchExtract = async () => {
    setError(null);
    setResult(null);

    if (!extractInputDir || !extractOutputDir) {
      setError('Selecciona las carpetas de entrada y salida.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.batch.extractPublicKeys({
        inputDir: extractInputDir,
        outputDir: extractOutputDir,
        inputExtensions: extractExtensions.split(',').map(e => e.trim()),
        recursive: extractRecursive,
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error?.message || 'Error en extracción batch.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setError(null);
    setExpirationReport(null);

    if (!reportInputDir) {
      setError('Selecciona la carpeta a escanear.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.batch.expirationReport({
        inputDir: reportInputDir,
        extensions: reportExtensions.split(',').map(e => e.trim()),
        recursive: reportRecursive,
        warningDays: reportWarningDays,
      });

      if (res.success && res.data) {
        setExpirationReport(res.data);
      } else {
        setError(res.error?.message || 'Error generando reporte.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!expirationReport) return;

    const headers = ['Archivo', 'Subject', 'Issuer', 'Válido desde', 'Válido hasta', 'Días restantes', 'Estado'];
    const rows = expirationReport.items.map(item => [
      item.fileName,
      `"${item.subject}"`,
      `"${item.issuer}"`,
      item.validFrom,
      item.validTo,
      item.daysUntilExpiration.toString(),
      item.status === 'valid' ? 'Válido' : item.status === 'expiring_soon' ? 'Por expirar' : 'Expirado',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expiration_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchImport = async () => {
    setError(null);
    setResult(null);

    if (!importKeystorePath || !importKeystorePassword || !importInputDir) {
      setError('Completa todos los campos requeridos.');
      return;
    }

    setLoading(true);
    try {
      const res = await window.electronAPI.batch.importTruststore({
        keystorePath: importKeystorePath,
        keystorePassword: importKeystorePassword,
        inputDir: importInputDir,
        extensions: importExtensions.split(',').map(e => e.trim()),
        aliasPrefix: importAliasPrefix,
        recursive: importRecursive,
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error?.message || 'Error en importación batch.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'success';
      case 'expiring_soon': return 'warning';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Operaciones Batch</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Procesa múltiples archivos de certificados de forma masiva
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<ConvertIcon />} label="Convertir" iconPosition="start" />
          <Tab icon={<KeyIcon />} label="Extraer públicas" iconPosition="start" />
          <Tab icon={<ExpirationIcon />} label="Reporte expiraciones" iconPosition="start" />
          <Tab icon={<ImportIcon />} label="Import a truststore" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Convierte todos los certificados de una carpeta a PEM o DER.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta entrada" value={convertInputDir} onChange={(e) => setConvertInputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setConvertInputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta salida" value={convertOutputDir} onChange={(e) => setConvertOutputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setConvertOutputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Extensiones (separadas por coma)" value={convertExtensions} onChange={(e) => setConvertExtensions(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Formato salida</InputLabel>
                <Select value={convertOutputFormat} label="Formato salida" onChange={(e) => setConvertOutputFormat(e.target.value as 'PEM' | 'DER')}>
                  <MenuItem value="PEM">PEM (texto)</MenuItem>
                  <MenuItem value="DER">DER (binario)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Switch checked={convertRecursive} onChange={(e) => setConvertRecursive(e.target.checked)} />} label="Incluir subcarpetas" />
            </Grid>
          </Grid>

          <Button variant="contained" sx={{ mt: 3 }} onClick={handleBatchConvert} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <ConvertIcon />}>
            Convertir
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Extrae las claves públicas de todos los certificados de una carpeta.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta entrada" value={extractInputDir} onChange={(e) => setExtractInputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setExtractInputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta salida" value={extractOutputDir} onChange={(e) => setExtractOutputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setExtractOutputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Extensiones" value={extractExtensions} onChange={(e) => setExtractExtensions(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={<Switch checked={extractRecursive} onChange={(e) => setExtractRecursive(e.target.checked)} />} label="Incluir subcarpetas" />
            </Grid>
          </Grid>

          <Button variant="contained" sx={{ mt: 3 }} onClick={handleBatchExtract} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <KeyIcon />}>
            Extraer
          </Button>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Genera un reporte de fechas de expiración de todos los certificados.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta a escanear" value={reportInputDir} onChange={(e) => setReportInputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setReportInputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth type="number" label="Días de advertencia" value={reportWarningDays} onChange={(e) => setReportWarningDays(parseInt(e.target.value) || 30)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel control={<Switch checked={reportRecursive} onChange={(e) => setReportRecursive(e.target.checked)} />} label="Incluir subcarpetas" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Extensiones" value={reportExtensions} onChange={(e) => setReportExtensions(e.target.value)} />
            </Grid>
          </Grid>

          <Button variant="contained" sx={{ mt: 3 }} onClick={handleGenerateReport} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <ExpirationIcon />}>
            Generar reporte
          </Button>

          {expirationReport && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip label={`Total: ${expirationReport.totalCertificates}`} />
                  <Chip label={`Válidos: ${expirationReport.validCount}`} color="success" />
                  <Chip label={`Por expirar: ${expirationReport.expiringSoonCount}`} color="warning" />
                  <Chip label={`Expirados: ${expirationReport.expiredCount}`} color="error" />
                </Box>
                <Button startIcon={<DownloadIcon />} onClick={handleExportCSV}>Exportar CSV</Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Archivo</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Válido hasta</TableCell>
                      <TableCell>Días</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expirationReport.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.fileName}</TableCell>
                        <TableCell>{item.subject}</TableCell>
                        <TableCell>{item.validTo}</TableCell>
                        <TableCell>{item.daysUntilExpiration}</TableCell>
                        <TableCell>
                          <Chip size="small" label={item.status === 'valid' ? 'Válido' : item.status === 'expiring_soon' ? 'Por expirar' : 'Expirado'} color={getStatusColor(item.status) as any} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Importa todos los certificados de una carpeta a un truststore.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Keystore destino" value={importKeystorePath} onChange={(e) => setImportKeystorePath(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectFile(setImportKeystorePath)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="password" label="Contraseña keystore" value={importKeystorePassword} onChange={(e) => setImportKeystorePassword(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField fullWidth label="Carpeta certificados" value={importInputDir} onChange={(e) => setImportInputDir(e.target.value)} />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setImportInputDir)}><FolderIcon /></Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth label="Prefijo alias" value={importAliasPrefix} onChange={(e) => setImportAliasPrefix(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel control={<Switch checked={importRecursive} onChange={(e) => setImportRecursive(e.target.checked)} />} label="Subcarpetas" />
            </Grid>
          </Grid>

          <Button variant="contained" sx={{ mt: 3 }} onClick={handleBatchImport} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : <ImportIcon />}>
            Importar
          </Button>
        </TabPanel>

        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

        {progress && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2">{progress.currentFile} ({progress.currentItem}/{progress.totalItems})</Typography>
            <LinearProgress variant="determinate" value={progress.percentComplete} />
          </Box>
        )}

        {result && (
          <Alert severity={result.success ? 'success' : 'warning'} sx={{ mt: 3 }} icon={result.success ? <SuccessIcon /> : <ErrorIcon />}>
            Procesados: {result.totalItems} | Éxito: {result.successCount} | Error: {result.failedCount}
            {result.duration && ` | Tiempo: ${(result.duration / 1000).toFixed(1)}s`}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
