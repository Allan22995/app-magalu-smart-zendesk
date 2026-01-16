
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

  useEffect(() => {
    setIsMounted(true);
    const loadTickets = async () => {
      if (settings.apiToken && settings.email && settings.queueId) {
        setIsLoading(true);
        const tickets = await ZendeskService.fetchTicketsFromView(settings);
        setPendingTickets(tickets);
        setIsLoading(false);
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
      let loadScore = (1 - occupancyRate) * 30;
      score += loadScore;

      let techScore = 0;
      const agentExpertise = agent.expertise || [];

      if (ticketSystem) {
        const formMatch = agentExpertise.find(exp => exp.systemName.toLowerCase() === ticketSystem);
        if (formMatch) {
          const pts = formMatch.level * 13.3;
          techScore += pts;
          analysisInsights.push({ source: 'Formulário', match: formMatch.systemName, level: formMatch.level, points: Math.round(pts) });
        }
      }

      agentExpertise.forEach(exp => {
        if (ticketContent.includes(exp.systemName.toLowerCase())) {
          const isDuplicate = analysisInsights.some(i => i.match === exp.systemName && i.source === 'Formulário');
          const pts = isDuplicate ? 5 : (exp.level * 8.3);
          techScore += pts;
          if (!isDuplicate) {
            analysisInsights.push({ source: 'Conteúdo (Título/Desc)', match: exp.systemName, level: exp.level, points: Math.round(pts) });
          }
        }
      });

      activeTicket.tags.forEach(tag => {
        const tagMatch = agentExpertise.find(exp => exp.systemName.toLowerCase() === tag.toLowerCase());
        if (tagMatch) {
          const isDuplicate = analysisInsights.some(i => i.match === tagMatch.systemName);
          const pts = isDuplicate ? 2 : (tagMatch.level * 5);
          techScore += pts;
          if (!isDuplicate) {
            analysisInsights.push({ source: 'Tags do Ticket', match: tagMatch.systemName, level: tagMatch.level, points: Math.round(pts) });
          }
        }
      });

      score += Math.min(techScore, 70);
      return { agent, score, analysisInsights, occupancyRate };
    });

    return scoredAgents.sort((a, b) => b.score - a.score)[0];
  }, [activeTicket, agents, memory, settings]);

  const handleSmartAssign = async () => {
    if (!activeTicket || !smartRecommendationData) return;
    setIsAssigning(true);
    const target = smartRecommendationData.agent;
    
    setTimeout(() => {
      const newAgents = agents.map(a => a.id === target.id ? { ...a, currentWorkload: a.currentWorkload + 1 } : a);
      onUpdateAgents(newAgents);
      const log: AssignmentLog = {
        id: Date.now().toString(),
        ticketId: activeTicket.id,
        agentName: target.name,
        timestamp: Date.now(),
        reason: `Análise Inteligente: ${smartRecommendationData.analysisInsights.map(i => `${i.source} (${i.match})`).join(' | ')}`,
        type: settings.isAutopilotEnabled ? 'autopilot' : 'manual',
        score: Math.round(smartRecommendationData.score)
      };
      activeTicket.tags.forEach(tag => onAssignSuccess(tag, target.id, log));
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <i className="bi bi-cpu-fill text-magalu text-xl"></i>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Fila Real do Zendesk</h3>
          </div>
          {isLoading ? (
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 border-2 border-magalu border-t-transparent rounded-full animate-spin"></div> Carregando View...
             </div>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border">Zendesk ID: {settings.queueId}</span>
          )}
        </div>
        <div className="max-h-40 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100">
              {pendingTickets.length === 0 && !isLoading && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Nenhum ticket pendente na view configurada.</td></tr>
              )}
              {pendingTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="px-6 py-3 font-bold text-slate-500 w-24">#{ticket.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-700">{ticket.subject}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-md">{ticket.description}</div>
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-slate-100 flex flex-col justify-between transition-all hover:border-magalu/20">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-magalu uppercase tracking-widest">Recomendação Deep Analysis</span>
                <span className="text-lg font-bold text-slate-800">Match Semântico</span>
              </div>
              {smartRecommendationData && (
                <div className="text-right">
                  <span className="text-2xl font-black text-magalu">{Math.round(smartRecommendationData.score)}%</span>
                  <div className="text-[8px] font-bold text-slate-400 uppercase">Match Score</div>
                </div>
              )}
            </div>

            {smartRecommendationData ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-magalu text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {smartRecommendationData.agent.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 leading-none">{smartRecommendationData.agent.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-bold">MELHOR DISPONIBILIDADE TÉCNICA</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <i className="bi bi-shield-check"></i> Evidências da IA
                  </h5>
                  <div className="space-y-2">
                    {smartRecommendationData.analysisInsights.map((insight, i) => (
                      <div key={i} className="flex flex-col gap-1 p-3 bg-white border border-slate-100 rounded-xl shadow-sm relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-magalu uppercase">{insight.source}</span>
                          <span className="text-[9px] font-bold text-slate-400">+{insight.points}pts</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-slate-700">{insight.match}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${getLevelColor(insight.level)}`}>
                            {getLevelLabel(insight.level)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-300">
                <i className="bi bi-stars text-5xl mb-4 block opacity-10"></i>
                <p className="text-xs font-medium uppercase tracking-widest leading-relaxed">
                  Sem tickets para analisar.<br/>Verifique sua view.
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={handleSmartAssign}
            disabled={isAssigning || !smartRecommendationData}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-magalu hover:brightness-95 transition-all shadow-lg shadow-magalu/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAssigning ? 'Atribuindo...' : 'Confirmar Atribuição'}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Carga Operacional Squad</h2>
              <p className="text-xs text-slate-400">Capacidade sincronizada do Zendesk.</p>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="carga" radius={[8, 8, 0, 0]} barSize={40}>
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.percentual >= threshold ? '#ef4444' : '#f60040'} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Total de Agentes</span>
              <span className="text-lg font-bold text-slate-700">{agents.length}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Média Carga</span>
              <span className="text-lg font-bold text-slate-700">
                {agents.length ? Math.round(agents.reduce((acc, a) => acc + a.currentWorkload, 0) / agents.length) : 0}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tickets na Fila</span>
              <span className="text-lg font-bold text-slate-700">{pendingTickets.length}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Status Global</span>
              <span className="text-lg font-bold text-green-500">Saudável</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
