import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
} from '@mui/material';
import { Folder as FolderIcon, CheckCircle as CheckIcon, Search as SearchIcon } from '@mui/icons-material';
import { useSettingsStore } from '../store/settingsStore';

export default function Settings() {
  const { settings, updateSettings } = useSettingsStore();

  const [opensslPath, setOpensslPath] = useState('');
  const [jdkRootPath, setJdkRootPath] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [savePasswords, setSavePasswords] = useState(false);

  const [opensslLoading, setOpensslLoading] = useState(false);
  const [opensslResult, setOpensslResult] = useState<{ success: boolean; message: string } | null>(null);

  const [jdkLoading, setJdkLoading] = useState(false);
  const [jdkResult, setJdkResult] = useState<{ success: boolean; message: string } | null>(null);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setOpensslPath(settings.opensslPath || '');
      setJdkRootPath(settings.jdkRootPath || '');
      setOutputDir(settings.defaultOutputDir || '');
      setSavePasswords(settings.savePasswords || false);
    }
  }, [settings]);

  const handleSelectOpenSSL = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'OpenSSL', extensions: ['exe', '*'] },
    ]);
    if (result.success && result.data) {
      setOpensslPath(result.data);
      setOpensslResult(null);
    }
  };

  const handleSelectOpenSSLFolder = async () => {
    const dirResult = await window.electronAPI.dialog.selectDirectory();
    if (!dirResult.success || !dirResult.data) return;
    setOpensslResult(null);
    setOpensslLoading(true);
    try {
      const findResult = await window.electronAPI.openssl.findInDirectory(dirResult.data);
      if (findResult.success && findResult.data) {
        setOpensslPath(findResult.data);
        setOpensslResult({
          success: true,
          message: `Ejecutable encontrado: ${findResult.data}`,
        });
      } else {
        setOpensslResult({
          success: false,
          message: findResult.error?.message || 'No se encontró openssl.exe en la carpeta seleccionada.',
        });
      }
    } catch (err: unknown) {
      setOpensslResult({
        success: false,
        message: `Error al buscar OpenSSL: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setOpensslLoading(false);
    }
  };

  const handleTestOpenSSL = async () => {
    if (!opensslPath) return;
    setOpensslLoading(true);
    setOpensslResult(null);
    try {
      const result = await window.electronAPI.openssl.test(opensslPath);
      setOpensslResult({
        success: result.success,
        message: result.success
          ? `OpenSSL detectado: ${result.data}`
          : result.error?.technicalDetails
            ? `${result.error.message}\n\nDetalles: ${result.error.technicalDetails}`
            : result.error?.message || 'Error al probar OpenSSL',
      });
    } catch (err: unknown) {
      setOpensslResult({
        success: false,
        message: `Error al probar OpenSSL: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setOpensslLoading(false);
    }
  };

  const handleSelectJDK = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setJdkRootPath(result.data);
      setJdkResult(null);
    }
  };

  const handleTestJDK = async () => {
    if (!jdkRootPath) return;
    setJdkLoading(true);
    setJdkResult(null);
    try {
      const result = await window.electronAPI.jdk.test(jdkRootPath);
      setJdkResult({
        success: result.success,
        message: result.success
          ? result.data || 'JDK configurado correctamente'
          : result.error?.message || 'Error al probar JDK',
      });
    } finally {
      setJdkLoading(false);
    }
  };

  const handleSelectOutputDir = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setOutputDir(result.data);
    }
  };

  const handleSave = async () => {
    await updateSettings({
      opensslPath,
      jdkRootPath,
      defaultOutputDir: outputDir,
      savePasswords,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom data-testid="page-title">
        Configuración
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configura las rutas de herramientas y preferencias de la aplicación
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>OpenSSL</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ruta al ejecutable de OpenSSL. Puedes seleccionar el archivo directamente o una carpeta y la aplicación buscará el ejecutable automáticamente.
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={opensslPath}
                onChange={(e) => setOpensslPath(e.target.value)}
                placeholder="C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
                data-testid="openssl-path-input"
              />
              <Button variant="outlined" size="small" onClick={handleSelectOpenSSL} title="Seleccionar archivo">
                <FolderIcon />
              </Button>
              <Button variant="outlined" size="small" onClick={handleSelectOpenSSLFolder} title="Buscar en carpeta">
                <SearchIcon />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              onClick={handleTestOpenSSL}
              disabled={opensslLoading || !opensslPath}
              startIcon={opensslLoading ? <CircularProgress size={16} /> : null}
              data-testid="openssl-test-btn"
            >
              Probar
            </Button>
          </Grid>
        </Grid>

        {opensslResult && (
          <Alert severity={opensslResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {opensslResult.message}
            </Box>
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>JDK (para keytool)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Carpeta raíz del JDK
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={jdkRootPath}
                onChange={(e) => setJdkRootPath(e.target.value)}
                placeholder="C:\Program Files\Java\jdk-17"
              />
              <Button variant="outlined" size="small" onClick={handleSelectJDK}>
                <FolderIcon />
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              onClick={handleTestJDK}
              disabled={jdkLoading || !jdkRootPath}
              startIcon={jdkLoading ? <CircularProgress size={16} /> : null}
            >
              Probar
            </Button>
          </Grid>
        </Grid>

        {jdkResult && (
          <Alert severity={jdkResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            {jdkResult.message}
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Carpeta de salida</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Directorio por defecto para archivos generados
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            placeholder="C:\Users\...\Documents\Certificates"
          />
          <Button variant="outlined" size="small" onClick={handleSelectOutputDir}>
            <FolderIcon />
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Seguridad</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={savePasswords}
              onChange={(e) => setSavePasswords(e.target.checked)}
            />
          }
          label="Guardar contraseñas (no recomendado)"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
          Si lo activas, las contraseñas se guardarán localmente cifradas.
          Por seguridad, se recomienda mantener esta opción desactivada.
        </Typography>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button variant="contained" size="large" onClick={handleSave} data-testid="save-settings-btn">
          Guardar cambios
        </Button>
        {saved && (
          <Alert icon={<CheckIcon />} severity="success" sx={{ py: 0 }}>
            Cambios guardados
          </Alert>
        )}
      </Box>
    </Box>
  );
}
