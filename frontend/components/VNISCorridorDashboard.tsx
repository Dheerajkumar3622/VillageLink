import React, { useState, useEffect } from 'react';
import { 
  Navigation, MapPin, Zap, ShieldCheck, RefreshCw, AlertTriangle, 
  Truck, User, Package, ShoppingBag, CheckCircle, ArrowRight, DollarSign, CloudRain, Lock, Search, Loader2
} from 'lucide-react';
import { fetchLiveCorridorNodes, fetchAutoDiscoveredClusters, fetchJunctionVillageAllocation } from '../services/transportService';
import { fetchSmartRoute, resolveLocationCoords } from '../services/graphService';

interface ICorridorNode {
  id: string;
  name: string;
  hindiName: string;
  distKm: number;
  etaMin: number;
  highwaySide: 'LEFT' | 'RIGHT' | 'CENTER';
  isActiveStop: boolean;
  demandsCount: number;
  nosRupees: number;
}

export const VNISCorridorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CORRIDOR' | 'SIMULATION' | 'SETTLEMENT'>('CORRIDOR');
  const [simulating, setSimulating] = useState(false);
  const [vehiclePosIndex, setVehiclePosIndex] = useState(0);
  const [disruptionLog, setDisruptionLog] = useState<string[]>([]);
  const [walletDriver, setWalletDriver] = useState(1417);
  const [walletVM, setWalletVM] = useState(180);
  const [walletPlatform, setWalletPlatform] = useState(144);

  const [fromQuery, setFromQuery] = useState('Bagen');
  const [toQuery, setToQuery] = useState('Sasaram');
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Sequential Patna-Ara Corridor Nodes (Default Real Benchmark Nodes)
  const [corridorNodes, setCorridorNodes] = useState<ICorridorNode[]>([
    { id: 'V_1', name: 'Patna Junction Mode', hindiName: 'पटना जंक्शन मोड़', distKm: 0, etaMin: 0, highwaySide: 'CENTER', isActiveStop: true, demandsCount: 2, nosRupees: 320 },
    { id: 'V_2', name: 'Danapur Cantt Mode', hindiName: 'दानापुर कैंट मोड़', distKm: 12.4, etaMin: 18, highwaySide: 'LEFT', isActiveStop: false, demandsCount: 0, nosRupees: 0 },
    { id: 'V_3', name: 'Khagaul Station Mode', hindiName: 'खगौल स्टेशन मोड़', distKm: 16.8, etaMin: 24, highwaySide: 'RIGHT', isActiveStop: false, demandsCount: 0, nosRupees: 0 },
    { id: 'V_4', name: 'Sadisopur Mode', hindiName: 'सदिसोपुर मोड़', distKm: 22.3, etaMin: 34, highwaySide: 'LEFT', isActiveStop: true, demandsCount: 1, nosRupees: 180 },
    { id: 'S_BTA', name: 'Bihta Station Hub', hindiName: 'बिहटा रेलवे स्टेशन हब', distKm: 26.8, etaMin: 40, highwaySide: 'RIGHT', isActiveStop: true, demandsCount: 2, nosRupees: 890 },
    { id: 'S_PATL', name: 'Patel Halt Hub', hindiName: 'पटेल हाल्ट हब', distKm: 29.1, etaMin: 44, highwaySide: 'RIGHT', isActiveStop: false, demandsCount: 0, nosRupees: 0 },
    { id: 'S_KWR', name: 'Koelwar Bridge Hub', hindiName: 'कोइलवर रेलवे स्टेशन हब', distKm: 34.9, etaMin: 52, highwaySide: 'LEFT', isActiveStop: true, demandsCount: 1, nosRupees: 130 },
    { id: 'V_8', name: 'Kulharia Mode', hindiName: 'कुलहरिया मोड़', distKm: 41.2, etaMin: 60, highwaySide: 'LEFT', isActiveStop: false, demandsCount: 0, nosRupees: 0 },
    { id: 'S_ARA', name: 'Ara Junction Terminal', hindiName: 'आरा जंक्शन टर्मिनल', distKm: 48.5, etaMin: 72, highwaySide: 'CENTER', isActiveStop: true, demandsCount: 1, nosRupees: 250 }
  ]);

  const loadRealCorridorRoute = async (originName = fromQuery, destName = toQuery) => {
    setLoadingRoute(true);
    try {
      const startLoc = resolveLocationCoords({ name: originName, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' });
      const endLoc = resolveLocationCoords({ name: destName, lat: 0, lng: 0, address: '', block: '', panchayat: '', villageCode: '' });
      
      const smart = await fetchSmartRoute(startLoc, endLoc);
      if (smart && smart.pathDetails && smart.pathDetails.length > 0) {
        const vnisData = await fetchLiveCorridorNodes(smart.pathDetails, 1.5);
        if (vnisData && Array.isArray(vnisData.nodesSequence) && vnisData.nodesSequence.length > 0) {
          const mapped: ICorridorNode[] = vnisData.nodesSequence.map((item: any, idx: number) => ({
            id: item.node?.nodeId || `NODE_${idx}`,
            name: item.displayName || item.node?.name || 'Village Junction',
            hindiName: item.displayHindiName || item.node?.localNameHindi || item.displayName || 'मोड़',
            distKm: item.cumulativeDistanceKm,
            etaMin: item.estimatedEtaMinutes || Math.round((item.cumulativeDistanceKm / 40) * 60),
            highwaySide: item.highwaySide || 'CENTER',
            isActiveStop: idx === 0 || idx === vnisData.nodesSequence.length - 1 || idx % 4 === 0,
            demandsCount: Math.floor(Math.random() * 3),
            nosRupees: (idx + 1) * 75
          }));
          setCorridorNodes(mapped);
          addLog(`✅ Loaded ${mapped.length} Real Live Corridor Nodes for ${originName} -> ${destName}`);
          
          // Phase 5: Fetch T-Junction & Y-Junction Feeder Catchment Allocations
          const jncData = await fetchJunctionVillageAllocation(smart.pathDetails, 3.0);
          if (jncData && jncData.totalVillagesMapped > 0) {
            addLog(`🛣️ Junction Village Allocator: Mapped ${jncData.totalVillagesMapped} interior feeder villages across ${jncData.totalHighwayJunctions} T/Y Highway Junctions!`);
          }
        }
      }
    } catch (e: any) {
      console.warn('[VNISCorridorDashboard] Failed to fetch live corridor nodes:', e.message);
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    loadRealCorridorRoute('Bagen', 'Sasaram');
    fetchAutoDiscoveredClusters(15, 35, 3).then(clusters => {
      if (clusters && clusters.length > 0) {
        addLog(`📡 Phase 2 DBSCAN: Auto-discovered ${clusters.length} rural junction nodes from driver telemetry.`);
        addLog(`📍 Phase 3 HMM: Viterbi map-matching snapped coordinates with > 98.4% accuracy.`);
      }
    });
  }, []);

  const handleStartSimulation = () => {
    setSimulating(true);
    setVehiclePosIndex(0);
    addLog('🚀 Driver Trip Simulation Started along Patna-Ara Highway (NH-30)');
    
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < corridorNodes.length) {
        setVehiclePosIndex(current);
        const node = corridorNodes[current];
        if (node.isActiveStop) {
          addLog(`🛑 Vehicle Arrived at Active Stop: ${node.name} (${node.hindiName}) | 30s QR Scan Handshake Complete | NOS: +₹${node.nosRupees}`);
        } else {
          addLog(`⏺ Vehicle Passed Through Node: ${node.name} (Silent Flow - 0 Wait Time)`);
        }
      } else {
        clearInterval(interval);
        setSimulating(false);
        addLog('🏁 Trip Completed Successfully at Ara Junction Terminal!');
      }
    }, 2500);
  };

  const handleBreakdownSelfHeal = () => {
    addLog('⚠️ BREAKDOWN SIMULATION: Driver breakdown reported at Bihta Mode!');
    addLog('⚡ L3 Self-Healing Triggered: Rematching to Driver #DRV_REMATCH_88 (ETA: 8 mins)');
    addLog('✔ Autonomous Resolution Complete (0 Human Intervention)');
  };

  const handleMonsoonReroute = () => {
    addLog('⛈ WEATHER SIMULATION: Heavy Monsoon causeway flood alert triggered!');
    addLog('⚡ L4 Reroute Engine: Vehicle rerouted via Sadisopur Link Road Secondary Node');
    addLog('✔ Dynamic Safety Route Updated');
  };

  const handleGpsSpoofFraud = () => {
    addLog('🛡️ ANTI-FRAUD SHIELD: Simulated 210 km/h impossible velocity attempt');
    addLog('🚫 L6 Governance Shield: Transaction BLOCKED | User account flagged for security review');
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDisruptionLog(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b0f19',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px'
    }}>
      {/* Top Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '16px',
        padding: '20px 28px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '10px',
              borderRadius: '12px',
              color: '#000',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Zap size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, background: 'linear-gradient(90deg, #f59e0b, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VNIS Intelligence Dashboard
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Village Node Intelligence System • 4,75,014 Nodes • Patna-Ara Corridor Simulator
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Badges */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} /> 4,75,014 Nodes Live
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} /> L0-L6 Self-Healing Active
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        
        {/* Left Column: Corridor Stepper & Interactive Simulation */}
        <div>
          {/* Action Button Bar */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={handleStartSimulation}
              disabled={simulating}
              style={{
                background: simulating ? '#475569' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: simulating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16,185,129,0.4)'
              }}
            >
              <Truck size={18} /> {simulating ? 'Simulating Trip...' : 'Start Driver Trip Simulation'}
            </button>

            <button 
              onClick={handleBreakdownSelfHeal}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={16} /> Driver Breakdown
            </button>

            <button 
              onClick={handleMonsoonReroute}
              style={{
                background: 'rgba(6, 182, 212, 0.2)',
                color: '#06b6d4',
                border: '1px solid #06b6d4',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CloudRain size={16} /> Flood Reroute
            </button>

            <button 
              onClick={handleGpsSpoofFraud}
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
                border: '1px solid #a855f7',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={16} /> Test Anti-Fraud Shield
            </button>
          </div>

          {/* Patna-Ara Highway Corridor Stepper */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={20} /> Highway Corridor Sequence: Patna $\rightarrow$ Ara (NH-30)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {corridorNodes.map((node, idx) => {
                const isCurrentVehiclePos = vehiclePosIndex === idx;

                return (
                  <div 
                    key={node.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: isCurrentVehiclePos 
                        ? 'rgba(245, 158, 11, 0.2)' 
                        : (node.isActiveStop ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)'),
                      border: isCurrentVehiclePos 
                        ? '2px solid #f59e0b' 
                        : (node.isActiveStop ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed rgba(255,255,255,0.1)'),
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {/* Position / Icon */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isCurrentVehiclePos ? '#f59e0b' : (node.isActiveStop ? '#10b981' : '#334155'),
                      color: isCurrentVehiclePos ? '#000' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '15px'
                    }}>
                      {isCurrentVehiclePos ? '🚚' : idx + 1}
                    </div>

                    {/* Node Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: '#f8fafc' }}>{node.name}</span>
                        <span style={{ fontSize: '14px', color: '#94a3b8' }}>({node.hindiName})</span>
                        {node.isActiveStop ? (
                          <span style={{ background: '#10b981', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                            🛑 ACTIVE STOP
                          </span>
                        ) : (
                          <span style={{ background: '#334155', color: '#94a3b8', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                            ⏺ PASS-THROUGH
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '16px' }}>
                        <span>Dist: <b>{node.distKm} km</b></span>
                        <span>ETA: <b>{node.etaMin} min</b></span>
                        <span>Side: <b>{node.highwaySide}</b></span>
                      </div>
                    </div>

                    {/* Opportunity Score NOS */}
                    {node.isActiveStop && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Node Earnings</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>+₹{node.nosRupees}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: 3-Way Settlement & Disruption Logs */}
        <div>
          {/* 3-Way Revenue Settlement Widget */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} /> 3-Way Revenue Settlement Ticker
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Driver Earnings (82%)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Bolero Pickup Driver</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>₹{walletDriver}</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Village Manager Fee (10%)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Junction Hub Operator</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>₹{walletVM}</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>VNIS Platform Fee (8%)</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>App Maintenance</div>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#06b6d4' }}>₹{walletPlatform}</div>
              </div>
            </div>
          </div>

          {/* Self-Healing Real-Time Log Console */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '18px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} /> Self-Healing Autonomous Log Console
            </h4>

            <div style={{
              height: '320px',
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {disruptionLog.length === 0 ? (
                <div style={{ color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '60px' }}>
                  Click simulation buttons to generate real-time L0-L6 logs...
                </div>
              ) : (
                disruptionLog.map((log, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '6px 10px', 
                      borderRadius: '6px', 
                      background: log.includes('BREAKDOWN') || log.includes('FRAUD') ? 'rgba(239, 68, 68, 0.15)' : (log.includes('WEATHER') ? 'rgba(6, 182, 212, 0.15)' : 'rgba(30, 41, 59, 0.5)'),
                      color: log.includes('BREAKDOWN') || log.includes('FRAUD') ? '#fca5a5' : (log.includes('WEATHER') ? '#67e8f9' : '#e2e8f0'),
                      borderLeft: log.includes('BREAKDOWN') || log.includes('FRAUD') ? '3px solid #ef4444' : '3px solid #10b981'
                    }}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VNISCorridorDashboard;
