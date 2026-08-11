import React, { useState } from 'react';

export const CityOperatingSystem: React.FC = () => {
  const [plugins, setPlugins] = useState([
    { id: 'ev_grid', name: 'EV Charging Grid Optimizer', active: true, desc: 'Schedules solar/off-peak vehicle battery replenishment.' },
    { id: 'transit', name: 'Public Transit Multi-Modal Link', active: true, desc: 'Syncs buses with drone parcel carrying timelines.' },
    { id: 'emergency', name: 'Emergency Swarm Response', active: true, desc: 'Auto-reroutes medical payloads around storm corridors.' },
    { id: 'parking', name: 'Smart Parking Edge Nodes', active: false, desc: 'P2P stop booking reservations for cargo auto-vans.' }
  ]);

  const togglePlugin = (id: string) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-white shadow-2xl w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
        <div>
          <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider font-mono">CITY OS MATRIX</span>
          <h2 className="text-xl font-bold tracking-tight text-white">Urban Mobility Operating System</h2>
        </div>
        <div className="flex gap-4 text-xs font-mono bg-black/40 px-4 py-2 rounded-xl border border-white/5">
          <div>OS: <span className="text-green-400 font-bold">NOMINAL</span></div>
          <div>AGENTS: <span className="text-yellow-400 font-bold">148 ACTIVE</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plugins.map((plugin) => (
          <div 
            key={plugin.id}
            className={`p-4 rounded-2xl border transition-all duration-300 ${
              plugin.active 
                ? 'bg-yellow-400/5 border-yellow-400/20' 
                : 'bg-black/20 border-white/5 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="font-bold text-sm text-white">{plugin.name}</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{plugin.desc}</p>
              </div>
              <button
                onClick={() => togglePlugin(plugin.id)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition active:scale-95 uppercase ${
                  plugin.active 
                    ? 'bg-green-600 text-white hover:bg-green-500' 
                    : 'bg-white/10 text-gray-400 hover:bg-white/15'
                }`}
              >
                {plugin.active ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
