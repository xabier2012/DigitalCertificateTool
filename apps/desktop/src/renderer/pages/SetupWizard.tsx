import { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '../store/settingsStore';

const steps = [
  'Bienvenido',
  'Configurar OpenSSL',
  'Configurar JDK',
  'Carpeta de salida',
  'Seguridad',
  'Completado',
];

export default function SetupWizard() {
  const { updateSettings } = useSettingsStore();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [opensslPath, setOpensslPath] = useState('');
  const [jdkRootPath, setJdkRootPath] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [savePasswords, setSavePasswords] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (activeStep === 1 && !opensslPath) {
      handleDetectOpenSSL();
    }
  }, [activeStep]);

  const handleDetectOpenSSL = async () => {
    setDetecting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.electronAPI.openssl.detect();
      if (result.success && result.data && 'path' in result.data) {
        setOpensslPath(result.data.path);
        setSuccess(`OpenSSL detectado automáticamente: ${result.data.version}`);
        setCanInstall(false);
      } else if (result.data && 'canInstall' in result.data) {
        setCanInstall(true);
        setError('OpenSSL no encontrado. Puedes instalarlo automáticamente o seleccionar la ruta manualmente.');
      } else {
        setCanInstall(false);
        setError(result.error?.message || 'OpenSSL no encontrado en el sistema.');
      }
    } catch {
      setError('Error al detectar OpenSSL');
    } finally {
      setDetecting(false);
    }
  };

  const handleInstallOpenSSL = async () => {
    setInstalling(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.electronAPI.openssl.install();
      if (result.success && result.data) {
        setSuccess(result.data.message);
      } else {
        setError(result.error?.message || 'Error al iniciar la instalación');
      }
    } catch {
      setError('Error al iniciar la instalación de OpenSSL');
    } finally {
      setInstalling(false);
    }
  };

  const handleNext = () => {
    setError(null);
    setSuccess(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setSuccess(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSelectOpenSSL = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'OpenSSL', extensions: ['exe', '*'] },
    ]);
    if (result.success && result.data) {
      setOpensslPath(result.data);
      setError(null);
      setSuccess(null);
    }
  };

  const handleTestOpenSSL = async () => {
    if (!opensslPath) {
      setError('Selecciona primero la ruta de OpenSSL');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.electronAPI.openssl.test(opensslPath);
      if (result.success) {
        setSuccess(`OpenSSL detectado: ${result.data}`);
      } else {
        setError(result.error?.message || 'No se pudo ejecutar OpenSSL. Revisa la ruta.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJDK = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setJdkRootPath(result.data);
      setError(null);
      setSuccess(null);
    }
  };

  const handleTestJDK = async () => {
    if (!jdkRootPath) {
      setError('Selecciona primero la carpeta raíz del JDK');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.electronAPI.jdk.test(jdkRootPath);
      if (result.success) {
        setSuccess(result.data || 'JDK configurado correctamente');
      } else {
        setError(result.error?.message || 'No se encontró keytool. Revisa la ruta del JDK.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOutputDir = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setOutputDir(result.data);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateSettings({
        opensslPath,
        jdkRootPath,
        defaultOutputDir: outputDir,
        savePasswords,
        setupCompleted: true,
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SecurityIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Bienvenido a Certificate Manager Tool
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
              Esta herramienta funciona 100% offline. Configura OpenSSL y tu JDK para habilitar todas las funciones.
            </Typography>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" gutterBottom>
              Configurar OpenSSL
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {detecting ? 'Buscando OpenSSL en el sistema...' : 'Selecciona la ruta al ejecutable de OpenSSL (openssl.exe en Windows)'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Ruta a OpenSSL"
                value={opensslPath}
                onChange={(e) => setOpensslPath(e.target.value)}
                placeholder="C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
                disabled={detecting}
              />
              <Button variant="outlined" onClick={handleSelectOpenSSL} disabled={detecting}>
                Seleccionar
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Buscar OpenSSL instalado en el sistema">
                <Button
                  variant="outlined"
                  onClick={handleDetectOpenSSL}
                  disabled={detecting || loading}
                  startIcon={detecting ? <CircularProgress size={20} /> : <SearchIcon />}
                >
                  Detectar
                </Button>
              </Tooltip>

              <Button
                variant="contained"
                onClick={handleTestOpenSSL}
                disabled={loading || detecting || !opensslPath}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                Probar
              </Button>

              {canInstall && (
                <Tooltip title="Instalar OpenSSL usando winget (requiere Windows 10/11)">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleInstallOpenSSL}
                    disabled={installing || detecting}
                    startIcon={installing ? <CircularProgress size={20} /> : <DownloadIcon />}
                  >
                    Instalar Online
                  </Button>
                </Tooltip>
              )}
            </Box>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

            <Alert severity="info" sx={{ mt: 2 }}>
              Si no tienes OpenSSL instalado, puedes descargarlo de{' '}
              <a href="https://slproweb.com/products/Win32OpenSSL.html" target="_blank" rel="noopener noreferrer">
                slproweb.com
              </a>{' '}
              o usar el botón "Instalar Online" si tienes winget disponible.
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" gutterBottom>
              Configurar JDK
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecciona la carpeta raíz del JDK (donde se encuentra la carpeta bin con keytool)
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Ruta raíz del JDK"
                value={jdkRootPath}
                onChange={(e) => setJdkRootPath(e.target.value)}
                placeholder="C:\Program Files\Java\jdk-17"
              />
              <Button variant="outlined" onClick={handleSelectJDK}>
                Seleccionar
              </Button>
            </Box>

            <Button
              variant="contained"
              onClick={handleTestJDK}
              disabled={loading || !jdkRootPath}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Probar
            </Button>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

            <Alert severity="info" sx={{ mt: 3 }}>
              El JDK es necesario para operaciones con keystores JKS (disponible en futuras versiones)
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" gutterBottom>
              Carpeta de salida por defecto
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Selecciona dónde se guardarán los archivos generados por defecto
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Carpeta de salida"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="C:\Users\tu_usuario\Documents\Certificates"
              />
              <Button variant="outlined" onClick={handleSelectOutputDir}>
                Seleccionar
              </Button>
            </Box>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ py: 2 }}>
            <Typography variant="h5" gutterBottom>
              Preferencias de seguridad
            </Typography>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <FormControlLabel
                  control={
                    <Switch
                      checked={savePasswords}
                      onChange={(e) => setSavePasswords(e.target.checked)}
                    />
                  }
                  label="Guardar contraseñas (no recomendado)"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 6 }}>
                  Si lo activas, se guardarán localmente cifradas. Recomendado mantener desactivado.
                </Typography>
              </CardContent>
            </Card>

            <Alert severity="warning" sx={{ mt: 3 }}>
              Por seguridad, las contraseñas no se guardan por defecto y solo permanecen en memoria el tiempo necesario.
            </Alert>
          </Box>
        );

      case 5:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Configuración completada
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ya puedes empezar a usar Certificate Manager Tool
            </Typography>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Paper sx={{ maxWidth: 700, width: '100%', p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Atrás
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleFinish}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              Finalizar
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              {activeStep === 0 ? 'Empezar' : 'Siguiente'}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
