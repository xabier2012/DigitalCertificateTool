import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Collapse,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  CheckCircle as SuccessIcon,
  Help as HelpIcon,
  Speed as QuickIcon,
  Settings as AdvancedIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type {
  CertificateTemplate,
  KeyAlgorithm,
  SubjectAltName,
  KeyUsageFlags,
  SignatureHash,
  LocalCAInfo,
} from '@cert-manager/shared';
import { BUILT_IN_TEMPLATES, DEFAULT_KEY_USAGE, EKU_OPTIONS } from '@cert-manager/shared';

type GenerationMode = 'csr-external' | 'self-signed' | 'ca-issued';

const MODE_LABELS: Record<GenerationMode, { label: string; description: string }> = {
  'csr-external': {
    label: 'CSR para CA externa (recomendado)',
    description: 'Para obtener un certificado de una CA confiable (FNMT, Let\'s Encrypt, etc.), genera un CSR. Cuando recibas el certificado firmado (.cer/.pem), podrás importarlo y empaquetarlo.',
  },
  'self-signed': {
    label: 'Autofirmado (desarrollo)',
    description: 'Para pruebas y desarrollo local. Los certificados autofirmados NO son confiables por defecto en navegadores.',
  },
  'ca-issued': {
    label: 'Emitido por mi CA',
    description: 'Usa tu Root/Intermediate CA local para firmar. Útil para entornos de laboratorio.',
  },
};

const ALGORITHMS: { value: KeyAlgorithm; label: string }[] = [
  { value: 'RSA-2048', label: 'RSA 2048 bits (recomendado)' },
  { value: 'RSA-4096', label: 'RSA 4096 bits' },
  { value: 'ECC-P256', label: 'ECC P-256 (ECDSA)' },
  { value: 'ECC-P384', label: 'ECC P-384 (ECDSA)' },
];

const steps = ['Tipo y plantilla', 'Datos del certificado', 'Generar'];

