
import { AppSettings, Agent, Ticket } from '../types';

// O AllOrigins é um proxy que não exige ativação manual via clique em botão, ideal para o Render.
const PROXY_URL = "https://api.allorigins.win/get?url=";

export const ZendeskService = {
  getAuthHeader(settings: AppSettings) {
    const auth = btoa(`${settings.email}/token:${settings.apiToken}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  },

  /**
   * Faz o fetch contornando o CORS usando AllOrigins
   */
  async fetchWithProxy(targetUrl: string, settings: AppSettings) {
    const encodedUrl = encodeURIComponent(targetUrl);
    const finalUrl = `${PROXY_URL}${encodedUrl}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        // Nota: O AllOrigins não repassa o header de Auth automaticamente para o destino em requisições complexas
        // mas o Zendesk aceita a credencial via URL (auth embutido) ou via headers se o proxy permitir.
        // Como o AllOrigins é um Wrapper, ele retorna o conteúdo da página original.
      }
    });

    if (!response.ok) throw new Error('Erro na rede do Proxy');
    
    // O AllOrigins retorna um JSON com { contents: "string_do_resultado" }
    // Precisamos de um fetch direto mas com credenciais para o Zendesk.
    // TENTATIVA 2: Se o AllOrigins falhar nas credenciais, usamos o proxy de desenvolvimento herokuapp.
    const directUrl = `https://cors-anywhere.herokuapp.com/${targetUrl}`;
    
    const zendeskResponse = await fetch(directUrl, {
      headers: this.getAuthHeader(settings)
    });

    if (!zendeskResponse.ok) {
       // Se o CORS Anywhere falhar por falta de clique no botão, tentamos um terceiro sem travas
       const thirdProxy = `https://thingproxy.freeboard.io/fetch/${targetUrl}`;
       const res3 = await fetch(thirdProxy, { headers: this.getAuthHeader(settings) });
       return await res3.json();
    }

    return await zendeskResponse.json();
  },

  async validateCredentials(settings: AppSettings): Promise<boolean> {
    try {
      const data = await this.fetchWithProxy(`https://${settings.subdomain}.zendesk.com/api/v2/users/me.json`, settings);
      return !!data.user;
    } catch (e) {
      return false;
    }
  },

  async fetchAgents(settings: AppSettings): Promise<Agent[]> {
    try {
      // API fornecida: users.json ou show_many
      const target = `https://${settings.subdomain}.zendesk.com/api/v2/users.json?role[]=agent&role[]=admin`;
      const data = await this.fetchWithProxy(target, settings);
      
      if (!data.users) return [];
      
      return data.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        maxCapacity: settings.defaultMaxCapacity || 8,
        currentWorkload: 0,
        skills: [],
        expertise: [],
        isActive: u.active,
        avatarUrl: u.photo?.content_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`
      }));
    } catch (e) {
      console.error("Erro fetchAgents:", e);
      return [];
    }
  },

  async fetchTicketsFromView(settings: AppSettings): Promise<Ticket[]> {
    try {
      // API Fornecida: /api/v2/tickets ou views
      const endpoint = settings.queueId 
        ? `https://${settings.subdomain}.zendesk.com/api/v2/views/${settings.queueId}/execute.json`
        : `https://${settings.subdomain}.zendesk.com/api/v2/tickets.json?sort_by=created_at&sort_order=desc`;

      const data = await this.fetchWithProxy(endpoint, settings);
      const rawTickets = data.rows || data.tickets || [];
      
      return rawTickets.map((item: any) => {
        const t = item.ticket || item;
        return {
          id: t.id.toString(),
          subject: t.subject,
          description: t.description || "",
          priority: t.priority || 'normal',
          tags: t.tags || [],
          status: t.status
        };
      });
    } catch (e) {
      return [];
    }
  },

  async fetchManyUsers(settings: AppSettings, ids: string) {
    const target = `https://${settings.subdomain}.zendesk.com/api/v2/users/show_many.json?ids=${ids}`;
    return await this.fetchWithProxy(target, settings);
  }
};
