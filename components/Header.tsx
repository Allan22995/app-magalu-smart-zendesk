
import React from 'react';
import { Ticket, TicketPriority } from '../types';

interface HeaderProps {
  currentTicket: Ticket | null;
}

const Header: React.FC<HeaderProps> = ({ currentTicket }) => {
  const getPriorityColor = (p: TicketPriority) => {
    switch (p) {
      case TicketPriority.URGENT: return 'bg-red-100 text-red-700 border-red-200';
      case TicketPriority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
      case TicketPriority.NORMAL: return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <img src="https://logodownload.org/wp-content/uploads/2014/04/magazine-luiza-logo-0.png" alt="Magalu" className="h-8 w-auto" />
        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
        <h1 className="text-xl font-bold text-slate-800">Smart Assignment</h1>
      </div>

      {currentTicket && (
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none">Ticket Ativo</span>
            <span className="text-sm font-semibold text-slate-700">#{currentTicket.id}: {currentTicket.subject}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(currentTicket.priority)}`}>
            {currentTicket.priority.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="p-2 text-slate-400 hover:text-magalu transition-colors">
          <i className="bi bi-bell text-xl"></i>
        </button>
        <div className="h-10 w-10 bg-magalu rounded-full flex items-center justify-center text-white font-bold">
          ML
        </div>
      </div>
    </header>
  );
};

export default Header;
