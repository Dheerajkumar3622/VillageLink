/**
 * WebRTC P2P Data Channel & Signaling Coordinator
 * Simulates Peer Connection states, ICE exchange, and direct data transmission.
 */

export class MockDataChannel {
    constructor(label, remoteChannelRef = null) {
        this.label = label;
        this.remoteChannelRef = remoteChannelRef;
        this.onmessage = () => {};
    }

    /**
     * Sends a data packet directly to the remote peer's channel handler
     */
    send(message) {
        if (!this.remoteChannelRef) {
            throw new Error('DataChannel: Connection is not established.');
        }
        
        // Deliver directly to peer callback asynchronously
        setImmediate(() => {
            this.remoteChannelRef.onmessage({
                data: message,
                timestamp: Date.now()
            });
        });
    }

    setRemoteReference(remoteRef) {
        this.remoteChannelRef = remoteRef;
    }
}

export class PeerConnection {
    constructor(peerId) {
        this.peerId = peerId;
        this.connectionState = 'new'; // new, connecting, connected, closed
        this.localDescription = null;
        this.remoteDescription = null;
        this.dataChannels = new Map();
    }

    /**
     * Generates a mock Session Description (SDP) offer
     */
    createOffer() {
        return {
            type: 'offer',
            sdp: `v=0\no=alice 2890844526\ns=VillageLink P2P Session\nt=0 0\na=group:bundle data\na=mid:data\n`
        };
    }

    /**
     * Generates a mock Session Description (SDP) answer
     */
    createAnswer() {
        return {
            type: 'answer',
            sdp: `v=0\no=bob 2890844527\ns=VillageLink P2P Session\nt=0 0\na=group:bundle data\na=mid:data\n`
        };
    }

    setLocalDescription(description) {
        this.localDescription = description;
        this.checkConnectionState();
    }

    setRemoteDescription(description) {
        this.remoteDescription = description;
        this.checkConnectionState();
    }

    checkConnectionState() {
        if (this.localDescription && this.remoteDescription && this.connectionState !== 'connected') {
            this.connectionState = 'connected';
            console.log(`   [WebRTC:${this.peerId}] signaling completed. ConnectionState: CONNECTED.`);
        }
    }

    /**
     * Instantiates a bidirectionally mapped data channel connection
     */
    createDataChannel(label) {
        const channel = new MockDataChannel(label);
        this.dataChannels.set(label, channel);
        return channel;
    }

    close() {
        this.connectionState = 'closed';
        this.dataChannels.clear();
        console.log(`   [WebRTC:${this.peerId}] Peer connection closed.`);
    }
}
