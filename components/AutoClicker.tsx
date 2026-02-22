import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AutoClicker: React.FC = () => {
    const [isActive, setIsActive] = useState(true);
    const [lastPing, setLastPing] = useState<string | null>(null);
    const [pingCount, setPingCount] = useState(0);
    const [status, setStatus] = useState<'IDLE' | 'PINGING' | 'SUCCESS' | 'ERROR'>('IDLE');

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive) {
            const performPing = async () => {
                setStatus('PINGING');
                try {
                    const response = await fetch(`${API_BASE_URL}/api/health`);
                    if (response.ok) {
                        setStatus('SUCCESS');
                        setLastPing(new Date().toLocaleTimeString());
                        setPingCount(prev => prev + 1);
                    } else {
                        setStatus('ERROR');
                    }
                } catch (error) {
                    setStatus('ERROR');
                }
                setTimeout(() => setStatus('IDLE'), 2000);
            };

            // Ping every 5 minutes while the dashboard is open
            performPing();
            interval = setInterval(performPing, 5 * 60 * 1000);
        }

        return () => clearInterval(interval);
    }, [isActive]);

    return (
        <div className="bg-slate-800/50 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    <h3 className="text-white font-semibold text-sm">Server Auto-Clicker</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={isActive} 
                        onChange={() => setIsActive(!isActive)} 
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400">
                <div className="bg-black/20 p-2 rounded">
                    <p className="uppercase opacity-50">Status</p>
                    <p className={`font-mono ${status === 'SUCCESS' ? 'text-green-400' : status === 'ERROR' ? 'text-red-400' : 'text-blue-400'}`}>
                        {status}
                    </p>
                </div>
                <div className="bg-black/20 p-2 rounded">
                    <p className="uppercase opacity-50">Total Pings</p>
                    <p className="font-mono text-white">{pingCount}</p>
                </div>
            </div>
            {lastPing && (
                <p className="text-[9px] mt-2 text-center text-gray-500 italic">
                    Last Heartbeat: {lastPing}
                </p>
            )}
        </div>
    );
};

export default AutoClicker;
