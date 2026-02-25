import { useState } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Folder as FolderIcon,
  SwapHoriz as ConvertIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import type { CertificateFormat } from '@cert-manager/shared';

const steps = ['Seleccionar archivo', 'Formato de salida', 'Convertir'];

export default function ConvertCertificate() {
  const [activeStep, setActiveStep] = useState(0);
  const [inputPath, setInputPath] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<CertificateFormat | null>(null);
  const [outputFormat, setOutputFormat] = useState<'PEM' | 'DER'>('PEM');
  const [outputPath, setOutputPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const handleSelectInput = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Certificados', extensions: ['cer', 'crt', 'pem', 'der'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);

    if (result.success && result.data) {
      setInputPath(result.data);
      setError(null);

      setLoading(true);
      try {
        const formatResult = await window.electronAPI.openssl.detectFormat(result.data);
        if (formatResult.success && formatResult.data) {
          const fmt = formatResult.data.format;
          if (fmt !== 'PEM' && fmt !== 'DER') {
            setDetectedFormat(null);
            setError(`El formato ${fmt} no se puede convertir directamente. Solo se soporta conversión entre PEM y DER.`);
          } else {
            setDetectedFormat(fmt);
            setOutputFormat(fmt === 'PEM' ? 'DER' : 'PEM');
          }
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectOutput = async () => {
    const extension = outputFormat === 'PEM' ? 'pem' : 'der';
    const result = await window.electronAPI.dialog.saveFile(
      undefined,
      [{ name: `Certificado ${outputFormat}`, extensions: [extension] }]
    );

    if (result.success && result.data) {
      setOutputPath(result.data);
    }
  };

  const handleConvert = async () => {
    if (!inputPath || !outputPath || !detectedFormat) {
      setError('Completa todos los campos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.openssl.convert({
        inputPath,
        inputFormat: detectedFormat,
        outputFormat,
        outputPath,
      });

      if (result.success) {
        setSuccessDialogOpen(true);
      } else {
        setError(result.error?.message || 'Error al convertir el certificado');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !inputPath) {
      setError('Selecciona un archivo primero');
      return;
    }
    if (activeStep === 1 && !outputPath) {
      setError('Selecciona la ubicación del archivo de salida');
      return;
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setInputPath('');
    setDetectedFormat(null);
    setOutputPath('');
    setError(null);
    setSuccessDialogOpen(false);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selecciona el certificado que deseas convertir:
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="Archivo de entrada"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="Selecciona un archivo .cer, .crt, .pem, .der..."
              />
              <Button variant="outlined" onClick={handleSelectInput} startIcon={<FolderIcon />}>
                Seleccionar
              </Button>
            </Box>

            {detectedFormat && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Formato detectado: <Chip label={detectedFormat} size="small" sx={{ ml: 1 }} />
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Selecciona el formato de salida y la ubicación:
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Formato de salida</InputLabel>
              <Select
                value={outputFormat}
                label="Formato de salida"
                onChange={(e) => setOutputFormat(e.target.value as 'PEM' | 'DER')}
              >
                <MenuItem value="PEM">PEM (Base64 con headers)</MenuItem>
                <MenuItem value="DER">DER (binario)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Archivo de salida"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                placeholder="Selecciona dónde guardar..."
              />
              <Button variant="outlined" onClick={handleSelectOutput} startIcon={<FolderIcon />}>
                Seleccionar
              </Button>
            </Box>

            {detectedFormat === outputFormat && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                El formato de entrada y salida son iguales. La conversión no es necesaria.
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Revisa los detalles y confirma la conversión:
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Archivo de entrada:</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>{inputPath}</Typography>

              <Typography variant="body2" color="text.secondary">Formato detectado:</Typography>
              <Chip label={detectedFormat} size="small" sx={{ mb: 2 }} />

              <Typography variant="body2" color="text.secondary">Archivo de salida:</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>{outputPath}</Typography>

              <Typography variant="body2" color="text.secondary">Formato de salida:</Typography>
              <Chip label={outputFormat} size="small" color="primary" />
            </Paper>

            <Button
              variant="contained"
              onClick={handleConvert}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <ConvertIcon />}
              fullWidth
              size="large"
            >
              Convertir
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Convertir / Exportar
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Convierte certificados entre formatos PEM y DER
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Atrás
          </Button>

          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </Box>
      </Paper>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          Conversión completada
        </DialogTitle>
        <DialogContent>
          <Typography>El certificado se ha convertido correctamente a:</Typography>
          <Typography sx={{ fontFamily: 'monospace', mt: 1 }}>{outputPath}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(outputPath)}>
            Abrir carpeta
          </Button>
          <Button onClick={handleReset}>Nueva conversión</Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
