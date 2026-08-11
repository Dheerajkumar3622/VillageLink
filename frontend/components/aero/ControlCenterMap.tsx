import React, { useState, useEffect } from 'react';

export const ControlCenterMap: React.FC = () => {
  const [drones, setDrones] = useState<any[]>([]);
  const [corridors, setCorridors] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<string[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<'ALL' | 'BATTERY' | 'HEATMAP'>('ALL');

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const droneRes = await fetch('/api/v2/drones/fleet');
        if (droneRes.ok) {
          const droneData = await droneRes.json();
          setDrones(droneData);
        }

        const corridorRes = await fetch('/api/v2/drones/corridors');
        if (corridorRes.ok) {
          const corridorData = await corridorRes.json();
          setCorridors(corridorData);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000); // 3s telemetry poll
    return () => clearInterval(interval);
  }, []);

  const addIncident = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setIncidents(prev => [`[${time}] ⚠️ ${msg}`, ...prev.slice(0, 10)]);
  };

  return (
    <div className="bg-neutral-950 text-white rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col gap-6 w-full mx-auto max-w-5xl">
      
      {/* Control Room Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider">COMMAND CENTER</span>
          <h2 className="text-2xl font-bold tracking-tight">Live Fleet Telemetry Center</h2>
        </div>

        {/* Overlay Filters */}
        <div className="flex gap-2">
          {['ALL', 'BATTERY', 'HEATMAP'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedOverlay(filter as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                selectedOverlay === filter
                  ? 'bg-yellow-400 text-neutral-950 border-yellow-400'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              {filter} VIEW
            </button>
          ))}
        </div>
      </div>

      {/* Map Layout Canvas & Logs */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Map Visualizer */}
        <div className="flex-1 bg-neutral-900 border border-white/5 rounded-2xl h-80 relative overflow-hidden flex items-center justify-center">
          
          {/* Radar grids */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full animate-pulse" />
          <div className="absolute w-[180px] h-[180px] border border-white/5 rounded-full" />
          
          {/* Corridors representation */}
          {corridors.map((c) => (
            <div 
              key={c.corridorId}
              className={`absolute border px-2 py-1 rounded text-[8px] font-mono ${
                c.type === 'NO_FLY_ZONE' 
                  ? 'border-red-500/30 bg-red-500/10 text-red-400' 
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
              }`}
              style={{
                top: c.type === 'NO_FLY_ZONE' ? '20%' : '50%',
                left: c.type === 'NO_FLY_ZONE' ? '55%' : '20%',
                width: c.type === 'NO_FLY_ZONE' ? '120px' : '180px'
              }}
            >
              {c.name.toUpperCase()}
            </div>
          ))}

          {/* Drones markers on Map */}
          {drones.map((d, index) => {
            const colors = {
              IDLE: 'bg-green-500',
              ASSIGNED: 'bg-blue-500',
              IN_FLIGHT: 'bg-purple-500 animate-ping',
              CHARGING: 'bg-yellow-500 animate-bounce',
              MAINTENANCE: 'bg-red-500'
            };
            const posOffset = [
              { top: '30%', left: '35%' },
              { top: '65%', left: '45%' },
              { top: '45%', left: '70%' },
              { top: '75%', left: '20%' }
            ];
            const pos = posOffset[index % posOffset.length];
            return (
              <div 
                key={d.droneId}
                className="absolute flex items-center gap-1.5 cursor-pointer bg-black/80 px-2 py-1 rounded border border-white/10"
                style={{ top: pos.top, left: pos.left }}
                onClick={() => addIncident(`Manual ping received from ${d.name}`)}
              >
                <div className={`w-2 h-2 rounded-full ${colors[d.status as keyof typeof colors] || 'bg-white'}`} />
                <span className="text-[9px] font-mono font-bold text-white">{d.droneId} ({d.batteryLevel}%)</span>
              </div>
            );
          })}

          <div className="absolute bottom-4 left-4 text-[10px] text-gray-500 bg-neutral-950/80 px-2 py-1 rounded border border-white/5">
            GRID SCALE: 1 UNIT = 200 METERS
          </div>
        </div>

        {/* Incidents & Active Control Panel */}
        <div className="w-full md:w-80 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-white/5 pb-2">
            Realtime Incident Desk
          </h3>

          <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 space-y-1">
            {incidents.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-10">No flight exceptions recorded. System green.</div>
            ) : (
              incidents.map((inc, idx) => (
                <div key={idx} className="p-2 bg-neutral-900 border border-white/5 rounded-xl text-[10px] font-mono leading-relaxed">
                  {inc}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-white/5 space-y-2">
            <button 
              onClick={() => addIncident('Low battery threshold triggers RTL return on DRN_03')}
              className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 text-xs font-bold rounded-xl transition"
            >
              ⚠️ SIMULATE FLIGHT EXCEPTION
            </button>
            <button 
              onClick={() => addIncident('Corridor violation check cleared for Mandi Cargo Flight')}
              className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition"
            >
              🔄 RUN AIRSPACE SCAN
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
