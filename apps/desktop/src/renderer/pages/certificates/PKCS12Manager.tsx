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
  FormControlLabel,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Download as ExtractIcon,
  Upload as CreateIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { PKCS12Info } from '@cert-manager/shared';

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

export default function PKCS12Manager() {
  const [tabValue, setTabValue] = useState(0);

  const [createCertPath, setCreateCertPath] = useState('');
  const [createKeyPath, setCreateKeyPath] = useState('');
  const [createChainPath, setCreateChainPath] = useState('');
  const [createKeyPassword, setCreateKeyPassword] = useState('');
  const [createP12Password, setCreateP12Password] = useState('');
  const [createP12PasswordConfirm, setCreateP12PasswordConfirm] = useState('');
  const [createFriendlyName, setCreateFriendlyName] = useState('');
  const [createOutputPath, setCreateOutputPath] = useState('');

  const [openP12Path, setOpenP12Path] = useState('');
  const [openP12Password, setOpenP12Password] = useState('');
  const [p12Info, setP12Info] = useState<PKCS12Info | null>(null);

  const [extractP12Path, setExtractP12Path] = useState('');
  const [extractPassword, setExtractPassword] = useState('');
  const [extractOutputDir, setExtractOutputDir] = useState('');
  const [extractCert, setExtractCert] = useState(true);
  const [extractKey, setExtractKey] = useState(true);
  const [extractChain, setExtractChain] = useState(true);
  const [extractKeyPassword, setExtractKeyPassword] = useState('');
  const [extractCertFormat, setExtractCertFormat] = useState<'PEM' | 'DER'>('PEM');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resultPaths, setResultPaths] = useState<string[]>([]);

  const handleSelectFile = async (setter: (path: string) => void, filters?: { name: string; extensions: string[] }[]) => {
    const result = await window.electronAPI.dialog.selectFile(filters || [
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);
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

  const handleSelectSaveFile = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.saveFile(undefined, [
      { name: 'PKCS#12', extensions: ['p12', 'pfx'] },
    ]);
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleCreateP12 = async () => {
    setError(null);

    if (!createCertPath) {
      setError('Selecciona el archivo de certificado.');
      return;
    }
    if (!createKeyPath) {
      setError('Selecciona el archivo de clave privada.');
      return;
    }
    if (!createP12Password) {
      setError('La contraseña del P12 es obligatoria.');
      return;
    }
    if (createP12Password !== createP12PasswordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!createOutputPath) {
      setError('Selecciona la ubicación del archivo de salida.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.pkcs12.create({
        certPath: createCertPath,
        keyPath: createKeyPath,
        keyPassword: createKeyPassword || undefined,
        chainPath: createChainPath || undefined,
        outputPath: createOutputPath,
        p12Password: createP12Password,
        friendlyName: createFriendlyName || undefined,
      });

      if (result.success) {
        setSuccessMessage('Archivo PKCS#12 creado correctamente.');
        setResultPaths([createOutputPath]);
        setSuccessDialogOpen(true);

        setCreateCertPath('');
        setCreateKeyPath('');
        setCreateChainPath('');
        setCreateKeyPassword('');
        setCreateP12Password('');
        setCreateP12PasswordConfirm('');
        setCreateFriendlyName('');
        setCreateOutputPath('');
      } else {
        setError(result.error?.message || 'Error al crear el archivo PKCS#12.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenP12 = async () => {
    setError(null);
    setP12Info(null);

    if (!openP12Path) {
      setError('Selecciona un archivo .p12 o .pfx.');
      return;
    }
    if (!openP12Password) {
      setError('Introduce la contraseña del archivo.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.pkcs12.inspect(openP12Path, openP12Password);

      if (result.success && result.data) {
        setP12Info(result.data);
      } else {
        if (result.error?.code === 'INVALID_PASSWORD') {
          setError('Contraseña inválida o archivo PKCS#12 dañado.');
        } else {
          setError(result.error?.message || 'Error al abrir el archivo.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExtractP12 = async () => {
    setError(null);

    if (!extractP12Path) {
      setError('Selecciona un archivo .p12 o .pfx.');
      return;
    }
    if (!extractPassword) {
      setError('Introduce la contraseña del archivo.');
      return;
    }
    if (!extractOutputDir) {
      setError('Selecciona la carpeta de salida.');
      return;
    }
    if (!extractCert && !extractKey && !extractChain) {
      setError('Selecciona al menos un componente para extraer.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.pkcs12.extract({
        p12Path: extractP12Path,
        p12Password: extractPassword,
        outputDir: extractOutputDir,
        extractCert,
        extractKey,
        extractChain,
        keyPassword: extractKeyPassword || undefined,
        certFormat: extractCertFormat,
      });

      if (result.success && result.data) {
        const paths: string[] = [];
        if (result.data.certPath) paths.push(result.data.certPath);
        if (result.data.keyPath) paths.push(result.data.keyPath);
        if (result.data.chainPath) paths.push(result.data.chainPath);
        if (result.data.chainCerts) paths.push(...result.data.chainCerts);

        setSuccessMessage('Componentes extraídos correctamente.');
        setResultPaths(paths);
        setSuccessDialogOpen(true);
      } else {
        if (result.error?.code === 'INVALID_PASSWORD') {
          setError('Contraseña inválida o archivo PKCS#12 dañado.');
        } else {
          setError(result.error?.message || 'Error al extraer del archivo.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PKCS#12 Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Crea, abre y extrae contenido de archivos .p12 y .pfx
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<CreateIcon />} label="Crear P12" iconPosition="start" />
          <Tab icon={<UnlockIcon />} label="Abrir P12" iconPosition="start" />
          <Tab icon={<ExtractIcon />} label="Extraer desde P12" iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Empaqueta un certificado + clave privada + cadena (opcional) en un archivo PKCS#12.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Certificado (.pem, .crt, .cer)"
                  value={createCertPath}
                  onChange={(e) => setCreateCertPath(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setCreateCertPath, [
                  { name: 'Certificados', extensions: ['pem', 'crt', 'cer'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Clave privada (.pem, .key)"
                  value={createKeyPath}
                  onChange={(e) => setCreateKeyPath(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setCreateKeyPath, [
                  { name: 'Claves', extensions: ['pem', 'key'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña de la clave privada (si está cifrada)"
                value={createKeyPassword}
                onChange={(e) => setCreateKeyPassword(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Cadena de certificados (opcional)"
                  value={createChainPath}
                  onChange={(e) => setCreateChainPath(e.target.value)}
                  placeholder="chain.pem o intermediate.pem"
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setCreateChainPath, [
                  { name: 'Certificados', extensions: ['pem', 'crt'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña del P12"
                value={createP12Password}
                onChange={(e) => setCreateP12Password(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Confirmar contraseña"
                value={createP12PasswordConfirm}
                onChange={(e) => setCreateP12PasswordConfirm(e.target.value)}
                required
                error={createP12Password !== createP12PasswordConfirm && createP12PasswordConfirm.length > 0}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Friendly Name / Alias (opcional)"
                value={createFriendlyName}
                onChange={(e) => setCreateFriendlyName(e.target.value)}
                placeholder="Mi Certificado"
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo de salida"
                  value={createOutputPath}
                  onChange={(e) => setCreateOutputPath(e.target.value)}
                  placeholder="certificado.p12"
                />
                <Button variant="outlined" onClick={() => handleSelectSaveFile(setCreateOutputPath)}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleCreateP12}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <LockIcon />}
            >
              Crear PKCS#12
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Abre un archivo PKCS#12 para ver su contenido (certificado, cadena, clave privada).
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo PKCS#12 (.p12, .pfx)"
                  value={openP12Path}
                  onChange={(e) => setOpenP12Path(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setOpenP12Path, [
                  { name: 'PKCS#12', extensions: ['p12', 'pfx'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña"
                value={openP12Password}
                onChange={(e) => setOpenP12Password(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                onClick={handleOpenP12}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <UnlockIcon />}
              >
                Abrir
              </Button>
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          {p12Info && (
            <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>Contenido del archivo</Typography>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>Certificado</TableCell>
                    <TableCell>
                      <Chip
                        label={p12Info.hasCertificate ? 'Sí' : 'No'}
                        color={p12Info.hasCertificate ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Clave privada</TableCell>
                    <TableCell>
                      <Chip
                        label={p12Info.hasPrivateKey ? 'Sí' : 'No'}
                        color={p12Info.hasPrivateKey ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Cadena de certificados</TableCell>
                    <TableCell>
                      <Chip
                        label={p12Info.hasChain ? `Sí (${p12Info.chainLength} certs)` : 'No'}
                        color={p12Info.hasChain ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  {p12Info.subject && (
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell><Typography variant="body2">{p12Info.subject}</Typography></TableCell>
                    </TableRow>
                  )}
                  {p12Info.issuer && (
                    <TableRow>
                      <TableCell>Issuer</TableCell>
                      <TableCell><Typography variant="body2">{p12Info.issuer}</Typography></TableCell>
                    </TableRow>
                  )}
                  {p12Info.validFrom && (
                    <TableRow>
                      <TableCell>Válido desde</TableCell>
                      <TableCell>{p12Info.validFrom}</TableCell>
                    </TableRow>
                  )}
                  {p12Info.validTo && (
                    <TableRow>
                      <TableCell>Válido hasta</TableCell>
                      <TableCell>{p12Info.validTo}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {!p12Info.hasPrivateKey && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Este archivo no contiene clave privada. Solo contiene el certificado y/o la cadena.
                </Alert>
              )}
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Extrae certificado, clave privada y/o cadena desde un archivo PKCS#12.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo PKCS#12 (.p12, .pfx)"
                  value={extractP12Path}
                  onChange={(e) => setExtractP12Path(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectFile(setExtractP12Path, [
                  { name: 'PKCS#12', extensions: ['p12', 'pfx'] },
                ])}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña del P12"
                value={extractPassword}
                onChange={(e) => setExtractPassword(e.target.value)}
              />
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

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Componentes a extraer:</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Switch checked={extractCert} onChange={(e) => setExtractCert(e.target.checked)} />}
                  label="Certificado"
                />
                <FormControlLabel
                  control={<Switch checked={extractKey} onChange={(e) => setExtractKey(e.target.checked)} />}
                  label="Clave privada"
                />
                <FormControlLabel
                  control={<Switch checked={extractChain} onChange={(e) => setExtractChain(e.target.checked)} />}
                  label="Cadena"
                />
              </Box>
            </Grid>

            {extractCert && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Formato del certificado</InputLabel>
                  <Select
                    value={extractCertFormat}
                    label="Formato del certificado"
                    onChange={(e) => setExtractCertFormat(e.target.value as 'PEM' | 'DER')}
                  >
                    <MenuItem value="PEM">PEM (texto)</MenuItem>
                    <MenuItem value="DER">DER (binario)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {extractKey && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="Contraseña para la clave extraída (opcional)"
                  value={extractKeyPassword}
                  onChange={(e) => setExtractKeyPassword(e.target.value)}
                  helperText="Si se deja vacío, la clave se exportará sin cifrar"
                />
              </Grid>
            )}
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 2 }}>
            Extraer la clave privada sin contraseña la dejará desprotegida. Guárdala en un lugar seguro.
          </Alert>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleExtractP12}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <ExtractIcon />}
            >
              Extraer
            </Button>
          </Box>
        </TabPanel>
      </Paper>

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
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(resultPaths[0] || '')}>
            Abrir carpeta
          </Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
