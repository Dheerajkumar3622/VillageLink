export class MultiRegionBalancer {
    constructor() {
        this.regions = {
            'ap-south-1': { name: 'ap-south-1 (Mumbai)', geo: 'IN', baseLatencyMs: 15, healthy: true },
            'ap-east-1': { name: 'ap-east-1 (Hong Kong)', geo: 'APAC', baseLatencyMs: 50, healthy: true },
            'us-west-2': { name: 'us-west-2 (Oregon)', geo: 'US', baseLatencyMs: 220, healthy: true }
        };
    }

    setNodeStatus(regionKey, isHealthy) {
        if (this.regions[regionKey]) {
            this.regions[regionKey].healthy = isHealthy;
            console.log(`   [Load Balancer] Health Status: Region "${regionKey}" set to: ${isHealthy ? 'ONLINE' : 'OFFLINE'}`);
        }
    }

    route(clientGeo) {
        let bestRegion = null;
        let failoverOccurred = false;

        let preferredKeys = [];
        if (clientGeo === 'IN') {
            preferredKeys = ['ap-south-1', 'ap-east-1', 'us-west-2'];
        } else if (clientGeo === 'APAC') {
            preferredKeys = ['ap-east-1', 'ap-south-1', 'us-west-2'];
        } else {
            preferredKeys = ['us-west-2', 'ap-east-1', 'ap-south-1'];
        }

        for (let i = 0; i < preferredKeys.length; i++) {
            const key = preferredKeys[i];
            const region = this.regions[key];
            if (region.healthy) {
                bestRegion = region;
                if (i > 0) {
                    failoverOccurred = true;
                }
                break;
            }
        }

        if (!bestRegion) {
            throw new Error('[Load Balancer] Critical: All global regions are offline!');
        }

        return {
            routedRegion: bestRegion.name,
            latencyMs: bestRegion.baseLatencyMs,
            failoverOccurred
        };
    }
}
