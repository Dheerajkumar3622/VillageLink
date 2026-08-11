import React, { useState, useEffect } from 'react';

export const ChargingDockPanel: React.FC = () => {
  const [docks, setDocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDock, setSelectedDock] = useState<any>(null);
  const [swapLogs, setSwapLogs] = useState<string[]>([]);

  const fetchDocks = async () => {
    try {
      const res = await fetch('/api/v2/drones/charging-docks');
      if (!res.ok) throw new Error('Failed to fetch charging docks');
      const data = await res.json();
      setDocks(data);
      if (data.length > 0 && !selectedDock) {
        setSelectedDock(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocks();
    const interval = setInterval(fetchDocks, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerBatterySwap = (dockId: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSwapLogs(prev => [
      `[${timestamp}] 🤖 Triggered Hot Swap Sequence at ${dockId}`,
      `[${timestamp}] ⚡ Executing mechanical arm validation...`,
      `[${timestamp}] ✅ Battery swapped. Capacity restored.`,
      ...prev
    ]);
  };

  if (loading && docks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 rounded-3xl min-h-[300px] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 text-white rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row gap-6 w-full mx-auto max-w-5xl">
      
      {/* Dock Stations List */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider">CHARGING NETWORK</span>
          <h2 className="text-xl font-bold tracking-tight">Autonomous Charging Docks</h2>
        </div>

        <div className="space-y-2">
          {docks.map((dock) => (
            <div 
              key={dock.dockId}
              onClick={() => setSelectedDock(dock)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                selectedDock?.dockId === dock.dockId 
                  ? 'bg-yellow-400/10 border-yellow-400/30' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-white">{dock.name}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{dock.dockId} • {dock.lat}, {dock.lng}</div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-yellow-400">{dock.powerOutputKw} kW</span>
                <div className="text-[10px] text-gray-400 mt-1">Available: <span className="font-bold text-white">{dock.totalSlots - dock.occupiedSlots}/{dock.totalSlots}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dock Panel Controls & Diagnostics */}
      {selectedDock && (
        <div className="w-full md:w-80 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-white/5 pb-2">
            Dock Controls: {selectedDock.dockId}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Power Rating:</span>
              <span className="font-bold text-white">{selectedDock.powerOutputKw} kW (DC Fast Charge)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="font-bold text-green-400">ONLINE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Queue Length:</span>
              <span className="font-bold text-white">{selectedDock.queue?.length || 0} Drones waiting</span>
            </div>

            {/* Battery hot-swap swap trigger */}
            <div className="mt-4 p-3 bg-neutral-900 border border-white/5 rounded-xl flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Autonomous Swap Station</span>
              <button 
                onClick={() => triggerBatterySwap(selectedDock.dockId)}
                className="w-full py-2 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 font-extrabold rounded-xl transition duration-200 active:scale-95 text-xs uppercase"
              >
                🔄 SWAP BATTERY NOW
              </button>
            </div>

            {/* Diagnostics hot swap logs */}
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Telemetry Logs</span>
              <div className="max-h-24 overflow-y-auto bg-black/60 rounded-xl p-2 font-mono text-[9px] text-gray-300 space-y-1">
                {swapLogs.length === 0 ? (
                  <div className="text-gray-500 italic">No events triggered.</div>
                ) : (
                  swapLogs.map((log, idx) => <div key={idx}>{log}</div>)
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
