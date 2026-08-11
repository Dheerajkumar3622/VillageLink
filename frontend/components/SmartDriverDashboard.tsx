import React, { useState, useEffect } from 'react';

interface SmartDriverDashboardProps {
  vehicleId?: string;
}

export const SmartDriverDashboard: React.FC<SmartDriverDashboardProps> = ({ vehicleId = 'BUS_01' }) => {
  const [data, setData] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch passengers presence inside vehicle
        const presenceRes = await fetch(`/api/v2/presence/vehicle/${vehicleId}`);
        if (!presenceRes.ok) throw new Error('Failed to load vehicle telemetry');
        const presenceData = await presenceRes.json();

        // Fetch assigned packages
        const packageRes = await fetch(`/api/v2/packages/list?carrierId=${vehicleId}`);
        let packageData = [];
        if (packageRes.ok) {
          packageData = await packageRes.json();
        }

        setData(presenceData);
        setPackages(packageData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000); // Poll every 4s
    return () => clearInterval(interval);
  }, [vehicleId]);

  const triggerEmergency = () => {
    setEmergencyAlert(prev => prev ? null : 'SOS: Battery temperature critical! Autopilot restricted.');
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8 bg-neutral-950 text-white rounded-3xl min-h-[500px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  // Fallbacks for empty states
  const totalOnboard = data?.totalOnboard || 0;
  const categories = data?.categories || { women: 0, senior: 0, disabled: 0, children: 0, vip: 0, student: 0, regular: 0 };
  const passengers = data?.passengers || [];

  return (
    <div className="bg-neutral-950 text-white p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-col gap-6 max-w-5xl mx-auto w-full relative">
      
      {/* Top HUD bar */}
      <div className="flex justify-between items-center bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
          <div>
            <span className="text-xs text-gray-400 font-semibold uppercase">ACTIVE ROUTE VEHICLE</span>
            <h2 className="text-xl font-bold tracking-tight text-white">{vehicleId} HUD</h2>
          </div>
        </div>
        
        {/* Core Stats */}
        <div className="flex gap-6">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase">BATTERY</span>
            <span className="text-lg font-bold text-green-400">82%</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase">COLLECTIONS</span>
            <span className="text-lg font-bold text-yellow-400">₹4,250</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase">SPEED</span>
            <span className="text-lg font-bold text-white">45 km/h</span>
          </div>
        </div>

        {/* SOS Emergency button */}
        <button 
          onClick={triggerEmergency}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition active:scale-95"
        >
          {emergencyAlert ? 'CLEAR SOS' : 'TRIGGER SOS'}
        </button>
      </div>

      {/* Emergency Alert Display */}
      {emergencyAlert && (
        <div className="p-4 bg-red-950/80 border border-red-500/30 rounded-2xl text-red-200 animate-bounce flex items-center gap-2">
          <span>⚠️</span>
          <span className="font-semibold text-sm">{emergencyAlert}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Map / Waypoints & Weather */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Waypoints & Route</h3>
          <div className="h-48 bg-neutral-900 rounded-xl relative overflow-hidden border border-white/5 flex items-center justify-center">
            {/* Mock Vector Route Map representation */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="w-4/5 h-1 bg-yellow-400/20 absolute rounded" />
            <div className="w-1/3 h-1 bg-yellow-400 absolute rounded" />
            <div className="absolute left-[33%] w-4 h-4 bg-yellow-400 rounded-full border-2 border-neutral-900 shadow-lg" />
            <span className="absolute top-4 left-4 text-xs font-mono text-gray-400">GPS REROUTING ONLINE</span>
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 px-2 py-1 rounded text-[10px] border border-white/10">
              <span>🌦️</span>
              <span>Light Rain, 26°C</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2 rounded bg-white/5">
              <span className="text-gray-400">Upcoming Stop:</span>
              <span className="font-bold text-white">North Gate Hub (ETA 3 min)</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-white/5">
              <span className="text-gray-400">Traffic Status:</span>
              <span className="font-bold text-green-400">Clear (Normal)</span>
            </div>
          </div>
        </div>

        {/* Column 2: Occupancy & Onboard Passengers list */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Occupancy HUD</h3>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-gray-300">
              {totalOnboard}/40 Seats
            </span>
          </div>

          {/* Demographics bar chart display */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Women Reserved</span>
              <span>{categories.women} on board</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-pink-400 h-full rounded-full" style={{ width: `${Math.min(100, (categories.women / 8) * 100)}%` }} />
            </div>

            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Senior & Disabled</span>
              <span>{categories.senior + categories.disabled} on board</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-400 h-full rounded-full" style={{ width: `${Math.min(100, ((categories.senior + categories.disabled) / 6) * 100)}%` }} />
            </div>
          </div>

          {/* Passenger Roster */}
          <div className="flex-1 overflow-y-auto max-h-36 pr-1 space-y-1">
            {passengers.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6">No passengers resolved onboard yet.</div>
            ) : (
              passengers.map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-neutral-900 border border-white/5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span>{p.category === 'WOMEN' ? '👩' : (p.category === 'SENIOR_CITIZEN' ? '👴' : '👤')}</span>
                    <span className="font-bold">{p.passengerName}</span>
                  </div>
                  <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-400/30 uppercase">
                    {p.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Package co-carrying and Cargo links */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Co-Carried Cargo</h3>
          
          <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-2">
            {packages.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-10">No packages assigned to this route.</div>
            ) : (
              packages.map((pkg, idx) => (
                <div key={idx} className="p-3 bg-neutral-900 rounded-xl border border-white/5 text-xs flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-white">{pkg.packageId}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      pkg.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/10 text-blue-300'
                    }`}>
                      {pkg.priority}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Type: <span className="text-white font-bold">{pkg.type}</span> | Weight: <span className="text-white">{pkg.weightKg} kg</span>
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    Drop: <span className="text-yellow-400 font-medium">{pkg.dropCoordinates?.address || 'Stop Central'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 border-t border-white/5 pt-1.5">
                    <span className="text-[9px] text-green-400 font-bold uppercase">{pkg.status}</span>
                    <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-gray-300">OTP: {pkg.otpCode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
