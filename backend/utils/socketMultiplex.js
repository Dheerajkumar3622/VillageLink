/**
 * Socket Connection Multiplexer & Demultiplexer
 * Enables multiple virtual streams (namespaces) to share one physical TCP connection transport.
 */

export class PhysicalSocket {
    constructor(nodeName) {
        this.nodeName = nodeName;
        this.namespaces = new Map(); // namespace -> Map of event listeners
        this.linkedPeer = null;
    }

    /**
     * Connects this socket directly to a peer socket to simulate connection link
     */
    linkPeer(peerSocket) {
        this.linkedPeer = peerSocket;
    }

    /**
     * Subscribes to events inside a logical namespace channel
     */
    subscribe(namespace, eventName, callback) {
        let nsMap = this.namespaces.get(namespace);
        if (!nsMap) {
            nsMap = new Map();
            this.namespaces.set(namespace, nsMap);
        }

        let eventListeners = nsMap.get(eventName);
        if (!eventListeners) {
            eventListeners = [];
            nsMap.set(eventName, eventListeners);
        }

        eventListeners.push(callback);
    }

    /**
     * Publishes a data packet over the shared channel wrapped with logical namespace details
     */
    emit(namespace, eventName, payload) {
        if (!this.linkedPeer) {
            throw new Error(`[Multiplexer] Socket ${this.nodeName} is not linked to any peer.`);
        }

        const envelope = {
            ns: namespace,
            ev: eventName,
            data: payload,
            sender: this.nodeName
        };

        const framePayload = JSON.stringify(envelope);
        
        // Transmit frame over physical connection
        setImmediate(() => {
            this.linkedPeer.receiveFrame(framePayload);
        });
    }

    /**
     * Receives raw physical frame, demultiplexes, and targets the registered namespace listeners
     */
    receiveFrame(rawFrame) {
        try {
            const envelope = JSON.parse(rawFrame);
            const nsMap = this.namespaces.get(envelope.ns);
            if (!nsMap) return; // No listeners registered on this namespace channel

            const listeners = nsMap.get(envelope.ev) || [];
            listeners.forEach(callback => {
                callback(envelope.data, envelope.sender);
            });
        } catch (err) {
            console.error(`   [Multiplexer:${this.nodeName}] Demux frame processing error: "${err.message}"`);
        }
    }
}
