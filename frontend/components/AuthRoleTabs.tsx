import React from 'react';
import { User, Shield, Store } from 'lucide-react';

export type AuthPortalRole = 'USER' | 'PROVIDER' | 'ADMIN';

interface AuthRoleTabsProps {
  activeRole: AuthPortalRole;
  onSelectRole: (role: AuthPortalRole) => void;
}

export const AuthRoleTabs: React.FC<AuthRoleTabsProps> = ({ activeRole, onSelectRole }) => {
  return (
    <div className="flex p-1.5 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg mb-6 w-full">
      <button
        type="button"
        onClick={() => onSelectRole('USER')}
        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          activeRole === 'USER'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <User size={14} />
        <span>Citizen</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectRole('PROVIDER')}
        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          activeRole === 'PROVIDER'
            ? 'bg-gradient-to-r from-amber-500 to-sienna-600 text-white shadow-md shadow-amber-500/20 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Store size={14} />
        <span>Provider</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectRole('ADMIN')}
        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
          activeRole === 'ADMIN'
            ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-500/20 scale-[1.02]'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Shield size={14} />
        <span>Admin</span>
      </button>
    </div>
  );
};
