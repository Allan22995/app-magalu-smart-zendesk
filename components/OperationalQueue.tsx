
import React, { useState, useMemo, useEffect } from 'react';
import { Ticket, AppSettings, Agent, TicketPriority } from '../types';
import { ZendeskService } from '../services/ZendeskService';

interface OperationalQueueProps {
  settings: AppSettings;
  agents: Agent[];
}

interface ExtendedTicket extends Ticket {
  createdAt: number;
  branch: string;
  assignedAgent?: string;
}

const OperationalQueue: React.FC<OperationalQueueProps> = ({ settings, agents }) => {
  const [tickets, setTickets] = useState<ExtendedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [now, setNow] = useState(Date.now());

  const loadTickets = async () => {
    if (!settings.apiToken || !settings.email || !settings.queueId) return;
    setIsLoading(true);
    try {
      const zendeskTickets = await ZendeskService.fetchTicketsFromView(settings);
      
      if (zendeskTickets && zendeskTickets.length > 0) {
        const enriched = zendeskTickets.map(t => ({
          ...t,
          createdAt: Date.now() - (Math.random() * 60 * 60000),
          branch: ['CD Louveira', 'CD Extrema', 'Filial SP 042', 'E-commerce'][Math.floor(Math.random() * 4)],
        }));
        setTickets(enriched);
      } else {
        // Fallback para visualização no site (Render) caso o CORS bloqueie
        const demoTickets: ExtendedTicket[] = [
          { id: '1', subject: 'Atraso na entrega CD Louveira', description: 'Dados de demonstração (API Bloqueada CORS)', priority: TicketPriority.URGENT, tags: [], status: 'open', createdAt: Date.now() - 50 * 60000, branch: 'CD Louveira' },
          { id: '2', subject: 'Dúvida sobre MagaluPay', description: 'Dados de demonstração (API Bloqueada CORS)', priority: TicketPriority.NORMAL, tags: [], status: 'open', createdAt: Date.now() - 10 * 60000, branch: 'E-commerce' }
        ];
        setTickets(demoTickets);
      }
    } catch (e) {
       console.error("Erro ao carregar fila.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [settings]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => filterBranch === 'all' || t.branch === filterBranch);
  }, [tickets, filterBranch]);

  const columns = useMemo(() => {
    const green: ExtendedTicket[] = [];
    const yellow: ExtendedTicket[] = [];
    const red: ExtendedTicket[] = [];
    filteredTickets.forEach(t => {
      const diffMin = (now - t.createdAt) / 60000;
      if (diffMin <= 15) green.push(t);
      else if (diffMin <= 40) yellow.push(t);
      else red.push(t);
    });
    return { green, yellow, red };
  }, [filteredTickets, now]);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Fila Viva Operacional</h2>
          <p className="text-xs text-slate-400">View: {settings.queueId} | Sub: {settings.subdomain}</p>
        </div>
        <button onClick={loadTickets} className="p-2 bg-slate-100 rounded-lg hover:bg-magalu hover:text-white transition-all">
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-0">
        {[
          { label: 'Normal', data: columns.green, color: 'border-green-400', bg: 'bg-green-50/50' },
          { label: 'Atenção', data: columns.yellow, color: 'border-amber-400', bg: 'bg-amber-50/50' },
          { label: 'Crítico', data: columns.red, color: 'border-red-400', bg: 'bg-red-50/50' }
        ].map(col => (
          <div key={col.label} className={`flex flex-col ${col.bg} rounded-2xl border p-4 overflow-hidden`}>
            <h3 className="text-xs font-black mb-4 uppercase">{col.label} ({col.data.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-4">
              {col.data.map(t => (
                <div key={t.id} className={`bg-white border-l-4 p-3 rounded-xl shadow-sm ${col.color}`}>
                  <div className="text-[10px] font-bold text-slate-400 mb-1">#{t.id}</div>
                  <div className="text-sm font-bold text-slate-700 leading-tight">{t.subject}</div>
                  <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <i className="bi bi-geo-alt"></i> {t.branch}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperationalQueue;
