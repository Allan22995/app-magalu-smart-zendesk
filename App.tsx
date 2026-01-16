
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Agent, Ticket, AppSettings, TicketPriority, AssignmentMemory, AssignmentLog } from './types';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SkillsMatrix from './components/SkillsMatrix';
import OperationalQueue from './components/OperationalQueue';
import { StorageService } from './services/StorageService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'history' | 'skills' | 'queue'>('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memory, setMemory] = useState<AssignmentMemory[]>([]);
  const [logs, setLogs] = useState<AssignmentLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    subdomain: 'opsmagalu',
    apiToken: '',
    email: '',
    defaultMaxCapacity: 8,
    autoAssignHighPriority: true,
    overloadThreshold: 80,
    isAutopilotEnabled: false,
    queueId: '360175136834',
    formId: '',
    systemFieldId: 'system_field',
    allowedGroupIds: []
  });
  
  const [currentTicket] = useState<Ticket | null>({
    id: '459203',
    subject: 'Falha crítica no sistema de Checkout MagaluPay',
    description: 'O cliente relata que ao tentar finalizar a compra utilizando o saldo MagaluPay, o sistema retorna erro 500. Verificamos os logs de checkout e parece ser uma instabilidade na API de finanças.',
    priority: TicketPriority.URGENT,
    tags: ['checkout', 'financeiro', 'api_error'],
    status: 'open',
    formId: '3600123',
    customFields: {
      'system_field': 'MagaluPay',
      'filial': 'Louveira CD 001'
    }
  });

  const loadData = useCallback(async () => {
    const savedAgents = await StorageService.loadAgents();
    const savedSettings = await StorageService.loadSettings();
    const savedMemory = localStorage.getItem('magalu_ai_memory');
    const savedLogs = localStorage.getItem('magalu_ai_logs');
    
    if (savedAgents.length > 0) setAgents(savedAgents);
    if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
    if (savedMemory) setMemory(JSON.parse(savedMemory));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateAgents = (newAgents: Agent[]) => {
    setAgents(newAgents);
    StorageService.saveAgents(newAgents);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
    // Aqui em uma aplicação real dispararíamos uma nova validação de token
  };

  const saveToMemory = (tag: string, agentId: number, log: AssignmentLog) => {
    const newMemory = [...memory];
    const index = newMemory.findIndex(m => m.tag === tag && m.agentId === agentId);
    if (index >= 0) {
      newMemory[index].successCount += 1;
    } else {
      newMemory.push({ tag, agentId, successCount: 1 });
    }
    setMemory(newMemory);
    localStorage.setItem('magalu_ai_memory', JSON.stringify(newMemory));

    const newLogs = [log, ...logs].slice(0, 100);
    setLogs(newLogs);
    localStorage.setItem('magalu_ai_logs', JSON.stringify(newLogs));
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentTicket={currentTicket} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <Dashboard 
              agents={agents} 
              currentTicket={currentTicket}
              settings={settings}
              onUpdateAgents={handleUpdateAgents}
              memory={memory}
              onAssignSuccess={saveToMemory}
            />
          )}
          {activeTab === 'queue' && (
            <OperationalQueue 
              settings={settings}
              agents={agents}
            />
          )}
          {activeTab === 'skills' && (
            <SkillsMatrix 
              agents={agents}
              onUpdateAgents={handleUpdateAgents}
            />
          )}
          {activeTab === 'settings' && (
            <Settings 
              settings={settings} 
              onSave={handleUpdateSettings}
              onSyncAgents={handleUpdateAgents}
            />
          )}
          {activeTab === 'history' && (
             <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <i className="bi bi-clock-history text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Histórico de Atribuições</h2>
                      <p className="text-sm text-slate-500">Últimas 100 ações realizadas pela IA ou Manualmente.</p>
                    </div>
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 italic">Nenhum registro encontrado.</div>
                  ) : (
                    <div className="space-y-4">
                      {logs.map(log => (
                        <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-magalu uppercase tracking-widest mb-1">TICKET #{log.ticketId}</div>
                            <div className="text-sm font-bold text-slate-700">Atribuído a {log.agentName}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{log.reason}</div>
                          </div>
                          <div className="text-right">
                             <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${log.type === 'autopilot' ? 'bg-magalu text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {log.type}
                             </div>
                             <div className="text-[10px] text-slate-400 mt-2">{new Date(log.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
