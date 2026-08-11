export class GeoIpLookup {
    constructor() {
        this.ipMap = {
            '103.55.99': { country: 'IN', region: 'Bihar', city: 'Patna', latitude: 25.594, longitude: 85.137 },
            '103.88.42': { country: 'IN', region: 'Maharashtra', city: 'Mumbai', latitude: 19.076, longitude: 72.877 },
            '104.22.4': { country: 'US', region: 'Oregon', city: 'Portland', latitude: 45.515, longitude: -122.678 }
        };
    }

    lookup(ipAddress) {
        if (!ipAddress || typeof ipAddress !== 'string') {
            return this.getFallback();
        }

        // Parse first 3 octets
        const parts = ipAddress.split('.');
        if (parts.length >= 3) {
            const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
            const match = this.ipMap[prefix];
            if (match) {
                return { ...match, ip: ipAddress, resolved: true };
            }
        }

        return this.getFallback(ipAddress);
    }

    getFallback(ip = '127.0.0.1') {
        return {
            country: 'IN',
            region: 'Delhi',
            city: 'New Delhi',
            latitude: 28.613,
            longitude: 77.209,
            ip,
            resolved: false
        };
    }
}
