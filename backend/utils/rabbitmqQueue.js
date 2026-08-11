import crypto from 'crypto';

/**
 * RabbitMQ Bounded Work Queue & Competing Consumer Simulator
 * Handles round-robin task routing, worker registration, and message acknowledgements (ACK/NACK).
 */

export class RabbitMQ {
    constructor() {
        this.queue = [];
        this.workers = [];
        this.unacknowledgedTasks = new Map(); // taskId -> task metadata
        this.nextWorkerIndex = 0;
    }

    /**
     * Registers a competing worker instance
     */
    registerWorker(workerId, processTaskFn) {
        this.workers.push({
            workerId,
            process: processTaskFn
        });
        console.log(`   [RabbitMQ] Worker "${workerId}" registered to task queue.`);
        
        // Trigger processing loop if there are backlogged tasks
        this.checkBackloggedTasks();
    }

    /**
     * Publishes a time-consuming background task
     */
    publishTask(taskType, payload) {
        const taskId = `task-${crypto.randomBytes(4).toString('hex')}`;
        const task = {
            taskId,
            taskType,
            payload,
            retries: 0
        };

        if (this.workers.length === 0) {
            console.log(`   [RabbitMQ] No active workers. Backlogging task: "${taskId}"`);
            this.queue.push(task);
            return taskId;
        }

        this.dispatchTask(task);
        return taskId;
    }

    /**
     * Dispatches a task to the next available worker in a round-robin cycle
     */
    dispatchTask(task) {
        const worker = this.workers[this.nextWorkerIndex % this.workers.length];
        this.nextWorkerIndex++;

        // Track in unacknowledged map to handle potential worker crash
        this.unacknowledgedTasks.set(task.taskId, task);

        setImmediate(() => {
            try {
                worker.process(task, worker.workerId);
            } catch (err) {
                console.error(`   [RabbitMQ] Worker "${worker.workerId}" crashed during dispatch: "${err.message}"`);
                this.nack(task.taskId);
            }
        });
    }

    /**
     * Acknowledges successful task completion, purging it from the tracking store
     */
    ack(taskId) {
        if (this.unacknowledgedTasks.has(taskId)) {
            this.unacknowledgedTasks.delete(taskId);
            // Check for next queued task
            this.checkBackloggedTasks();
        }
    }

    nack(taskId) {
        const task = this.unacknowledgedTasks.get(taskId);
        if (task) {
            this.unacknowledgedTasks.delete(taskId);
            task.retries++;
            
            if (task.retries > 3) {
                console.error(`   [RabbitMQ] Task "${taskId}" exceeded max retries (3). Discarding to Dead Letter Queue.`);
                return;
            }

            console.warn(`   [RabbitMQ] Task "${taskId}" NACK received (Retry #${task.retries}). Re-queueing...`);
            
            if (this.workers.length > 0) {
                this.dispatchTask(task);
            } else {
                this.queue.unshift(task);
            }
        }
    }

    /**
     * Checks if backlog queue has elements and schedules them
     */
    checkBackloggedTasks() {
        if (this.queue.length > 0 && this.workers.length > 0) {
            const task = this.queue.shift();
            this.dispatchTask(task);
        }
    }

    /**
     * Returns size of unacknowledged tracks
     */
    getPendingCount() {
        return this.unacknowledgedTasks.size;
    }
}
