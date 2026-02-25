import { create } from 'zustand';
import type { AppSettings, RecentFile } from '@cert-manager/shared';

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addRecentFile: (file: RecentFile) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  error: null,

  loadSettings: async () => {
    try {
      set({ loading: true, error: null });
      const settings = await window.electronAPI.settings.get();
      set({ settings, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al cargar configuración',
        loading: false,
      });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      await window.electronAPI.settings.set(newSettings);
      const currentSettings = get().settings;
      set({
        settings: currentSettings ? { ...currentSettings, ...newSettings } : null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Error al guardar configuración',
      });
    }
  },

  addRecentFile: async (file) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const recentFiles = currentSettings.recentFiles.filter((f) => f.path !== file.path);
    recentFiles.unshift(file);
    const trimmed = recentFiles.slice(0, 10);

    set({
      settings: { ...currentSettings, recentFiles: trimmed },
    });

    try {
      await window.electronAPI.settings.set({ recentFiles: trimmed });
    } catch {
      // Silent fail - local state is already updated
    }
  },
}));
