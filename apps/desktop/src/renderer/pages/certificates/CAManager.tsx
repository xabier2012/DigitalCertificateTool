import { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Security as RootIcon,
  AccountTree as IntermediateIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FileUpload as ImportIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import type { LocalCAInfo, KeyAlgorithm, SignatureHash, SubjectDN } from '@cert-manager/shared';

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

const ALGORITHMS: { value: KeyAlgorithm; label: string }[] = [
  { value: 'RSA-2048', label: 'RSA 2048 bits' },
  { value: 'RSA-4096', label: 'RSA 4096 bits (recomendado para CA)' },
  { value: 'ECC-P256', label: 'ECC P-256' },
  { value: 'ECC-P384', label: 'ECC P-384' },
];

export default function CAManager() {
  const [tabValue, setTabValue] = useState(0);
  const [localCAs, setLocalCAs] = useState<LocalCAInfo[]>([]);

  const [rootCN, setRootCN] = useState('');
  const [rootOrg, setRootOrg] = useState('');
  const [rootCountry, setRootCountry] = useState('ES');
  const [rootAlgorithm, setRootAlgorithm] = useState<KeyAlgorithm>('RSA-4096');
  const [rootValidityDays, setRootValidityDays] = useState(3650);
  const [rootPassword, setRootPassword] = useState('');
  const [rootPasswordConfirm, setRootPasswordConfirm] = useState('');
  const [rootOutputDir, setRootOutputDir] = useState('');

  const [intCN, setIntCN] = useState('');
  const [intOrg, setIntOrg] = useState('');
  const [intCountry, setIntCountry] = useState('ES');
  const [intAlgorithm, setIntAlgorithm] = useState<KeyAlgorithm>('RSA-4096');
  const [intValidityDays, setIntValidityDays] = useState(1825);
  const [intPassword, setIntPassword] = useState('');
  const [intPasswordConfirm, setIntPasswordConfirm] = useState('');
  const [intOutputDir, setIntOutputDir] = useState('');
  const [selectedRootCA, setSelectedRootCA] = useState('');
  const [rootCAPassword, setRootCAPassword] = useState('');
  const [intPathLen, setIntPathLen] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resultPaths, setResultPaths] = useState<string[]>([]);

  useEffect(() => {
    loadLocalCAs();
    loadDefaults();
  }, []);

  const loadLocalCAs = () => {
    const saved = localStorage.getItem('cert-manager-local-cas');
    if (saved) {
      setLocalCAs(JSON.parse(saved));
    }
  };

  const loadDefaults = async () => {
    const dir = await window.electronAPI.settings.getOutputDir();
    setRootOutputDir(dir);
    setIntOutputDir(dir);
  };

  const saveLocalCAs = (cas: LocalCAInfo[]) => {
    localStorage.setItem('cert-manager-local-cas', JSON.stringify(cas));
    setLocalCAs(cas);
  };

  const handleSelectDirectory = async (setter: (path: string) => void) => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setter(result.data);
    }
  };

  const handleGenerateRootCA = async () => {
    setError(null);

    if (!rootCN.trim()) {
      setError('El Common Name (CN) es obligatorio.');
      return;
    }
    if (!rootPassword) {
      setError('La contraseña de la clave es obligatoria para proteger la CA.');
      return;
    }
    if (rootPassword !== rootPasswordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!rootOutputDir) {
      setError('Selecciona una carpeta de salida.');
      return;
    }

    setLoading(true);
    try {
      const subject: SubjectDN = {
        CN: rootCN.trim(),
        O: rootOrg || undefined,
        C: rootCountry || undefined,
      };

      const result = await window.electronAPI.ca.generateRoot({
        subject,
        algorithm: rootAlgorithm,
        validityDays: rootValidityDays,
        keyPassword: rootPassword,
        outputDir: rootOutputDir,
      });

      if (result.success && result.data) {
        const newCA: LocalCAInfo = {
          id: `root-${Date.now()}`,
          name: rootCN.trim(),
          type: 'root',
          subject,
          certPath: result.data.certPath,
          keyPath: result.data.keyPath,
          createdAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + rootValidityDays * 24 * 60 * 60 * 1000).toISOString(),
          serialNumber: '',
        };

        saveLocalCAs([...localCAs, newCA]);

        setSuccessMessage('Root CA generada correctamente.');
        setResultPaths([result.data.keyPath, result.data.certPath]);
        setSuccessDialogOpen(true);

        setRootCN('');
        setRootOrg('');
        setRootPassword('');
        setRootPasswordConfirm('');
      } else {
        setError(result.error?.message || 'Error al generar la Root CA.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIntermediateCA = async () => {
    setError(null);

    if (!intCN.trim()) {
      setError('El Common Name (CN) es obligatorio.');
      return;
    }
    if (!intPassword) {
      setError('La contraseña de la clave es obligatoria.');
      return;
    }
    if (intPassword !== intPasswordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!intOutputDir) {
      setError('Selecciona una carpeta de salida.');
      return;
    }
    if (!selectedRootCA) {
      setError('Selecciona una Root CA para firmar.');
      return;
    }

    const rootCA = localCAs.find(ca => ca.id === selectedRootCA);
    if (!rootCA) {
      setError('Root CA no encontrada.');
      return;
    }

    setLoading(true);
    try {
      const subject: SubjectDN = {
        CN: intCN.trim(),
        O: intOrg || undefined,
        C: intCountry || undefined,
      };

      const result = await window.electronAPI.ca.generateIntermediate({
        subject,
        algorithm: intAlgorithm,
        validityDays: intValidityDays,
        keyPassword: intPassword,
        rootCAKeyPath: rootCA.keyPath,
        rootCACertPath: rootCA.certPath,
        rootCAKeyPassword: rootCAPassword,
        outputDir: intOutputDir,
        pathLenConstraint: intPathLen,
      });

      if (result.success && result.data) {
        const newCA: LocalCAInfo = {
          id: `intermediate-${Date.now()}`,
          name: intCN.trim(),
          type: 'intermediate',
          subject,
          certPath: result.data.certPath,
          keyPath: result.data.keyPath,
          createdAt: new Date().toISOString(),
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + intValidityDays * 24 * 60 * 60 * 1000).toISOString(),
          serialNumber: '',
          parentCAId: selectedRootCA,
        };

        saveLocalCAs([...localCAs, newCA]);

        setSuccessMessage('Intermediate CA generada correctamente.');
        setResultPaths([result.data.keyPath, result.data.certPath, result.data.chainPath]);
        setSuccessDialogOpen(true);

        setIntCN('');
        setIntOrg('');
        setIntPassword('');
        setIntPasswordConfirm('');
        setRootCAPassword('');
      } else {
        setError(result.error?.message || 'Error al generar la Intermediate CA.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCA = (caId: string) => {
    if (!confirm('¿Estás seguro? Esto solo elimina el registro, no los archivos.')) return;
    const updated = localCAs.filter(ca => ca.id !== caId);
    saveLocalCAs(updated);
  };

  const rootCAs = localCAs.filter(ca => ca.type === 'root');
  const intermediateCAs = localCAs.filter(ca => ca.type === 'intermediate');

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        CA Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona tus Autoridades de Certificación locales (Root e Intermediate)
      </Typography>

      {localCAs.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>CAs configuradas</Typography>
          <Grid container spacing={2}>
            {localCAs.map(ca => (
              <Grid item xs={12} md={6} lg={4} key={ca.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {ca.type === 'root' ? <RootIcon color="warning" /> : <IntermediateIcon color="info" />}
                      <Typography variant="h6">{ca.name}</Typography>
                      <Chip label={ca.type === 'root' ? 'Root' : 'Intermediate'} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Creada: {new Date(ca.createdAt).toLocaleDateString('es-ES')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {ca.certPath}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Tooltip title="Abrir carpeta">
                      <IconButton size="small" onClick={() => window.electronAPI.shell.showItemInFolder(ca.certPath)}>
                        <FolderIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar registro">
                      <IconButton size="small" color="error" onClick={() => handleDeleteCA(ca.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<RootIcon />} label="Crear Root CA" iconPosition="start" />
          <Tab icon={<IntermediateIcon />} label="Crear Intermediate CA" iconPosition="start" disabled={rootCAs.length === 0} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Una Root CA es el certificado raíz de confianza. Guárdala de forma segura y usa una contraseña fuerte.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Common Name (CN)"
                value={rootCN}
                onChange={(e) => setRootCN(e.target.value)}
                placeholder="Mi Root CA"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organización (O)"
                value={rootOrg}
                onChange={(e) => setRootOrg(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="País (C)"
                value={rootCountry}
                onChange={(e) => setRootCountry(e.target.value)}
                inputProps={{ maxLength: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Algoritmo</InputLabel>
                <Select value={rootAlgorithm} label="Algoritmo" onChange={(e) => setRootAlgorithm(e.target.value as KeyAlgorithm)}>
                  {ALGORITHMS.map(alg => <MenuItem key={alg.value} value={alg.value}>{alg.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Días de validez"
                value={rootValidityDays}
                onChange={(e) => setRootValidityDays(parseInt(e.target.value) || 3650)}
                helperText="Recomendado: 10 años (3650)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Contraseña de la clave"
                value={rootPassword}
                onChange={(e) => setRootPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Confirmar contraseña"
                value={rootPasswordConfirm}
                onChange={(e) => setRootPasswordConfirm(e.target.value)}
                error={rootPassword !== rootPasswordConfirm && rootPasswordConfirm.length > 0}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Carpeta de salida"
                  value={rootOutputDir}
                  onChange={(e) => setRootOutputDir(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setRootOutputDir)}>
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
              onClick={handleGenerateRootCA}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Generar Root CA
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Una Intermediate CA se firma con la Root CA y se usa para emitir certificados finales. Esto protege la Root CA.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Root CA para firmar</InputLabel>
                <Select value={selectedRootCA} label="Root CA para firmar" onChange={(e) => setSelectedRootCA(e.target.value)}>
                  {rootCAs.map(ca => <MenuItem key={ca.id} value={ca.id}>{ca.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {selectedRootCA && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Contraseña de la Root CA"
                  value={rootCAPassword}
                  onChange={(e) => setRootCAPassword(e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12}><Divider /></Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Common Name (CN)"
                value={intCN}
                onChange={(e) => setIntCN(e.target.value)}
                placeholder="Mi Intermediate CA"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organización (O)"
                value={intOrg}
                onChange={(e) => setIntOrg(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="País (C)"
                value={intCountry}
                onChange={(e) => setIntCountry(e.target.value)}
                inputProps={{ maxLength: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Algoritmo</InputLabel>
                <Select value={intAlgorithm} label="Algoritmo" onChange={(e) => setIntAlgorithm(e.target.value as KeyAlgorithm)}>
                  {ALGORITHMS.map(alg => <MenuItem key={alg.value} value={alg.value}>{alg.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Días de validez"
                value={intValidityDays}
                onChange={(e) => setIntValidityDays(parseInt(e.target.value) || 1825)}
                helperText="Recomendado: 5 años"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="number"
                label="pathLen constraint"
                value={intPathLen}
                onChange={(e) => setIntPathLen(parseInt(e.target.value) || 0)}
                helperText="0 = no puede firmar otras CAs"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Contraseña de la clave"
                value={intPassword}
                onChange={(e) => setIntPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="password"
                label="Confirmar contraseña"
                value={intPasswordConfirm}
                onChange={(e) => setIntPasswordConfirm(e.target.value)}
                error={intPassword !== intPasswordConfirm && intPasswordConfirm.length > 0}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Carpeta de salida"
                  value={intOutputDir}
                  onChange={(e) => setIntOutputDir(e.target.value)}
                />
                <Button variant="outlined" onClick={() => handleSelectDirectory(setIntOutputDir)}>
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
              onClick={handleGenerateIntermediateCA}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            >
              Generar Intermediate CA
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
          <Typography gutterBottom>Archivos creados:</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            {resultPaths.map((p, i) => (
              <Typography key={i} sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p}</Typography>
            ))}
          </Box>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Importante:</strong> Guarda la clave privada y su contraseña en un lugar seguro. ¡No las pierdas!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(resultPaths[0] || '')}>Abrir carpeta</Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
