import React, { useEffect, useRef, useCallback, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface InceptionGrid3DProps {
    stops: Array<{
        name: string;
        waitingPassengers?: number;
        parcels?: number;
        isCurrentStop?: boolean;
    }>;
    currentStopIndex: number;
    currentSpeed?: number;
    aheadVehicles?: Array<{
        id: string;
        name?: string;
        distance?: number;
        speed?: number;
        capacity?: number;
        occupancy?: number;
    }>;
    tripDistance?: number;
    className?: string;
}

// ── Particle system ──────────────────────────────────────────────────────────

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    alpha: number;
}

// ── Color Palette ────────────────────────────────────────────────────────────

const COLORS = {
    bg: '#0a0f1a',
    bgGradientEnd: '#0d1525',
    cyan: '#06b6d4',
    cyanDim: 'rgba(6, 182, 212, 0.25)',
    cyanGlow: 'rgba(6, 182, 212, 0.5)',
    gold: '#f59e0b',
    goldDim: 'rgba(245, 158, 11, 0.3)',
    goldGlow: 'rgba(245, 158, 11, 0.5)',
    rose: '#f43f5e',
    roseGlow: 'rgba(244, 63, 94, 0.5)',
    emerald: '#10b981',
    emeraldGlow: 'rgba(16, 185, 129, 0.5)',
    gridLine: 'rgba(6, 182, 212, 0.07)',
    gridLineBright: 'rgba(6, 182, 212, 0.15)',
    white: '#ffffff',
    dimText: 'rgba(255,255,255,0.5)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

function createParticle(w: number, h: number): Particle {
    return {
        x: Math.random() * w,
        y: h * 0.3 + Math.random() * h * 0.7,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.6),
        life: 0,
        maxLife: 80 + Math.random() * 120,
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.1 + Math.random() * 0.4,
    };
}

// ── Canvas renderer ──────────────────────────────────────────────────────────

