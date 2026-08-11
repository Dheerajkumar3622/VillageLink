import { GracefulShutdownManager } from './gracefulShutdown.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Graceful Shutdown Hooks Signal Verification     ║');
console.log('╚════════════════════════════════════════════════════════════════╗');

const runVerification = () => {
    const manager = new GracefulShutdownManager();

    let serverClosed = false;
    const mockServer = {
        close(cb) {
            serverClosed = true;
            cb();
        }
    };

    let dbClosed = false;
    const mockDb = {
        close() {
            dbClosed = true;
        }
    };

    console.log('🔵 Test 1: Simulating active request ingress trackings...');
    manager.trackConnection();
    manager.trackConnection();
    console.log(`   📍 Active Connections Counter: ${manager.activeConnections}`);

    if (manager.activeConnections === 2) {
        console.log('   ✅ PASS: Connection tracks registered correctly.');
    } else {
        console.error('   ❌ FAIL: Active request tracking mismatch.');
        process.exit(1);
    }

    console.log('\n🔵 Test 2: Triggering process shutdown sequence and blocking new ingress...');
    
    let exitCodeReturned = null;
    const mockExitCallback = (code) => {
        exitCodeReturned = code;
    };

    manager.initiateShutdown(mockServer, mockDb, mockExitCallback);
    console.log(`   📍 Shutdown In-Progress Flag: ${manager.isShuttingDown}`);

    try {
        manager.trackConnection();
        console.error('   ❌ FAIL: Server accepted request during shutdown sequence.');
        process.exit(1);
    } catch (err) {
        console.log(`   ✅ PASS: Blocked incoming connection (Error: "${err.message}").`);
    }

    console.log('\n🔵 Test 3: Releasing pending connections and verifying database cleanup...');

    // Release the active connections
    manager.releaseConnection();
    manager.releaseConnection();
    console.log(`   📍 Active Connections Remaining: ${manager.activeConnections}`);

    // Wait 150ms for the drain check interval to execute
    setTimeout(() => {
        console.log(`   📍 Server Close Executed: ${serverClosed}`);
        console.log(`   📍 Database Disconnect Executed: ${dbClosed}`);
        console.log(`   📍 Process Exit Code: ${exitCodeReturned}`);

        if (serverClosed && dbClosed && exitCodeReturned === 0) {
            console.log('   ✅ PASS: Clean shutdown completed, all database client handles closed.');
            console.log('\n🎉 SUCCESS: All Graceful Shutdown Hooks checks passed!');
        } else {
            console.error('   ❌ FAIL: Process did not exit cleanly or database was not closed.');
            process.exit(1);
        }
    }, 150);
};

runVerification();
