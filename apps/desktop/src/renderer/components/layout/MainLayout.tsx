import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  SwapHoriz as ConvertIcon,
  Add as AddIcon,
  VerifiedUser as SelfSignedIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Description as TemplateIcon,
  AccountTree as CAIcon,
  Lock as PKCS12Icon,
  Storage as KeystoreIcon,
  FolderOpen as OpenIcon,
  List as ListIcon,
  BatchPrediction as BatchIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 260;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  {
    text: 'Certificates',
    icon: <SecurityIcon />,
    children: [
      { text: 'Generate', icon: <AddIcon />, path: '/certificates/generate' },
      { text: 'Inspect', icon: <SearchIcon />, path: '/certificates/inspect' },
      { text: 'Convert / Export', icon: <ConvertIcon />, path: '/certificates/convert' },
      { text: 'PKCS#12 Manager', icon: <PKCS12Icon />, path: '/certificates/pkcs12' },
      { text: 'PKCS#7 Manager', icon: <PKCS12Icon />, path: '/certificates/pkcs7' },
    ],
  },
  {
    text: 'Keystores',
    icon: <KeystoreIcon />,
    children: [
      { text: 'Open / Create', icon: <OpenIcon />, path: '/keystores/open' },
      { text: 'Entries', icon: <ListIcon />, path: '/keystores/entries' },
    ],
  },
  {
    text: 'CA Manager',
    icon: <CAIcon />,
    path: '/ca-manager',
  },
  { text: 'Templates', icon: <TemplateIcon />, path: '/templates' },
  { text: 'Batch', icon: <BatchIcon />, path: '/batch' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Activity / Logs', icon: <HistoryIcon />, path: '/activity' },
  { text: 'Help', icon: <HelpIcon />, path: '/help' },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Certificates: true,
  });

  const handleToggle = (text: string) => {
    setOpenSections((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const isSelected = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections[item.text];

    return (
      <Box key={item.text}>
        <ListItem disablePadding>
          <ListItemButton
            data-testid={`nav-${item.text.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onClick={() => {
              if (hasChildren) {
                handleToggle(item.text);
              } else if (item.path) {
                handleNavigate(item.path);
              }
            }}
            selected={isSelected(item.path)}
            sx={{ pl: 2 + level * 2 }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderNavItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar sx={{ px: 2 }} data-testid="sidebar-header">
          <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" noWrap component="div" fontWeight={600}>
            Certificate Manager
          </Typography>
        </Toolbar>
        <Divider />
        <List sx={{ pt: 1 }}>
          {navItems.map((item) => renderNavItem(item))}
        </List>
      </Drawer>
      <Box
        component="main"
        data-testid="main-content"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          overflow: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
