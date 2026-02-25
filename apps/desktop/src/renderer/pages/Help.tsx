import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Link,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  SwapHoriz as ConvertIcon,
  Add as AddIcon,
  VerifiedUser as SelfSignedIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export default function Help() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Ayuda
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Guía de uso de Certificate Manager Tool
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon color="primary" />
          <Typography variant="h6">Acerca de la aplicación</Typography>
        </Box>
        <Typography paragraph>
          Certificate Manager Tool es una herramienta de escritorio para gestionar certificados digitales
          de forma segura y completamente offline. No realiza conexiones de red ni envía telemetría.
        </Typography>
        <Typography paragraph>
          La aplicación utiliza OpenSSL para las operaciones criptográficas. Asegúrate de tener
          OpenSSL instalado y configurado correctamente en la sección de Configuración.
        </Typography>
      </Paper>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon />
            <Typography variant="h6">Inspeccionar certificados</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Permite visualizar los detalles de un certificado digital:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Formatos soportados"
                secondary=".cer, .crt, .pem, .der, .p12, .pfx"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Archivos PKCS#12 (.p12, .pfx)"
                secondary="Requieren contraseña para extraer el certificado"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Información mostrada"
                secondary="Subject, Issuer, validez, algoritmo, Key Usage, EKU, SAN, fingerprints"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConvertIcon />
            <Typography variant="h6">Convertir certificados</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Convierte certificados entre diferentes formatos:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="PEM (Base64)"
                secondary="Formato de texto con encabezados -----BEGIN CERTIFICATE-----"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="DER (Binario)"
                secondary="Formato binario sin encabezados"
              />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary">
            La conversión detecta automáticamente el formato de entrada.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon />
            <Typography variant="h6">Generar CSR (recomendado)</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            <strong>CSR (Certificate Signing Request)</strong> es el método correcto para obtener
            certificados de una Autoridad de Certificación (CA).
          </Typography>
          <Typography paragraph>
            <strong>Proceso:</strong>
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="1. Genera el CSR"
                secondary="Se creará una clave privada y un archivo CSR"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="2. Envía el CSR a la CA"
                secondary="FNMT, Let's Encrypt, CA corporativa, etc."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="3. Recibe el certificado firmado"
                secondary="La CA verificará tu identidad y firmará el certificado"
              />
            </ListItem>
          </List>
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            ⚠️ Nunca compartas la clave privada. Guárdala en un lugar seguro.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SelfSignedIcon />
            <Typography variant="h6">Generar certificados autofirmados</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Los certificados autofirmados son útiles para:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText primary="• Desarrollo local" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Pruebas y testing" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Entornos aislados" />
            </ListItem>
          </List>
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            ⚠️ Los certificados autofirmados NO son confiables por defecto en navegadores
            y sistemas operativos. No los uses en producción.
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            <Typography variant="h6">Seguridad</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography paragraph>
            Esta aplicación implementa las siguientes medidas de seguridad:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="100% Offline"
                secondary="No realiza conexiones de red ni envía datos"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Sin almacenamiento de contraseñas"
                secondary="Las contraseñas se mantienen en memoria solo el tiempo necesario"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Logs sanitizados"
                secondary="Las claves privadas y contraseñas no se registran en logs"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Archivos temporales"
                secondary="Se eliminan automáticamente tras cada operación"
              />
            </ListItem>
          </List>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 3 }} />

      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>Requisitos</Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><SecurityIcon /></ListItemIcon>
            <ListItemText
              primary="OpenSSL"
              secondary="Requerido para todas las operaciones de certificados"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><SecurityIcon /></ListItemIcon>
            <ListItemText
              primary="JDK (opcional)"
              secondary="Necesario para operaciones con keystores JKS/JCEKS/PKCS12"
            />
          </ListItem>
        </List>
      </Paper>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Certificate Manager Tool v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}
