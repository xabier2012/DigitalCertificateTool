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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Output as ExtractIcon,
} from '@mui/icons-material';
import type { PKCS7Info, PKCS7ExtractResult } from '@cert-manager/shared';

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

export default function PKCS7Manager() {
  const [tabValue, setTabValue] = useState(0);

  // Create tab state
  const [certPaths, setCertPaths] = useState<string[]>([]);
  const [createOutputPath, setCreateOutputPath] = useState('');
  const [chainPath, setChainPath] = useState('');
  const [createMode, setCreateMode] = useState<'certs' | 'chain'>('certs');

  // Inspect tab state
  const [inspectPath, setInspectPath] = useState('');
  const [p7bInfo, setP7bInfo] = useState<PKCS7Info | null>(null);

  // Extract tab state
  const [extractInputPath, setExtractInputPath] = useState('');
  const [extractOutputDir, setExtractOutputDir] = useState('');
  const [extractFormat, setExtractFormat] = useState<'individual' | 'chain'>('individual');
  const [extractResult, setExtractResult] = useState<PKCS7ExtractResult | null>(null);

  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resultPaths, setResultPaths] = useState<string[]>([]);

  const handleSelectFile = async (setter: (path: string) => void, filters?: { name: string; extensions: string[] }[]) => {
    const result = await window.electronAPI.dialog.selectFile(
      filters || [
        { name: 'PKCS#7', extensions: ['p7b', 'p7c'] },
        { name: 'Certificados', extensions: ['cer', 'crt', 'pem'] },
        { name: 'Todos', extensions: ['*'] },
      ]
    );
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleSelectDirectory = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleSaveFile = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.saveFile(undefined, [
      { name: 'PKCS#7', extensions: ['p7b'] },
      { name: 'Todos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleAddCert = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Certificados', extensions: ['cer', 'crt', 'pem', 'der'] },
      { name: 'Todos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setCertPaths(prev => [...prev, result.data!]);
    }
  };

  const handleRemoveCert = (index: number) => {
    setCertPaths(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setError(null);

    if (createMode === 'certs') {
      if (certPaths.length === 0) {
        setError('Añade al menos un certificado.');
        return;
      }
      if (!createOutputPath) {
        setError('Selecciona un archivo de salida.');
        return;
      }

      setLoading(true);
      try {
        const result = await window.electronAPI.pkcs7.create({
          certPaths,
          outputPath: createOutputPath,
        });

        if (result.success) {
          setSuccessMessage('Archivo PKCS#7 creado correctamente.');
          setResultPaths([createOutputPath]);
          setSuccessDialogOpen(true);
          setCertPaths([]);
          setCreateOutputPath('');
        } else {
          setError(result.error?.message || 'Error al crear el archivo PKCS#7.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!chainPath) {
        setError('Selecciona un archivo de cadena PEM.');
        return;
      }
      if (!createOutputPath) {
        setError('Selecciona un archivo de salida.');
        return;
      }

      setLoading(true);
      try {
        const result = await window.electronAPI.pkcs7.createFromChain(chainPath, createOutputPath);

        if (result.success) {
          setSuccessMessage('Archivo PKCS#7 creado desde cadena.');
          setResultPaths([createOutputPath]);
          setSuccessDialogOpen(true);
          setChainPath('');
          setCreateOutputPath('');
        } else {
          setError(result.error?.message || 'Error al crear el archivo PKCS#7.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleInspect = async () => {
    if (!inspectPath) {
      setError('Selecciona un archivo PKCS#7.');
      return;
    }

    setError(null);
    setP7bInfo(null);
    setLoading(true);

    try {
      const result = await window.electronAPI.pkcs7.inspect(inspectPath);
      if (result.success && result.data) {
        setP7bInfo(result.data);
      } else {
        setError(result.error?.message || 'Error al inspeccionar el archivo PKCS#7.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!extractInputPath) {
      setError('Selecciona un archivo PKCS#7.');
      return;
    }
    if (!extractOutputDir) {
      setError('Selecciona una carpeta de salida.');
      return;
    }

    setError(null);
    setExtractResult(null);
    setLoading(true);

    try {
      const result = await window.electronAPI.pkcs7.extract({
        p7bPath: extractInputPath,
        outputDir: extractOutputDir,
        outputFormat: extractFormat,
      });

      if (result.success && result.data) {
        setExtractResult(result.data);
        const paths = [...(result.data.certPaths || [])];
        if (result.data.chainPath) paths.push(result.data.chainPath);
        setSuccessMessage('Certificados extraídos correctamente.');
        setResultPaths(paths);
        setSuccessDialogOpen(true);
      } else {
        setError(result.error?.message || 'Error al extraer del archivo PKCS#7.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PKCS#7 Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Crea, inspecciona y extrae certificados de archivos PKCS#7 (.p7b/.p7c)
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setError(null); }}>
          <Tab label="Crear PKCS#7" />
          <Tab label="Inspeccionar" />
          <Tab label="Extraer" />
        </Tabs>

        {/* CREATE TAB */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Un archivo PKCS#7 (.p7b) agrupa varios certificados (por ejemplo, una cadena de confianza) sin incluir claves privadas.
          </Alert>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Modo de creación</InputLabel>
            <Select
              value={createMode}
              label="Modo de creación"
              onChange={(e) => setCreateMode(e.target.value as 'certs' | 'chain')}
            >
              <MenuItem value="certs">Desde certificados individuales</MenuItem>
              <MenuItem value="chain">Desde archivo de cadena PEM</MenuItem>
            </Select>
          </FormControl>

          {createMode === 'certs' ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Certificados ({certPaths.length})</Typography>
                  <Button startIcon={<AddIcon />} onClick={handleAddCert} variant="outlined" size="small">
                    Añadir certificado
                  </Button>
                </Box>
                {certPaths.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No se han añadido certificados. Añade al menos uno.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {certPaths.map((p, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}>{p}</Typography>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleRemoveCert(i)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo de cadena PEM"
                  value={chainPath}
                  onChange={(e) => setChainPath(e.target.value)}
                  placeholder="Archivo PEM con múltiples certificados concatenados"
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setChainPath, [
                  { name: 'PEM', extensions: ['pem', 'crt', 'cer'] },
                  { name: 'Todos', extensions: ['*'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              label="Archivo de salida (.p7b)"
              value={createOutputPath}
              onChange={(e) => setCreateOutputPath(e.target.value)}
            />
            <Button variant="outlined" onClick={() => handleSaveFile(setCreateOutputPath)}>
              <FolderIcon />
            </Button>
          </Box>

          {error && tabValue === 0 && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            variant="contained"
            size="large"
            onClick={handleCreate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Crear PKCS#7
          </Button>
        </TabPanel>

        {/* INSPECT TAB */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              label="Archivo PKCS#7 (.p7b / .p7c)"
              value={inspectPath}
              onChange={(e) => setInspectPath(e.target.value)}
            />
            <Button variant="outlined" onClick={() => handleSelectFile(setInspectPath, [
              { name: 'PKCS#7', extensions: ['p7b', 'p7c'] },
              { name: 'Todos', extensions: ['*'] },
            ])}>
              <FolderIcon />
            </Button>
          </Box>

          {error && tabValue === 1 && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Button
            variant="contained"
            onClick={handleInspect}
            disabled={loading || !inspectPath}
            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
            sx={{ mb: 3 }}
          >
            Inspeccionar
          </Button>

          {p7bInfo && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Contenido del archivo PKCS#7
              </Typography>
              <Chip
                label={`${p7bInfo.certificateCount} certificado(s)`}
                color="primary"
                sx={{ mb: 2 }}
              />

              {p7bInfo.certificates.length > 0 && (
                <Box>
                  {p7bInfo.certificates.map((cert, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1, bgcolor: 'grey.50' }}>
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="primary">
                            Certificado #{i + 1}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Subject</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{cert.subject}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Issuer</Typography>
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{cert.issuer}</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{cert.serialNumber}</Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              )}
            </Paper>
          )}
        </TabPanel>

        {/* EXTRACT TAB */}
        <TabPanel value={tabValue} index={2}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Extrae los certificados contenidos en un archivo PKCS#7 como archivos PEM individuales o como una cadena concatenada.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo PKCS#7 de entrada (.p7b / .p7c)"
                  value={extractInputPath}
                  onChange={(e) => setExtractInputPath(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setExtractInputPath, [
                  { name: 'PKCS#7', extensions: ['p7b', 'p7c'] },
                  { name: 'Todos', extensions: ['*'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Carpeta de salida"
                  value={extractOutputDir}
                  onChange={(e) => setExtractOutputDir(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setExtractOutputDir)}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Formato de salida</InputLabel>
                <Select
                  value={extractFormat}
                  label="Formato de salida"
                  onChange={(e) => setExtractFormat(e.target.value as 'individual' | 'chain')}
                >
                  <MenuItem value="individual">Archivos individuales (cert_1.pem, cert_2.pem...)</MenuItem>
                  <MenuItem value="chain">Cadena concatenada (chain.pem)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {error && tabValue === 2 && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleExtract}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <ExtractIcon />}
            >
              Extraer certificados
            </Button>
          </Box>
        </TabPanel>
      </Paper>

      {/* Success dialog */}
      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          {successMessage}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Archivos:</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            {resultPaths.map((p, i) => (
              <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p}</Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            if (resultPaths.length > 0) window.electronAPI.shell.showItemInFolder(resultPaths[0]);
          }}>
            Abrir carpeta
          </Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
