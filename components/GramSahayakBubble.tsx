import React, { useState, useEffect } from 'react';
import { Sparkles, X, MessageSquare, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface GramSahayakBubbleProps {
    user: any;
    onOpenChat: () => void;
}

export const GramSahayakBubble: React.FC<GramSahayakBubbleProps> = ({ user, onOpenChat }) => {
    const [insight, setInsight] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        fetchInsight();

        // Refresh insight every 2 minutes
        const interval = setInterval(fetchInsight, 120000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    const fetchInsight = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/ai/insights`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.insight) {
                setInsight(data.insight);
            }
        } catch (error) {
            console.error('Fetch insight error:', error);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 right-4 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            {/* Proactive Insight Toast */}
            {insight && !isMenuOpen && (
                <div className="animate-slide-up pointer-events-auto bg-[var(--bg-elevated)] border border-[var(--border-glow)] rounded-2xl p-3 pr-8 shadow-2xl max-w-[240px] relative">
                    <button
                        onClick={() => setInsight(null)}
                        className="absolute top-1 right-1 p-1 opacity-50 hover:opacity-100"
                        title="Close Insight"
                    >
                        <X size={12} />
                    </button>
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={12} className="text-[var(--accent-primary)]" />
                        </div>
                        <p className="text-[11px] leading-tight text-[var(--text-primary)]">
                            {insight}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Bubble */}
            <div className="pointer-events-auto flex flex-col items-end">
                {isMenuOpen && (
                    <div className="mb-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-2 shadow-2xl min-w-[200px] animate-fade-in origin-bottom-right">
                        <button
                            onClick={onOpenChat}
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} className="text-[var(--accent-primary)]" />
                                <span className="text-sm font-semibold">Talk to Sahayak</span>
                            </div>
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-whisk-float transition-all duration-500 relative group
                                ${isMenuOpen ? 'bg-[var(--bg-elevated)] rotate-90' : 'bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]'}`}
                >
                    {/* Pulsing Atmosphere */}
                    {!isMenuOpen && (
                        <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)] animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
                    )}

                    {isMenuOpen ? (
                        <X size={24} className="text-[var(--text-primary)]" />
                    ) : (
                        <Sparkles size={28} className="text-[var(--bg-void)] drop-shadow-lg" />
                    )}
                </button>
            </div>

            <style>{`
                .animate-slide-up {
                    animation: sahayakSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in {
                    animation: sahayakFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes sahayakSlideUp {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes sahayakFadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
