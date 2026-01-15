import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, label, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative space-y-2" ref={wrapperRef}>
      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">{label}</label>
      <div 
        className="relative group cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 dark:text-neon-cyan transition-colors">
          {icon || <Search size={18} />}
        </div>
        <div className="w-full pl-12 pr-10 py-4 bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-700 rounded-xl text-lg font-medium shadow-sm hover:border-brand-400 dark:hover:border-neon-cyan/50 transition-all flex items-center justify-between backdrop-blur-sm">
          <span className="truncate text-slate-700 dark:text-white">{value || "Select Stop"}</span>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-2 sticky top-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              placeholder="Search stop..."
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option}
                  className={`px-4 py-3 cursor-pointer transition-colors text-sm font-medium ${
                    option === value 
                      ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-400 italic text-center">No stops found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};