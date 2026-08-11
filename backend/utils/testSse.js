import { registerSseClient, broadcastSseEvent, getActiveListenerCount, clearSseConnections } from './sseManager.js';
import { EventEmitter } from 'events';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Server-Sent Events W3C Format Validation         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = () => {
    clearSseConnections();
    
    // 1. Mock request & response streams
    const mockReq = new EventEmitter();
    
    let headersWritten = null;
    const writtenChunks = [];

    const mockRes = {
        writeHead: (status, headers) => {
            headersWritten = { status, headers };
        },
        write: (chunk) => {
            writtenChunks.push(chunk);
        }
    };

    console.log('🔵 Test 1: Registering SSE client connection...');
    
    registerSseClient(mockReq, mockRes);
    
    console.log(`   📍 Connection Registry Count: ${getActiveListenerCount()}`);
    console.log(`   📍 Handshake payload written:`, JSON.stringify(writtenChunks[0]));

    const headersOk = headersWritten !== null &&
                      headersWritten.status === 200 &&
                      headersWritten.headers['Content-Type'] === 'text/event-stream' &&
                      headersWritten.headers['Connection'] === 'keep-alive';

    const handshakeOk = writtenChunks.length === 1 &&
                        writtenChunks[0].includes('event: handshake') &&
                        writtenChunks[0].includes('data:');

    if (headersOk && handshakeOk) {
        console.log('   ✅ PASS: Connection initialized with correct event-stream headers.');
    } else {
        console.error('   ❌ FAIL: Connection headers or initial handshake payload mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Broadcasting structured updates to client streams...');

    const samplePayload = { crop: 'Basmati Rice', price: 3200, location: 'Buxar' };
    const broadcastsCount = broadcastSseEvent('mandi-price-ticker', samplePayload);

    console.log(`   📍 Active Broadcast Client Count: ${broadcastsCount}`);
    console.log(`   📍 Broadcast Chunk Written:\n${writtenChunks[1]}`);

    const formatOk = writtenChunks.length === 2 &&
                     writtenChunks[1].startsWith('event: mandi-price-ticker\n') &&
                     writtenChunks[1].includes('data: {"crop":"Basmati Rice"') &&
                     writtenChunks[1].endsWith('\n\n');

    if (formatOk) {
        console.log('   ✅ PASS: Message compiled conforming to W3C Server-Sent Events spec.');
    } else {
        console.error('   ❌ FAIL: SSE text stream compilation format mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 3: Cleaning up client connections on close...');

    mockReq.emit('close');
    console.log(`   📍 Active Listener Count: ${getActiveListenerCount()}`);

    if (getActiveListenerCount() === 0) {
        console.log('   ✅ PASS: SSE connection references cleaned up on disconnect.');
        console.log('\n🎉 SUCCESS: All Server-Sent Events spec checks passed!');
    } else {
        console.error('   ❌ FAIL: Connection leaks detected.');
        process.exit(1);
    }
};

runVerification();
