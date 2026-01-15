
import React from 'react';
import { Home, Ticket, Package, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: 'HOME' | 'PASSES' | 'LOGISTICS' | 'PROFILE') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'PASSES', label: 'My Passes', icon: Ticket },
    { id: 'LOGISTICS', label: 'Parcels', icon: Package },
    { id: 'PROFILE', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-end max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as any)}
              className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${isActive ? '-translate-y-2' : ''}`}
            >
              <div className={`p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'text-brand-600 dark:text-brand-400 scale-100' : 'text-slate-400 scale-0 h-0 opacity-0'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
