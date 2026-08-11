/**
 * Distributed Saga Pattern Coordinator
 * Manages sequential local service transactions.
 * Orchestrates backward compensating updates to rollback changes if any intermediate step fails.
 */

export class DistributedSaga {
    constructor(name) {
        this.name = name;
        this.steps = [];
        this.successfulSteps = [];
    }

    /**
     * Registers a transaction step with an action and its corresponding rollback compensation
     * @param {string} stepName Name identifying the step
     * @param {Function} executeFn Action logic (returns Promise)
     * @param {Function} compensateFn Rollback logic (returns Promise)
     */
    addStep(stepName, executeFn, compensateFn) {
        this.steps.push({
            name: stepName,
            execute: executeFn,
            compensate: compensateFn
        });
    }

    /**
     * Executes all registered transaction steps sequentially
     * Triggers compensating rollbacks if any step throws an error
     */
    async execute(context = {}) {
        this.successfulSteps = [];
        console.log(`   [Saga:${this.name}] Starting transaction pipeline...`);

        for (const step of this.steps) {
            try {
                console.log(`     [Step:${step.name}] Executing...`);
                await step.execute(context);
                this.successfulSteps.push(step);
            } catch (error) {
                console.warn(`     [Step:${step.name}] FAILED: "${error.message}". Initializing rollback...`);
                await this.rollback(context);
                throw error; // Re-throw to inform client
            }
        }

        console.log(`   [Saga:${this.name}] SUCCESS: All steps completed.`);
        return { success: true, context };
    }

    /**
     * Triggers compensating actions in reverse order of successes
     */
    async rollback(context) {
        console.log(`   [Saga:${this.name}] Rolling back successes in reverse order...`);
        
        // Reverse iteration over successful steps
        for (let i = this.successfulSteps.length - 1; i >= 0; i--) {
            const step = this.successfulSteps[i];
            try {
                console.log(`     [Compensate:${step.name}] Reversing action...`);
                await step.compensate(context);
            } catch (compensateError) {
                console.error(`     [Compensate:${step.name}] CRITICAL: Rollback failed: "${compensateError.message}"`);
            }
        }
        
        console.log(`   [Saga:${this.name}] Rollback completed. Eventual consistency restored.`);
    }
}
