
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load backend/.env then repo root .env (monorepo)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

async function sendViaResend(to, subject, html) {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) return false;

    const resend = new Resend(key);
    const from = process.env.RESEND_FROM?.trim() || 'VillageLink <onboarding@resend.dev>';

    try {
        const { data, error } = await resend.emails.send({
            from,
            to: [to],
            subject,
            html,
        });

        if (error) {
            console.error('❌ Resend API Error:', error);
            return false;
        }

        console.log(`✅ Email sent via Resend. ID: ${data?.id}`);
        return true;
    } catch (e) {
        console.error('❌ Resend send exception:', e?.message || e);
        return false;
    }
}

async function sendViaSmtp(to, subject, html) {
    const user = process.env.EMAIL_USER?.trim();
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, '');
    if (!user || !pass) return false;

    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';

    try {
        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });

        const fromName = process.env.EMAIL_FROM_NAME?.trim() || 'VillageLink';
        await transporter.sendMail({
            from: `"${fromName}" <${user}>`,
            to,
            subject,
            html,
        });
        console.log(`✅ Email sent via SMTP (${host}) to ${to}`);
        return true;
    } catch (e) {
        console.error('❌ SMTP send failed:', e?.message || e);
        return false;
    }
}

/**
 * Sends transactional email. Tries Resend first, then Gmail/SMTP (EMAIL_USER + EMAIL_PASS).
 */
export const sendEmail = async (to, subject, html) => {
    if (!to || !String(to).includes('@')) {
        console.warn('[sendEmail] Invalid recipient:', to);
        return false;
    }

    if (await sendViaResend(to, subject, html)) return true;
    if (await sendViaSmtp(to, subject, html)) return true;

    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_USER) {
        console.warn('⚠️ No RESEND_API_KEY and no EMAIL_USER/EMAIL_PASS — email disabled.');
    }
    console.log(`[EMAIL SIM] To: ${to} | Subject: ${subject}`);
    return false;
};

export default { sendEmail };
