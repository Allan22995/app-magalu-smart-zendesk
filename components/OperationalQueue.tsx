
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
    const zendeskTickets = await ZendeskService.fetchTicketsFromView(settings);
    
    // Transforma para ExtendedTicket adicionando dados simulados de filial e data para visualização
    const enriched = zendeskTickets.map(t => ({
      ...t,
      createdAt: Date.now() - (Math.random() * 60 * 60000), // Simula tempo de espera
      branch: ['CD Louveira', 'CD Extrema', 'Filial SP 042', 'E-commerce'][Math.floor(Math.random() * 4)],
      assignedAgent: undefined
    }));
    
    setTickets(enriched);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [settings]);

  const branches = useMemo(() => {
    const set = new Set(tickets.map(t => t.branch));
    return Array.from(set).sort();
  }, [tickets]);

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

  const formatWaitTime = (createdAt: number) => {
    const mins = Math.floor((now - createdAt) / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const TicketCard = ({ ticket, colorClass }: { ticket: ExtendedTicket, colorClass: string }) => (
    <div className={`bg-white border-l-4 p-4 rounded-xl shadow-sm hover:shadow-md transition-all animate-fadeIn mb-4 ${colorClass}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{ticket.id}</span>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg flex items-center gap-1">
          <i className="bi bi-clock"></i> {formatWaitTime(ticket.createdAt)}
        </span>
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1 leading-snug truncate" title={ticket.subject}>{ticket.subject}</h4>
      <p className="text-[11px] text-slate-500 mb-3 line-clamp-2 italic leading-relaxed">
        {ticket.description}
      </p>
      
      <div className="space-y-2 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <i className="bi bi-geo-alt-fill text-magalu text-[10px]"></i>
          <span className="text-[10px] font-bold text-slate-600 truncate">{ticket.branch}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${ticket.assignedAgent ? 'bg-magalu text-white' : 'bg-slate-200 text-slate-400'}`}>
              {ticket.assignedAgent ? ticket.assignedAgent.charAt(0) : '?'}
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              {ticket.assignedAgent || 'Pendente'}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${ticket.priority === TicketPriority.URGENT ? 'bg-red-500' : 'bg-slate-300'}`}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="bi bi-activity text-magalu"></i> Monitor de SLA Operacional
          </h2>
          <p className="text-sm text-slate-500">Tickets reais da View ID: {settings.queueId}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isLoading && <div className="text-xs text-magalu animate-pulse font-bold">Sincronizando...</div>}
          <div className="flex flex-col">
            <select 
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-magalu/20 focus:border-magalu transition-all min-w-[180px]"
            >
              <option value="all">Todas as Unidades</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button 
            onClick={loadTickets}
            className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-magalu hover:text-white transition-all shadow-sm"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-0">
        <div className="flex flex-col bg-green-50/50 rounded-2xl border border-green-100 p-2 overflow-hidden">
          <div className="flex items-center justify-between p-3 mb-2">
            <h3 className="text-xs font-black text-green-700 uppercase tracking-widest">Normal (&lt; 15 min)</h3>
            <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.green.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-4">
            {columns.green.map(t => <TicketCard key={t.id} ticket={t} colorClass="border-green-400" />)}
          </div>
        </div>

        <div className="flex flex-col bg-amber-50/50 rounded-2xl border border-amber-100 p-2 overflow-hidden">
          <div className="flex items-center justify-between p-3 mb-2">
            <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Atenção (15-40 min)</h3>
            <span className="bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.yellow.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-4">
            {columns.yellow.map(t => <TicketCard key={t.id} ticket={t} colorClass="border-amber-400" />)}
          </div>
        </div>

        <div className="flex flex-col bg-red-50/50 rounded-2xl border border-red-100 p-2 overflow-hidden">
          <div className="flex items-center justify-between p-3 mb-2">
            <h3 className="text-xs font-black text-red-700 uppercase tracking-widest">Crítico (&gt; 40 min)</h3>
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.red.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-4">
            {columns.red.map(t => <TicketCard key={t.id} ticket={t} colorClass="border-red-400" />)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationalQueue;
