import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSettingsStore } from './store/settingsStore';
import MainLayout from './components/layout/MainLayout';
import SetupWizard from './pages/SetupWizard';
import Dashboard from './pages/Dashboard';
import InspectCertificate from './pages/certificates/InspectCertificate';
import ConvertCertificate from './pages/certificates/ConvertCertificate';
import GenerateCertificate from './pages/certificates/GenerateCertificate';
import PKCS12Manager from './pages/certificates/PKCS12Manager';
import CAManager from './pages/certificates/CAManager';
import Templates from './pages/Templates';
import KeystoreOpen from './pages/keystores/KeystoreOpen';
import KeystoreEntries from './pages/keystores/KeystoreEntries';
import Batch from './pages/Batch';
import Settings from './pages/Settings';
import ActivityLogs from './pages/ActivityLogs';
import Help from './pages/Help';

function App() {
  const { settings, loading, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!settings?.setupCompleted) {
    return <SetupWizard />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/certificates/generate" element={<GenerateCertificate />} />
        <Route path="/certificates/inspect" element={<InspectCertificate />} />
        <Route path="/certificates/convert" element={<ConvertCertificate />} />
        <Route path="/certificates/pkcs12" element={<PKCS12Manager />} />
        <Route path="/ca-manager" element={<CAManager />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/keystores/open" element={<KeystoreOpen />} />
        <Route path="/keystores/entries" element={<KeystoreEntries />} />
        <Route path="/batch" element={<Batch />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/activity" element={<ActivityLogs />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
