
import React, { useState, useMemo } from 'react';
import { Agent, KnowledgeLevel, SystemExpertise } from '../types';

interface SkillsMatrixProps {
  agents: Agent[];
  onUpdateAgents: (agents: Agent[]) => void;
}

const SkillsMatrix: React.FC<SkillsMatrixProps> = ({ agents, onUpdateAgents }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [newSys, setNewSys] = useState('');
  const [newLevel, setNewLevel] = useState<KnowledgeLevel>(KnowledgeLevel.BASIC);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const isBulkMode = bulkSelectedIds.length > 1;

  // Filtragem de agentes baseada na busca
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  // Lógica de Sugestão Inteligente Aprimorada
  const teamInsight = useMemo(() => {
    if (!newSys.trim() || newSys.length < 2) return null;

    const relevantExpertise = agents
      .flatMap(a => a.expertise || [])
      .filter(e => e.systemName.toLowerCase().trim() === newSys.toLowerCase().trim());

    if (relevantExpertise.length === 0) return null;

    const sum = relevantExpertise.reduce((acc, curr) => acc + curr.level, 0);
    const average = Math.round(sum / relevantExpertise.length) as KnowledgeLevel;
    
    const levelLabel = average === KnowledgeLevel.ADVANCED ? 'Avançado' : 
                       average === KnowledgeLevel.INTERMEDIATE ? 'Intermediário' : 'Básico';

    return { level: average, label: levelLabel, count: relevantExpertise.length };
  }, [newSys, agents]);

  const handleToggleBulk = (id: number) => {
    setBulkSelectedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      // Sincroniza o selectedAgentId para visualização se for o único
      if (next.length === 1) setSelectedAgentId(next[0]);
      else if (next.length === 0) setSelectedAgentId(null);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (bulkSelectedIds.length === filteredAgents.length) {
      setBulkSelectedIds([]);
      setSelectedAgentId(null);
    } else {
      const allIds = filteredAgents.map(a => a.id);
      setBulkSelectedIds(allIds);
      setSelectedAgentId(allIds[0]);
    }
  };

  const handleAddExpertise = () => {
    if (!newSys.trim()) return;

    const targetIds = bulkSelectedIds.length > 0 ? bulkSelectedIds : (selectedAgentId ? [selectedAgentId] : []);
    if (targetIds.length === 0) return;

    const updatedAgents = agents.map(agent => {
      if (targetIds.includes(agent.id)) {
        const updatedExpertise = [...(agent.expertise || [])];
        const existingIndex = updatedExpertise.findIndex(e => e.systemName.toLowerCase() === newSys.toLowerCase());
        
        if (existingIndex >= 0) {
          updatedExpertise[existingIndex].level = newLevel;
        } else {
          updatedExpertise.push({ systemName: newSys.trim(), level: newLevel });
        }
        return { ...agent, expertise: updatedExpertise };
      }
      return agent;
    });
    
    onUpdateAgents(updatedAgents);
    setNewSys('');
    setNewLevel(KnowledgeLevel.BASIC);
    if (targetIds.length > 1) {
       alert(`Sucesso! Competência "${newSys}" aplicada a ${targetIds.length} analistas.`);
       setBulkSelectedIds([]);
       setSelectedAgentId(null);
    }
  };

  const handleRemoveExpertise = (sysName: string) => {
    if (!selectedAgent) return;
    const updatedExpertise = (selectedAgent.expertise || []).filter(e => e.systemName !== sysName);
    const updatedAgents = agents.map(a => 
      a.id === selectedAgentId ? { ...a, expertise: updatedExpertise } : a
    );
    onUpdateAgents(updatedAgents);
  };

  const applySuggestion = () => {
    if (teamInsight) {
      setNewLevel(teamInsight.level);
    }
  };

  const getLevelBadge = (level: KnowledgeLevel) => {
    switch(level) {
      case KnowledgeLevel.ADVANCED: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case KnowledgeLevel.INTERMEDIATE: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-magalu text-white rounded-2xl flex items-center justify-center shadow-lg shadow-magalu/20">
               <i className="bi bi-diagram-3-fill text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Matriz de Conhecimento</h2>
              <p className="text-sm text-slate-500 font-medium">Calibração técnica e gestão de competências da equipe.</p>
            </div>
          </div>
          
          {bulkSelectedIds.length > 0 && (
            <div className="flex items-center gap-4 bg-magalu/5 px-4 py-2 rounded-xl border border-magalu/20 animate-slideDown">
              <span className="text-xs font-bold text-magalu uppercase tracking-widest">
                {bulkSelectedIds.length} Analistas Selecionados
              </span>
              <button 
                onClick={() => { setBulkSelectedIds([]); setSelectedAgentId(null); }}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Listagem de Agentes com Busca e Multi-seleção */}
          <div className="md:col-span-1 border-r border-slate-100 pr-4 flex flex-col h-[650px]">
            <div className="mb-4 space-y-3">
              <div className="relative group">
                <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-magalu transition-colors"></i>
                <input 
                  type="text" 
                  placeholder="Buscar analista..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-magalu/10 focus:border-magalu outline-none transition-all"
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <button 
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-magalu hover:underline uppercase tracking-tight"
                >
                  {bulkSelectedIds.length === filteredAgents.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {filteredAgents.length} Analistas
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredAgents.map(agent => (
                <div
                  key={agent.id}
                  className={`group relative flex items-center p-1 rounded-2xl transition-all border-2 ${
                    bulkSelectedIds.includes(agent.id) || selectedAgentId === agent.id 
                    ? 'bg-magalu/5 border-magalu/30' 
                    : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="px-3">
                    <input 
                      type="checkbox"
                      checked={bulkSelectedIds.includes(agent.id)}
                      onChange={() => handleToggleBulk(agent.id)}
                      className="w-4 h-4 rounded border-slate-300 text-magalu focus:ring-magalu cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      if (!bulkSelectedIds.includes(agent.id)) setBulkSelectedIds([]);
                    }}
                    className="flex-1 text-left py-3 pr-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-700 text-sm truncate pr-2">{agent.name}</div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${agent.isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-200'}`}></div>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-1 truncate">
                      {agent.email}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes e Edição em Massa */}
          <div className="md:col-span-2">
            {(selectedAgent || bulkSelectedIds.length > 1) ? (
              <div className="space-y-8 animate-fadeIn">
                <div className={`p-6 rounded-2xl border-2 shadow-sm transition-all ${
                  isBulkMode ? 'bg-magalu/5 border-magalu/20' : 'bg-white border-slate-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                      <i className={`bi ${isBulkMode ? 'bi-people-fill text-magalu' : 'bi-plus-circle-fill text-magalu'}`}></i>
                      {isBulkMode ? `Atualização Coletiva (${bulkSelectedIds.length} analistas)` : 'Novo Mapeamento de Sistema'}
                    </h3>
                  </div>
                  
                  {teamInsight && (
                    <div className="mb-6 p-4 bg-white border border-magalu/20 rounded-2xl animate-slideDown flex items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-magalu text-white rounded-xl flex items-center justify-center shadow-md">
                          <i className="bi bi-stars"></i>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-magalu uppercase tracking-wider">Sugestão de Nível</p>
                          <p className="text-sm text-slate-700 leading-tight">
                            Média da equipe para <span className="font-bold">{newSys}</span> é <span className="text-magalu font-bold">{teamInsight.label}</span>.
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={applySuggestion}
                        className="bg-magalu text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-magalu/20 hover:brightness-95 active:scale-95 transition-all whitespace-nowrap"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Sistema / Tag</label>
                      <input 
                        type="text" placeholder="Ex: WMS, MagaluPay..." value={newSys}
                        onChange={e => setNewSys(e.target.value)}
                        className="w-full text-sm border-2 border-slate-100 rounded-xl px-4 py-3 focus:ring-4 focus:ring-magalu/10 focus:border-magalu outline-none transition-all bg-white"
                      />
                    </div>
                    <div className="sm:w-48">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Expertise</label>
                      <select 
                        value={newLevel} onChange={e => setNewLevel(Number(e.target.value))}
                        className="w-full text-sm border-2 border-slate-100 rounded-xl px-4 py-3 bg-white outline-none focus:border-magalu transition-all font-medium"
                      >
                        <option value={KnowledgeLevel.BASIC}>Básico (Lvl 1)</option>
                        <option value={KnowledgeLevel.INTERMEDIATE}>Intermediário (Lvl 2)</option>
                        <option value={KnowledgeLevel.ADVANCED}>Avançado (Lvl 3)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={handleAddExpertise} 
                        disabled={!newSys.trim()}
                        className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-sm font-bold shadow-xl transition-all ${
                          isBulkMode ? 'bg-magalu text-white hover:brightness-90' : 'bg-slate-900 text-white hover:bg-slate-800'
                        } disabled:opacity-50`}
                      >
                        {isBulkMode ? 'Aplicar em Massa' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                </div>

                {!isBulkMode && selectedAgent && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expertise de {selectedAgent.name.split(' ')[0]}</h4>
                      <span className="text-[10px] font-bold text-slate-400">{(selectedAgent.expertise || []).length} Sistemas</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(selectedAgent.expertise || []).map((exp, idx) => (
                        <div key={idx} className="group flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-50 hover:border-magalu/30 hover:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-10 rounded-full ${
                               exp.level === KnowledgeLevel.ADVANCED ? 'bg-yellow-400' : 
                               exp.level === KnowledgeLevel.INTERMEDIATE ? 'bg-blue-400' : 'bg-slate-300'
                            }`}></div>
                            <div>
                              <div className="text-sm font-bold text-slate-800 uppercase leading-tight">{exp.systemName}</div>
                              <div className={`text-[9px] font-black px-2 py-0.5 mt-1.5 rounded-lg border uppercase tracking-wider ${getLevelBadge(exp.level)}`}>
                                {exp.level === 3 ? 'Expert' : exp.level === 2 ? 'Proficiente' : 'Aprendiz'}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveExpertise(exp.systemName)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all p-2.5 rounded-xl"
                          >
                            <i className="bi bi-trash3-fill"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isBulkMode && (
                  <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-magalu shadow-sm">
                      <i className="bi bi-lightning-charge-fill text-3xl"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-600">Modo de Edição Rápida Ativo</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      A competência definida acima será adicionada ou atualizada em todos os analistas selecionados simultaneamente.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                  <i className="bi bi-person-bounding-box text-5xl text-slate-200"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-400">Gestão de Competências</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
                  Selecione um ou mais analistas para definir seus níveis de expertise técnica.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
