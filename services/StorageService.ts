
import { Agent, AppSettings } from '../types';

const KEYS = {
  AGENTS: 'magalu_agents',
  SETTINGS: 'magalu_settings',
  HISTORY: 'magalu_history'
};

export const StorageService = {
  async loadAgents(): Promise<Agent[]> {
    const data = localStorage.getItem(KEYS.AGENTS);
    return data ? JSON.parse(data) : [];
  },

  async saveAgents(agents: Agent[]): Promise<void> {
    localStorage.setItem(KEYS.AGENTS, JSON.stringify(agents));
  },

  async loadSettings(): Promise<AppSettings | null> {
    const data = localStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};
