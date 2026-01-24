/**
 * ScratchCard - V5 Interactive Reward Component
 * Psychology-driven "Variable Rewards" (Dopamine Loop)
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Trophy, Sparkles } from 'lucide-react';

interface ScratchCardProps {
    onClose: () => void;
    onClaim: (reward: string) => void;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({ onClose, onClaim }) => {
    const [isScratched, setIsScratched] = useState(false);
    const [scratchedPercent, setScratchedPercent] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const prize = "₹50 Wallet Credit";

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill with scratchable pattern
        ctx.fillStyle = '#475569'; // Slate-600
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add texture/text
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 + 5);

        // Add some "metallic" lines
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.stroke();
        }
    }, []);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || isScratched) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Check completion
        setScratchedPercent(prev => {
            const next = prev + 1;
            if (next > 40) setIsScratched(true);
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[40px] p-8 relative overflow-hidden shadow-2xl">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors" title="Close Mystery Reward">
                    <X size={24} />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
                        <Trophy size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Mystery Reward</h2>
                    <p className="text-sm text-slate-500 font-medium">Daily dopamine boost for our loyal villagers</p>
                </div>

                <div className="relative aspect-video bg-indigo-950/30 rounded-3xl border-2 border-dashed border-indigo-500/30 flex flex-col items-center justify-center overflow-hidden group">
                    {/* Prize Reveal */}
                    <div className="text-center animate-bounce">
                        <Sparkles className="text-amber-400 mx-auto mb-2" size={32} />
                        <h3 className="text-3xl font-black text-white">{prize}</h3>
                    </div>

                    {!isScratched && (
                        <canvas
                            ref={canvasRef}
                            width={340}
                            height={190}
                            className="absolute inset-0 cursor-crosshair touch-none"
                            onMouseDown={() => setIsDrawing(true)}
                            onMouseUp={() => setIsDrawing(false)}
                            onMouseMove={handleMove}
                            onTouchStart={() => setIsDrawing(true)}
                            onTouchEnd={() => setIsDrawing(false)}
                            onTouchMove={handleMove}
                        />
                    )}
                </div>

                <div className="mt-8">
                    <button
                        onClick={() => onClaim(prize)}
                        disabled={!isScratched}
                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-glow-md ${isScratched ? 'bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
                    >
                        {isScratched ? 'Claim Reward' : 'Scratch to Reveal'}
                    </button>
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mt-4">Safe & Verified by VillageLink Infrastructure</p>
                </div>
            </div>
        </div>
    );
};

export default ScratchCard;
