import Models from '../models.js';
const { VillageManager, Beneficiary, ProxyTransaction, Ticket } = Models;
import crypto from 'crypto';

/**
 * VillageManager Service
 * Handles business logic for proxy transactions and beneficiary management
 */

export const registerBeneficiary = async (managerId, beneficiaryData) => {
    const beneficiaryId = 'BNF' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const newBeneficiary = new Beneficiary({
        id: beneficiaryId,
        managerId,
        ...beneficiaryData
    });
    return await newBeneficiary.save();
};

export const getBeneficiaries = async (managerId) => {
    return await Beneficiary.find({ managerId });
};

export const createProxyTicket = async (managerId, beneficiaryId, ticketData) => {
    // 1. Find beneficiary to get name
    const beneficiary = await Beneficiary.findOne({ id: beneficiaryId });
    if (!beneficiary) throw new Error('Beneficiary not found');

    // 2. Create the actual ticket (usually handled by ticketRoutes but we need proxy logic)
    // For now, we manually create it or call ticket logic if exposed.
    // In this app, tickets are often created locally and synced or via API.

    const ticketId = 'TCK' + crypto.randomBytes(6).toString('hex').toUpperCase();
    const newTicket = new Ticket({
        id: ticketId,
        userId: managerId, // Manager acts as the user for the system
        ...ticketData,
        status: 'PAID',
        paymentMethod: 'CASH', // VillageManager usually collects cash from villager
        timestamp: Date.now()
    });

    await newTicket.save();

    // 3. Create Proxy Transaction record
    const proxyTxId = 'PTX' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const proxyTx = new ProxyTransaction({
        id: proxyTxId,
        managerId,
        beneficiaryId,
        beneficiaryName: beneficiary.name,
        transactionType: 'TICKET',
        amount: ticketData.totalPrice,
        commission: 2, // Fixed ₹2 commission for now
        relatedEntityId: ticketId,
        status: 'COMPLETED',
        paymentMethod: 'CASH',
        timestamp: Date.now()
    });

    await proxyTx.save();

    // 4. Update Manager Stats
    await VillageManager.findOneAndUpdate(
        { userId: managerId },
        {
            $inc: {
                'stats.totalTransactions': 1,
                'stats.earningsToDate': 2
            }
        }
    );

    return { ticket: newTicket, proxyTransaction: proxyTx };
};

export const getManagerStats = async (managerId) => {
    return await VillageManager.findOne({ userId: managerId });
};

export const getProxyTransactions = async (managerId) => {
    return await ProxyTransaction.find({ managerId }).sort({ timestamp: -1 });
};

export default {
    registerBeneficiary,
    getBeneficiaries,
    createProxyTicket,
    getManagerStats,
    getProxyTransactions
};
