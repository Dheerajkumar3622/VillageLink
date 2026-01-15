
import { User, Ticket, Transaction, SMSLog, Route, Parcel } from '../models.js';
import crypto from 'crypto';
const PART_INDEX = {
    COMMAND: 0,
    ID: 1,
    EXTRA: 2
};

// GLOBAL SIMULATION STORE (To persist state during session-based testing)
const mockStore = {
    '9876543210': {
        walletBalance: 1000,
        smsSessionState: null
    }
};

/**
 * Keypad Driver Service
 * Handles parsing of SMS/USSD commands and executes business logic.
 */
export const handleDriverCommand = async (phoneNumber, message) => {
    const rawCommand = message.trim().toUpperCase();
    const parts = rawCommand.split(' ');
    const mainCommand = parts[PART_INDEX.COMMAND];

    // Find driver - Prioritize Simulation Mock
    let driver = null;

    if (phoneNumber === '9876543210') {
        const store = mockStore[phoneNumber];
        driver = {
            id: 'SIM-DRIVER-001',
            name: 'Simulation Driver',
            phone: phoneNumber,
            walletBalance: store.walletBalance,
            creditLimit: 500,
            creditUsed: 0,
            smsSessionState: store.smsSessionState,
            save: async function () {
                store.walletBalance = this.walletBalance;
                store.smsSessionState = this.smsSessionState;
            },
            connectionType: 'APP'
        };
    } else if (User.db.readyState === 1) {
        driver = await User.findOne({ phone: phoneNumber });
    }

    if (!driver) {
        return "❌ NOT REGISTERED: Please register at VillageLink Hub or call support.";
    }

    // Log the incoming message (Only if DB is up)
    if (User.db.readyState === 1) {
        const incomingLog = new SMSLog({
            id: `SMS-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
            driverId: driver.id,
            direction: 'INCOMING',
            phoneNumber,
            message,
            command: mainCommand
        });
        await incomingLog.save().catch(() => { });
    }

    let response = "";

    try {
        switch (mainCommand) {
            case 'SCAN':
                response = await handleScanCommand(driver, parts);
                break;
            case 'BALANCE':
                response = await handleBalanceCommand(driver);
                break;
            case 'START':
                response = await handleStartTripCommand(driver, parts);
                break;
            case 'STOP':
                response = await handleStopTripCommand(driver);
                break;
            case 'ONLINE':
                driver.connectionType = 'SMS';
                driver.isVerified = true; // For pilot simplicity
                await driver.save();
                response = "✅ You are now ONLINE. You will receive ride requests via SMS.";
                break;
            case 'OFFLINE':
                driver.connectionType = 'APP';
                await driver.save();
                response = "✅ You are now OFFLINE.";
                break;
            case 'HELP':
                response = "Commands:\nSCAN [ID]\nBALANCE\nSTART [ROUTE]\nSTOP\nONLINE\nOFFLINE";
                break;
            default:
                response = `❓ Unknown command: ${mainCommand}. Send HELP for options.`;
        }
    } catch (error) {
        console.error("SMS Logic Error:", error);
        response = "❌ System Error. Please try again later.";
    }

    // Log the outgoing response (Only if DB is up)
    if (User.db.readyState === 1) {
        const outgoingLog = new SMSLog({
            id: `SMS-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
            driverId: driver.id,
            direction: 'OUTGOING',
            phoneNumber,
            message: response,
            status: 'SENT'
        });
        await outgoingLog.save().catch(() => { });
    }

    return response;
};

async function handleScanCommand(driver, parts) {
    const ticketId = parts[PART_INDEX.ID];
    if (!ticketId) return "⚠️ Usage: SCAN [TicketID]";

    // SIMULATION MOCK for Scan (If DB is down)
    if (User.db.readyState !== 1) {
        return `✅ [SIM] VERIFIED\nTicket: ${ticketId}\nOffline Mode Active.`;
    }

    const ticket = await Ticket.findOne({ id: { $regex: new RegExp(`^${ticketId}$`, 'i') } });
    if (!ticket) return "❌ TICKET NOT FOUND";
    if (ticket.status === 'BOARDED' || ticket.status === 'COMPLETED') return "⚠️ ALREADY USED";

    const PLATFORM_FEE_PERCENT = 0.10;
    let financialMessage = "";

    if (ticket.paymentMethod === 'ONLINE' || ticket.paymentMethod === 'GRAMCOIN') {
        const driverShare = ticket.totalPrice * (1 - PLATFORM_FEE_PERCENT);
        driver.walletBalance += driverShare;
        financialMessage = `Added ₹${driverShare.toFixed(0)}`;
    } else if (ticket.paymentMethod === 'CASH') {
        const platformFee = ticket.totalPrice * PLATFORM_FEE_PERCENT;
        driver.walletBalance -= platformFee;
        financialMessage = `Collect ₹${ticket.totalPrice}. Fee ₹${platformFee.toFixed(0)} deducted.`;
    }

    ticket.status = 'BOARDED';
    ticket.driverId = driver.id;
    await ticket.save();
    await driver.save();

    const txn = new Transaction({
        id: `TXN-${Date.now()}`,
        userId: driver.id,
        type: 'EARN',
        amount: ticket.totalPrice, // Simplified for log
        desc: `SMS Scan: ${ticketId}`,
        timestamp: Date.now(),
        relatedEntityId: ticketId
    });
    await txn.save();

    return `✅ VERIFIED\nPassenger: ${ticket.userId.substring(0, 5)}\n${ticket.from} -> ${ticket.to}\n${financialMessage}`;
}

async function handleBalanceCommand(driver) {
    return `💰 BALANCE: ₹${driver.walletBalance.toFixed(2)}\nCredit Limit: ₹${driver.creditUsed}/₹${driver.creditLimit}`;
}

async function handleStartTripCommand(driver, parts) {
    const routeName = parts.slice(1).join(' '); // e.g. "AURANGABAD PATNA"
    if (!routeName) return "⚠️ Usage: START [Route Name]";

    // Logic to mark driver as in-transit
    driver.smsSessionState = `TRIP|${routeName}`;
    driver.lastCommandTimestamp = Date.now();
    await driver.save();

    return `🚀 TRIP STARTED: ${routeName}\nSend STOP when reached.`;
}

async function handleStopTripCommand(driver) {
    if (!driver.smsSessionState || !driver.smsSessionState.startsWith('TRIP')) {
        return "⚠️ No active trip found to stop.";
    }

    const route = driver.smsSessionState.split('|')[1];
    driver.smsSessionState = null;
    await driver.save();

    return `🏁 TRIP COMPLETED: ${route}\nThank you for choosing VillageLink.`;
}
