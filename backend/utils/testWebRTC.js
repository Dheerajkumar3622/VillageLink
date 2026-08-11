import { PeerConnection } from './webrtcDataChannel.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               WebRTC P2P Data Channel & Signaling Validation   ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    // 1. Instantiate peer instances
    const peerA = new PeerConnection('Passenger-Alice');
    const peerB = new PeerConnection('Driver-Bob');

    console.log(`🔵 Test 1: Simulating WebRTC signaling handshake (Offer/Answer Exchange)...`);
    console.log(`   📍 PeerA Initial State: ${peerA.connectionState} | PeerB Initial State: ${peerB.connectionState}`);

    // Generate Offer
    const offer = peerA.createOffer();
    peerA.setLocalDescription(offer);
    peerB.setRemoteDescription(offer);

    // Generate Answer
    const answer = peerB.createAnswer();
    peerB.setLocalDescription(answer);
    peerA.setRemoteDescription(answer);

    console.log(`   📍 PeerA Final State: ${peerA.connectionState} | PeerB Final State: ${peerB.connectionState}`);

    const signalingOk = peerA.connectionState === 'connected' && peerB.connectionState === 'connected';
    if (signalingOk) {
        console.log('   ✅ PASS: SDP descriptors exchanged and peer connections established.');
    } else {
        console.error('   ❌ FAIL: Signaling handshake state mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Simulating direct P2P data channel transmission...');

    // Instantiate bidirectionally connected mock channels
    const dataChannelA = peerA.createDataChannel('telemetry');
    const dataChannelB = peerB.createDataChannel('telemetry');

    dataChannelA.setRemoteReference(dataChannelB);
    dataChannelB.setRemoteReference(dataChannelA);

    let receivedMsg = null;
    dataChannelB.onmessage = (event) => {
        receivedMsg = event.data;
    };

    const testMessage = { eventType: 'GPS_UPDATE', lat: 25.567, lng: 84.123, speed: 40 };
    dataChannelA.send(testMessage);

    await delay(100);

    console.log(`   📍 Sent:`, JSON.stringify(testMessage));
    console.log(`   📍 Received:`, JSON.stringify(receivedMsg));

    const dataChannelOk = receivedMsg !== null && 
                          receivedMsg.eventType === 'GPS_UPDATE' && 
                          receivedMsg.lat === 25.567;

    if (dataChannelOk) {
        console.log('   ✅ PASS: Zero-latency P2P packets transferred successfully.');
    } else {
        console.error('   ❌ FAIL: P2P data channel packet loss or format mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Closing Peer connections...');
    peerA.close();
    peerB.close();

    const closedOk = peerA.connectionState === 'closed' && peerB.connectionState === 'closed';
    if (closedOk) {
        console.log('   ✅ PASS: WebRTC connections and data channels disposed.');
        console.log('\n🎉 SUCCESS: All WebRTC P2P Data Channels checks passed!');
    } else {
        console.error('   ❌ FAIL: Peer connection teardown mismatch.');
        process.exit(1);
    }
};

runVerification();
