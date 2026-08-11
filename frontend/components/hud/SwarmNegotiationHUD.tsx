import React, { useState, useEffect } from 'react';

export const SwarmNegotiationHUD: React.FC = () => {
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBids = async () => {
    try {
      const res = await fetch('/api/v2/lmis/swarm/bids');
      if (res.ok) {
        const data = await res.json();
        setBids(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 4000); // refresh every 4s
    return () => clearInterval(interval);
  }, []);

  const simulateBidAction = async () => {
    try {
      const mockBidId = `BID_${Math.floor(100000 + Math.random() * 900000)}`;
      const mockSender = Math.random() > 0.5 ? 'BUS_01' : 'DRN_01';
      const mockReceiver = mockSender === 'BUS_01' ? 'BUS_02' : 'DRN_02';
      const mockType = mockSender === 'BUS_01' ? 'PASSENGER_REDISTRIBUTION' : 'PARCEL_TRANSFER';

      await fetch('/api/v2/lmis/swarm/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bidId: mockBidId,
          senderAgentId: mockSender,
          receiverAgentId: mockReceiver,
          type: mockType,
          offerAmountPoints: Math.floor(80 + Math.random() * 80),
          details: { passengerCount: 4, urgencyLevel: 'HIGH' }
        })
      });
      fetchBids();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-white shadow-2xl w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-[10px] text-yellow-400 font-semibold uppercase tracking-wider font-mono">SWARM INTELLIGENCE</span>
          <h3 className="text-base font-bold text-white tracking-tight">P2P Swarm Negotiation HUD</h3>
        </div>
        <button 
          onClick={simulateBidAction}
          className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-neutral-900 font-extrabold text-[10px] rounded-xl transition duration-150 active:scale-95 uppercase"
        >
          ⚡ Post Mock Bid
        </button>
      </div>

      {loading && bids.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs">Awaiting swarm telemetry...</div>
      ) : bids.length === 0 ? (
        <div className="text-center py-10 bg-black/35 rounded-2xl border border-white/5 text-xs text-gray-400">
          No bids active in this sector. Grid green.
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {bids.map((bid) => (
            <div
              key={bid.bidId}
              className="p-3 bg-white/5 border border-white/5 hover:bg-white/10 transition rounded-xl flex justify-between items-center text-xs"
            >
              <div>
                <span className="font-extrabold text-yellow-400">{bid.senderAgentId}</span>
                <span className="text-gray-400"> ➔ </span>
                <span className="font-extrabold text-white">{bid.receiverAgentId}</span>
                <div className="text-[10px] text-gray-400 mt-1 uppercase font-mono tracking-wide">{bid.type.replace(/_/g, ' ')}</div>
              </div>
              <div className="text-right">
                <span className="font-mono text-green-400 font-extrabold">{bid.offerAmountPoints} pts</span>
                <div className={`text-[9px] font-bold uppercase mt-1 ${
                  bid.status === 'ACCEPTED' ? 'text-green-400' : (bid.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400')
                }`}>{bid.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
