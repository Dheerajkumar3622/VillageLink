
/**
 * SMS Gateway Service
 * Primary Engine: Firebase Phone Auth (Client + Admin SDK)
 */
export const sendSMS = async (to, message) => {
    console.log(`📡 [SMS ENGINE] Processing SMS for ${to}. Primary engine: Firebase Phone Auth.`);
    
    // Fallback Simulation Log for backend automated tasks
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, simulated: true, provider: 'FirebasePhoneAuth', messageId: `FB-SMS-${Date.now()}` };
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
