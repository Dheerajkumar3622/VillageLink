/**
 * Circuit Breaker Pattern Coordinator
 * Wraps external service connections to isolate downstream node failures.
 * Transitions state gracefully: CLOSED <-> OPEN -> HALF-OPEN -> CLOSED.
 */

export class CircuitBreaker {
    constructor(name, failureThreshold = 3, cooldownMs = 2000) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
        
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
        this.failuresCount = 0;
        this.lastStateChange = Date.now();
    }

    /**
     * Executes the protected task action or invokes the local fallback on failure
     */
    async execute(actionFn, fallbackFn) {
        this.evaluateCooldownState();

        if (this.state === 'OPEN') {
            return fallbackFn();
        }

        try {
            const result = await actionFn();
            this.handleSuccess();
            return result;
        } catch (error) {
            this.handleFailure();
            return fallbackFn();
        }
    }

    /**
     * Checks if the cooling timer has expired while in an OPEN state
     */
    evaluateCooldownState() {
        if (this.state === 'OPEN') {
            const elapsed = Date.now() - this.lastStateChange;
            if (elapsed >= this.cooldownMs) {
                this.state = 'HALF-OPEN';
                this.lastStateChange = Date.now();
                console.log(`   [CircuitBreaker:${this.name}] Cooldown expired. Testing path: state -> HALF-OPEN`);
            }
        }
    }

    /**
     * Marks a success call to reset state parameters
     */
    handleSuccess() {
        if (this.state === 'HALF-OPEN') {
            this.state = 'CLOSED';
            this.failuresCount = 0;
            this.lastStateChange = Date.now();
            console.log(`   [CircuitBreaker:${this.name}] Trial call succeeded. Resetting path: state -> CLOSED`);
        }
    }

    /**
     * Handles failures and transitions state to OPEN if threshold is crossed
     */
    handleFailure() {
        this.failuresCount++;
        
        const shouldTrip = this.failuresCount >= this.failureThreshold || this.state === 'HALF-OPEN';
        
        if (shouldTrip) {
            this.state = 'OPEN';
            this.lastStateChange = Date.now();
            console.warn(`   [CircuitBreaker:${this.name}] Failure threshold crossed. Tripping circuit: state -> OPEN`);
        }
    }

    /**
     * Helper to get current status parameters
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failuresCount
        };
    }
}