function drawFrame(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    props: InceptionGrid3DProps,
    particles: Particle[],
) {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    // ── Background gradient ──────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, COLORS.bgGradientEnd);
    bgGrad.addColorStop(1, COLORS.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ── Vanishing point ──────────────────────────────────────────────────
    const vpx = w / 2;
    const vpy = h * 0.15;

    // ── Perspective grid — horizontal lines ──────────────────────────────
    const hLineCount = 18;
    for (let i = 0; i <= hLineCount; i++) {
        const frac = i / hLineCount;
        // Non-linear spacing: lines get closer together toward horizon
        const yFrac = Math.pow(frac, 2.2);
        const y = lerp(vpy, h, yFrac);
        const xSpread = lerp(0, w * 0.6, yFrac);

        // Pulse alpha based on time
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + i * 0.3);
        const baseAlpha = lerp(0.03, 0.12, yFrac);
        const alpha = baseAlpha * (0.7 + 0.3 * pulse);

        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = yFrac > 0.5 ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(vpx - xSpread, y);
        ctx.lineTo(vpx + xSpread, y);
        ctx.stroke();
    }

    // ── Perspective grid — vertical lines converging to VP ───────────────
    const vLineCount = 14;
    for (let i = 0; i <= vLineCount; i++) {
        const frac = i / vLineCount;
        const bottomX = lerp(w * 0.05, w * 0.95, frac);
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.0015 + i * 0.5);
        const alpha = 0.04 + 0.04 * pulse;
        ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bottomX, h);
        ctx.lineTo(vpx, vpy);
        ctx.stroke();
    }

    // ── Neon road trail ──────────────────────────────────────────────────
    const roadPulse = 0.6 + 0.4 * Math.sin(t * 0.003);
    const roadWidth = 3;

    // Outer glow
    ctx.save();
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 20 * roadPulse;
    ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 * roadPulse})`;
    ctx.lineWidth = roadWidth + 6;
    ctx.beginPath();
    ctx.moveTo(vpx, vpy);
    ctx.lineTo(vpx, h);
    ctx.stroke();
    ctx.restore();

    // Core road line
    ctx.save();
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12 * roadPulse;
    const roadGrad = ctx.createLinearGradient(0, vpy, 0, h);
    roadGrad.addColorStop(0, `rgba(6, 182, 212, 0.1)`);
    roadGrad.addColorStop(0.4, `rgba(6, 182, 212, ${0.6 * roadPulse})`);
    roadGrad.addColorStop(1, `rgba(6, 182, 212, ${0.9 * roadPulse})`);
    ctx.strokeStyle = roadGrad;
    ctx.lineWidth = roadWidth;
    ctx.beginPath();
    ctx.moveTo(vpx, vpy);
    ctx.lineTo(vpx, h);
    ctx.stroke();
    ctx.restore();

    // Dashed lane markers
    const dashLen = 8;
    const dashGap = 14;
    const dashOffset = (t * 0.05) % (dashLen + dashGap);
    ctx.save();
    ctx.setLineDash([dashLen, dashGap]);
    ctx.lineDashOffset = -dashOffset;
    ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 * roadPulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vpx - 12, vpy);
    ctx.lineTo(vpx - 12, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vpx + 12, vpy);
    ctx.lineTo(vpx + 12, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── Stop Pillars ─────────────────────────────────────────────────────
    const stops = props.stops;
    const currentIdx = props.currentStopIndex;
    const totalStops = stops.length;

    if (totalStops > 0) {
        for (let i = 0; i < totalStops; i++) {
            const stop = stops[i];
            // Position along road: upcoming stops are higher (closer to VP)
            const relIdx = i - currentIdx;
            if (relIdx < -1) continue; // skip far-past stops
            const maxVisible = Math.min(totalStops - currentIdx + 1, 8);
            const posFrac = clamp((relIdx + 1) / (maxVisible + 1), 0.05, 0.95);
            // Perspective position on road
            const yFrac = 1 - Math.pow(posFrac, 1.5);
            const yPos = lerp(vpy, h, yFrac);

            // Pillar data
            const passengers = stop.waitingPassengers ?? 0;
            const parcels = stop.parcels ?? 0;
            const total = passengers + parcels;
            const pillarMaxH = 50;
            const pillarH = Math.min(pillarMaxH, 8 + total * 3);
            const perspScale = lerp(0.3, 1, yFrac);

            // Dimming for passed/current
            const isPast = i < currentIdx;
            const isCurrent = i === currentIdx || stop.isCurrentStop;
            const dimAlpha = isPast ? 0.2 : isCurrent ? 1 : 0.7 + 0.3 * Math.sin(t * 0.004 + i);

            // Draw pillar
            const pillarW = 4 * perspScale;
            const xOffset = (i % 2 === 0 ? -1 : 1) * (20 + 10 * perspScale);

            ctx.save();
            ctx.globalAlpha = dimAlpha;

            // Passenger portion (cyan)
            if (passengers > 0) {
                const pH = (passengers / Math.max(total, 1)) * pillarH * perspScale;
                ctx.shadowColor = COLORS.cyan;
                ctx.shadowBlur = isCurrent ? 15 : 6;
                ctx.fillStyle = COLORS.cyan;
                ctx.fillRect(vpx + xOffset - pillarW / 2, yPos - pH, pillarW, pH);
            }

            // Parcel portion (gold) stacked on top
            if (parcels > 0) {
                const pHeight = (passengers / Math.max(total, 1)) * pillarH * perspScale;
                const gH = (parcels / Math.max(total, 1)) * pillarH * perspScale;
                ctx.shadowColor = COLORS.gold;
                ctx.shadowBlur = isCurrent ? 15 : 6;
                ctx.fillStyle = COLORS.gold;
                ctx.fillRect(vpx + xOffset - pillarW / 2, yPos - pHeight - gH, pillarW, gH);
            }

            // Stop label
            ctx.shadowBlur = 0;
            ctx.font = `${Math.round(9 * perspScale)}px "Inter", system-ui, sans-serif`;
            ctx.fillStyle = isCurrent ? COLORS.white : COLORS.dimText;
            ctx.textAlign = xOffset > 0 ? 'left' : 'right';
            const labelX = vpx + xOffset + (xOffset > 0 ? pillarW : -pillarW);
            ctx.fillText(stop.name, labelX, yPos - 2);

            // Current stop marker
            if (isCurrent) {
                const markerPulse = 0.5 + 0.5 * Math.sin(t * 0.005);
                ctx.beginPath();
                ctx.arc(vpx + xOffset, yPos + 4, 3 * perspScale, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(6, 182, 212, ${markerPulse})`;
                ctx.shadowColor = COLORS.cyan;
                ctx.shadowBlur = 10;
                ctx.fill();
            }

            ctx.restore();
        }
    }

    // ── Vehicle Capsules ─────────────────────────────────────────────────
    const vehicles = props.aheadVehicles ?? [];
    for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        const dist = v.distance ?? (200 + i * 300);
        // Map distance to vertical position (closer = lower)
        const maxDist = 2000;
        const dFrac = clamp(dist / maxDist, 0.05, 0.95);
        const yFrac = 1 - Math.pow(dFrac, 1.2);
        const yPos = lerp(vpy, h * 0.85, yFrac);
        const perspScale = lerp(0.35, 0.9, yFrac);

        // Fullness determines color
        const occupancy = v.occupancy ?? 0;
        const capacity = v.capacity ?? 1;
        const fullRatio = capacity > 0 ? occupancy / capacity : 0;
        const isFull = fullRatio > 0.8;
        const capsuleColor = isFull ? COLORS.rose : COLORS.emerald;
        const glowColor = isFull ? COLORS.roseGlow : COLORS.emeraldGlow;

        // Lateral offset to avoid overlapping road center
        const xOff = ((i % 2 === 0) ? -1 : 1) * (6 + i * 4) * perspScale;

        // Draw capsule (ellipse)
        const cw = 14 * perspScale;
        const ch = 7 * perspScale;
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = capsuleColor;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.ellipse(vpx + xOff, yPos, cw, ch, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Speed label
        if (v.speed != null) {
            ctx.save();
            ctx.font = `bold ${Math.round(7 * perspScale)}px "Inter", system-ui, sans-serif`;
            ctx.fillStyle = COLORS.white;
            ctx.globalAlpha = 0.8;
            ctx.textAlign = 'center';
            ctx.fillText(`${v.speed}`, vpx + xOff, yPos + 3 * perspScale);
            ctx.restore();
        }
    }

    // ── Particles (dust motes) ───────────────────────────────────────────
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.y < 0 || p.x < 0 || p.x > w) {
            particles[i] = createParticle(w, h);
            continue;
        }

        const lifeFrac = p.life / p.maxLife;
        const fadeAlpha = lifeFrac < 0.2 ? lifeFrac / 0.2 : lifeFrac > 0.8 ? (1 - lifeFrac) / 0.2 : 1;
        ctx.save();
        ctx.globalAlpha = p.alpha * fadeAlpha;
        ctx.fillStyle = COLORS.cyan;
        ctx.shadowColor = COLORS.cyan;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ── Scanline effect ──────────────────────────────────────────────────
    const scanY = ((t * 0.08) % (h + 40)) - 20;
    const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.04)');
    scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 20, w, 40);

    // ── Horizon glow ─────────────────────────────────────────────────────
    const horizGlow = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, w * 0.35);
    horizGlow.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
    horizGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = horizGlow;
    ctx.fillRect(0, 0, w, h * 0.5);

    ctx.restore();
}

