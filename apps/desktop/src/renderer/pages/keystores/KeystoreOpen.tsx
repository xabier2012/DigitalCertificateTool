import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Folder as FolderIcon,
  LockOpen as OpenIcon,
  Add as CreateIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import type { KeystoreType } from '@cert-manager/shared';

export default function KeystoreOpen() {
  const navigate = useNavigate();

  const [openPath, setOpenPath] = useState('');
  const [openPassword, setOpenPassword] = useState('');

  const [createPath, setCreatePath] = useState('');
  const [createType, setCreateType] = useState<KeystoreType>('JKS');
  const [createPassword, setCreatePassword] = useState('');
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSelectFile = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Keystores', extensions: ['jks', 'jceks', 'p12', 'pfx', 'keystore'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setOpenPath(result.data);
    }
  };

  const handleSelectSaveLocation = async () => {
    const ext = createType === 'PKCS12' ? 'p12' : createType.toLowerCase();
    const result = await window.electronAPI.dialog.saveFile(undefined, [
      { name: `Keystore ${createType}`, extensions: [ext] },
    ]);
    if (result.success && result.data) {
      setCreatePath(result.data);
    }
  };

  const handleOpenKeystore = async () => {
    setError(null);

    if (!openPath) {
      setError('Selecciona un archivo keystore.');
      return;
    }
    if (!openPassword) {
      setError('Introduce la contraseña del keystore.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.open({
        path: openPath,
        password: openPassword,
      });

      if (result.success && result.data) {
        sessionStorage.setItem('cert-manager-current-keystore', JSON.stringify({
          path: openPath,
          password: openPassword,
          info: result.data,
        }));
        navigate('/keystores/entries');
      } else {
        setError(result.error?.message || 'Error al abrir el keystore.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKeystore = async () => {
    setError(null);

    if (!createPath) {
      setError('Selecciona la ubicación del keystore.');
      return;
    }
    if (!createPassword) {
      setError('La contraseña es obligatoria.');
      return;
    }
    if (createPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (createPassword !== createPasswordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.create({
        path: createPath,
        type: createType,
        password: createPassword,
      });

      if (result.success) {
        setCreateDialogOpen(false);
        setSuccessMessage(`Keystore ${createType} creado correctamente.`);
        setSuccessDialogOpen(true);

        setOpenPath(createPath);
        setOpenPassword(createPassword);
        setCreatePath('');
        setCreatePassword('');
        setCreatePasswordConfirm('');
      } else {
        setError(result.error?.message || 'Error al crear el keystore.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Keystores</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Abre o crea keystores JKS, JCEKS o PKCS12 usando keytool
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OpenIcon color="primary" /> Abrir Keystore
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Archivo keystore"
                value={openPath}
                onChange={(e) => setOpenPath(e.target.value)}
                placeholder="keystore.jks"
              />
              <Button variant="outlined" onClick={handleSelectFile}>
                <FolderIcon />
              </Button>
            </Box>

            <TextField
              fullWidth
              type="password"
              label="Contraseña"
              value={openPassword}
              onChange={(e) => setOpenPassword(e.target.value)}
              sx={{ mb: 3 }}
            />

            {error && !createDialogOpen && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleOpenKeystore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <OpenIcon />}
            >
              Abrir
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreateIcon color="primary" /> Crear Keystore
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Crea un nuevo keystore vacío para almacenar certificados y claves privadas.
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Tipos soportados:</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li><strong>JKS</strong>: Java KeyStore (formato tradicional)</li>
                <li><strong>JCEKS</strong>: Java Cryptography Extension KeyStore</li>
                <li><strong>PKCS12</strong>: Formato estándar multiplataforma</li>
              </Box>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setCreateDialogOpen(true)}
              startIcon={<CreateIcon />}
            >
              Crear nuevo keystore
            </Button>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Keystore</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de keystore</InputLabel>
                <Select
                  value={createType}
                  label="Tipo de keystore"
                  onChange={(e) => setCreateType(e.target.value as KeystoreType)}
                >
                  <MenuItem value="JKS">JKS (Java KeyStore)</MenuItem>
                  <MenuItem value="JCEKS">JCEKS (Java Cryptography Extension)</MenuItem>
                  <MenuItem value="PKCS12">PKCS12 (Estándar multiplataforma)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Ubicación"
                  value={createPath}
                  onChange={(e) => setCreatePath(e.target.value)}
                />
                <Button variant="outlined" onClick={handleSelectSaveLocation}>
                  <FolderIcon />
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Contraseña"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                helperText="Mínimo 6 caracteres"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Confirmar contraseña"
                value={createPasswordConfirm}
                onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                error={createPassword !== createPasswordConfirm && createPasswordConfirm.length > 0}
              />
            </Grid>
          </Grid>

          {error && createDialogOpen && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateKeystore}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" /> {successMessage}
        </DialogTitle>
        <DialogContent>
          <Typography>Puedes abrir el keystore usando la contraseña que configuraste.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">Aceptar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
