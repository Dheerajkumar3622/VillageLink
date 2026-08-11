import React, { useState, useEffect, useRef } from 'react';
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
    
    // Draggable position state
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const elementPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const hasDraggedRef = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1000);
        fetchInsight();

        // Default initial placement (bottom left)
        if (typeof window !== 'undefined') {
            const initialX = 20;
            const initialY = window.innerHeight - 170;
            setPosition({ x: initialX, y: Math.max(10, initialY) });
        }

        // Handle window resize to keep bubble inside viewport
        const handleResize = () => {
            setPosition(prev => {
                if (!prev) return null;
                const maxX = window.innerWidth - 70;
                const maxY = window.innerHeight - 70;
                return {
                    x: Math.min(Math.max(10, prev.x), maxX),
                    y: Math.min(Math.max(10, prev.y), maxY)
                };
            });
        };

        window.addEventListener('resize', handleResize);

        // Refresh insight every 2 minutes
        const interval = setInterval(fetchInsight, 120000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const fetchInsight = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/proactive-insight?role=DRIVER`).catch(() => null);
            if (res && res.ok) {
                const data = await res.json();
                if (data.insight) setInsight(data.insight);
            } else {
                setInsight("Gram Sahayak AI: Mandi price trend alert & route optimizations active.");
            }
        } catch {
            setInsight("Gram Sahayak AI: Mandi price trend alert & route optimizations active.");
        }
    };

    // Pointer Event Handlers for Free-Dragging Anywhere
    const handlePointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
        hasDraggedRef.current = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        elementPosRef.current = position || { x: 20, y: window.innerHeight - 170 };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasDraggedRef.current = true;
        }

        const newX = Math.min(Math.max(10, elementPosRef.current.x + dx), window.innerWidth - 70);
        const newY = Math.min(Math.max(10, elementPosRef.current.y + dy), window.innerHeight - 70);

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            setIsDragging(false);
        }
    };

    const handleButtonClick = () => {
        if (hasDraggedRef.current) return; // Prevent click trigger after drag
        setIsMenuOpen(!isMenuOpen);
    };

    if (!isVisible) return null;

    const isTopHalf = position ? position.y < window.innerHeight / 2 : false;

    return (
        <div 
            className="fixed z-[200] flex flex-col items-start gap-3 select-none touch-none"
            style={{
                left: position ? `${position.x}px` : '20px',
                top: position ? `${position.y}px` : 'auto',
                right: 'auto',
                bottom: position ? 'auto' : '96px',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
        >
            {/* Proactive Insight Toast */}
            {insight && !isMenuOpen && (
                <div className={`animate-slide-up pointer-events-auto bg-[var(--bg-elevated)] border border-[var(--border-glow)] rounded-2xl p-3 pr-8 shadow-2xl max-w-[240px] relative ${isTopHalf ? 'order-2' : 'order-1'}`}>
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
                        <p className="text-[11px] leading-tight text-[var(--text-primary)] font-medium">
                            {insight}
                        </p>
                    </div>
                </div>
            )}

            {/* Main Bubble & Dropdown Menu */}
            <div className={`pointer-events-auto flex flex-col items-end ${isTopHalf ? 'order-1' : 'order-2'}`}>
                {isMenuOpen && (
                    <div className={`bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-2 shadow-2xl min-w-[200px] animate-fade-in ${isTopHalf ? 'mt-2 mb-0 origin-top-right' : 'mb-2 origin-bottom-right'}`}>
                        <button
                            onClick={onOpenChat}
                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} className="text-[var(--accent-primary)]" />
                                <span className="text-sm font-semibold text-white">Talk to Sahayak</span>
                            </div>
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[var(--accent-primary)]" />
                        </button>
                    </div>
                )}

                <div className="relative group">
                    <button
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={handleButtonClick}
                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-whisk-float transition-transform duration-200 relative
                                    ${isDragging ? 'scale-110 shadow-2xl ring-4 ring-amber-400/50 cursor-grabbing' : 'active:scale-95 cursor-grab'}
                                    ${isMenuOpen ? 'bg-[var(--bg-elevated)] rotate-90' : 'bg-gradient-to-br from-[var(--accent-primary)] via-amber-500 to-[var(--accent-secondary)]'}`}
                        title="Hold & drag to move Sahayak anywhere"
                    >
                        {/* Pulsing Atmosphere */}
                        {!isMenuOpen && !isDragging && (
                            <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)] animate-ping opacity-20 group-hover:opacity-40 transition-opacity" />
                        )}

                        {isMenuOpen ? (
                            <X size={24} className="text-[var(--text-primary)]" />
                        ) : (
                            <Sparkles size={28} className="text-[var(--bg-void)] drop-shadow-lg" />
                        )}
                    </button>
                </div>
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
