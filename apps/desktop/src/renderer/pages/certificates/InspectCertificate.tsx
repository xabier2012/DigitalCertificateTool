import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  Folder as FolderIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import type { CertificateInfo } from '@cert-manager/shared';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function InspectCertificate() {
  const location = useLocation();
  const [filePath, setFilePath] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certInfo, setCertInfo] = useState<CertificateInfo | null>(null);
  const [isPKCS12, setIsPKCS12] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [extractPath, setExtractPath] = useState('');

  useEffect(() => {
    const state = location.state as { filePath?: string } | null;
    if (state?.filePath) {
      setFilePath(state.filePath);
      handleAnalyze(state.filePath);
    }
  }, [location.state]);

  const handleSelectFile = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Certificados', extensions: ['cer', 'crt', 'pem', 'der', 'p12', 'pfx', 'key'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setFilePath(result.data);
      setCertInfo(null);
      setError(null);

      const ext = result.data.toLowerCase();
      setIsPKCS12(ext.endsWith('.p12') || ext.endsWith('.pfx'));
    }
  };

  const handleAnalyze = async (path?: string) => {
    const targetPath = path || filePath;
    if (!targetPath) {
      setError('Selecciona un archivo primero');
      return;
    }

    setLoading(true);
    setError(null);
    setCertInfo(null);

    try {
      const result = await window.electronAPI.openssl.inspect(targetPath, password || undefined);
      if (result.success && result.data) {
        setCertInfo(result.data);
        setPassword('');
      } else {
        setError(result.error?.message || 'Error al analizar el certificado');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExtractPublicKey = async () => {
    if (!filePath) return;

    const result = await window.electronAPI.dialog.saveFile(
      undefined,
      [{ name: 'Clave pública PEM', extensions: ['pem'] }]
    );

    if (result.success && result.data) {
      setExtractPath(result.data);
      const extractResult = await window.electronAPI.openssl.extractPublicKey(filePath, result.data);
      if (extractResult.success) {
        setExtractDialogOpen(true);
      } else {
        setError(extractResult.error?.message || 'Error al extraer la clave pública');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return dateStr;
  };

  const InfoRow = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 150, fontWeight: 500 }}>
        {label}:
      </Typography>
      <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
        {value || 'N/A'}
      </Typography>
      {copyable && value && (
        <Tooltip title="Copiar">
          <IconButton size="small" onClick={() => handleCopy(value)}>
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inspeccionar Certificado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Analiza y visualiza los detalles de un certificado
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            label="Archivo de certificado"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="Selecciona un archivo .cer, .crt, .pem, .p12, .pfx..."
          />
          <Button variant="outlined" onClick={handleSelectFile} startIcon={<FolderIcon />}>
            Seleccionar
          </Button>
        </Box>

        {isPKCS12 && (
          <TextField
            fullWidth
            label="Contraseña (para archivos .p12/.pfx)"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        <Button
          variant="contained"
          onClick={() => handleAnalyze()}
          disabled={loading || !filePath}
          startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
        >
          Analizar
        </Button>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {certInfo && (
        <Paper sx={{ p: 0 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tab label="Resumen" />
            <Tab label="Texto completo" />
            <Tab label="Acciones rápidas" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Subject</Typography>
                  <InfoRow label="CN (Common Name)" value={certInfo.subject.CN || ''} copyable />
                  <InfoRow label="O (Organization)" value={certInfo.subject.O || ''} />
                  <InfoRow label="OU (Org. Unit)" value={certInfo.subject.OU || ''} />
                  <InfoRow label="L (Locality)" value={certInfo.subject.L || ''} />
                  <InfoRow label="ST (State)" value={certInfo.subject.ST || ''} />
                  <InfoRow label="C (Country)" value={certInfo.subject.C || ''} />
                  <InfoRow label="Full DN" value={certInfo.subject.raw} copyable />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Issuer</Typography>
                  <InfoRow label="CN (Common Name)" value={certInfo.issuer.CN || ''} />
                  <InfoRow label="O (Organization)" value={certInfo.issuer.O || ''} />
                  <InfoRow label="OU (Org. Unit)" value={certInfo.issuer.OU || ''} />
                  <InfoRow label="L (Locality)" value={certInfo.issuer.L || ''} />
                  <InfoRow label="ST (State)" value={certInfo.issuer.ST || ''} />
                  <InfoRow label="C (Country)" value={certInfo.issuer.C || ''} />
                  <InfoRow label="Full DN" value={certInfo.issuer.raw} copyable />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Validity</Typography>
                  <InfoRow label="Not Before" value={formatDate(certInfo.validFrom)} />
                  <InfoRow label="Not After" value={formatDate(certInfo.validTo)} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Technical Details</Typography>
                  <InfoRow label="Serial Number" value={certInfo.serialNumber} copyable />
                  <InfoRow label="Signature Algorithm" value={certInfo.algorithm} />
                  <InfoRow label="Key Size" value={certInfo.keySize ? `${certInfo.keySize} bits` : 'N/A'} />
                  <InfoRow label="Version" value={certInfo.version?.toString() || 'N/A'} />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Basic Constraints</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={certInfo.isCA ? 'CA: TRUE' : 'CA: FALSE'}
                      color={certInfo.isCA ? 'warning' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Key Usage</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {certInfo.keyUsage.length > 0 ? (
                      certInfo.keyUsage.map((usage, i) => (
                        <Chip key={i} label={usage} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No especificado</Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Extended Key Usage (EKU)</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {certInfo.extendedKeyUsage.length > 0 ? (
                      certInfo.extendedKeyUsage.map((eku, i) => (
                        <Chip key={i} label={eku} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No especificado</Typography>
                    )}
                  </Box>
                </Grid>

                {certInfo.subjectAltNames.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Subject Alternative Names (SAN)</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {certInfo.subjectAltNames.map((san, i) => (
                        <Chip key={i} label={`${san.type}: ${san.value}`} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Fingerprints</Typography>
                  <InfoRow label="SHA-256" value={certInfo.fingerprints.sha256} copyable />
                  <InfoRow label="SHA-1" value={certInfo.fingerprints.sha1} copyable />
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <TextField
                fullWidth
                multiline
                rows={20}
                value={certInfo.rawText}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '12px' },
                }}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CopyIcon />}
                    onClick={() => handleCopy(certInfo.subject.raw)}
                  >
                    Copiar Subject
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CopyIcon />}
                    onClick={() => handleCopy(certInfo.fingerprints.sha256)}
                  >
                    Copiar Fingerprint SHA-256
                  </Button>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<KeyIcon />}
                    onClick={handleExtractPublicKey}
                  >
                    Extraer clave pública...
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>
          </Box>
        </Paper>
      )}

      <Dialog open={extractDialogOpen} onClose={() => setExtractDialogOpen(false)}>
        <DialogTitle>Clave pública extraída</DialogTitle>
        <DialogContent>
          <Typography>La clave pública se ha guardado en:</Typography>
          <Typography sx={{ fontFamily: 'monospace', mt: 1 }}>{extractPath}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(extractPath)}>
            Abrir carpeta
          </Button>
          <Button onClick={() => setExtractDialogOpen(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
