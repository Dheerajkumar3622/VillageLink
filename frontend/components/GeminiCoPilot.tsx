/**
 * GeminiCoPilot — Gemini Cognitive Co-Pilot
 * A floating, morphing particle ring voice assistant for drivers.
 * Canvas-rendered particle ring + Web Speech API + AudioContext feedback.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

/* ─── Web Speech API type shim (not in default TS lib) ─── */
interface IWebSpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onresult: ((ev: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
    onerror: ((ev: Event) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

/* ─── Props ─── */
interface GeminiCoPilotProps {
    isActive: boolean;
    onToggle: () => void;
    currentSpeed?: number;
    currentStop?: string;
    nextStop?: string;
    aheadVehicles?: Array<{
        name?: string;
        distance?: number;
        capacity?: number;
        occupancy?: number;
    }>;
    parcels?: Array<{
        from: string;
        to: string;
        itemType?: string;
        price?: number;
    }>;
    routePath?: string[];
    earnings?: { today?: { total?: number } };
    lang?: 'EN' | 'HI';
}

/* ─── Types ─── */
type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Exchange {
    role: 'user' | 'gemini';
    text: string;
    ts: number;
}

/* ─── Particle Ring Config ─── */
const PARTICLE_COUNT = 60;
const RING_RADIUS = 58;
const RING_CX = 90;
const RING_CY = 90;

interface Particle {
    angle: number;
    speed: number;
    radius: number;
    hue: number;
    alpha: number;
    size: number;
}

function createParticles(): Particle[] {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (i / PARTICLE_COUNT) * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.002,
        radius: RING_RADIUS + (Math.random() - 0.5) * 8,
        hue: 190 + Math.random() * 20,
        alpha: 0.4 + Math.random() * 0.6,
        size: 1.2 + Math.random() * 1.8,
    }));
}

/* ─── Colour presets by state ─── */
const STATE_COLORS: Record<AssistantState, { hue: number; sat: number; speed: number }> = {
    idle: { hue: 190, sat: 80, speed: 1 },
    listening: { hue: 150, sat: 90, speed: 2.8 },
    processing: { hue: 270, sat: 85, speed: 2 },
    speaking: { hue: 42, sat: 95, speed: 1.5 },
};

