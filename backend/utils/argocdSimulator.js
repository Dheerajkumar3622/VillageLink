/**
 * ArgoCD GitOps Continuous Delivery & Self-Healing Simulator
 * Detects configuration drifts and overrides out-of-sync parameters automatically.
 */

export class ArgoCdSimulator {
    constructor() {
        this.selfHealEnforced = true;
    }

    /**
     * Compares the target state in Git against live cluster resources
     */
    checkSyncStatus(gitState, liveClusterState) {
        const driftFoundKeys = [];

        // Compare properties
        for (const [key, desiredValue] of Object.entries(gitState)) {
            const liveValue = liveClusterState[key];
            if (desiredValue !== liveValue) {
                driftFoundKeys.push(key);
            }
        }

        if (driftFoundKeys.length > 0) {
            console.warn(`   [ArgoCD] OutOfSync! Configuration drift detected on parameters: [${driftFoundKeys.join(', ')}]`);
            return {
                synced: false,
                status: 'OutOfSync',
                driftedProperties: driftFoundKeys
            };
        }

        console.log('   [ArgoCD] Synced. Live cluster configuration matches Git repository state.');
        return {
            synced: true,
            status: 'Synced',
            driftedProperties: []
        };
    }

    /**
     * Overrides out-of-sync cluster resources to restore the git target state
     */
    autoHealState(gitState, liveClusterState) {
        const syncCheck = this.checkSyncStatus(gitState, liveClusterState);

        if (syncCheck.synced) {
            return {
                healed: false,
                status: 'Synced',
                state: liveClusterState
            };
        }

        if (!this.selfHealEnforced) {
            console.log('   [ArgoCD] Self-healing disabled. Skipping automated restoration.');
            return {
                healed: false,
                status: 'OutOfSync',
                state: liveClusterState
            };
        }

        console.log('   [ArgoCD] Self-heal: Reverting unauthorized modifications on cluster...');
        
        // Clone git state to simulate applying desired manifest
        const healedClusterState = { ...gitState };

        for (const key of syncCheck.driftedProperties) {
            console.log(`   📍 Reverted "${key}": Changed "${liveClusterState[key]}" back to git desired value "${gitState[key]}"`);
        }

        console.log('   [ArgoCD] Restored. Status reset to Synced.');

        return {
            healed: true,
            status: 'Synced',
            state: healedClusterState
        };
    }
}
