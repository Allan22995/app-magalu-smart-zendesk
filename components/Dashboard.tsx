
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

  useEffect(() => {
    setIsMounted(true);
    const loadTickets = async () => {
      if (settings.apiToken && settings.email && settings.queueId) {
        setIsLoading(true);
        setError(null);
        try {
          const tickets = await ZendeskService.fetchTicketsFromView(settings);
          if (tickets && tickets.length > 0) {
            setPendingTickets(tickets);
          } else {
            // Se retornar vazio, pode ser a View ou erro de CORS
            // Criamos um ticket fake apenas para o usuário conseguir ver o Dashboard funcionando no Render
            setPendingTickets([
              { id: '1001', subject: 'Aguardando Sincronização Real...', description: 'Conecte o app no Zendesk para ver dados vivos.', priority: TicketPriority.NORMAL, tags: ['demo'], status: 'open' }
            ]);
          }
        } catch (e) {
          setError("Erro de conexão com Zendesk (CORS).");
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadTickets();
  }, [settings]);

  const threshold = settings.overloadThreshold || 80;

  const getLevelLabel = (level: KnowledgeLevel) => {
    switch(level) {
      case KnowledgeLevel.ADVANCED: return 'Expert';
      case KnowledgeLevel.INTERMEDIATE: return 'Proficiente';
      default: return 'Aprendiz';
    }
  };

  const getLevelColor = (level: KnowledgeLevel) => {
    switch(level) {
      case KnowledgeLevel.ADVANCED: return 'text-amber-600 bg-amber-50 border-amber-200';
      case KnowledgeLevel.INTERMEDIATE: return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  const activeTicket = currentTicket || pendingTickets[0] || null;

  const smartRecommendationData = useMemo(() => {
    if (!activeTicket || !agents.length) return null;
    const available = agents.filter(a => a.isActive);
    if (!available.length) return null;

    const ticketSystem = settings.systemFieldId && activeTicket.customFields 
      ? String(activeTicket.customFields[settings.systemFieldId]).toLowerCase()
      : null;

    const ticketContent = (activeTicket.subject + ' ' + activeTicket.description).toLowerCase();

    const scoredAgents = available.map(agent => {
      let score = 0;
      let analysisInsights: Array<{source: string, match: string, level: number, points: number}> = [];
      const occupancyRate = agent.currentWorkload / agent.maxCapacity;
      score += (1 - occupancyRate) * 30;

      const agentExpertise = agent.expertise || [];
      if (ticketSystem) {
        const formMatch = agentExpertise.find(exp => exp.systemName.toLowerCase() === ticketSystem);
        if (formMatch) {
          analysisInsights.push({ source: 'Formulário', match: formMatch.systemName, level: formMatch.level, points: Math.round(formMatch.level * 13.3) });
          score += formMatch.level * 13.3;
        }
      }
      return { agent, score, analysisInsights, occupancyRate };
    });

    return scoredAgents.sort((a, b) => b.score - a.score)[0];
  }, [activeTicket, agents, settings]);

  const handleSmartAssign = async () => {
    if (!activeTicket || !smartRecommendationData) return;
    setIsAssigning(true);
    setTimeout(() => {
      const target = smartRecommendationData.agent;
      const newAgents = agents.map(a => a.id === target.id ? { ...a, currentWorkload: a.currentWorkload + 1 } : a);
      onUpdateAgents(newAgents);
      const log: AssignmentLog = {
        id: Date.now().toString(), ticketId: activeTicket.id, agentName: target.name, timestamp: Date.now(),
        reason: "IA Smart Match", type: 'manual', score: Math.round(smartRecommendationData.score)
      };
      onAssignSuccess(activeTicket.tags[0] || 'geral', target.id, log);
      setPendingTickets(prev => prev.filter(t => t.id !== activeTicket.id));
      setIsAssigning(false);
    }, 800);
  };

  const chartData = agents.map(a => ({
    name: a.name.split(' ')[0],
    carga: a.currentWorkload,
    percentual: (a.currentWorkload / a.maxCapacity) * 100
  }));

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {error && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-amber-700 text-xs font-bold">
          <i className="bi bi-exclamation-triangle-fill"></i>
          Aviso: O navegador pode estar bloqueando a conexão direta com o Zendesk (CORS). No ambiente Render, use dados locais para teste.
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <i className="bi bi-cpu-fill text-magalu text-xl"></i>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Fila Real do Zendesk</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border">View ID: {settings.queueId}</span>
        </div>
        <div className="max-h-40 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100">
              {pendingTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-bold text-slate-500 w-24">#{ticket.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-700">{ticket.subject}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {ticket.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-bold">#{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold text-slate-800">Match Inteligente</span>
              {smartRecommendationData && <span className="text-2xl font-black text-magalu">{Math.round(smartRecommendationData.score)}%</span>}
            </div>
            {smartRecommendationData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                  <div className="w-8 h-8 rounded-full bg-magalu text-white flex items-center justify-center font-bold text-xs">{smartRecommendationData.agent.name.charAt(0)}</div>
                  <div className="text-sm font-bold text-slate-700">{smartRecommendationData.agent.name}</div>
                </div>
              </div>
            ) : <div className="py-10 text-center text-slate-300">Sem recomendações.</div>}
          </div>
          <button onClick={handleSmartAssign} disabled={isAssigning || !smartRecommendationData} className="w-full mt-8 py-3 rounded-xl font-bold text-white bg-magalu disabled:opacity-50">
            {isAssigning ? 'Atribuindo...' : 'Confirmar Atribuição'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[300px]">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Carga Operacional</h2>
          <div className="h-64">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="carga" radius={[4, 4, 0, 0]} barSize={30}>
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
    </div>
  );
};

export default Dashboard;
