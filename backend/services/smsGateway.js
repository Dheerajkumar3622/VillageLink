
/**
 * SMS Gateway Service (Mock)
 * In production, this would use Twilio, MSG91, or Gupshup.
 */
export const sendSMS = async (to, message) => {
    console.log(`📡 [SMS GATEWAY] Sending to ${to}: ${message}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, messageId: `MSG-${Date.now()}` };
};

/**
 * Handle Webhook from Provider
 * This translates provider-specific payloads into a standard VillageLink format.
 */
export const parseIncomingSMS = (payload) => {
    // Local Simulation Format
    if (payload.phoneNumber && payload.text) {
        return {
            from: payload.phoneNumber,
            text: payload.text
        };
    }

    // Twilio Format Simulation
    if (payload.From && payload.Body) {
        return {
            from: payload.From,
            text: payload.Body
        };
    }

    return null;
};
