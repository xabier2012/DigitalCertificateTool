import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Collapse,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Folder as FolderIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import type { KeyAlgorithm, SubjectAltName } from '@cert-manager/shared';

const ALGORITHMS: { value: KeyAlgorithm; label: string }[] = [
  { value: 'RSA-2048', label: 'RSA 2048 bits (recomendado)' },
  { value: 'RSA-4096', label: 'RSA 4096 bits' },
  { value: 'ECC-P256', label: 'ECC P-256 (ECDSA)' },
  { value: 'ECC-P384', label: 'ECC P-384 (ECDSA)' },
];

export default function GenerateCSR() {
  const [cn, setCn] = useState('www.example.com');
  const [country, setCountry] = useState('ES');
  const [state, setState] = useState('Madrid');
  const [locality, setLocality] = useState('Madrid');
  const [org, setOrg] = useState('My Organization');
  const [ou, setOu] = useState('IT Department');
  const [email, setEmail] = useState('admin@example.com');
  const [algorithm, setAlgorithm] = useState<KeyAlgorithm>('RSA-2048');
  const [keyPassword, setKeyPassword] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [sanList, setSanList] = useState<SubjectAltName[]>([]);
  const [newSanType, setNewSanType] = useState<'DNS' | 'IP'>('DNS');
  const [newSanValue, setNewSanValue] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keyFileName, setKeyFileName] = useState('private_key.pem');
  const [csrFileName, setCsrFileName] = useState('request.csr');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [resultPaths, setResultPaths] = useState<{ keyPath: string; csrPath: string; readmePath: string } | null>(null);

  useEffect(() => {
    const loadDefaultDir = async () => {
      const dir = await window.electronAPI.settings.getOutputDir();
      setOutputDir(dir);
    };
    loadDefaultDir();
  }, []);

  const handleSelectOutputDir = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setOutputDir(result.data);
    }
  };

  const handleAddSan = () => {
    if (!newSanValue.trim()) return;
    setSanList([...sanList, { type: newSanType, value: newSanValue.trim() }]);
    setNewSanValue('');
  };

  const handleRemoveSan = (index: number) => {
    setSanList(sanList.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!cn.trim()) {
      setError('El Common Name (CN) es obligatorio');
      return;
    }
    if (!outputDir) {
      setError('Selecciona una carpeta de salida');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.openssl.generateCSR({
        subject: {
          CN: cn.trim(),
          C: country || undefined,
          ST: state || undefined,
          L: locality || undefined,
          O: org || undefined,
          OU: ou || undefined,
          emailAddress: email || undefined,
        },
        sanList,
        algorithm,
        keyPassword: keyPassword || undefined,
        outputDir,
        keyFileName: keyFileName || undefined,
        csrFileName: csrFileName || undefined,
      });

      if (result.success && result.data) {
        setResultPaths(result.data);
        setSuccessDialogOpen(true);
      } else {
        setError(result.error?.message || 'Error al generar el CSR');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCn('www.example.com');
    setCountry('ES');
    setState('Madrid');
    setLocality('Madrid');
    setOrg('My Organization');
    setOu('IT Department');
    setEmail('admin@example.com');
    setAlgorithm('RSA-2048');
    setKeyPassword('');
    setSanList([]);
    setSuccessDialogOpen(false);
    setResultPaths(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Generar CSR (Solicitud de Certificado)
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Crea una solicitud de firma de certificado para enviar a una Autoridad de Certificación (CA)
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Recomendado:</strong> Este es el método correcto para obtener certificados de CAs como FNMT, Let's Encrypt, o CA corporativas.
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Datos del certificado</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Common Name (CN)"
              value={cn}
              onChange={(e) => setCn(e.target.value)}
              placeholder="ejemplo.com o Mi Nombre"
              helperText="Nombre de dominio o nombre del titular"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Country (C)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="ES"
              inputProps={{ maxLength: 2 }}
              helperText="2-letter country code"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="State/Province (ST)"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Madrid"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Locality/City (L)"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Madrid"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Organization (O)"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="My Organization"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Organizational Unit (OU)"
              value={ou}
              onChange={(e) => setOu(e.target.value)}
              placeholder="IT Department"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Algoritmo</InputLabel>
              <Select
                value={algorithm}
                label="Algoritmo"
                onChange={(e) => setAlgorithm(e.target.value as KeyAlgorithm)}
              >
                {ALGORITHMS.map((alg) => (
                  <MenuItem key={alg.value} value={alg.value}>{alg.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Subject Alternative Names (SAN) - Opcional pero recomendado
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={newSanType}
                  label="Tipo"
                  onChange={(e) => setNewSanType(e.target.value as 'DNS' | 'IP')}
                  size="small"
                >
                  <MenuItem value="DNS">DNS</MenuItem>
                  <MenuItem value="IP">IP</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Valor"
                value={newSanValue}
                onChange={(e) => setNewSanValue(e.target.value)}
                placeholder={newSanType === 'DNS' ? 'www.ejemplo.com' : '192.168.1.1'}
                sx={{ flex: 1 }}
              />
              <Button
                variant="outlined"
                onClick={handleAddSan}
                startIcon={<AddIcon />}
              >
                Añadir
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {sanList.map((san, i) => (
                <Chip
                  key={i}
                  label={`${san.type}: ${san.value}`}
                  onDelete={() => handleRemoveSan(i)}
                  deleteIcon={<DeleteIcon />}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Seguridad y ubicación</Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Contraseña para clave privada (opcional)"
              type="password"
              value={keyPassword}
              onChange={(e) => setKeyPassword(e.target.value)}
              helperText="Si se especifica, la clave privada se cifrará"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Carpeta de salida"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
              />
              <Button variant="outlined" onClick={handleSelectOutputDir} sx={{ minWidth: 'auto' }}>
                <FolderIcon />
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              endIcon={showAdvanced ? <CollapseIcon /> : <ExpandIcon />}
              sx={{ textTransform: 'none' }}
            >
              Opciones avanzadas
            </Button>

            <Collapse in={showAdvanced}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre archivo clave"
                    value={keyFileName}
                    onChange={(e) => setKeyFileName(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre archivo CSR"
                    value={csrFileName}
                    onChange={(e) => setCsrFileName(e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleGenerate}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Generar CSR
          </Button>
        </Box>
      </Paper>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          CSR generado correctamente
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Se han creado los siguientes archivos:</Typography>

          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">Clave privada:</Typography>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>{resultPaths?.keyPath}</Typography>

            <Typography variant="body2" color="text.secondary">CSR:</Typography>
            <Typography sx={{ fontFamily: 'monospace', mb: 1 }}>{resultPaths?.csrPath}</Typography>

            <Typography variant="body2" color="text.secondary">Instrucciones:</Typography>
            <Typography sx={{ fontFamily: 'monospace' }}>{resultPaths?.readmePath}</Typography>
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Importante:</strong> Guarda la clave privada en un lugar seguro. ¡No la compartas!
          </Alert>

          <Alert severity="info" sx={{ mt: 2 }}>
            Envía el archivo CSR a tu Autoridad de Certificación (CA). Cuando recibas el certificado firmado, podrás importarlo.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(resultPaths?.csrPath || '')}>
            Abrir carpeta
          </Button>
          <Button onClick={handleReset}>Nuevo CSR</Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
