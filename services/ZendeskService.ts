
import { AppSettings, Agent, Ticket } from '../types';

export const ZendeskService = {
  getAuthHeader(settings: AppSettings) {
    const auth = btoa(`${settings.email}/token:${settings.apiToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  async validateCredentials(settings: AppSettings): Promise<boolean> {
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/users/me.json`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      return response.ok;
    } catch (e) {
      console.error("Erro ao validar credenciais Zendesk:", e);
      return false;
    }
  },

  async fetchAgents(settings: AppSettings): Promise<Agent[]> {
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/users.json?role[]=agent&role[]=admin`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        maxCapacity: settings.defaultMaxCapacity || 8,
        currentWorkload: 0,
        skills: [],
        expertise: [],
        isActive: u.active,
        avatarUrl: u.photo?.content_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=f60040&color=fff`
      }));
    } catch (e) {
      console.error("Falha ao buscar agentes do Zendesk:", e);
      return [];
    }
  },

  async fetchTicketsFromView(settings: AppSettings): Promise<Ticket[]> {
    if (!settings.queueId) return [];
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/views/${settings.queueId}/execute.json`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      if (!response.ok) return [];
      const data = await response.json();
      return data.rows.map((row: any) => ({
        id: row.ticket.id.toString(),
        subject: row.ticket.subject,
        description: row.ticket.description || "Sem descrição disponível.",
        priority: row.ticket.priority || 'normal',
        tags: row.ticket.tags || [],
        status: row.ticket.status,
        customFields: {} 
      }));
    } catch (e) {
      console.error("Erro ao carregar fila do Zendesk:", e);
      return [];
    }
  }
};
