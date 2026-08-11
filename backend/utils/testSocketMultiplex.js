import { PhysicalSocket } from './socketMultiplex.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Socket Connection Multiplexing Validation        ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runVerification = async () => {
    // 1. Establish single shared physical link
    const clientSocket = new PhysicalSocket('ClientEndpoint');
    const serverSocket = new PhysicalSocket('ServerEndpoint');

    clientSocket.linkPeer(serverSocket);
    serverSocket.linkPeer(clientSocket);

    // Trackers for demultiplexed logical stream receives
    const receivedChatMessages = [];
    const receivedGPSUpdates = [];

    console.log('🔵 Test 1: Registering logical namespace listeners on one socket connection...');

    // Subscribe to chat stream namespace
    serverSocket.subscribe('chat-namespace', 'new-chat-message', (data, sender) => {
        receivedChatMessages.push({ data, sender });
    });

    // Subscribe to tracking stream namespace
    serverSocket.subscribe('map-tracker-namespace', 'gps-position-change', (data, sender) => {
        receivedGPSUpdates.push({ data, sender });
    });

    console.log('\n🔵 Test 2: Emitting multiplexed events over shared connection...');

    // Client sends chat message
    clientSocket.emit('chat-namespace', 'new-chat-message', { author: 'Kisan-Arjun', text: 'basmati price updated' });
    
    // Client sends telemetry GPS update over the exact same socket connection
    clientSocket.emit('map-tracker-namespace', 'gps-position-change', { lat: 25.56, lng: 84.11 });

    await delay(100);

    console.log(`   📍 Received logical chat messages count: ${receivedChatMessages.length}`);
    console.log(`   📍 Received logical GPS position updates count: ${receivedGPSUpdates.length}`);

    // Assert logical channel isolation
    const chatOk = receivedChatMessages.length === 1 && 
                   receivedChatMessages[0].data.text === 'basmati price updated' &&
                   receivedChatMessages[0].sender === 'ClientEndpoint';

    const gpsOk = receivedGPSUpdates.length === 1 && 
                  receivedGPSUpdates[0].data.lat === 25.56 &&
                  receivedGPSUpdates[0].sender === 'ClientEndpoint';

    if (chatOk && gpsOk) {
        console.log('   ✅ PASS: Logical streams isolated and demultiplexed over single socket.');
        console.log('\n🎉 SUCCESS: All Socket Connection Multiplexing checks passed!');
    } else {
        console.error('   ❌ FAIL: Namespace routing leak or demux failure.');
        process.exit(1);
    }
};

runVerification();
