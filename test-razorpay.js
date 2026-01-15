
import dotenv from 'dotenv';
dotenv.config();
import Razorpay from 'razorpay';

const key_id = process.env.RAZORPAY_KEY_ID?.trim();
const key_secret = process.env.RAZORPAY_SECRET?.trim();

console.log("Testing Razorpay Config...");
console.log(`Key ID: ${key_id ? key_id.substring(0, 6) + '...' : 'MISSING'}`);
console.log(`Secret: ${key_secret ? 'PRESENT' : 'MISSING'}`);

if (!key_id || !key_secret) {
    console.error("❌ Keys missing. Check .env");
    process.exit(1);
}

const razorpay = new Razorpay({ key_id, key_secret });

razorpay.orders.create({
    amount: 500,
    currency: "INR",
    receipt: "test_receipt_1"
}).then(order => {
    console.log("✅ SUCCESS! Order created:", order.id);
    process.exit(0);
}).catch(err => {
    console.error("❌ FAILURE! Authentication Failed.");
    console.error(JSON.stringify(err, null, 2));
    process.exit(1);
});
