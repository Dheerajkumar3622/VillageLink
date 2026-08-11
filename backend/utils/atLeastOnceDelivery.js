/**
 * At-Least-Once Message Delivery Manager
 * Guarantees zero message loss by retrying dispatches until a receiver ACK is logged.
 */

export class DeliveryManager {
    constructor(retryIntervalMs = 150) {
        this.retryInterval = retryIntervalMs;
        this.pendingMessages = new Map(); // messageId -> message record
    }

    /**
     * Sends a message, initializing retry timers until acknowledgeReceipt is called
     * @param {string} messageId Unique message tracking ID
     * @param {Object} payload Event data packet
     * @param {Object} targetNode Mock server node with .receive() method
     */
    sendMessage(messageId, payload, targetNode) {
        const record = {
            messageId,
            payload,
            targetNode,
            attempts: 1,
            maxAttempts: 5,
            timer: null
        };

        // Dispatch initial delivery attempt
        targetNode.receive(messageId, payload);

        // Schedule automated retry interval
        record.timer = setInterval(() => {
            this.retryMessage(messageId);
        }, this.retryInterval);

        this.pendingMessages.set(messageId, record);
    }

    /**
     * Retries dispatching unacknowledged message
     */
    retryMessage(messageId) {
        const record = this.pendingMessages.get(messageId);
        if (!record) return;

        if (record.attempts >= record.maxAttempts) {
            console.error(`   [DeliveryManager] Message "${messageId}" exceeded max retry attempts (${record.maxAttempts}). Giving up.`);
            this.clearMessageTimer(messageId);
            return;
        }

        record.attempts++;
        console.warn(`   [DeliveryManager] Message "${messageId}" ACK timeout. Retrying attempt #${record.attempts}...`);
        
        try {
            record.targetNode.receive(messageId, record.payload);
        } catch (err) {
            console.error(`   [DeliveryManager] Delivery attempt failed: "${err.message}"`);
        }
    }

    /**
     * Acknowledges message receipt, stopping retry timers
     */
    acknowledgeReceipt(messageId) {
        const record = this.pendingMessages.get(messageId);
        if (record) {
            this.clearMessageTimer(messageId);
            console.log(`   [DeliveryManager] Message "${messageId}" acknowledged successfully on attempt #${record.attempts}.`);
            return true;
        }
        return false;
    }

    clearMessageTimer(messageId) {
        const record = this.pendingMessages.get(messageId);
        if (record) {
            if (record.timer) {
                clearInterval(record.timer);
            }
            this.pendingMessages.delete(messageId);
        }
    }

    stopAll() {
        for (const messageId of this.pendingMessages.keys()) {
            this.clearMessageTimer(messageId);
        }
    }
}
