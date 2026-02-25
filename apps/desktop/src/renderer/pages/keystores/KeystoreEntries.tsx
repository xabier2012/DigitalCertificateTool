import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Download as ExportIcon,
  Delete as DeleteIcon,
  Edit as RenameIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { KeystoreEntry, KeystoreInfo } from '@cert-manager/shared';

interface CurrentKeystore {
  path: string;
  password: string;
  info: KeystoreInfo;
}

export default function KeystoreEntries() {
  const navigate = useNavigate();
  const [keystore, setKeystore] = useState<CurrentKeystore | null>(null);
  const [entries, setEntries] = useState<KeystoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<KeystoreEntry | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newAliasName, setNewAliasName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aliasToDelete, setAliasToDelete] = useState('');

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCertPath, setImportCertPath] = useState('');
  const [importAlias, setImportAlias] = useState('');

  const [importP12DialogOpen, setImportP12DialogOpen] = useState(false);
  const [p12Path, setP12Path] = useState('');
  const [p12Password, setP12Password] = useState('');
  const [p12DestAlias, setP12DestAlias] = useState('');

  useEffect(() => {
    loadKeystore();
  }, []);

  const loadKeystore = () => {
    const saved = sessionStorage.getItem('cert-manager-current-keystore');
    if (saved) {
      const ks = JSON.parse(saved) as CurrentKeystore;
      setKeystore(ks);
      setEntries(ks.info.entries);
    } else {
      navigate('/keystores/open');
    }
  };

  const refreshEntries = async () => {
    if (!keystore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.keystore.open({
        path: keystore.path,
        password: keystore.password,
      });

      if (result.success && result.data) {
        const updated = { ...keystore, info: result.data };
        sessionStorage.setItem('cert-manager-current-keystore', JSON.stringify(updated));
        setKeystore(updated);
        setEntries(result.data.entries);
      } else {
        setError(result.error?.message || 'Error al actualizar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseKeystore = () => {
    sessionStorage.removeItem('cert-manager-current-keystore');
    navigate('/keystores/open');
  };

  const handleViewDetails = async (entry: KeystoreEntry) => {
    setSelectedEntry(entry);
    setDetailsDialogOpen(true);
  };

  const handleExportCert = async (alias: string) => {
    if (!keystore) return;

    const result = await window.electronAPI.dialog.saveFile(undefined, [
      { name: 'Certificado PEM', extensions: ['pem', 'crt'] },
      { name: 'Certificado DER', extensions: ['der', 'cer'] },
    ]);

    if (!result.success || !result.data) return;

    const format = result.data.endsWith('.der') || result.data.endsWith('.cer') ? 'DER' : 'PEM';

    setLoading(true);
    try {
      const exportResult = await window.electronAPI.keystore.exportCert({
        keystorePath: keystore.path,
        keystorePassword: keystore.password,
        alias,
        outputPath: result.data,
        format,
      });

      if (exportResult.success) {
        window.electronAPI.shell.showItemInFolder(result.data);
      } else {
        setError(exportResult.error?.message || 'Error al exportar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRenameDialog = (entry: KeystoreEntry) => {
    setSelectedEntry(entry);
    setNewAliasName(entry.alias);
    setRenameDialogOpen(true);
  };

  const handleRenameAlias = async () => {
    if (!keystore || !selectedEntry || !newAliasName.trim()) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.renameAlias({
        keystorePath: keystore.path,
        keystorePassword: keystore.password,
        oldAlias: selectedEntry.alias,
        newAlias: newAliasName.trim(),
      });

      if (result.success) {
        setRenameDialogOpen(false);
        await refreshEntries();
      } else {
        setError(result.error?.message || 'Error al renombrar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDialog = (alias: string) => {
    setAliasToDelete(alias);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAlias = async () => {
    if (!keystore || !aliasToDelete) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.deleteAlias({
        keystorePath: keystore.path,
        keystorePassword: keystore.password,
        alias: aliasToDelete,
      });

      if (result.success) {
        setDeleteDialogOpen(false);
        await refreshEntries();
      } else {
        setError(result.error?.message || 'Error al eliminar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCertFile = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'Certificados', extensions: ['pem', 'crt', 'cer', 'der'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setImportCertPath(result.data);
      // Sugerir alias basado en nombre de archivo
      const fileName = result.data.split(/[\\/]/).pop() || '';
      const suggestedAlias = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!importAlias) {
        setImportAlias(suggestedAlias);
      }
    }
  };

  const handleImportCert = async () => {
    if (!keystore || !importCertPath || !importAlias.trim()) {
      setError('Selecciona un certificado y escribe un alias.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.importCert({
        keystorePath: keystore.path,
        keystorePassword: keystore.password,
        alias: importAlias.trim(),
        certPath: importCertPath,
        trustCACerts: true,
      });

      if (result.success) {
        setImportDialogOpen(false);
        setImportCertPath('');
        setImportAlias('');
        await refreshEntries();
      } else {
        setError(result.error?.message || 'Error al importar certificado.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectP12File = async () => {
    const result = await window.electronAPI.dialog.selectFile([
      { name: 'PKCS#12', extensions: ['p12', 'pfx'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ]);
    if (result.success && result.data) {
      setP12Path(result.data);
      // Sugerir alias basado en nombre de archivo
      const fileName = result.data.split(/[\\/]/).pop() || '';
      const suggestedAlias = fileName.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!p12DestAlias) {
        setP12DestAlias(suggestedAlias);
      }
    }
  };

  const handleImportP12 = async () => {
    if (!keystore || !p12Path || !p12Password) {
      setError('Selecciona un archivo P12/PFX y escribe su contraseña.');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.keystore.importP12({
        keystorePath: keystore.path,
        keystorePassword: keystore.password,
        p12Path: p12Path,
        p12Password: p12Password,
        destAlias: p12DestAlias || undefined,
      });

      if (result.success) {
        setImportP12DialogOpen(false);
        setP12Path('');
        setP12Password('');
        setP12DestAlias('');
        await refreshEntries();
      } else {
        setError(result.error?.message || 'Error al importar PKCS#12.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PrivateKeyEntry': return 'primary';
      case 'TrustedCertEntry': return 'success';
      case 'SecretKeyEntry': return 'warning';
      default: return 'default';
    }
  };

  const getExpirationColor = (days?: number) => {
    if (days === undefined) return 'default';
    if (days <= 0) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  if (!keystore) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Entradas del Keystore</Typography>
          <Typography variant="body2" color="text.secondary">
            {keystore.path} ({keystore.info.type}) - {entries.length} entradas
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => setImportDialogOpen(true)} disabled={loading}>
            Importar Certificado
          </Button>
          <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setImportP12DialogOpen(true)} disabled={loading}>
            Importar PKCS#12
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={refreshEntries} disabled={loading}>
            Actualizar
          </Button>
          <Button startIcon={<CloseIcon />} color="error" onClick={handleCloseKeystore}>
            Cerrar
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alias</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Algoritmo</TableCell>
              <TableCell>Expira</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    El keystore está vacío. Importa certificados o genera claves.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.alias} hover>
                  <TableCell>
                    <Typography fontWeight={500}>{entry.alias}</Typography>
                    {entry.subject && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {entry.subject}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.type}
                      size="small"
                      color={getTypeColor(entry.type) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {entry.algorithm && (
                      <Typography variant="body2">
                        {entry.algorithm} {entry.keySize ? `(${entry.keySize} bit)` : ''}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.daysUntilExpiration !== undefined && (
                      <Chip
                        label={entry.daysUntilExpiration <= 0 ? 'Expirado' : `${entry.daysUntilExpiration}d`}
                        size="small"
                        color={getExpirationColor(entry.daysUntilExpiration) as any}
                        icon={entry.daysUntilExpiration <= 30 ? <WarningIcon /> : undefined}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalles">
                      <IconButton size="small" onClick={() => handleViewDetails(entry)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Exportar certificado">
                      <IconButton size="small" onClick={() => handleExportCert(entry.alias)}>
                        <ExportIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Renombrar">
                      <IconButton size="small" onClick={() => handleOpenRenameDialog(entry)}>
                        <RenameIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(entry.alias)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalles: {selectedEntry?.alias}</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Box sx={{ mt: 1 }}>
              <Typography><strong>Tipo:</strong> {selectedEntry.type}</Typography>
              <Typography><strong>Algoritmo:</strong> {selectedEntry.algorithm || 'N/A'}</Typography>
              <Typography><strong>Tamaño clave:</strong> {selectedEntry.keySize ? `${selectedEntry.keySize} bits` : 'N/A'}</Typography>
              <Typography><strong>Subject:</strong> {selectedEntry.subject || 'N/A'}</Typography>
              <Typography><strong>Issuer:</strong> {selectedEntry.issuer || 'N/A'}</Typography>
              <Typography><strong>Serial:</strong> {selectedEntry.serialNumber || 'N/A'}</Typography>
              <Typography><strong>Expira:</strong> {selectedEntry.expirationDate || 'N/A'}</Typography>
              {selectedEntry.certificateChainLength && (
                <Typography><strong>Cadena:</strong> {selectedEntry.certificateChainLength} certificados</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)}>
        <DialogTitle>Renombrar alias</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nuevo nombre"
            value={newAliasName}
            onChange={(e) => setNewAliasName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleRenameAlias} disabled={loading}>
            Renombrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            ¿Estás seguro de eliminar el alias "{aliasToDelete}"? Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAlias} disabled={loading}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar Certificado al Keystore</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Archivo de certificado"
                value={importCertPath}
                onChange={(e) => setImportCertPath(e.target.value)}
                placeholder="Selecciona un archivo .pem, .crt, .cer"
              />
              <Button variant="outlined" onClick={handleSelectCertFile}>
                Buscar
              </Button>
            </Box>
            <TextField
              fullWidth
              label="Alias (nombre único en el keystore)"
              value={importAlias}
              onChange={(e) => setImportAlias(e.target.value)}
              placeholder="mi_certificado"
              helperText="Identificador único para este certificado en el keystore"
            />
            <Alert severity="info">
              El certificado se importará como <strong>TrustedCertEntry</strong> (certificado de confianza).
              Para importar un certificado con clave privada, usa la opción de importar PKCS#12.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleImportCert} 
            disabled={loading || !importCertPath || !importAlias.trim()}
          >
            {loading ? <CircularProgress size={20} /> : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importP12DialogOpen} onClose={() => setImportP12DialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar PKCS#12 (.p12 / .pfx)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Archivo PKCS#12"
                value={p12Path}
                onChange={(e) => setP12Path(e.target.value)}
                placeholder="Selecciona un archivo .p12 o .pfx"
              />
              <Button variant="outlined" onClick={handleSelectP12File}>
                Buscar
              </Button>
            </Box>
            <TextField
              fullWidth
              type="password"
              label="Contraseña del PKCS#12"
              value={p12Password}
              onChange={(e) => setP12Password(e.target.value)}
              placeholder="Contraseña del archivo P12/PFX"
              helperText="La contraseña con la que se protegió el archivo PKCS#12"
            />
            <TextField
              fullWidth
              label="Alias de destino (opcional)"
              value={p12DestAlias}
              onChange={(e) => setP12DestAlias(e.target.value)}
              placeholder="mi_certificado"
              helperText="Si se deja vacío, se usará el alias original del P12"
            />
            <Alert severity="info">
              El archivo PKCS#12 se importará como <strong>PrivateKeyEntry</strong> (certificado con clave privada).
              Esto permite usar el certificado para firmar documentos o autenticarse.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportP12DialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleImportP12} 
            disabled={loading || !p12Path || !p12Password}
          >
            {loading ? <CircularProgress size={20} /> : 'Importar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
