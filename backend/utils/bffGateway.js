/**
 * BFF (Backend for Frontend) Gateway Coordinator
 * Intercepts general DB records and compiles client-optimized data contracts.
 * Prunes heavy system overhead and joins related telemetry matrices on demand.
 */

/**
 * Formats a highly compressed produce list optimized for Kisan (Farmer) mobile view.
 * Eliminates developer telemetry, history tracking, and internal DB flags.
 */
export const compileKisanBffData = (rawProduceList) => {
    return rawProduceList.map(item => ({
        id: item._id || item.id,
        title: item.itemName,
        price: item.currentPrice,
        unit: item.weightUnit || 'quintal',
        marketName: item.villageMarketName,
        availableQty: item.quantityAvailable
    }));
};

/**
 * Compiles a rich aggregate routing list optimized for logistics drivers & providers.
 * Joins coordinate telemetry with active bidder arrays.
 */
export const compileProviderBffData = (rawProduceList, rawBidsList) => {
    return rawProduceList.map(produce => {
        const matchingBids = rawBidsList
            .filter(bid => bid.produceId === (produce._id || produce.id))
            .map(bid => ({
                bidderName: bid.username,
                amount: bid.bidAmount,
                timestamp: bid.createdEpoch
            }));

        return {
            deliveryId: produce._id || produce.id,
            location: {
                name: produce.villageMarketName,
                lat: produce.latitude,
                lng: produce.longitude
            },
            produceDetails: {
                name: produce.itemName,
                weight: produce.quantityAvailable
            },
            bidsCount: matchingBids.length,
            highestBid: matchingBids.reduce((max, b) => b.amount > max ? b.amount : max, 0),
            bids: matchingBids
        };
    });
};
