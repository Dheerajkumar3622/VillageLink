import React, { useState, useEffect } from 'react';

export const DroneFleetStatus: React.FC = () => {
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState<any>(null);

  const fetchFleet = async () => {
    try {
      const res = await fetch('/api/v2/drones/fleet');
      if (!res.ok) throw new Error('Failed to load fleet status');
      const data = await res.json();
      setFleet(data);
      if (data.length > 0 && !selectedDrone) {
        setSelectedDrone(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    const maps: Record<string, string> = {
      IDLE: 'bg-green-500/10 text-green-400 border-green-500/20',
      ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      IN_FLIGHT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      CHARGING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      MAINTENANCE: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${maps[status] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'}`}>
        {status}
      </span>
    );
  };

  if (loading && fleet.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-900 rounded-3xl min-h-[300px] border border-white/5 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 text-white rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row gap-6 w-full mx-auto max-w-5xl">
      
      {/* List Panel */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider">AERODYNAMICS FLEET</span>
            <h2 className="text-xl font-bold tracking-tight">Active UAV Drone Fleet</h2>
          </div>
          <button 
            onClick={fetchFleet} 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-xs border border-white/5"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
          {fleet.map((drone) => (
            <div 
              key={drone.droneId}
              onClick={() => setSelectedDrone(drone)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex justify-between items-center ${
                selectedDrone?.droneId === drone.droneId 
                  ? 'bg-yellow-400/10 border-yellow-400/30' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-white">{drone.name}</div>
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{drone.type} • {drone.droneId}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {getStatusBadge(drone.status)}
                <div className="text-[10px] text-gray-400">Battery: <span className="font-bold text-white">{drone.batteryLevel}%</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details/Diagnostics HUD */}
      {selectedDrone && (
        <div className="w-full md:w-80 bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-white/5 pb-2">
            HUD Diagnostics: {selectedDrone.droneId}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Class Type:</span>
              <span className="font-bold uppercase">{selectedDrone.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payload Capacity:</span>
              <span className="font-bold text-white">{selectedDrone.maxPayloadKg} kg ({selectedDrone.maxVolumeCm3 / 1000}L)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Motor Condition:</span>
              <span className={`font-bold ${selectedDrone.motorHealth === 'GOOD' ? 'text-green-400' : 'text-red-400'}`}>
                {selectedDrone.motorHealth}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Battery Health Score:</span>
              <span className="font-bold text-white">{selectedDrone.batteryHealth}%</span>
            </div>

            {/* Live Telemetry details */}
            <div className="p-3 bg-neutral-900 rounded-xl border border-white/5 space-y-2 mt-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Live Autopilot Telemetry</div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-gray-400">Altitude:</span>
                  <div className="font-bold text-white text-sm">{selectedDrone.telemetry?.alt || 0} m</div>
                </div>
                <div>
                  <span className="text-gray-400">Ground Speed:</span>
                  <div className="font-bold text-white text-sm">{(selectedDrone.telemetry?.speedMps || 0) * 3.6} km/h</div>
                </div>
                <div>
                  <span className="text-gray-400">Wind Resist:</span>
                  <div className="font-bold text-white text-sm">{selectedDrone.telemetry?.windSpeedMps || 0} m/s</div>
                </div>
                <div>
                  <span className="text-gray-400">Current Payload:</span>
                  <div className="font-bold text-yellow-400 text-sm">{selectedDrone.currentPayloadWeightKg || 0} kg</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
