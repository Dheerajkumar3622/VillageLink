/**
 * Chaos Engineering - Chaos Monkey Simulator
 * Deliberately injects randomized failures and network latency into system executions.
 * Validates resilience and error recovery capabilities of services under test.
 */

export const config = {
    enabled: false,
    errorRate: 0.15,      // 15% probability of error injection
    minLatencyMs: 50,     // 50ms minimum injection delay
    maxLatencyMs: 150     // 150ms maximum injection delay
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wraps any task execution to inject failure and latency parameters based on configuration.
 */
export const injectChaos = async (actionFn) => {
    if (!config.enabled) {
        return actionFn();
    }

    // 1. Simulating random failures
    if (Math.random() < config.errorRate) {
        throw new Error('Simulated Chaos Monkey Error: Network Connection Dropped');
    }

    // 2. Simulating network latency jitter
    const latencyRange = config.maxLatencyMs - config.minLatencyMs;
    const latencyJitter = Math.floor(Math.random() * latencyRange) + config.minLatencyMs;
    
    await delay(latencyJitter);

    // 3. Complete the wrapped task
    return actionFn();
};
