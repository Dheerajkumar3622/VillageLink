import React, { useState, useEffect } from 'react';

export const LiveSimulationTwin: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [tickSpeed, setTickSpeed] = useState<number>(1); // Speed multiplier
  const [tickCount, setTickCount] = useState<number>(0);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);
  const [activeDrones, setActiveDrones] = useState<number>(4);
  const [activeVehicles, setActiveVehicles] = useState<number>(2);
  const [packagesDelivered, setPackagesDelivered] = useState<number>(24);

  useEffect(() => {
    if (!isPlaying) return;

    const runSimulationTick = () => {
      setTickCount(prev => prev + 1);

      // Randomly trigger simulated events and telemetry logging
      const events = [
        'DRN_01 adjusting heading for crosswind at corridor A (+2.4° yaw)',
        'BUS_02 passenger presence scan broadcasted via BLE (14 active)',
        'Smart Stop STOP_MAIN recalculating ETA (Tempo-03 approaching in 8 min)',
        'Drone DRN_02 altitude lock check at 60 meters: status Nominal',
        'Package PKG_8820 routing update: co-carried on Bus-01',
        'DOCK_01 charging deck slots status query: 1 active charging, 3 idle'
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const timestamp = new Date().toLocaleTimeString();

      setTelemetryLogs(prev => [`[Tick ${tickCount}] ${randomEvent}`, ...prev.slice(0, 15)]);

      // Adjust metrics slowly over time
      if (Math.random() > 0.8) {
        setPackagesDelivered(p => p + 1);
      }
    };

    const interval = setInterval(runSimulationTick, 3000 / tickSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, tickSpeed, tickCount]);

  const resetSimulation = () => {
    setTickCount(0);
    setTelemetryLogs([]);
    setPackagesDelivered(24);
  };

  return (
    <div className="bg-neutral-950 text-white rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col gap-6 w-full mx-auto max-w-5xl">
      
      {/* Simulation HUD Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-4">
        <div>
          <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider font-mono">SIMULATION CONTROL ENGINE</span>
          <h2 className="text-xl font-bold tracking-tight">Enterprise Digital Twin Console</h2>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition uppercase ${
              isPlaying 
                ? 'bg-yellow-400 text-neutral-950 hover:bg-yellow-300' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isPlaying ? '⏸️ PAUSE ENGINE' : '▶️ RESUME ENGINE'}
          </button>
          
          <div className="flex items-center bg-neutral-900 border border-white/10 rounded-xl px-2">
            <span className="text-[10px] text-gray-400 font-bold px-2">SPEED:</span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setTickSpeed(s)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition ${
                  tickSpeed === s 
                    ? 'bg-yellow-400 text-neutral-950' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button 
            onClick={resetSimulation}
            className="px-3 py-2 text-xs font-semibold text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 transition"
          >
            🔄 RESET
          </button>
        </div>
      </div>

      {/* Grid: Stats & Realtime Simulation Logs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric Cards */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Simulation Ticks Run</span>
            <div className="text-3xl font-extrabold text-white mt-1 font-mono">{tickCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Active Drones in Air</span>
            <div className="text-3xl font-extrabold text-purple-400 mt-1 font-mono">{activeDrones}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">AI Parcels Delivered</span>
            <div className="text-3xl font-extrabold text-green-400 mt-1 font-mono">{packagesDelivered}</div>
          </div>
        </div>

        {/* Realtime logs timeline */}
        <div className="md:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-white/5 pb-2">
            Live Telemetry Console Streams
          </h3>
          
          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-1.5 pr-1 font-mono text-[10px] text-gray-300">
            {telemetryLogs.length === 0 ? (
              <div className="text-gray-500 italic py-10 text-center">Start the twin engine to begin telemetry tracking.</div>
            ) : (
              telemetryLogs.map((log, idx) => (
                <div key={idx} className="p-2 bg-black/60 rounded-xl border border-white/5 flex gap-2">
                  <span className="text-yellow-400/80 font-bold select-none">&gt;&gt;</span>
                  <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
