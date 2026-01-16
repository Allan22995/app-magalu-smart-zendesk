
import React, { useState, useEffect, useCallback } from 'react';
import { Agent, Ticket, AppSettings, TicketPriority, AssignmentMemory, AssignmentLog } from './types';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SkillsMatrix from './components/SkillsMatrix';
import OperationalQueue from './components/OperationalQueue';
import { StorageService } from './services/StorageService';
import { ZendeskService } from './services/ZendeskService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'history' | 'skills' | 'queue'>('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memory, setMemory] = useState<AssignmentMemory[]>([]);
  const [logs, setLogs] = useState<AssignmentLog[]>([]);
  
  // Credenciais fixas conforme solicitado
  const [settings, setSettings] = useState<AppSettings>({
    subdomain: 'luizalabs', // Ajustado para o subdomínio padrão do labs se necessário, ou mantenha opsmagalu
    apiToken: 'MgqbK3ah4XBOcAJOiMXgFU9O2gYJqA2HHeSHhhL5',
    email: 'alan.rosa@luizalabs.com',
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
    description: 'O cliente relata que ao tentar finalizar a compra utilizando o saldo MagaluPay, o sistema retorna erro 500.',
    priority: TicketPriority.URGENT,
    tags: ['checkout', 'financeiro', 'api_error'],
    status: 'open',
    customFields: {
      'system_field': 'MagaluPay'
    }
  });

  const loadData = useCallback(async () => {
    // Tenta carregar do storage primeiro para manter expertises salvas localmente
    const savedAgents = await StorageService.loadAgents();
    const savedSettings = await StorageService.loadSettings();
    const savedMemory = localStorage.getItem('magalu_ai_memory');
    const savedLogs = localStorage.getItem('magalu_ai_logs');
    
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }

    // Busca agentes reais do Zendesk usando as credenciais fixas
    try {
      const realAgents = await ZendeskService.fetchAgents(settings);
      if (realAgents.length > 0) {
        // Mescla expertises salvas anteriormente com os novos dados dos agentes
        const mergedAgents = realAgents.map(ra => {
          const found = savedAgents.find(sa => sa.id === ra.id);
          return found ? { ...ra, expertise: found.expertise || [] } : ra;
        });
        setAgents(mergedAgents);
        StorageService.saveAgents(mergedAgents);
      } else if (savedAgents.length > 0) {
        setAgents(savedAgents);
      }
    } catch (error) {
      console.error("Erro na sincronização inicial:", error);
      if (savedAgents.length > 0) setAgents(savedAgents);
    }

    if (savedMemory) setMemory(JSON.parse(savedMemory));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, [settings]);

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateAgents = (newAgents: Agent[]) => {
    setAgents(newAgents);
    StorageService.saveAgents(newAgents);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
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
                      <h2 className="text-xl font-bold text-slate-800">Histórico</h2>
                      <p className="text-sm text-slate-500">Log de ações da inteligência Magalu.</p>
                    </div>
                  </div>
                  {logs.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 italic">Nenhum registro.</div>
                  ) : (
                    <div className="space-y-4">
                      {logs.map(log => (
                        <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-magalu uppercase mb-1">TICKET #{log.ticketId}</div>
                            <div className="text-sm font-bold text-slate-700">Para {log.agentName}</div>
                          </div>
                          <div className="text-right">
                             <div className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${log.type === 'autopilot' ? 'bg-magalu text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {log.type}
                             </div>
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
