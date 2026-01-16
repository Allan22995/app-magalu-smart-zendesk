
import React, { useState, useMemo, useEffect } from 'react';
import { Agent, Ticket, AppSettings, AssignmentMemory, AssignmentLog, KnowledgeLevel, TicketPriority } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ZendeskService } from '../services/ZendeskService';

interface DashboardProps {
  agents: Agent[];
  currentTicket: Ticket | null;
  settings: AppSettings;
  onUpdateAgents: (agents: Agent[]) => void;
  memory: AssignmentMemory[];
  onAssignSuccess: (tag: string, agentId: number, log: AssignmentLog) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ agents, currentTicket, settings, onUpdateAgents, memory, onAssignSuccess }) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    if (settings.apiToken && settings.email && settings.queueId) {
      setIsLoading(true);
      setError(null);
      try {
        const tickets = await ZendeskService.fetchTicketsFromView(settings);
        setPendingTickets(tickets || []);
      } catch (e) {
        setError("Erro de CORS: O navegador bloqueou a conexão. Este app deve ser usado como App Privado no Zendesk para visualização real.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadTickets();
    const interval = setInterval(loadTickets, 30000); // Atualiza tickets a cada 30s
    return () => clearInterval(interval);
  }, [settings]);

  const threshold = settings.overloadThreshold || 80;
  const activeTicket = currentTicket || pendingTickets[0] || null;

  const smartRecommendationData = useMemo(() => {
    if (!activeTicket || !agents.length) return null;
    const available = agents.filter(a => a.isActive);
    if (!available.length) return null;

    return available.map(agent => {
      let score = 0;
      const occupancyRate = agent.currentWorkload / agent.maxCapacity;
      score += (1 - occupancyRate) * 40;
      
      const ticketContent = (activeTicket.subject + ' ' + activeTicket.description).toLowerCase();
      const agentExpertise = agent.expertise || [];
      
      agentExpertise.forEach(exp => {
        if (ticketContent.includes(exp.systemName.toLowerCase())) {
          score += (exp.level * 20);
        }
      });

      return { agent, score, occupancyRate };
    }).sort((a, b) => b.score - a.score)[0];
  }, [activeTicket, agents]);

  const handleSmartAssign = async () => {
    if (!activeTicket || !smartRecommendationData) return;
    setIsAssigning(true);
    // Simulação de delay de processamento da IA
    setTimeout(() => {
      const target = smartRecommendationData.agent;
      const newAgents = agents.map(a => a.id === target.id ? { ...a, currentWorkload: a.currentWorkload + 1 } : a);
      onUpdateAgents(newAgents);
      const log: AssignmentLog = {
        id: Date.now().toString(), ticketId: activeTicket.id, agentName: target.name, timestamp: Date.now(),
        reason: "IA Real-Time Match", type: 'manual', score: Math.round(smartRecommendationData.score)
      };
      onAssignSuccess(activeTicket.tags[0] || 'geral', target.id, log);
      setPendingTickets(prev => prev.filter(t => t.id !== activeTicket.id));
      setIsAssigning(false);
    }, 600);
  };

  const chartData = agents.map(a => ({
    name: a.name.split(' ')[0],
    carga: a.currentWorkload,
    percentual: (a.currentWorkload / a.maxCapacity) * 100
  }));

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {error && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700 shadow-sm">
          <i className="bi bi-shield-slash-fill text-xl"></i>
          <div>
            <p className="font-bold text-sm">Bloqueio de Segurança Detectado</p>
            <p className="text-xs opacity-80">Para visualizar sua fila real <b>{settings.queueId}</b>, instale este app no painel do Zendesk ou use uma extensão de "CORS Unblock" no Chrome para testes.</p>
          </div>
        </div>
      )}

      {isLoading && pendingTickets.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-magalu border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-bold animate-pulse uppercase text-xs tracking-widest">Conectando à Fila Viva...</p>
        </div>
      )}
      
      {!isLoading && pendingTickets.length === 0 && !error && (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
          <i className="bi bi-inbox text-5xl text-slate-200 mb-4 block"></i>
          <p className="text-slate-400 font-bold">Fila limpa! Nenhum ticket pendente em {settings.queueId}.</p>
        </div>
      )}

      {pendingTickets.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="bi bi-lightning-charge-fill text-magalu"></i>
                <h3 className="font-bold text-slate-800 text-xs uppercase">Tickets em Tempo Real ({pendingTickets.length})</h3>
              </div>
              <button onClick={loadTickets} className="text-[10px] font-bold text-magalu bg-white px-3 py-1 rounded-full border border-magalu/20 hover:bg-magalu hover:text-white transition-all">
                ATUALIZAR AGORA
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {pendingTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-400">#{ticket.id}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-700">{ticket.subject}</div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                          ticket.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">IA Recommend</h2>
              {smartRecommendationData ? (
                <div className="space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-magalu/10 rounded-2xl flex items-center justify-center text-magalu text-2xl font-black">
                        {Math.round(smartRecommendationData.score)}%
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{smartRecommendationData.agent.name}</div>
                        <div className="text-[10px] text-slate-400">Match baseado em expertise e carga</div>
                      </div>
                   </div>
                   <button onClick={handleSmartAssign} disabled={isAssigning} className="w-full py-4 bg-magalu text-white rounded-xl font-bold shadow-lg shadow-magalu/20 active:scale-95 transition-all">
                     {isAssigning ? 'PROCESSANDO...' : 'CONFIRMAR ATRIBUIÇÃO'}
                   </button>
                </div>
              ) : <div className="py-10 text-center text-slate-300">Aguardando ticket...</div>}
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-widest">Carga Operacional Viva</h2>
              <div className="h-48">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={9} fontWeight={700} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="carga" radius={[6, 6, 0, 0]} barSize={24}>
                         {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.percentual >= threshold ? '#ef4444' : '#f60040'} />
                         ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
