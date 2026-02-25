import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  SwapHoriz as ConvertIcon,
  Add as AddIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useSettingsStore } from '../store/settingsStore';

const quickActions = [
  {
    title: 'Inspeccionar certificado',
    description: 'Analiza y visualiza los detalles de un certificado',
    icon: <SearchIcon sx={{ fontSize: 40 }} />,
    path: '/certificates/inspect',
    color: '#1976d2',
  },
  {
    title: 'Convertir certificado',
    description: 'Convierte entre formatos PEM y DER',
    icon: <ConvertIcon sx={{ fontSize: 40 }} />,
    path: '/certificates/convert',
    color: '#9c27b0',
  },
  {
    title: 'Generar CSR (recomendado)',
    description: 'Crea una solicitud de certificado para enviar a una CA',
    icon: <AddIcon sx={{ fontSize: 40 }} />,
    path: '/certificates/generate-csr',
    color: '#2e7d32',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const recentFiles = settings?.recentFiles || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cer: 'CER',
      crt: 'CRT',
      pem: 'PEM',
      der: 'DER',
      p12: 'PKCS#12',
      pfx: 'PKCS#12',
      key: 'KEY',
      csr: 'CSR',
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Gestiona tus certificados de forma segura y offline
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Acciones rápidas
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action) => (
          <Grid item xs={12} md={4} key={action.title}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea
                onClick={() => navigate(action.path)}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ color: action.color, mb: 2 }}>{action.icon}</Box>
                  <Typography variant="h6" gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom>
        Archivos recientes
      </Typography>

      <Paper sx={{ p: 0 }}>
        {recentFiles.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No hay archivos recientes
            </Typography>
          </Box>
        ) : (
          <List>
            {recentFiles.map((file, index) => (
              <ListItem key={index} disablePadding divider={index < recentFiles.length - 1}>
                <ListItemButton
                  onClick={() => navigate('/certificates/inspect', { state: { filePath: file.path } })}
                >
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={formatDate(file.lastAccessed)}
                  />
                  <Chip
                    label={getFileTypeLabel(file.type)}
                    size="small"
                    variant="outlined"
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
