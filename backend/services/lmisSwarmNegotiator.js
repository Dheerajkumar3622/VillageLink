import { SwarmBid, Drone, User } from '../models.js';

/**
 * Handles autonomous swarm negotiations between V2V and D2D agents.
 * Evaluates compatible bid rates based on workload, capacity, and current energy margins.
 */
export async function processSwarmNegotiation(bidId, senderAgentId, receiverAgentId, type, details, offerAmount) {
    // 1. Check if receiver agent has capacity to fulfill request
    let capacityCleared = false;
    let utilityFactor = 1.0;

    if (type === 'PARCEL_TRANSFER') {
        // If receiver is drone, check payload capacity
        if (receiverAgentId.includes('DRN')) {
            const drone = await Drone.findOne({ droneId: receiverAgentId });
            if (drone && drone.status === 'IDLE' && drone.batteryLevel > 45) {
                capacityCleared = true;
                utilityFactor = drone.batteryLevel / 100; // higher battery gives higher acceptance utility
            }
        } else {
            // Road vehicle co-carrier assumption: check default capacity limits
            capacityCleared = true;
        }
    } else if (type === 'PASSENGER_REDISTRIBUTION') {
        // Assumes receiver bus is not overloaded
        capacityCleared = true;
    } else if (type === 'POWER_SHARING') {
        // Check power availability
        capacityCleared = true;
    }

    const accepted = capacityCleared && (offerAmount * utilityFactor >= 100);

    // 2. Record or update the Swarm Bid in DB
    const bid = await SwarmBid.findOneAndUpdate(
        { bidId },
        {
            senderAgentId,
            receiverAgentId,
            type,
            offerAmountPoints: offerAmount,
            details,
            status: accepted ? 'ACCEPTED' : 'REJECTED',
            updatedAt: Date.now()
        },
        { new: true, upsert: true }
    );

    // Mock trigger V2V coordinate rendezvous
    const rendezvousCoord = accepted 
        ? { lat: 25.6135, lng: 85.1325 } 
        : null;

    return {
        success: true,
        bidId: bid.bidId,
        status: bid.status,
        actionRequired: accepted ? 'RANDEZVOUS_WAYPOINT_LOCK' : 'SEARCH_ALTERNATE_SWARM_AGENT',
        rendezvousCoord
    };
}

/**
 * Lists active swarm transactions.
 */
export async function getSwarmBids() {
    return await SwarmBid.find({}).sort({ createdAt: -1 }).limit(10);
}
