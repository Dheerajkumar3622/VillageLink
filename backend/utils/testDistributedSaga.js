import { DistributedSaga } from './distributedSaga.js';

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║               Distributed Saga Pattern Transaction Validation  ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const runVerification = async () => {
    // Stateful service mock database flags
    let bookingCreated = false;
    let seatLocked = false;
    let walletDebited = false;

    // Step logic mapping
    const step1Execute = async (ctx) => { bookingCreated = true; ctx.bookingId = 'B-100'; };
    const step1Compensate = async (ctx) => { bookingCreated = false; delete ctx.bookingId; };

    const step2Execute = async (ctx) => { seatLocked = true; ctx.seatNo = 'A4'; };
    const step2Compensate = async (ctx) => { seatLocked = false; delete ctx.seatNo; };

    const step3Execute = async (ctx) => {
        if (ctx.balance < ctx.cost) {
            throw new Error('INSUFFICIENT_WALLET_BALANCE');
        }
        walletDebited = true;
    };
    const step3Compensate = async (ctx) => { walletDebited = false; };

    // Instantiate Saga
    const saga = new DistributedSaga('TicketBookingSaga');
    saga.addStep('CreateBookingRecord', step1Execute, step1Compensate);
    saga.addStep('LockTransitSeat', step2Execute, step2Compensate);
    saga.addStep('DebitClientWallet', step3Execute, step3Compensate);

    console.log('🔵 Phase 1: Executing successful Saga transaction (funds available)...');
    
    const contextSuccess = { balance: 500, cost: 200 };
    const res1 = await saga.execute(contextSuccess);

    console.log(`   📍 Saga Result: ${res1.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📍 DB Flags - Booking: ${bookingCreated} | Seat: ${seatLocked} | Wallet: ${walletDebited}`);

    const phase1Ok = res1.success && bookingCreated && seatLocked && walletDebited;
    if (phase1Ok) {
        console.log('   ✅ PASS: Transaction completed with zero compensation events.');
    } else {
        console.error('   ❌ FAIL: Success track assertion failed.');
        process.exit(1);
    }

    console.log('\n🔵 Phase 2: Simulating intermediate step failure and rollback (funds exhausted)...');

    // Reset database flags
    bookingCreated = false;
    seatLocked = false;
    walletDebited = false;

    const contextFail = { balance: 50, cost: 200 };
    let errorCaught = false;

    try {
        await saga.execute(contextFail);
    } catch (err) {
        errorCaught = true;
        console.log(`   📍 Exec Caught Error: "${err.message}"`);
    }

    console.log(`   📍 DB Flags - Booking: ${bookingCreated} | Seat: ${seatLocked} | Wallet: ${walletDebited}`);

    const phase2Ok = errorCaught && !bookingCreated && !seatLocked && !walletDebited;
    if (phase2Ok) {
        console.log('   ✅ PASS: Intermediate failure correctly triggered compensating rollbacks.');
        console.log('\n🎉 SUCCESS: All Distributed Saga Pattern checks passed!');
    } else {
        console.error('   ❌ FAIL: Compensation rollback failed. Data inconsistent!');
        process.exit(1);
    }
};

runVerification();