export default function GenerateCertificate() {
  const [activeStep, setActiveStep] = useState(0);
  const [viewMode, setViewMode] = useState<'quick' | 'advanced'>('quick');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('csr-external');
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  const [cn, setCn] = useState('');
  const [country, setCountry] = useState('ES');
  const [org, setOrg] = useState('');
  const [ou, setOu] = useState('');
  const [locality, setLocality] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  const [algorithm, setAlgorithm] = useState<KeyAlgorithm>('RSA-2048');
  const [validityDays, setValidityDays] = useState(365);
  const [signatureHash, setSignatureHash] = useState<SignatureHash>('SHA-256');
  const [keyPassword, setKeyPassword] = useState('');
  const [outputDir, setOutputDir] = useState('');

  const [sanList, setSanList] = useState<SubjectAltName[]>([]);
  const [newSanType, setNewSanType] = useState<'DNS' | 'IP' | 'email' | 'URI'>('DNS');
  const [newSanValue, setNewSanValue] = useState('');

  const [isCA, setIsCA] = useState(false);
  const [pathLenConstraint, setPathLenConstraint] = useState<number | undefined>(undefined);
  const [keyUsage, setKeyUsage] = useState<KeyUsageFlags>({ ...DEFAULT_KEY_USAGE, digitalSignature: true, keyEncipherment: true });
  const [extendedKeyUsage, setExtendedKeyUsage] = useState<string[]>([]);
  const [customOids, setCustomOids] = useState<string[]>([]);
  const [newOid, setNewOid] = useState('');

  const [showSubjectAdvanced, setShowSubjectAdvanced] = useState(false);
  const [showKeyUsage, setShowKeyUsage] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const [localCAs, setLocalCAs] = useState<LocalCAInfo[]>([]);
  const [selectedCA, setSelectedCA] = useState<string>('');
  const [caKeyPassword, setCaKeyPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [resultPaths, setResultPaths] = useState<{ keyPath?: string; csrPath?: string; certPath?: string; chainPath?: string } | null>(null);

  useEffect(() => {
    loadDefaults();
    loadLocalCAs();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    validateForm();
  }, [generationMode, sanList, isCA, keyUsage, extendedKeyUsage]);

  const loadDefaults = async () => {
    const dir = await window.electronAPI.settings.getOutputDir();
    setOutputDir(dir);
    setSelectedTemplate(BUILT_IN_TEMPLATES.find(t => t.id === 'csr-external') || null);
  };

  const loadLocalCAs = async () => {
    try {
      const settings = await window.electronAPI.settings.get();
      setLocalCAs(settings.localCAs || []);
    } catch {
      setLocalCAs([]);
    }
  };

  const applyTemplate = (template: CertificateTemplate) => {
    setAlgorithm(template.defaults.algorithm);
    setValidityDays(template.defaults.validityDays);
    setSignatureHash(template.defaults.signatureHash);
    setIsCA(template.defaults.isCA);
    setPathLenConstraint(template.defaults.pathLenConstraint);
    setKeyUsage({ ...template.defaults.keyUsage });
    setExtendedKeyUsage([...template.defaults.extendedKeyUsage]);
  };

  const validateForm = () => {
    const newWarnings: string[] = [];

    if (generationMode !== 'ca-issued' || !isCA) {
      const isServer = extendedKeyUsage.includes('serverAuth');
      if (isServer && sanList.length === 0) {
        newWarnings.push('Los navegadores modernos requieren SAN. CN no es suficiente para certificados de servidor.');
      }
    }

    if (isCA && !keyUsage.keyCertSign) {
      newWarnings.push('Un certificado CA debe tener el flag keyCertSign.');
    }

    setWarnings(newWarnings);
  };

  const handleSelectOutputDir = async () => {
    const result = await window.electronAPI.dialog.selectDirectory();
    if (result.success && result.data) {
      setOutputDir(result.data);
    }
  };

  const validateSanValue = (type: string, value: string): string | null => {
    const v = value.trim();
    if (!v) return 'El valor no puede estar vacío.';

    switch (type) {
      case 'DNS': {
        const dnsRegex = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/;
        if (!dnsRegex.test(v)) return 'DNS inválido. Ejemplo: www.example.com o *.example.com';
        break;
      }
      case 'IP': {
        const ipv4Regex = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
        const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
        if (!ipv4Regex.test(v) && !ipv6Regex.test(v)) return 'IP inválida. Ejemplo: 192.168.1.1 o ::1';
        break;
      }
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(v)) return 'Email inválido. Ejemplo: admin@example.com';
        break;
      }
      case 'URI': {
        try {
          const url = new URL(v);
          if (!url.protocol || !url.host) throw new Error();
        } catch {
          return 'URI inválida. Ejemplo: https://example.com';
        }
        break;
      }
    }
    return null;
  };

  const handleAddSan = () => {
    const validationError = validateSanValue(newSanType, newSanValue);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSanList([...sanList, { type: newSanType as any, value: newSanValue.trim() }]);
    setNewSanValue('');
  };

  const handleRemoveSan = (index: number) => {
    setSanList(sanList.filter((_, i) => i !== index));
  };

  const handleAddOid = () => {
    const oidRegex = /^[0-9]+(\.[0-9]+)+$/;
    if (!oidRegex.test(newOid)) {
      setError('OID inválido. Ejemplo válido: 1.3.6.1.5.5.7.3.2');
      return;
    }
    setCustomOids([...customOids, newOid]);
    setNewOid('');
    setError(null);
  };

  const handleRemoveOid = (index: number) => {
    setCustomOids(customOids.filter((_, i) => i !== index));
  };

  const toggleEKU = (eku: string) => {
    setExtendedKeyUsage(prev =>
      prev.includes(eku) ? prev.filter(e => e !== eku) : [...prev, eku]
    );
  };

  const updateKeyUsage = (field: keyof KeyUsageFlags, value: boolean) => {
    setKeyUsage(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (activeStep === 0 && generationMode === 'ca-issued' && localCAs.length === 0) {
      setError('Primero crea o importa una CA local (Root/Intermediate).');
      return;
    }
    if (activeStep === 1 && !cn.trim()) {
      setError('El Common Name (CN) es obligatorio.');
      return;
    }
    if (activeStep === 1 && !outputDir) {
      setError('Selecciona una carpeta de salida.');
      return;
    }
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep(prev => prev - 1);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const subject = {
        CN: cn.trim(),
        C: country || undefined,
        O: org || undefined,
        OU: ou || undefined,
        L: locality || undefined,
        ST: state || undefined,
        emailAddress: email || undefined,
        serialNumber: serialNumber || undefined,
      };

      const allEKU = [...extendedKeyUsage, ...customOids];

      if (generationMode === 'csr-external') {
        const result = await window.electronAPI.openssl.generateCSR({
          subject,
          sanList,
          algorithm,
          keyPassword: keyPassword || undefined,
          outputDir,
          signatureHash,
          keyUsage,
          extendedKeyUsage: allEKU.length > 0 ? allEKU : undefined,
        });

        if (result.success && result.data) {
          setResultPaths(result.data);
          setSuccessDialogOpen(true);
        } else {
          setError(result.error?.message || 'Error al generar el CSR');
        }
      } else if (generationMode === 'self-signed') {
        const result = await window.electronAPI.openssl.generateSelfSigned({
          subject,
          sanList,
          algorithm,
          keyPassword: keyPassword || undefined,
          outputDir,
          validityDays,
          signatureHash,
          keyUsage,
          extendedKeyUsage: allEKU.length > 0 ? allEKU : undefined,
          isCA,
          pathLenConstraint,
        });

        if (result.success && result.data) {
          setResultPaths(result.data);
          setSuccessDialogOpen(true);
        } else {
          setError(result.error?.message || 'Error al generar el certificado');
        }
      } else if (generationMode === 'ca-issued') {
        const ca = localCAs.find(c => c.id === selectedCA);
        if (!ca) {
          setError('Selecciona una CA válida.');
          return;
        }

        const csrResult = await window.electronAPI.openssl.generateCSR({
          subject,
          sanList,
          algorithm,
          keyPassword: keyPassword || undefined,
          outputDir,
          signatureHash,
        });

        if (!csrResult.success || !csrResult.data) {
          setError(csrResult.error?.message || 'Error al generar el CSR');
          return;
        }

        const signResult = await window.electronAPI.ca.signCSR({
          csrPath: csrResult.data.csrPath,
          caCertPath: ca.certPath,
          caKeyPath: ca.keyPath,
          caKeyPassword: caKeyPassword,
          outputDir,
          validityDays,
          isCA,
          pathLenConstraint,
          keyUsage,
          extendedKeyUsage: allEKU,
          sanList,
          signatureHash,
          chainCertPath: ca.certPath,
        });

        if (signResult.success && signResult.data) {
          setResultPaths({
            keyPath: csrResult.data.keyPath,
            certPath: signResult.data.certPath,
            chainPath: signResult.data.chainPath,
          });
          setSuccessDialogOpen(true);
        } else {
          setError(signResult.error?.message || 'Error al firmar el certificado');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setCn('');
    setSanList([]);
    setResultPaths(null);
    setSuccessDialogOpen(false);
  };

  const renderQuickFields = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          required
          label="Common Name (CN)"
          value={cn}
          onChange={(e) => setCn(e.target.value)}
          placeholder={generationMode === 'self-signed' ? 'localhost' : 'ejemplo.com'}
          helperText="Nombre de dominio o nombre del titular"
          data-testid="cn-input"
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Subject Alternative Names (SAN)
          <Tooltip title="Los navegadores modernos requieren SAN para certificados de servidor">
            <HelpIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
          </Tooltip>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <FormControl sx={{ minWidth: 100 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={newSanType} label="Tipo" onChange={(e) => setNewSanType(e.target.value as typeof newSanType)} size="small">
              <MenuItem value="DNS">DNS</MenuItem>
              <MenuItem value="IP">IP</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="URI">URI</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Valor"
            value={newSanValue}
            onChange={(e) => setNewSanValue(e.target.value)}
            placeholder={newSanType === 'DNS' ? 'www.ejemplo.com' : '192.168.1.1'}
            sx={{ flex: 1 }}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSan()}
          />
          <Button variant="outlined" onClick={handleAddSan} startIcon={<AddIcon />}>Añadir</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {sanList.map((san, i) => (
            <Chip key={i} label={`${san.type}: ${san.value}`} onDelete={() => handleRemoveSan(i)} />
          ))}
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>Algoritmo</InputLabel>
          <Select value={algorithm} label="Algoritmo" onChange={(e) => setAlgorithm(e.target.value as KeyAlgorithm)}>
            {ALGORITHMS.map(alg => <MenuItem key={alg.value} value={alg.value}>{alg.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Días de validez"
          value={validityDays}
          onChange={(e) => setValidityDays(parseInt(e.target.value) || 365)}
          disabled={generationMode === 'csr-external'}
          helperText={generationMode === 'csr-external' ? 'La CA determina la validez' : ''}
        />
      </Grid>

      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="password"
          label="Contraseña clave privada (opcional)"
          value={keyPassword}
          onChange={(e) => setKeyPassword(e.target.value)}
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
          <Button variant="outlined" onClick={handleSelectOutputDir}><FolderIcon /></Button>
        </Box>
      </Grid>
    </Grid>
  );

  const renderAdvancedFields = () => (
    <Box>
      {renderQuickFields()}

      <Divider sx={{ my: 3 }} />

      <Button onClick={() => setShowSubjectAdvanced(!showSubjectAdvanced)} endIcon={showSubjectAdvanced ? <CollapseIcon /> : <ExpandIcon />}>
        Subject DN completo
      </Button>
      <Collapse in={showSubjectAdvanced}>
        <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Organización (O)" value={org} onChange={(e) => setOrg(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Unidad organizativa (OU)" value={ou} onChange={(e) => setOu(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Localidad (L)" value={locality} onChange={(e) => setLocality(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Estado/Provincia (ST)" value={state} onChange={(e) => setState(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="País (C)" value={country} onChange={(e) => setCountry(e.target.value)} inputProps={{ maxLength: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Serial Number" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      <Box sx={{ mt: 2 }}>
        <Button onClick={() => setShowKeyUsage(!showKeyUsage)} endIcon={showKeyUsage ? <CollapseIcon /> : <ExpandIcon />}>
          Key Usage y EKU
        </Button>
        <Collapse in={showKeyUsage}>
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={isCA} onChange={(e) => setIsCA(e.target.checked)} />}
              label="Es CA (Basic Constraints)"
            />
            {isCA && (
              <TextField
                size="small"
                type="number"
                label="pathLen"
                value={pathLenConstraint ?? ''}
                onChange={(e) => setPathLenConstraint(e.target.value ? parseInt(e.target.value) : undefined)}
                sx={{ ml: 2, width: 100 }}
              />
            )}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Key Usage</Typography>
            <Grid container spacing={1}>
              {(Object.keys(DEFAULT_KEY_USAGE) as (keyof KeyUsageFlags)[]).map(key => (
                <Grid item xs={6} md={4} key={key}>
                  <FormControlLabel
                    control={<Switch size="small" checked={keyUsage[key]} onChange={(e) => updateKeyUsage(key, e.target.checked)} />}
                    label={<Typography variant="body2">{key}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Extended Key Usage (EKU)</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {EKU_OPTIONS.map(eku => (
                <Chip
                  key={eku.value}
                  label={eku.label}
                  onClick={() => toggleEKU(eku.value)}
                  color={extendedKeyUsage.includes(eku.value) ? 'primary' : 'default'}
                  variant={extendedKeyUsage.includes(eku.value) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>OIDs personalizados</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField size="small" label="OID" value={newOid} onChange={(e) => setNewOid(e.target.value)} placeholder="1.3.6.1.4.1...." />
              <Button variant="outlined" onClick={handleAddOid}>Añadir</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {customOids.map((oid, i) => (
                <Chip key={i} label={oid} onDelete={() => handleRemoveOid(i)} />
              ))}
            </Box>
          </Paper>
        </Collapse>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button onClick={() => setShowSecurity(!showSecurity)} endIcon={showSecurity ? <CollapseIcon /> : <ExpandIcon />}>
          Opciones de seguridad
        </Button>
        <Collapse in={showSecurity}>
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Hash de firma</InputLabel>
                  <Select value={signatureHash} label="Hash de firma" onChange={(e) => setSignatureHash(e.target.value as SignatureHash)}>
                    <MenuItem value="SHA-256">SHA-256 (recomendado)</MenuItem>
                    <MenuItem value="SHA-384">SHA-384</MenuItem>
                    <MenuItem value="SHA-512">SHA-512</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Selecciona el tipo de generación</Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {(Object.keys(MODE_LABELS) as GenerationMode[]).map(mode => (
                <Grid item xs={12} md={4} key={mode}>
                  <Paper
                    variant={generationMode === mode ? 'elevation' : 'outlined'}
                    elevation={generationMode === mode ? 4 : 0}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: generationMode === mode ? '2px solid' : undefined,
                      borderColor: 'primary.main',
                    }}
                    onClick={() => setGenerationMode(mode)}
                  >
                    <Typography variant="subtitle1" fontWeight={600}>{MODE_LABELS[mode].label}</Typography>
                    <Typography variant="body2" color="text.secondary">{MODE_LABELS[mode].description}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {generationMode === 'ca-issued' && (
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>CA para firmar</InputLabel>
                  <Select value={selectedCA} label="CA para firmar" onChange={(e) => setSelectedCA(e.target.value)}>
                    {localCAs.map(ca => (
                      <MenuItem key={ca.id} value={ca.id}>{ca.name} ({ca.type})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {localCAs.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    No tienes CAs locales configuradas. Ve a "CA Manager" para crear una Root o Intermediate CA.
                  </Alert>
                )}
                {localCAs.length > 0 && (
                  <TextField
                    fullWidth
                    type="password"
                    label="Contraseña de la clave de la CA (si tiene)"
                    value={caKeyPassword}
                    onChange={(e) => setCaKeyPassword(e.target.value)}
                    sx={{ mt: 2 }}
                    helperText="Déjalo vacío si la clave de la CA no tiene contraseña"
                  />
                )}
              </Box>
            )}

            <Typography variant="h6" gutterBottom>Plantilla (opcional)</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {BUILT_IN_TEMPLATES.filter(t => 
                generationMode === 'ca-issued' || t.category !== 'ca'
              ).map(t => (
                <Chip
                  key={t.id}
                  label={t.name}
                  onClick={() => setSelectedTemplate(t)}
                  color={selectedTemplate?.id === t.id ? 'primary' : 'default'}
                  variant={selectedTemplate?.id === t.id ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Datos del certificado</Typography>
              <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                <ToggleButton value="quick"><QuickIcon sx={{ mr: 1 }} /> Rápido</ToggleButton>
                <ToggleButton value="advanced"><AdvancedIcon sx={{ mr: 1 }} /> Avanzado</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {viewMode === 'quick' ? renderQuickFields() : renderAdvancedFields()}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Resumen y generación</Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography color="text.secondary">Modo:</Typography></Grid>
                <Grid item xs={6}><Typography>{MODE_LABELS[generationMode].label}</Typography></Grid>
                <Grid item xs={6}><Typography color="text.secondary">CN:</Typography></Grid>
                <Grid item xs={6}><Typography>{cn}</Typography></Grid>
                <Grid item xs={6}><Typography color="text.secondary">Algoritmo:</Typography></Grid>
                <Grid item xs={6}><Typography>{algorithm}</Typography></Grid>
                {generationMode !== 'csr-external' && (
                  <>
                    <Grid item xs={6}><Typography color="text.secondary">Validez:</Typography></Grid>
                    <Grid item xs={6}><Typography>{validityDays} días</Typography></Grid>
                  </>
                )}
                <Grid item xs={6}><Typography color="text.secondary">SAN:</Typography></Grid>
                <Grid item xs={6}><Typography>{sanList.length > 0 ? sanList.map(s => s.value).join(', ') : 'Ninguno'}</Typography></Grid>
              </Grid>
            </Paper>

            {warnings.length > 0 && (
              <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                {warnings.map((w, i) => <div key={i}>{w}</div>)}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleGenerate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              data-testid="generate-btn"
            >
              {generationMode === 'csr-external' ? 'Generar CSR' : 'Generar Certificado'}
            </Button>
          </Box>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom data-testid="page-title">Generar Certificado</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Wizard unificado para CSRs, certificados autofirmados y emisión con CA local
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        {renderStepContent()}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button disabled={activeStep === 0} onClick={handleBack} data-testid="cert-back-btn">Atrás</Button>
          {activeStep < steps.length - 1 && (
            <Button variant="contained" onClick={handleNext} data-testid="cert-next-btn">Siguiente</Button>
          )}
        </Box>
      </Paper>

      <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SuccessIcon color="success" />
          {generationMode === 'csr-external' ? 'CSR generado' : 'Certificado generado'}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Archivos creados:</Typography>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
            {resultPaths?.keyPath && <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>Clave: {resultPaths.keyPath}</Typography>}
            {resultPaths?.csrPath && <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>CSR: {resultPaths.csrPath}</Typography>}
            {resultPaths?.certPath && <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>Cert: {resultPaths.certPath}</Typography>}
            {resultPaths?.chainPath && <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>Chain: {resultPaths.chainPath}</Typography>}
          </Box>
          {generationMode === 'csr-external' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Envía el archivo CSR a tu CA (FNMT, Let's Encrypt, etc.). <strong>No compartas la clave privada.</strong>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.electronAPI.shell.showItemInFolder(resultPaths?.keyPath || resultPaths?.certPath || '')}>
            Abrir carpeta
          </Button>
          <Button onClick={handleReset}>Nuevo</Button>
          <Button onClick={() => setSuccessDialogOpen(false)} variant="contained">Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
