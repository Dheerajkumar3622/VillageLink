/**
 * GeoDNS Routing Engine Simulator
 * Resolves a hostname to a specific regional server IP address based on user geography.
 */

const REGIONAL_POOLS = {
    NORTH: { region: 'North India', node: 'DELHI-NCR', ip: '103.86.122.1' },
    EAST: { region: 'East India', node: 'KOLKATA', ip: '103.86.122.2' },
    WEST: { region: 'West India', node: 'MUMBAI', ip: '103.86.122.3' },
    SOUTH: { region: 'South India', node: 'BANGALORE', ip: '103.86.122.4' },
    GLOBAL: { region: 'Global Anycast Node', node: 'ANYCAST-HUB', ip: '103.86.122.0' }
};

const STATE_MAPPING = {
    // East India
    bihar: 'EAST', westbengal: 'EAST', jharkhand: 'EAST', odisha: 'EAST', assam: 'EAST',
    // West India
    maharashtra: 'WEST', gujarat: 'WEST', rajasthan: 'WEST', goa: 'WEST',
    // North India
    delhi: 'NORTH', punjab: 'NORTH', haryana: 'NORTH', uttarpradesh: 'NORTH', uttarakhand: 'NORTH',
    // South India
    karnataka: 'SOUTH', tamilnadu: 'SOUTH', kerala: 'SOUTH', andhrapradesh: 'SOUTH', telangana: 'SOUTH'
};

/**
 * Resolves optimal API endpoint IP based on user state
 */
export const resolveGeoDNS = (state = '', country = 'IN') => {
    if (country !== 'IN') {
        return REGIONAL_POOLS.GLOBAL;
    }

    const cleanState = state.toLowerCase().replace(/[\s_]/g, '');
    const poolKey = STATE_MAPPING[cleanState] || 'GLOBAL';
    
    return REGIONAL_POOLS[poolKey];
};