/* ─── Audio helpers ─── */
function playChime(ctx: AudioContext, type: 'activate' | 'response') {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    if (type === 'activate') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else {
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.linearRampToValueAtTime(523.25, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
    }
}

/* ─── Quick‑action chips ─── */
const QUICK_ACTIONS = [
    { label: '🔍 Competitors ahead?', command: 'competitors ahead' },
    { label: '📦 Find return cargo', command: 'find return cargo' },
    { label: '🗺️ Route summary', command: 'route summary' },
    { label: '🌤️ Weather update', command: 'weather update' },
];

/* ─── Status labels ─── */
const STATUS_LABELS: Record<AssistantState, string> = {
    idle: 'Tap mic or ask a question…',
    listening: '🎙️ Listening…',
    processing: '⚡ Processing…',
    speaking: '🔊 Speaking…',
};

/* ────────────────────────── COMPONENT ────────────────────────── */
export const GeminiCoPilot: React.FC<GeminiCoPilotProps> = ({
    isActive,
    onToggle,
    aheadVehicles = [],
    parcels = [],
    routePath = [],
    earnings,
    currentStop,
    nextStop,
    lang = 'EN',
}) => {
    /* ── state ── */
    const [expanded, setExpanded] = useState(false);
    const [assistantState, setAssistantState] = useState<AssistantState>('idle');
    const [exchanges, setExchanges] = useState<Exchange[]>([]);

    /* ── refs ── */
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>(createParticles());
    const rafRef = useRef<number>(0);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const recognitionRef = useRef<IWebSpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

    /* ── lazy AudioContext ── */
    const getAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        return audioCtxRef.current;
    }, []);

    /* ─── LOCAL COMMAND PROCESSOR ─── */
    const processCommand = useCallback(
        (raw: string): string => {
            const q = raw.toLowerCase();

            if (/competitor|ahead|vehicle/i.test(q)) {
                if (!aheadVehicles.length) return 'No competitor vehicles detected ahead right now.';
                const lines = aheadVehicles.map((v, i) => {
                    const dist = v.distance ? `${v.distance} km` : '? km';
                    const occ =
                        v.occupancy !== undefined && v.capacity
                            ? `${Math.round((v.occupancy / v.capacity) * 100)}% full`
                            : '';
                    return `${i + 1}. ${v.name || 'Vehicle'} — ${dist} ahead ${occ ? '(' + occ + ')' : ''}`;
                });
                return `I see ${aheadVehicles.length} vehicle(s) ahead:\n${lines.join('\n')}`;
            }

            if (/cargo|parcel|return/i.test(q)) {
                if (!parcels.length) return 'No pending parcels in the system right now.';
                const best = [...parcels].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
                return `Best cargo: ${best.itemType || 'Package'} from ${best.from} → ${best.to}${
                    best.price ? ` at ₹${best.price}` : ''
                }. ${parcels.length} total parcels available.`;
            }

            if (/summary|route/i.test(q)) {
                if (!routePath.length) return 'Route data is not loaded yet.';
                const stops = routePath.slice(0, 5).join(' → ');
                const more = routePath.length > 5 ? ` …and ${routePath.length - 5} more stops` : '';
                return `Route: ${stops}${more}. ${
                    currentStop ? `Currently at ${currentStop}.` : ''
                } ${nextStop ? `Next: ${nextStop}.` : ''}`;
            }

            if (/earning|income|money|revenue/i.test(q)) {
                const total = earnings?.today?.total;
                return total !== undefined
                    ? `Today's earnings so far: ₹${total.toLocaleString('en-IN')}`
                    : "Earnings data isn't available right now.";
            }

            if (/weather/i.test(q)) {
                return "Current conditions look clear for the route ahead. I'll alert you if anything changes.";
            }

            return "I'm analysing the route. Try asking about competitors, cargo, route summary, or earnings.";
        },
        [aheadVehicles, parcels, routePath, earnings, currentStop, nextStop],
    );

    /* ─── SPEAK ─── */
    const speak = useCallback(
        (text: string) => {
            if (!('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
            utter.rate = 1.05;
            utter.pitch = 1.0;
            utter.onstart = () => setAssistantState('speaking');
            utter.onend = () => setAssistantState('idle');
            utter.onerror = () => setAssistantState('idle');
            synthRef.current = utter;
            window.speechSynthesis.speak(utter);
        },
        [lang],
    );

    /* ─── HANDLE FINAL TRANSCRIPT ─── */
    const handleTranscript = useCallback(
        (text: string) => {
            setExchanges((prev) => {
                const next = [...prev, { role: 'user' as const, text, ts: Date.now() }];
                return next.slice(-6);
            });
            setAssistantState('processing');

            setTimeout(() => {
                const reply = processCommand(text);
                setExchanges((prev) => {
                    const next = [...prev, { role: 'gemini' as const, text: reply, ts: Date.now() }];
                    return next.slice(-6);
                });
                try {
                    playChime(getAudioCtx(), 'response');
                } catch {
                    /* noop */
                }
                speak(reply);
            }, 600);
        },
        [processCommand, speak, getAudioCtx],
    );

    /* ─── START / STOP RECOGNITION ─── */
    const toggleListening = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any;
        const SpeechRec: (new () => IWebSpeechRecognition) | undefined =
            w.SpeechRecognition ?? w.webkitSpeechRecognition;

        if (!SpeechRec) {
            handleTranscript('voice not supported');
            return;
        }

        if (assistantState === 'listening') {
            recognitionRef.current?.stop();
            setAssistantState('idle');
            return;
        }

        window.speechSynthesis.cancel();
        const rec = new SpeechRec();
        rec.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        rec.onresult = (e) => {
            const transcript = e.results[0]?.[0]?.transcript ?? '';
            if (transcript) handleTranscript(transcript);
        };
        rec.onerror = () => setAssistantState('idle');
        rec.onend = () => {
            if (assistantState === 'listening') setAssistantState('idle');
        };

        recognitionRef.current = rec;
        try {
            playChime(getAudioCtx(), 'activate');
        } catch {
            /* noop */
        }
        rec.start();
        setAssistantState('listening');
    }, [assistantState, lang, handleTranscript, getAudioCtx]);

    /* ─── PARTICLE RING ANIMATION ─── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !expanded) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = 180 * dpr;
        canvas.height = 180 * dpr;
        ctx.scale(dpr, dpr);

        const particles = particlesRef.current;
        const stateConf = STATE_COLORS[assistantState];
        let frameTs = 0;

        const draw = (ts: number) => {
            const dt = ts - frameTs;
            frameTs = ts;
            ctx.clearRect(0, 0, 180, 180);

            /* outer glow */
            const grd = ctx.createRadialGradient(RING_CX, RING_CY, RING_RADIUS - 18, RING_CX, RING_CY, RING_RADIUS + 22);
            grd.addColorStop(0, `hsla(${stateConf.hue}, ${stateConf.sat}%, 55%, 0.00)`);
            grd.addColorStop(0.5, `hsla(${stateConf.hue}, ${stateConf.sat}%, 55%, 0.06)`);
            grd.addColorStop(1, `hsla(${stateConf.hue}, ${stateConf.sat}%, 55%, 0.00)`);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 180, 180);

            for (const p of particles) {
                /* morph toward target colour / speed */
                p.hue += (stateConf.hue - p.hue) * 0.02;
                p.speed += (0.003 * stateConf.speed - p.speed) * 0.03;

                p.angle += p.speed * (dt || 16) * 0.06;
                const wobble = Math.sin(p.angle * 3) * 3;
                const r = p.radius + wobble;
                const x = RING_CX + Math.cos(p.angle) * r;
                const y = RING_CY + Math.sin(p.angle) * r;

                /* pulse alpha when speaking */
                const alphaMultiplier =
                    assistantState === 'speaking' ? 0.5 + Math.sin(ts * 0.005 + p.angle) * 0.5 : 1;

                ctx.beginPath();
                ctx.arc(x, y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, ${stateConf.sat}%, 65%, ${p.alpha * alphaMultiplier})`;
                ctx.fill();

                /* tiny trail */
                ctx.beginPath();
                const tx = RING_CX + Math.cos(p.angle - p.speed * 8) * r;
                const ty = RING_CY + Math.sin(p.angle - p.speed * 8) * r;
                ctx.moveTo(tx, ty);
                ctx.lineTo(x, y);
                ctx.strokeStyle = `hsla(${p.hue}, ${stateConf.sat}%, 65%, ${p.alpha * 0.2 * alphaMultiplier})`;
                ctx.lineWidth = p.size * 0.5;
                ctx.stroke();
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(rafRef.current);
    }, [expanded, assistantState]);

    /* ─── Cleanup speech on unmount ─── */
    useEffect(
        () => () => {
            recognitionRef.current?.stop();
            window.speechSynthesis?.cancel();
        },
        [],
    );

    /* ─── Toggle expand/collapse ─── */
    const handleOrbClick = () => {
        if (!expanded) {
            setExpanded(true);
            if (!isActive) onToggle();
        } else {
            setExpanded(false);
        }
    };

    /* ─── last 3 exchanges (max 6 items → 3 pairs) ─── */
    const recentExchanges = exchanges.slice(-6);

    /* ────────────────── RENDER ────────────────── */
    return (
        <>
            {/* ── Injected keyframes ── */}
            <style>{`
                @keyframes gcop-pulse{0%,100%{transform:scale(1);box-shadow:0 0 12px 3px rgba(251,191,36,.35)}50%{transform:scale(1.12);box-shadow:0 0 24px 8px rgba(251,146,60,.55)}}
                @keyframes gcop-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
                @keyframes gcop-mic-pulse{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.5)}70%{box-shadow:0 0 0 14px rgba(251,191,36,0)}}
                @keyframes gcop-slide-up{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
                @keyframes gcop-chip-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
            `}</style>

            {/* ── Floating Orb (collapsed) ── */}
            {!expanded && (
                <button
                    onClick={handleOrbClick}
                    aria-label="Open Gemini Co-Pilot"
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 40,
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%)',
                        animation: 'gcop-pulse 2.5s ease-in-out infinite, gcop-float 3s ease-in-out infinite',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
                            fill="white"
                            opacity="0.95"
                        />
                    </svg>
                </button>
            )}

            {/* ── Expanded Panel ── */}
            {expanded && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 80,
                        right: 16,
                        zIndex: 41,
                        width: 380,
                        maxWidth: '90vw',
                        borderRadius: 32,
                        background: 'rgba(15, 15, 25, 0.82)',
                        backdropFilter: 'blur(28px) saturate(1.6)',
                        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow:
                            '0 24px 80px rgba(0,0,0,0.55), 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
                        animation: 'gcop-slide-up .35s cubic-bezier(.16,1,.3,1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '24px 20px 20px',
                        overflow: 'hidden',
                        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setExpanded(false)}
                        aria-label="Close Co-Pilot"
                        style={{
                            position: 'absolute',
                            top: 14,
                            right: 18,
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background .2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    >
                        ✕
                    </button>

                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8,
                            opacity: 0.85,
                        }}
                    >
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.04em' }}>
                            ✦ GEMINI CO-PILOT
                        </span>
                    </div>

                    {/* Particle Ring Canvas */}
                    <div style={{ position: 'relative', width: 180, height: 180 }}>
                        <canvas
                            ref={canvasRef}
                            style={{ width: 180, height: 180 }}
                        />
                        {/* Centre icon */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: 28,
                                opacity: 0.85,
                                pointerEvents: 'none',
                            }}
                        >
                            {assistantState === 'listening'
                                ? '🎧'
                                : assistantState === 'processing'
                                  ? '⚡'
                                  : assistantState === 'speaking'
                                    ? '🔊'
                                    : '✦'}
                        </div>
                    </div>

                    {/* Status text */}
                    <div
                        style={{
                            fontSize: 12,
                            color:
                                assistantState === 'listening'
                                    ? '#34d399'
                                    : assistantState === 'speaking'
                                      ? '#fbbf24'
                                      : 'rgba(255,255,255,0.45)',
                            marginTop: 2,
                            marginBottom: 12,
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            transition: 'color .3s',
                            textAlign: 'center',
                        }}
                    >
                        {STATUS_LABELS[assistantState]}
                    </div>

                    {/* Transcript area */}
                    {recentExchanges.length > 0 && (
                        <div
                            style={{
                                width: '100%',
                                maxHeight: 140,
                                overflowY: 'auto',
                                marginBottom: 12,
                                padding: '8px 10px',
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}
                        >
                            {recentExchanges.map((ex, i) => (
                                <div
                                    key={ex.ts + '-' + i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 6,
                                        fontSize: 11,
                                        lineHeight: 1.45,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 10,
                                            flexShrink: 0,
                                            marginTop: 1,
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background:
                                                ex.role === 'user'
                                                    ? 'rgba(59,130,246,0.2)'
                                                    : 'rgba(251,191,36,0.2)',
                                        }}
                                    >
                                        {ex.role === 'user' ? '🧑' : '✦'}
                                    </span>
                                    <span
                                        style={{
                                            color:
                                                ex.role === 'user'
                                                    ? 'rgba(255,255,255,0.7)'
                                                    : 'rgba(251,191,36,0.9)',
                                            whiteSpace: 'pre-wrap',
                                        }}
                                    >
                                        {ex.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Quick action chips */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                            justifyContent: 'center',
                            marginBottom: 14,
                            width: '100%',
                        }}
                    >
                        {QUICK_ACTIONS.map((qa, idx) => (
                            <button
                                key={qa.command}
                                onClick={() => handleTranscript(qa.command)}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 20,
                                    padding: '5px 12px',
                                    fontSize: 11,
                                    color: 'rgba(255,255,255,0.75)',
                                    cursor: 'pointer',
                                    transition: 'all .2s',
                                    animation: `gcop-chip-in .35s ${idx * 0.06}s both`,
                                    fontFamily: 'inherit',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(251,191,36,0.15)';
                                    e.currentTarget.style.borderColor = 'rgba(251,191,36,0.3)';
                                    e.currentTarget.style.color = '#fbbf24';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                                }}
                            >
                                {qa.label}
                            </button>
                        ))}
                    </div>

                    {/* Mic button */}
                    <button
                        onClick={toggleListening}
                        aria-label={assistantState === 'listening' ? 'Stop listening' : 'Start voice input'}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            background:
                                assistantState === 'listening'
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    : 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                            boxShadow:
                                assistantState === 'listening'
                                    ? '0 0 20px rgba(239,68,68,0.5)'
                                    : '0 4px 20px rgba(245,158,11,0.4)',
                            animation: assistantState === 'listening' ? 'gcop-mic-pulse 1.5s infinite' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background .3s, box-shadow .3s',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            {assistantState === 'listening' ? (
                                /* Stop icon */
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                            ) : (
                                /* Mic icon */
                                <>
                                    <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
                                    <path d="M19 11a7 7 0 0 1-14 0" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </>
                            )}
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
};

export default GeminiCoPilot;
