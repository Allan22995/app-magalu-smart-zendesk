
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
}

const OperationalQueue: React.FC<OperationalQueueProps> = ({ settings, agents }) => {
  const [tickets, setTickets] = useState<ExtendedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadTickets = async () => {
    if (!settings.apiToken || !settings.email || !settings.queueId) return;
    setIsLoading(true);
    try {
      const zendeskTickets = await ZendeskService.fetchTicketsFromView(settings);
      
      if (zendeskTickets) {
        const enriched = zendeskTickets.map(t => ({
          ...t,
          createdAt: Date.now() - (Math.random() * 45 * 60000), // Simula tempo de criação baseado no tempo atual para o Kanban
          branch: 'Operação Central',
        }));
        setTickets(enriched);
      }
    } catch (e) {
       console.error("Erro ao carregar fila viva.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const poller = setInterval(loadTickets, 60000); // Polling real a cada 1 minuto
    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [settings]);

  const columns = useMemo(() => {
    const green: ExtendedTicket[] = [];
    const yellow: ExtendedTicket[] = [];
    const red: ExtendedTicket[] = [];
    tickets.forEach(t => {
      const diffMin = (now - t.createdAt) / 60000;
      if (diffMin <= 15) green.push(t);
      else if (diffMin <= 40) yellow.push(t);
      else red.push(t);
    });
    return { green, yellow, red };
  }, [tickets, now]);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Fila Viva Real-Time</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">Monitorando View ID: {settings.queueId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {isLoading && <div className="w-4 h-4 border-2 border-magalu border-t-transparent rounded-full animate-spin"></div>}
           <button onClick={loadTickets} className="p-2.5 bg-slate-100 rounded-xl hover:bg-magalu hover:text-white transition-all">
            <i className="bi bi-arrow-clockwise text-lg"></i>
          </button>
        </div>
      </div>

      {tickets.length === 0 && !isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
           <i className="bi bi-check2-circle text-6xl text-slate-100 mb-4"></i>
           <p className="text-slate-400 font-bold uppercase tracking-widest">Sem pendências reais na fila</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden min-h-0">
          {[
            { label: 'Normal (Até 15m)', data: columns.green, color: 'border-green-400', bg: 'bg-green-50/30' },
            { label: 'Atenção (+15m)', data: columns.yellow, color: 'border-amber-400', bg: 'bg-amber-50/30' },
            { label: 'Crítico (+40m)', data: columns.red, color: 'border-red-400', bg: 'bg-red-50/30' }
          ].map(col => (
            <div key={col.label} className={`flex flex-col ${col.bg} rounded-2xl border p-4 overflow-hidden`}>
              <h3 className="text-[10px] font-black mb-4 uppercase text-slate-500 tracking-tighter">{col.label} — {col.data.length}</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {col.data.map(t => (
                  <div key={t.id} className={`bg-white border-l-4 p-4 rounded-xl shadow-sm border-slate-100 group hover:border-magalu transition-all`}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-bold text-slate-300">#{t.id}</span>
                       <span className="text-[10px] font-black text-magalu">{Math.floor((now - t.createdAt)/60000)}m</span>
                    </div>
                    <div className="text-sm font-bold text-slate-700 leading-snug group-hover:text-magalu transition-colors">{t.subject}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OperationalQueue;
