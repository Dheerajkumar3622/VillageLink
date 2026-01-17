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
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Floating Glass Bar */}
      <div className="mx-auto max-w-sm mb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 dark:border-slate-700/50 p-2 pointer-events-auto">
        <div className="flex justify-between items-center relative">

          {/* Animated Background Blob - Moves to active tab */}
          <div className="absolute inset-0 px-2 flex items-center" aria-hidden="true">
            <div
              className="h-12 w-16 bg-gradient-to-tr from-brand-500 to-indigo-400 rounded-3xl shadow-glow-md transition-all duration-500 ease-out morphing-blob opacity-20 dark:opacity-40"
              style={{
                transform: `translateX(${navItems.findIndex(i => i.id === activeTab) * 100}%) translateX(10px)`
              }}
            />
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as any)}
                className={`relative z-10 flex-1 flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 group`}
              >
                <div
                  className={`p-2.5 rounded-full transition-all duration-500 ${isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/40 -translate-y-4 scale-110 ring-4 ring-white dark:ring-slate-900'
                      : 'text-slate-400 hover:text-brand-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-transform duration-300 ${isActive ? 'rotate-0' : 'group-hover:rotate-12'}`}
                  />
                </div>

                {/* Text Label - Fades in/up */}
                <span className={`absolute -bottom-1 text-[10px] font-bold transition-all duration-300 ${isActive
                    ? 'opacity-100 translate-y-0 text-brand-600 dark:text-brand-400 delay-100'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}>
                  {item.label}
                </span>

                {/* Active Dot */}
                {isActive && (
                  <span className="absolute -bottom-2 w-1 h-1 bg-brand-500 rounded-full animate-bounce delay-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
