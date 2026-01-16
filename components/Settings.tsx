
import React, { useState } from 'react';
import { AppSettings, Agent } from '../types';
import { ZendeskService } from '../services/ZendeskService';

interface SettingsProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onSyncAgents: (agents: Agent[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onSyncAgents }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [newGroupId, setNewGroupId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestConnection = async () => {
    setIsValidating(true);
    setConnectionStatus('idle');
    try {
      const isValid = await ZendeskService.validateCredentials(formData);
      setConnectionStatus(isValid ? 'success' : 'error');
      if (isValid) onSave(formData);
    } catch (e) {
      setConnectionStatus('error');
    } finally {
      setIsValidating(false);
    }
  };

  const addGroupId = () => {
    if (newGroupId.trim() && !formData.allowedGroupIds.includes(newGroupId.trim())) {
      setFormData({
        ...formData,
        allowedGroupIds: [...formData.allowedGroupIds, newGroupId.trim()]
      });
      setNewGroupId('');
    }
  };

  const removeGroupId = (id: string) => {
    setFormData({
      ...formData,
      allowedGroupIds: formData.allowedGroupIds.filter(g => g !== id)
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-magalu/10 text-magalu rounded-xl flex items-center justify-center">
              <i className="bi bi-shield-lock-fill text-2xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Conexão Zendesk</h2>
              <p className="text-sm text-slate-500">Insira suas credenciais para habilitar a inteligência operacional.</p>
            </div>
          </div>
          {connectionStatus === 'success' && (
            <span className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200 animate-bounce">
              <i className="bi bi-check-circle-fill"></i> Conectado
            </span>
          )}
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i className="bi bi-key-fill text-magalu"></i> Credenciais de API
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail do Administrador</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-magalu outline-none"
                  placeholder="admin@magalu.com.br"
                />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zendesk API Token</label>
                <div className="relative">
                  <input 
                    type={showToken ? "text" : "password"}
                    value={formData.apiToken}
                    onChange={e => setFormData({...formData, apiToken: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-magalu outline-none pr-10"
                    placeholder="Seu token de API"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-magalu"
                  >
                    <i className={`bi ${showToken ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleTestConnection}
              disabled={isValidating || !formData.apiToken || !formData.email}
              className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                connectionStatus === 'success' 
                ? 'bg-green-500 border-green-500 text-white' 
                : connectionStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-slate-200 text-slate-600 hover:border-magalu hover:text-magalu'
              }`}
            >
              {isValidating ? (
                <> <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Validando... </>
              ) : connectionStatus === 'success' ? (
                <> <i className="bi bi-check2-all"></i> Conexão Validada! </>
              ) : connectionStatus === 'error' ? (
                <> <i className="bi bi-exclamation-triangle"></i> Falha na Conexão. Tente novamente. </>
              ) : (
                <> <i className="bi bi-plug-fill"></i> Testar e Salvar Credenciais </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subdomínio Magalu</label>
              <div className="flex items-center">
                <input 
                  type="text" value={formData.subdomain}
                  onChange={e => setFormData({...formData, subdomain: e.target.value})}
                  className="flex-1 bg-white border border-slate-200 rounded-l-lg px-4 py-2 text-sm focus:border-magalu outline-none"
                />
                <span className="bg-slate-100 border border-l-0 border-slate-200 px-3 py-2 rounded-r-lg text-sm text-slate-500">.zendesk.com</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID da View Operacional</label>
              <input 
                type="text" value={formData.queueId}
                onChange={e => setFormData({...formData, queueId: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-magalu outline-none"
                placeholder="Ex: 360175136834"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <i className="bi bi-people"></i> Grupos Autorizados
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" value={newGroupId}
                onChange={e => setNewGroupId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:border-magalu outline-none"
                placeholder="ID do Grupo"
              />
              <button 
                type="button" onClick={addGroupId}
                className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-700"
              >
                Vincular
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allowedGroupIds.map(id => (
                <div key={id} className="bg-white border border-magalu/20 text-magalu px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                  ID: {id}
                  <button type="button" onClick={() => removeGroupId(id)} className="hover:text-red-500">
                    <i className="bi bi-x-circle-fill"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