// ── Component ────────────────────────────────────────────────────────────────

export const InceptionGrid3D: React.FC<InceptionGrid3DProps> = (props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const [dims, setDims] = useState({ w: 400, h: 350 });

    // Responsive resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setDims({ w: Math.round(width), h: Math.round(height) });
                }
            }
        });
        ro.observe(container);

        // Initialize dimensions
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
        }

        return () => ro.disconnect();
    }, []);

    // Initialize particles
    useEffect(() => {
        const count = 40;
        const ps: Particle[] = [];
        for (let i = 0; i < count; i++) {
            ps.push(createParticle(dims.w, dims.h));
        }
        particlesRef.current = ps;
    }, [dims.w, dims.h]);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dims.w * dpr;
        canvas.height = dims.h * dpr;

        let running = true;

        const tick = (t: number) => {
            if (!running) return;
            drawFrame(ctx, dims.w, dims.h, t, props, particlesRef.current);
            animRef.current = requestAnimationFrame(tick);
        };
        animRef.current = requestAnimationFrame(tick);

        return () => {
            running = false;
            cancelAnimationFrame(animRef.current);
        };
    }, [dims.w, dims.h, props]);

    // Derived data for HUD overlays
    const nextStop = props.stops[props.currentStopIndex + 1] ?? props.stops[props.currentStopIndex];
    const speed = props.currentSpeed ?? 0;
    const distRemaining = props.tripDistance ?? 0;

    return (
        <div
            ref={containerRef}
            className={props.className}
            style={{
                position: 'relative',
                width: '100%',
                minHeight: 350,
                overflow: 'hidden',
                borderRadius: 16,
                background: COLORS.bg,
                perspective: '800px',
            }}
        >
            {/* Canvas with 3D tilt */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    inset: 0,
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(6deg)',
                    transformOrigin: 'center bottom',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            </div>

            {/* Vignette overlay */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(ellipse at center, transparent 50%, rgba(10,15,26,0.7) 100%)',
                    borderRadius: 16,
                }}
            />

            {/* ── HUD Overlay: Speed ─────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '10px 16px',
                    background: 'rgba(6,182,212,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(6,182,212,0.15)',
                    borderRadius: 12,
                    color: COLORS.white,
                    minWidth: 72,
                }}
            >
                <span
                    style={{
                        fontSize: 28,
                        fontWeight: 700,
                        fontFamily: '"Inter", system-ui, sans-serif',
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        color: COLORS.cyan,
                        textShadow: `0 0 12px ${COLORS.cyanGlow}`,
                    }}
                >
                    {speed}
                </span>
                <span
                    style={{
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: COLORS.dimText,
                        marginTop: 2,
                    }}
                >
                    km/h
                </span>
            </div>

            {/* ── HUD Overlay: Next Stop ──────────────────────────────── */}
            {nextStop && (
                <div
                    style={{
                        position: 'absolute',
                        top: 14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '8px 18px',
                        background: 'rgba(6,182,212,0.08)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(6,182,212,0.15)',
                        borderRadius: 10,
                        color: COLORS.white,
                        textAlign: 'center',
                        maxWidth: '60%',
                    }}
                >
                    <div
                        style={{
                            fontSize: 8,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            color: COLORS.dimText,
                            marginBottom: 2,
                        }}
                    >
                        Next Stop
                    </div>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: '"Inter", system-ui, sans-serif',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {nextStop.name}
                    </div>
                    {(nextStop.waitingPassengers != null || nextStop.parcels != null) && (
                        <div
                            style={{
                                display: 'flex',
                                gap: 10,
                                justifyContent: 'center',
                                marginTop: 4,
                                fontSize: 10,
                            }}
                        >
                            {nextStop.waitingPassengers != null && (
                                <span style={{ color: COLORS.cyan }}>
                                    👤 {nextStop.waitingPassengers}
                                </span>
                            )}
                            {nextStop.parcels != null && (
                                <span style={{ color: COLORS.gold }}>
                                    📦 {nextStop.parcels}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── HUD Overlay: Distance ───────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    padding: '10px 16px',
                    background: 'rgba(6,182,212,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(6,182,212,0.15)',
                    borderRadius: 12,
                    color: COLORS.white,
                    textAlign: 'center',
                    minWidth: 72,
                }}
            >
                <span
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        fontFamily: '"Inter", system-ui, sans-serif',
                        lineHeight: 1,
                        color: COLORS.gold,
                        textShadow: `0 0 10px ${COLORS.goldGlow}`,
                    }}
                >
                    {distRemaining >= 1000
                        ? `${(distRemaining / 1000).toFixed(1)}`
                        : `${distRemaining}`}
                </span>
                <span
                    style={{
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: COLORS.dimText,
                        marginLeft: 3,
                    }}
                >
                    {distRemaining >= 1000 ? 'km' : 'm'}
                </span>
                <div
                    style={{
                        fontSize: 8,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: COLORS.dimText,
                        marginTop: 3,
                    }}
                >
                    remaining
                </div>
            </div>

            {/* ── HUD Overlay: Ahead Vehicles count badge ─────────────── */}
            {props.aheadVehicles && props.aheadVehicles.length > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        padding: '6px 12px',
                        background: 'rgba(244,63,94,0.12)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        borderRadius: 8,
                        color: COLORS.rose,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: '"Inter", system-ui, sans-serif',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                    }}
                >
                    <span style={{ fontSize: 14 }}>🚐</span>
                    {props.aheadVehicles.length} ahead
                </div>
            )}

            {/* ── NavIC badge ─────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: '"Inter", system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: COLORS.cyanDim,
                    pointerEvents: 'none',
                }}
            >
                NavIC 3D
            </div>

            {/* Inline styles for the pulsing border animation */}
            <style>{`
                @keyframes inceptionBorderPulse {
                    0%, 100% { box-shadow: inset 0 0 20px rgba(6,182,212,0.05), 0 0 30px rgba(6,182,212,0.03); }
                    50% { box-shadow: inset 0 0 30px rgba(6,182,212,0.1), 0 0 40px rgba(6,182,212,0.06); }
                }
            `}</style>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 16,
                    border: '1px solid rgba(6,182,212,0.1)',
                    pointerEvents: 'none',
                    animation: 'inceptionBorderPulse 4s ease-in-out infinite',
                }}
            />
        </div>
    );
};
