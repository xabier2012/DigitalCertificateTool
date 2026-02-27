import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Computer as ServerIcon,
  Person as ClientIcon,
  Badge as CAIcon,
} from '@mui/icons-material';
import type { 
  CertificateTemplate, 
  TemplateCategory,
  KeyUsageFlags,
  KeyAlgorithm,
  SignatureHash,
} from '@cert-manager/shared';
import { BUILT_IN_TEMPLATES, DEFAULT_KEY_USAGE, EKU_OPTIONS } from '@cert-manager/shared';

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  server: <ServerIcon />,
  client: <ClientIcon />,
  ca: <CAIcon />,
  csr: <SecurityIcon />,
  custom: <SecurityIcon />,
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  server: 'Servidor',
  client: 'Cliente',
  ca: 'CA',
  csr: 'CSR',
  custom: 'Personalizada',
};

const ALGORITHMS: KeyAlgorithm[] = ['RSA-2048', 'RSA-4096', 'ECC-P256', 'ECC-P384'];
const HASHES: SignatureHash[] = ['SHA-256', 'SHA-384', 'SHA-512'];

export default function Templates() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const settings = await window.electronAPI.settings.get();
      const custom: CertificateTemplate[] = settings.customTemplates || [];
      setTemplates([...BUILT_IN_TEMPLATES, ...custom]);
    } catch {
      setTemplates([...BUILT_IN_TEMPLATES]);
    }
  };

  const saveCustomTemplates = async (allTemplates: CertificateTemplate[]) => {
    const custom = allTemplates.filter(t => !t.isBuiltIn);
    try {
      await window.electronAPI.settings.set({ customTemplates: custom });
    } catch {
      // Silent fail - state already updated locally
    }
  };

  const handleCreate = () => {
    setEditingTemplate({
      id: `custom-${Date.now()}`,
      name: 'Nueva plantilla',
      description: '',
      category: 'custom',
      isBuiltIn: false,
      defaults: {
        isCA: false,
        keyUsage: { ...DEFAULT_KEY_USAGE, digitalSignature: true, keyEncipherment: true },
        extendedKeyUsage: [],
        validityDays: 365,
        algorithm: 'RSA-2048',
        sanRequired: false,
        signatureHash: 'SHA-256',
      },
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (template: CertificateTemplate) => {
    setEditingTemplate({ ...template, defaults: { ...template.defaults, keyUsage: { ...template.defaults.keyUsage } } });
    setEditDialogOpen(true);
  };

  const handleDuplicate = (template: CertificateTemplate) => {
    const newTemplate: CertificateTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name: `${template.name} (copia)`,
      isBuiltIn: false,
      defaults: { ...template.defaults, keyUsage: { ...template.defaults.keyUsage } },
    };
    setEditingTemplate(newTemplate);
    setEditDialogOpen(true);
  };

  const handleDelete = (template: CertificateTemplate) => {
    if (template.isBuiltIn) return;
    const updated = templates.filter(t => t.id !== template.id);
    setTemplates(updated);
    saveCustomTemplates(updated);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    
    const existing = templates.findIndex(t => t.id === editingTemplate.id);
    let updated: CertificateTemplate[];
    
    if (existing >= 0) {
      updated = [...templates];
      updated[existing] = editingTemplate;
    } else {
      updated = [...templates, editingTemplate];
    }
    
    setTemplates(updated);
    saveCustomTemplates(updated);
    setEditDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleExport = (template: CertificateTemplate) => {
    const data = JSON.stringify(template, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const template = JSON.parse(text) as CertificateTemplate;
        
        if (!template.name || !template.defaults) {
          throw new Error('Formato inválido');
        }
        
        template.id = `custom-${Date.now()}`;
        template.isBuiltIn = false;
        
        const updated = [...templates, template];
        setTemplates(updated);
        saveCustomTemplates(updated);
        setImportError(null);
      } catch (err) {
        setImportError('Error al importar la plantilla. Formato inválido.');
      }
    };
    input.click();
  };

  const updateKeyUsage = (field: keyof KeyUsageFlags, value: boolean) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      defaults: {
        ...editingTemplate.defaults,
        keyUsage: {
          ...editingTemplate.defaults.keyUsage,
          [field]: value,
        },
      },
    });
  };

  const toggleEKU = (eku: string) => {
    if (!editingTemplate) return;
    const current = editingTemplate.defaults.extendedKeyUsage;
    const updated = current.includes(eku)
      ? current.filter(e => e !== eku)
      : [...current, eku];
    setEditingTemplate({
      ...editingTemplate,
      defaults: {
        ...editingTemplate.defaults,
        extendedKeyUsage: updated,
      },
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Plantillas de Certificados
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona plantillas predefinidas para generar certificados rápidamente
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<ImportIcon />} onClick={handleImport}>
            Importar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Nueva plantilla
          </Button>
        </Box>
      </Box>

      {importError && (
        <Alert severity="error" onClose={() => setImportError(null)} sx={{ mb: 2 }}>
          {importError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {CATEGORY_ICONS[template.category]}
                  <Typography variant="h6">{template.name}</Typography>
                  {template.isBuiltIn && (
                    <Chip label="Predefinida" size="small" variant="outlined" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {template.description || 'Sin descripción'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  <Chip label={CATEGORY_LABELS[template.category]} size="small" />
                  <Chip label={template.defaults.algorithm} size="small" variant="outlined" />
                  <Chip label={`${template.defaults.validityDays} días`} size="small" variant="outlined" />
                  {template.defaults.isCA && <Chip label="CA" size="small" color="warning" />}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {template.defaults.extendedKeyUsage.map(eku => (
                    <Chip key={eku} label={eku} size="small" variant="outlined" />
                  ))}
                </Box>
              </CardContent>
              <CardActions>
                <Tooltip title="Duplicar">
                  <IconButton size="small" onClick={() => handleDuplicate(template)}>
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Exportar JSON">
                  <IconButton size="small" onClick={() => handleExport(template)}>
                    <ExportIcon />
                  </IconButton>
                </Tooltip>
                {!template.isBuiltIn && (
                  <>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleEdit(template)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(template)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTemplate?.isBuiltIn === false && templates.find(t => t.id === editingTemplate?.id)
            ? 'Editar plantilla'
            : 'Nueva plantilla'}
        </DialogTitle>
        <DialogContent>
          {editingTemplate && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Nombre"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      value={editingTemplate.category}
                      label="Categoría"
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as TemplateCategory })}
                    >
                      <MenuItem value="server">Servidor</MenuItem>
                      <MenuItem value="client">Cliente</MenuItem>
                      <MenuItem value="ca">CA</MenuItem>
                      <MenuItem value="csr">CSR</MenuItem>
                      <MenuItem value="custom">Personalizada</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descripción"
                    multiline
                    rows={2}
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" gutterBottom>Configuración por defecto</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Algoritmo</InputLabel>
                    <Select
                      value={editingTemplate.defaults.algorithm}
                      label="Algoritmo"
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        defaults: { ...editingTemplate.defaults, algorithm: e.target.value as KeyAlgorithm }
                      })}
                    >
                      {ALGORITHMS.map(alg => (
                        <MenuItem key={alg} value={alg}>{alg}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Días de validez"
                    value={editingTemplate.defaults.validityDays}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      defaults: { ...editingTemplate.defaults, validityDays: parseInt(e.target.value) || 365 }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Hash de firma</InputLabel>
                    <Select
                      value={editingTemplate.defaults.signatureHash}
                      label="Hash de firma"
                      onChange={(e) => setEditingTemplate({
                        ...editingTemplate,
                        defaults: { ...editingTemplate.defaults, signatureHash: e.target.value as SignatureHash }
                      })}
                    >
                      {HASHES.map(hash => (
                        <MenuItem key={hash} value={hash}>{hash}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingTemplate.defaults.isCA}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          defaults: { ...editingTemplate.defaults, isCA: e.target.checked }
                        })}
                      />
                    }
                    label="Es CA (Autoridad de Certificación)"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingTemplate.defaults.sanRequired}
                        onChange={(e) => setEditingTemplate({
                          ...editingTemplate,
                          defaults: { ...editingTemplate.defaults, sanRequired: e.target.checked }
                        })}
                      />
                    }
                    label="SAN requerido"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>Extended Key Usage (EKU)</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {EKU_OPTIONS.map(eku => (
                      <Chip
                        key={eku.value}
                        label={eku.label}
                        onClick={() => toggleEKU(eku.value)}
                        color={editingTemplate.defaults.extendedKeyUsage.includes(eku.value) ? 'primary' : 'default'}
                        variant={editingTemplate.defaults.extendedKeyUsage.includes(eku.value) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    endIcon={showAdvanced ? <CollapseIcon /> : <ExpandIcon />}
                  >
                    Key Usage avanzado
                  </Button>
                  <Collapse in={showAdvanced}>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      <Grid container spacing={1}>
                        {(Object.keys(DEFAULT_KEY_USAGE) as (keyof KeyUsageFlags)[]).map(key => (
                          <Grid item xs={6} md={4} key={key}>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={editingTemplate.defaults.keyUsage[key]}
                                  onChange={(e) => updateKeyUsage(key, e.target.checked)}
                                />
                              }
                              label={key}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Collapse>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
