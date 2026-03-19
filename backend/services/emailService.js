
import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root directory instead of backend/
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const getResendInstance = () => {
    if (process.env.RESEND_API_KEY) {
        return new Resend(process.env.RESEND_API_KEY);
    }
    return null;
};

export const sendEmail = async (to, subject, html) => {
    const resend = getResendInstance();
    if (!resend) {
        console.warn("⚠️ RESEND_API_KEY missing in .env. Email simulation mode.");

        console.log(`[EMAIL SIM] To: ${to}, Subject: ${subject}`);
        return false;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'VillageLink <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("❌ Resend API Error:", error);
            return false;
        }

        console.log(`✅ Email sent successfully via Resend. ID: ${data?.id}`);
        return true;
    } catch (error) {
        console.error("❌ Unexpected Email Send Error (Resend):", error);
        return false;
    }
};

// Default export for CJS compatibility
export default { sendEmail };
