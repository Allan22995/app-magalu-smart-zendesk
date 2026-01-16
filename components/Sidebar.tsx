
import React from 'react';

interface SidebarProps {
  activeTab: 'dashboard' | 'settings' | 'history' | 'skills' | 'queue';
  setActiveTab: (tab: 'dashboard' | 'settings' | 'history' | 'skills' | 'queue') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: 'bi-grid-1x2-fill', label: 'Painel' },
    { id: 'queue', icon: 'bi-kanban-fill', label: 'Fila Viva' },
    { id: 'skills', icon: 'bi-mortarboard-fill', label: 'Matriz' },
    { id: 'history', icon: 'bi-clock-history', label: 'Histórico' },
    { id: 'settings', icon: 'bi-gear-fill', label: 'Ajustes' },
  ] as const;

  return (
    <aside className="w-20 bg-slate-900 flex flex-col items-center py-8 gap-8 shadow-2xl">
      <div className="mb-4">
        <div className="w-10 h-10 bg-magalu rounded-xl flex items-center justify-center text-white shadow-lg shadow-magalu/20">
          <i className="bi bi-robot text-xl"></i>
        </div>
      </div>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`relative group flex flex-col items-center transition-all duration-300 ${
            activeTab === item.id ? 'text-magalu' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className={`p-3 rounded-xl transition-all ${
            activeTab === item.id ? 'bg-magalu/10 scale-110' : 'bg-transparent'
          }`}>
            <i className={`bi ${item.icon} text-2xl`}></i>
          </div>
          <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          {activeTab === item.id && (
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-magalu rounded-l-full"></div>
          )}
        </button>
      ))}
    </aside>
  );
};

export default Sidebar;
