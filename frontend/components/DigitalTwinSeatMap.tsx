
import React from 'react';
import { User, Box, Shield, MonitorSmartphone } from 'lucide-react';

interface DigitalTwinSeatMapProps {
  onSelectSeat: (seatId: string) => void;
  selectedSeat: string | null;
}

export const DigitalTwinSeatMap: React.FC<DigitalTwinSeatMapProps> = ({ onSelectSeat, selectedSeat }) => {
  const seats = Array.from({ length: 12 }, (_, i) => {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const isAisle = col === 1; 
    const status = i < 4 ? 'OCCUPIED' : (i === 10 ? 'CARGO' : 'AVAILABLE');
    const isFemale = i === 4; 
    return { id: `S-${i+1}`, row, col: isAisle ? col + 1 : col, status, isFemale };
  });

  return (
    <div className="bg-slate-900 rounded-[32px] p-6 relative overflow-hidden perspective-800 shadow-2xl border border-slate-800">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 relative z-10">
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                 <MonitorSmartphone size={16} className="text-blue-400" />
             </div>
             <div>
                 <h3 className="text-white font-bold text-sm leading-none">Live Seat View</h3>
                 <p className="text-[10px] text-slate-400 mt-1">Real-time Digital Twin</p>
             </div>
         </div>
         <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
         </span>
      </div>

      {/* Bus Interior */}
      <div className="bg-slate-800/90 rounded-[40px] p-4 border-4 border-slate-700 mx-auto max-w-[260px] shadow-2xl transform rotate-x-12 relative">
         
         {/* Driver Cabin */}
         <div className="w-full flex justify-end mb-8 relative">
             <div className="w-10 h-10 border-2 border-slate-600 rounded-lg flex items-center justify-center bg-slate-700/50">
                 <span className="text-[8px] text-slate-400 font-bold uppercase rotate-90">Driver</span>
             </div>
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-1 bg-slate-600 rounded-full"></div>
         </div>
         
         {/* Seats Grid */}
         <div className="grid grid-cols-5 gap-3 mb-4">
            {seats.map((seat, idx) => (
                <div 
                    key={seat.id}
                    onClick={() => seat.status === 'AVAILABLE' && onSelectSeat(seat.id)}
                    className={`
                        w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-lg transition-all duration-300 relative group
                        ${seat.col === 2 ? 'col-span-2 opacity-0 pointer-events-none' : ''} 
                        ${seat.status === 'OCCUPIED' ? 'bg-slate-600/50 text-slate-500 cursor-not-allowed border border-slate-600' : 
                          seat.status === 'CARGO' ? 'bg-amber-900/30 text-amber-500 border border-amber-600/50' :
                          selectedSeat === seat.id ? 'bg-emerald-500 text-white scale-110 shadow-emerald-500/30 ring-2 ring-white z-10' : 
                          'bg-slate-700 text-white hover:bg-slate-600 cursor-pointer border border-slate-600 hover:border-slate-500'}
                    `}
                >
                    {seat.status === 'OCCUPIED' ? <User size={14} /> : 
                     seat.status === 'CARGO' ? <Box size={14} /> :
                     seat.isFemale ? <Shield size={14} className="text-pink-400" /> :
                     seat.id.split('-')[1]}
                     
                    {/* Tooltip */}
                    {seat.status === 'AVAILABLE' && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl font-bold">
                            Select
                        </div>
                    )}
                </div>
            ))}
         </div>

         {/* Rear Engine Area */}
         <div className="w-full h-3 bg-slate-700 mt-4 rounded-full border border-slate-600 flex justify-center items-center">
             <div className="w-1/2 h-1 bg-red-500/20 rounded-full"></div>
         </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-6 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-700 rounded-sm border border-slate-600"></div> Empty</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-600 rounded-sm"></div> Taken</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-sm"></div> Your Seat</div>
      </div>
    </div>
  );
};
