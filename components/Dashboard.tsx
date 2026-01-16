
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

  const loadTickets = async () => {
    if (settings.apiToken && settings.email) {
      setIsLoading(true);
      try {
        const tickets = await ZendeskService.fetchTicketsFromView(settings);
        setPendingTickets(tickets || []);
      } catch (e) {
        console.error("Erro ao carregar tickets.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadTickets();
    const interval = setInterval(loadTickets, 30000); 
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
      (agent.expertise || []).forEach(exp => {
        if (ticketContent.includes(exp.systemName.toLowerCase())) score += (exp.level * 20);
      });
      return { agent, score, occupancyRate };
    }).sort((a, b) => b.score - a.score)[0];
  }, [activeTicket, agents]);

  const handleSmartAssign = async () => {
    if (!activeTicket || !smartRecommendationData) return;
    setIsAssigning(true);
    setTimeout(() => {
      const target = smartRecommendationData.agent;
      const newAgents = agents.map(a => a.id === target.id ? { ...a, currentWorkload: a.currentWorkload + 1 } : a);
      onUpdateAgents(newAgents);
      onAssignSuccess(activeTicket.tags[0] || 'geral', target.id, {
        id: Date.now().toString(), ticketId: activeTicket.id, agentName: target.name, timestamp: Date.now(),
        reason: "IA Smart Match", type: 'manual', score: Math.round(smartRecommendationData.score)
      });
      setPendingTickets(prev => prev.filter(t => t.id !== activeTicket.id));
      setIsAssigning(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs uppercase flex items-center gap-2">
              <i className="bi bi-list-task text-magalu"></i> Fila Real: {settings.queueId || 'Todos os Tickets'}
            </h3>
            {isLoading && <div className="w-3 h-3 border-2 border-magalu border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {pendingTickets.length === 0 ? (
              <div className="p-20 text-center text-slate-300 italic">Nenhum ticket encontrado.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-4 py-3">Assunto</th>
                    <th className="px-4 py-3">Prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors cursor-default">
                      <td className="px-6 py-4 font-bold text-slate-400">#{ticket.id}</td>
                      <td className="px-4 py-4 font-bold text-slate-700">{ticket.subject}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ticket.priority === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>{ticket.priority.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
            <h2 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Recomendação IA</h2>
            {smartRecommendationData ? (
              <div className="animate-fadeIn">
                <div className="w-20 h-20 bg-magalu text-white rounded-3xl flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-xl shadow-magalu/20">
                  {Math.round(smartRecommendationData.score)}%
                </div>
                <div className="font-bold text-slate-800 text-sm mb-1">{smartRecommendationData.agent.name}</div>
                <button onClick={handleSmartAssign} disabled={isAssigning} className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-magalu transition-all">
                  ATRIBUIR AGORA
                </button>
              </div>
            ) : <div className="text-slate-200 italic text-xs">Selecione um ticket na fila</div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
