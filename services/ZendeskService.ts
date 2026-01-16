
import { AppSettings, Agent, Ticket } from '../types';

export const ZendeskService = {
  // Gera o header de autorização para o Zendesk API
  getAuthHeader(settings: AppSettings) {
    const auth = btoa(`${settings.email}/token:${settings.apiToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  },

  async validateCredentials(settings: AppSettings): Promise<boolean> {
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/users/me.json`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      return response.ok;
    } catch (e) {
      console.error("Erro ao validar credenciais", e);
      return false;
    }
  },

  async fetchAgents(settings: AppSettings): Promise<Agent[]> {
    // Busca usuários (agentes) do Zendesk
    // Em um cenário real, filtraríamos por grupos usando settings.allowedGroupIds
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/users.json?role[]=agent&role[]=admin`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      const data = await response.json();
      return data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        maxCapacity: settings.defaultMaxCapacity,
        currentWorkload: 0,
        skills: [],
        expertise: [],
        isActive: u.active,
        avatarUrl: u.photo?.content_url
      }));
    } catch (e) {
      console.error("Erro ao buscar agentes", e);
      return [];
    }
  },

  async fetchTicketsFromView(settings: AppSettings): Promise<Ticket[]> {
    if (!settings.queueId) return [];
    const url = `https://${settings.subdomain}.zendesk.com/api/v2/views/${settings.queueId}/execute.json`;
    try {
      const response = await fetch(url, { headers: this.getAuthHeader(settings) });
      const data = await response.json();
      return data.rows.map((row: any) => ({
        id: row.ticket.id.toString(),
        subject: row.ticket.subject,
        description: row.ticket.description || "Sem descrição disponível.",
        priority: row.ticket.priority || 'normal',
        tags: row.ticket.tags || [],
        status: row.ticket.status,
        customFields: {} // Campos personalizados seriam mapeados aqui se necessário
      }));
    } catch (e) {
      console.error("Erro ao buscar tickets da view", e);
      return [];
    }
  }
};
