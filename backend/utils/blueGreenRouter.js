/**
 * Blue-Green Environment Traffic Router
 * Simulates instant zero-downtime traffic switches between cluster environments.
 * Keeps tracks of active endpoints and swaps targets to enable safe updates.
 */

let activeEnv = 'BLUE'; // Active cluster defaults to BLUE

const envConfigs = {
    BLUE: {
        url: 'http://blue-cluster.villagelink.local:8081',
        version: 'v1.4.2-stable'
    },
    GREEN: {
        url: 'http://green-cluster.villagelink.local:8082',
        version: 'v1.5.0-release'
    }
};

/**
 * Returns the currently active production environment config
 */
export const routeTraffic = () => {
    return envConfigs[activeEnv];
};

/**
 * Instantly swaps traffic to the passive cluster target
 */
export const switchActiveEnvironment = () => {
    const previous = activeEnv;
    activeEnv = (activeEnv === 'BLUE') ? 'GREEN' : 'BLUE';
    
    console.log(`   [BlueGreenRouter] Swapped active clusters: ${previous} -> ${activeEnv} | Routing target: ${envConfigs[activeEnv].url}`);
    
    return {
        previous,
        active: activeEnv,
        config: envConfigs[activeEnv]
    };
};

/**
 * Gets the current router configuration status
 */
export const getRouterStatus = () => {
    return {
        active: activeEnv,
        configs: envConfigs
    };
};
