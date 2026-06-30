import React, { useState } from 'react';
import { useTranslation, Language } from '../services/i18n';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
    const { language, setLanguage } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const languages: { code: Language; label: string; icon: string }[] = [
        { code: 'EN', label: 'English', icon: '🇬🇧' },
        { code: 'HI', label: 'हिन्दी', icon: '🇮🇳' },
        { code: 'BR', label: 'भोजपुरी', icon: '🌾' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    return (
        <div className="relative inline-block text-left z-[1000]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 border border-white/10 backdrop-blur-md text-white transition-all shadow-lg active:scale-95 font-medium text-xs md:text-sm"
            >
                <Globe className="w-4 h-4 text-brand-400 animate-pulse" />
                <span>{currentLang.icon} {currentLang.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Overlay to close on tap outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    
                    <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-1.5 z-50 animate-fade-in">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs md:text-sm font-semibold transition-colors hover:bg-white/5 ${lang.code === language ? 'text-brand-400 bg-white/5' : 'text-slate-300'}`}
                            >
                                <span className="text-base">{lang.icon}</span>
                                <span className="flex-grow">{lang.label}</span>
                                {lang.code === language && <Check className="w-4 h-4 text-brand-400" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
