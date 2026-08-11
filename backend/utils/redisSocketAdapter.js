/**
 * Redis Pub/Sub Socket Adapter Simulator
 * Coordinates socket broadcasts across horizontally scaled server nodes.
 * Distributes real-time events through a simulated Redis server backplane.
 */

export class RedisPubSubAdapter {
    constructor() {
        this.channels = new Map(); // channelName -> array of node subscriptions
    }

    /**
     * Registers a server node's listener callback on a shared channel
     */
    subscribeNode(channelName, nodeId, onMessageFn) {
        let nodeListeners = this.channels.get(channelName);
        if (!nodeListeners) {
            nodeListeners = [];
            this.channels.set(channelName, nodeListeners);
        }

        nodeListeners.push({
            nodeId,
            onMessage: onMessageFn
        });

        console.log(`   [RedisAdapter] Server node "${nodeId}" subscribed to channel: "${channelName}"`);
    }

    /**
     * Publishes a message to the Redis backplane, relaying to all subscribed nodes
     */
    publishMessage(channelName, message, senderNodeId) {
        const listeners = this.channels.get(channelName) || [];
        
        let dispatchCount = 0;
        listeners.forEach(sub => {
            // Relays to all listener nodes (including sender, standard Redis behavior)
            setImmediate(() => {
                sub.onMessage({
                    channel: channelName,
                    senderNodeId,
                    payload: message
                }, sub.nodeId);
            });
            dispatchCount++;
        });

        return dispatchCount;
    }

    /**
     * Resets subscriptions cache
     */
    clear() {
        this.channels.clear();
    }
}
