
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ Email credentials missing in .env. Email simulation mode.");
        console.log(`[EMAIL SIM] To: ${to}, Subject: ${subject}`);
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"VillageLink Admin" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log(`✅ Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Email Send Error:", error);
        return false;
    }
};
