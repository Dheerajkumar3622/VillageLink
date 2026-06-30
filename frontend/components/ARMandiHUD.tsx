import React, { useMemo } from 'react';

/* ─── Types ────────────────────────────────────────────────────── */
interface ParkingBay {
  bayNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED';
  purpose?: string;
}

interface MarketPrice {
  crop: string;
  price: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

interface ARMandiHUDProps {
  mandiName: string;
  location?: { lat: number; lng: number };
  gateStatus?: 'OPEN' | 'CLOSED' | 'BUSY';
  parkingBays?: ParkingBay[];
  marketPrices?: MarketPrice[];
  driversAtGate?: number;
  estimatedWaitMinutes?: number;
  onClose: () => void;
  className?: string;
}

/* ─── Defaults ─────────────────────────────────────────────────── */
const DEFAULT_PARKING: ParkingBay[] = [
  { bayNumber: 1, status: 'AVAILABLE', purpose: 'Unloading' },
  { bayNumber: 2, status: 'AVAILABLE', purpose: 'Unloading' },
  { bayNumber: 3, status: 'OCCUPIED', purpose: 'Loading' },
  { bayNumber: 4, status: 'AVAILABLE', purpose: 'Weighing' },
  { bayNumber: 5, status: 'OCCUPIED', purpose: 'Loading' },
  { bayNumber: 6, status: 'AVAILABLE', purpose: 'Storage' },
];

const DEFAULT_PRICES: MarketPrice[] = [
  { crop: 'Wheat', price: 2850, unit: 'q', trend: 'UP' },
  { crop: 'Rice', price: 3200, unit: 'q', trend: 'STABLE' },
  { crop: 'Potato', price: 1450, unit: 'q', trend: 'DOWN' },
  { crop: 'Onion', price: 2100, unit: 'q', trend: 'UP' },
];

/* ─── Helpers ──────────────────────────────────────────────────── */
const GATE_META: Record<string, { label: string; color: string; glow: string }> = {
  OPEN:   { label: 'OPEN',   color: '#10b981', glow: '0 0 18px #10b98188' },
  CLOSED: { label: 'CLOSED', color: '#f43f5e', glow: '0 0 18px #f43f5e88' },
  BUSY:   { label: 'BUSY',   color: '#f59e0b', glow: '0 0 18px #f59e0b88' },
};

const trendIcon = (t: MarketPrice['trend']) =>
  t === 'UP' ? '↑' : t === 'DOWN' ? '↓' : '→';

const trendColor = (t: MarketPrice['trend']) =>
  t === 'UP' ? '#10b981' : t === 'DOWN' ? '#f43f5e' : '#94a3b8';

const formatPrice = (n: number) => '₹' + n.toLocaleString('en-IN');

/* ─── Component ────────────────────────────────────────────────── */
export const ARMandiHUD: React.FC<ARMandiHUDProps> = ({
  mandiName,
  location,
  gateStatus = 'OPEN',
  parkingBays = DEFAULT_PARKING,
  marketPrices = DEFAULT_PRICES,
  driversAtGate = 3,
  estimatedWaitMinutes = 8,
  onClose,
  className = '',
}) => {
  const gate = GATE_META[gateStatus] ?? GATE_META.OPEN;

  /* Perspective grid lines (SVG paths that converge to vanishing point) */
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const cx = 50; // vanishing‐point X %
    const cy = 18; // vanishing‐point Y %
    const bottomY = 100;
    const count = 14;
    for (let i = 0; i <= count; i++) {
      const x = (i / count) * 100;
      lines.push(
        <line
          key={`v-${i}`}
          x1={`${x}%`}
          y1={`${bottomY}%`}
          x2={`${cx}%`}
          y2={`${cy}%`}
          stroke="#06b6d4"
          strokeOpacity="0.12"
          strokeWidth="1"
        />,
      );
    }
    for (let j = 0; j < 8; j++) {
      const t = j / 8;
      const y = bottomY - t * (bottomY - cy);
      const halfW = (1 - t) * 50;
      lines.push(
        <line
          key={`h-${j}`}
          x1={`${cx - halfW}%`}
          y1={`${y}%`}
          x2={`${cx + halfW}%`}
          y2={`${y}%`}
          stroke="#06b6d4"
          strokeOpacity={0.08 + t * 0.06}
          strokeWidth="1"
        />,
      );
    }
    return lines;
  }, []);

  return (
    <>
      {/* ─── Keyframe Animations ─────────────────────────── */}
      <style>{`
        @keyframes armhud-scanline {
          0%   { top: 0; }
          100% { top: 100%; }
        }
        @keyframes armhud-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: .45; }
        }
        @keyframes armhud-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes armhud-bracket-blink {
          0%, 100% { opacity: .7; }
          50%      { opacity: .25; }
        }
        @keyframes armhud-glow-ring {
          0%, 100% { box-shadow: 0 0 6px var(--_gc); }
          50%      { box-shadow: 0 0 20px var(--_gc); }
        }
      `}</style>

      {/* ─── Root Overlay ────────────────────────────────── */}
      <div
        className={className}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: '#e2e8f0',
          background: '#0a0e17',
          overflow: 'hidden',
        }}
      >
        {/* ═══════════════ TOP 60 % — Street View ═══════════════ */}
        <div
          style={{
            position: 'relative',
            flex: '0 0 60%',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 60%, #334155 100%)',
          }}
        >
          {/* Perspective Grid */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="none"
          >
            {gridLines}
          </svg>

          {/* ── Warehouse Facade ────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '12%',
              transform: 'translateX(-50%)',
              width: '42%',
              maxWidth: 320,
            }}
          >
            {/* Roof (trapezoid via border trick) */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '30px solid transparent',
                borderRight: '30px solid transparent',
                borderBottom: '38px solid #334155',
                margin: '0 auto',
                position: 'relative',
                zIndex: 1,
              }}
            />
            <div
              style={{
                background: 'linear-gradient(180deg, #334155, #1e293b)',
                width: '100%',
                height: 0,
                paddingBottom: '28%',
                borderBottom: '38px solid #334155',
                clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
              }}
            />
            {/* Wall */}
            <div
              style={{
                background: 'linear-gradient(180deg,#1e293b,#0f172a)',
                border: '1px solid rgba(6,182,212,.18)',
                borderTop: 'none',
                width: '100%',
                height: 0,
                paddingBottom: '55%',
                position: 'relative',
              }}
            >
              {/* Gate opening */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '36%',
                  height: '62%',
                  background: gateStatus === 'OPEN'
                    ? 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)'
                    : 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
                  border: `1px solid ${gate.color}44`,
                  borderBottom: 'none',
                  borderRadius: '4px 4px 0 0',
                }}
              />
              {/* Windows row */}
              <div
                style={{
                  position: 'absolute',
                  top: '18%',
                  left: '10%',
                  right: '10%',
                  display: 'flex',
                  gap: 6,
                  justifyContent: 'space-around',
                }}
              >
                {[0, 1, 2, 3].map((w) => (
                  <div
                    key={w}
                    style={{
                      width: 14,
                      height: 10,
                      background: '#06b6d422',
                      border: '1px solid #06b6d433',
                      borderRadius: 2,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Gate Status AR Badge ───────────────────── */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '42%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              animation: 'armhud-float 3s ease-in-out infinite',
              zIndex: 5,
            }}
          >
            <div
              style={{
                '--_gc': gate.color,
                background: 'rgba(15,23,42,.82)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1.5px solid ${gate.color}88`,
                borderRadius: 10,
                padding: '6px 18px',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1.5,
                color: gate.color,
                textShadow: `0 0 8px ${gate.color}88`,
                boxShadow: gate.glow,
                animation: 'armhud-glow-ring 2s ease-in-out infinite',
              } as React.CSSProperties}
            >
              GATE: {gate.label}
            </div>
            <div
              style={{
                width: 1,
                height: 18,
                background: `linear-gradient(180deg, ${gate.color}88, transparent)`,
              }}
            />
          </div>

          {/* ── Parking Bay Indicators ──────────────────── */}
          <div
            style={{
              position: 'absolute',
              left: '6%',
              bottom: '10%',
              display: 'flex',
              gap: 8,
              zIndex: 5,
            }}
          >
            {parkingBays.slice(0, 6).map((bay) => {
              const avail = bay.status === 'AVAILABLE';
              return (
                <div
                  key={bay.bayNumber}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: avail
                      ? 'rgba(16,185,129,.18)'
                      : 'rgba(244,63,94,.18)',
                    border: `1.5px solid ${avail ? '#10b981' : '#f43f5e'}`,
                    color: avail ? '#10b981' : '#f43f5e',
                    animation: 'armhud-float 3.5s ease-in-out infinite',
                    animationDelay: `${bay.bayNumber * 0.15}s`,
                  }}
                  title={bay.purpose}
                >
                  {bay.bayNumber}
                </div>
              );
            })}
          </div>

          {/* ── Floating Market Price Tags ──────────────── */}
          <div
            style={{
              position: 'absolute',
              right: '4%',
              top: '18%',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 5,
            }}
          >
            {marketPrices.slice(0, 4).map((mp, i) => (
              <div
                key={mp.crop}
                style={{
                  background: 'rgba(15,23,42,.72)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(6,182,212,.22)',
                  borderRadius: 10,
                  padding: '5px 12px',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  animation: 'armhud-float 4s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                }}
              >
                <span style={{ color: '#94a3b8', fontWeight: 500 }}>{mp.crop}</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
                  {formatPrice(mp.price)}/{mp.unit}
                </span>
                <span style={{ color: trendColor(mp.trend), fontWeight: 800, fontSize: 14 }}>
                  {trendIcon(mp.trend)}
                </span>
              </div>
            ))}
          </div>

          {/* ── Scanline Overlay ────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: 8,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: 2,
                background: 'linear-gradient(90deg, transparent, #06b6d466, transparent)',
                animation: 'armhud-scanline 4s linear infinite',
              }}
            />
          </div>

          {/* ── Corner Brackets (viewfinder) ────────────── */}
          {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
            const isTop = corner.includes('top');
            const isLeft = corner.includes('Left');
            return (
              <div
                key={corner}
                style={{
                  position: 'absolute',
                  [isTop ? 'top' : 'bottom']: 12,
                  [isLeft ? 'left' : 'right']: 12,
                  width: 28,
                  height: 28,
                  borderColor: '#06b6d4',
                  borderStyle: 'solid',
                  borderWidth: 0,
                  ...(isTop && isLeft && { borderTopWidth: 2, borderLeftWidth: 2 }),
                  ...(isTop && !isLeft && { borderTopWidth: 2, borderRightWidth: 2 }),
                  ...(!isTop && isLeft && { borderBottomWidth: 2, borderLeftWidth: 2 }),
                  ...(!isTop && !isLeft && { borderBottomWidth: 2, borderRightWidth: 2 }),
                  borderRadius: isTop
                    ? isLeft ? '6px 0 0 0' : '0 6px 0 0'
                    : isLeft ? '0 0 0 6px' : '0 0 6px 0',
                  opacity: 0.6,
                  animation: 'armhud-bracket-blink 3s ease-in-out infinite',
                  zIndex: 9,
                }}
              />
            );
          })}

          {/* ── System Status Bar (top-left) ───────────── */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 48,
              zIndex: 10,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#06b6d4',
              opacity: 0.8,
            }}
          >
            AR MANDI HUD v2.1 &nbsp;•&nbsp; LIVE
          </div>
        </div>

        {/* ═══════════════ BOTTOM 40 % — Info Panel ═══════════════ */}
        <div
          style={{
            flex: '0 0 40%',
            background: 'linear-gradient(180deg, #0f172a, #0a0e17)',
            borderTop: '1px solid rgba(6,182,212,.18)',
            padding: '14px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Pulsing live dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  animation: 'armhud-pulse 1.5s ease-in-out infinite',
                  boxShadow: '0 0 6px #10b981',
                }}
              />
              <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3 }}>
                {mandiName}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(244,63,94,.14)',
                border: '1px solid #f43f5e55',
                borderRadius: 8,
                color: '#f43f5e',
                fontWeight: 600,
                fontSize: 12,
                padding: '5px 14px',
                cursor: 'pointer',
                transition: 'background .2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,.28)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,.14)'; }}
            >
              ✕ Close
            </button>
          </div>

          {/* Gate & Wait Row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <InfoChip label="Gate" value={gate.label} accent={gate.color} />
            <InfoChip label="Wait" value={`~${estimatedWaitMinutes} min`} accent="#06b6d4" />
            <InfoChip label="Drivers" value={String(driversAtGate)} accent="#8b5cf6" />
            {location && (
              <InfoChip
                label="GPS"
                value={`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                accent="#06b6d4"
              />
            )}
          </div>

          {/* Parking Bay Grid (2×3) */}
          <div>
            <SectionLabel text="Parking Bays" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
              }}
            >
              {parkingBays.slice(0, 6).map((bay) => {
                const avail = bay.status === 'AVAILABLE';
                return (
                  <div
                    key={bay.bayNumber}
                    style={{
                      background: avail ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.1)',
                      border: `1px solid ${avail ? '#10b98144' : '#f43f5e44'}`,
                      borderRadius: 8,
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: avail ? '#10b98122' : '#f43f5e22',
                        border: `1.5px solid ${avail ? '#10b981' : '#f43f5e'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 10,
                        color: avail ? '#10b981' : '#f43f5e',
                        flexShrink: 0,
                      }}
                    >
                      {bay.bayNumber}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.2 }}>
                      {bay.purpose ?? (avail ? 'Free' : 'In use')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Prices Table */}
          <div>
            <SectionLabel text="Live Market Prices" />
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ color: '#64748b', textAlign: 'left', fontSize: 10 }}>
                  <th style={{ padding: '3px 0', fontWeight: 600 }}>Crop</th>
                  <th style={{ padding: '3px 0', fontWeight: 600 }}>Price</th>
                  <th style={{ padding: '3px 0', fontWeight: 600, textAlign: 'center' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {marketPrices.map((mp) => (
                  <tr key={mp.crop} style={{ borderTop: '1px solid #1e293b' }}>
                    <td style={{ padding: '5px 0', fontWeight: 500 }}>{mp.crop}</td>
                    <td style={{ padding: '5px 0', fontWeight: 700 }}>
                      {formatPrice(mp.price)}/{mp.unit}
                    </td>
                    <td
                      style={{
                        padding: '5px 0',
                        textAlign: 'center',
                        color: trendColor(mp.trend),
                        fontWeight: 800,
                        fontSize: 15,
                      }}
                    >
                      {trendIcon(mp.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─── Sub‑components ───────────────────────────────────────────── */
const InfoChip: React.FC<{ label: string; value: string; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div
    style={{
      background: 'rgba(15,23,42,.7)',
      border: `1px solid ${accent}33`,
      borderRadius: 8,
      padding: '4px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
    }}
  >
    <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
    <span style={{ color: accent, fontWeight: 700 }}>{value}</span>
  </div>
);

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: '#06b6d4',
      marginBottom: 6,
    }}
  >
    {text}
  </div>
);
