import React, { useEffect, useRef } from 'react';

export const MemoryGraphVisual: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simulated nodes representing AI Memory Graph relations
    const nodes = [
      { id: 'BUS_01', label: 'Bus 01 Agent', x: 80, y: 150, type: 'VEHICLE' },
      { id: 'DRN_01', label: 'Drone 01 Agent', x: 260, y: 80, type: 'DRONE' },
      { id: 'STOP_MAIN', label: 'Central Stop Node', x: 170, y: 220, type: 'STOP' },
      { id: 'DOCK_01', label: 'Central Charger', x: 280, y: 190, type: 'INFRA' }
    ];

    const drawGraph = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid decor
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // Draw active relation lines
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 1.5;
      
      // V2V / V2D connections
      nodes.forEach((n1, idx) => {
        nodes.slice(idx + 1).forEach(n2 => {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        });
      });

      // Draw node circles
      nodes.forEach(n => {
        // Outer glowing ring
        ctx.fillStyle = n.type === 'VEHICLE' ? 'rgba(59, 130, 246, 0.15)' :
                        n.type === 'DRONE' ? 'rgba(168, 85, 247, 0.15)' :
                        n.type === 'STOP' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(16, 185, 129, 0.15)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid node
        ctx.fillStyle = n.type === 'VEHICLE' ? '#3b82f6' :
                        n.type === 'DRONE' ? '#a855f7' :
                        n.type === 'STOP' ? '#eab308' : '#10b981';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text Labels
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 9px font-sans';
        ctx.fillText(n.label, n.x + 14, n.y + 3);
      });
    };

    drawGraph();
  }, []);

  return (
    <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-white shadow-2xl w-full">
      <div className="mb-4">
        <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider font-mono">RELATION GRAPH</span>
        <h3 className="text-base font-bold text-white tracking-tight">AI Memory Graph Network</h3>
      </div>
      <canvas ref={canvasRef} width={360} height={260} className="w-full bg-black/45 rounded-2xl border border-white/5" />
    </div>
  );
};
