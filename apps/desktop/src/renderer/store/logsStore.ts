import { create } from 'zustand';
import type { OperationLogEntry } from '@cert-manager/shared';

interface LogsState {
  logs: OperationLogEntry[];
  loading: boolean;
  loadLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  loading: false,

  loadLogs: async () => {
    try {
      set({ loading: true });
      const logs = await window.electronAPI.logs.get();
      set({ logs, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clearLogs: async () => {
    try {
      await window.electronAPI.logs.clear();
      set({ logs: [] });
    } catch {
      // Silent fail
    }
  },
}));
