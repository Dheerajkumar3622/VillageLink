
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Models from './models.js';
const { User, Shop } = Models;
import crypto from 'crypto';
import https from 'https';
import EmailService from './services/emailService.js';
const { sendEmail } = EmailService;

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn("🔒 SECURITY WARNING: No JWT_SECRET in env. Using ephemeral random key.");
}

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2),
  role: z.enum(['PASSENGER', 'DRIVER', 'SHOPKEEPER', 'MESS_MANAGER']),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional().or(z.literal('')),
  vehicleCapacity: z.number().optional(),
  vehicleType: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional()
});

const loginSchema = z.object({
  loginId: z.string(),
  password: z.string()
});

// --- REAL FAST2SMS INTEGRATION ---
const sendFast2SMS = async (phone, otp) => {
  // YOUR REAL API KEY
  const apiKey = "3VZns2qWUdbyQm40oeEXa5RLpIF17TNfKkczhMP8OvYCgBiJxwVbMRPqE1BeoGA25SNzgiXhQpIcjTFW";

  // Using bulkV2 route 'otp' which sends a standard OTP message
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=${otp}&flash=0&numbers=${phone}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Fast2SMS] Response for ${phone}:`, data);
        try {
          const json = JSON.parse(data);
          if (json.return === true) {
            resolve(true);
          } else {
            console.error("[Fast2SMS] API Returned False:", json);
            resolve(false);
          }
        } catch (e) {
          console.error("[Fast2SMS] JSON Parse Error", e);
          resolve(false); // Assume failure if response isn't JSON
        }
      });
    }).on('error', (e) => {
      console.error("[Fast2SMS] Network Error:", e);
      resolve(false);
    });
  });
};

export const register = async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

    const query = [];
    if (validated.email) query.push({ email: validated.email });
    if (validated.phone) query.push({ phone: validated.phone });

    if (query.length > 0) {
      const existing = await User.findOne({ $or: query });
      if (existing) {
        return res.status(400).json({ error: "User already exists with this Email or Phone" });
      }
    }

    const id = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    const isVerified = validated.role === 'PASSENGER';

    const user = new User({ ...validated, id, isVerified });
    await user.save();

    // Auto-create Shop for Mess Manager
    if (validated.role === 'MESS_MANAGER') {
      const shop = new Shop({
        id: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerId: user.id,
        name: validated.name, // Mess Name
        category: 'MESS',
        location: validated.address,
        pincode: validated.pincode,
        rating: 4.0,
        isOpen: true,
        themeColor: 'purple'
      });
      await shop.save();
    }

    // Ideally verify phone on register, but for now just sending welcome/logging
    if (validated.phone) {
      console.log(`New User registered: ${validated.phone}`);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { loginId, password } = loginSchema.parse(req.body);

    const user = await User.findOne({
      $or: [{ id: loginId }, { email: loginId }, { phone: loginId }]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account Suspended by Administrator" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// --- REAL PASSWORD RESET FLOW ---

// ...

export const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body;
    // Search by email or phone
    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });

    if (!user) {
      // Security: Don't reveal user existence
      return res.json({ message: "If an account exists with this detail, an OTP has been sent." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 300000; // 5 mins validity
    await user.save();

    if (user.phone) {
      const success = await sendFast2SMS(user.phone, otp);
      if (success) {
        res.json({ message: `OTP sent to mobile ending in ${user.phone.slice(-4)}` });
      } else {
        res.status(500).json({ error: "Failed to send SMS. Please try again later." });
      }
    }

    if (user.email) {
      // REAL EMAIL SENDING
      const emailSuccess = await sendEmail(user.email, "Password Reset OTP - VillageLink",
        `<h3>Password Reset Request</h3><p>Your OTP is: <b>${otp}</b></p><p>Valid for 5 minutes.</p>`);

      if (emailSuccess) {
        res.json({ message: `OTP sent to ${user.email}` });
      } else {
        console.log(`[EMAIL FAIL] OTP for ${user.email}: ${otp}`);
        res.json({ message: "OTP generated. Check console (Email config missing)." });
      }
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { identifier, token, newPassword } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
      resetOTP: token,
      resetOTPExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Mongoose pre-save hook will hash this
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please login with new password." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Access denied" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Access denied" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ id: decoded.id });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const resetPasswordViaFirebase = async (req, res) => {
  try {
    const { idToken, newPassword } = req.body;

    // Dynamic import to avoid crash if firebase-admin is missing
    let admin;
    try {
      admin = await import('firebase-admin');
      if (!admin.apps?.length) {
        admin.default.initializeApp({
          credential: admin.default.credential.applicationDefault()
        });
      }
    } catch (e) {
      console.error("Firebase Admin load error:", e);
      return res.status(500).json({ error: "Firebase Admin SDK not configured on server." });
    }

    const decodedToken = await admin.default.auth().verifyIdToken(idToken);
    const phoneNumber = decodedToken.phone_number;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Token matched no phone number" });
    }

    const normalizedPhone = phoneNumber.replace('+91', '').replace('+', '');

    const user = await User.findOne({
      $or: [{ phone: normalizedPhone }, { phone: phoneNumber }]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found with this phone number." });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Password updated successfully via Firebase Auth." });

  } catch (e) {
    console.error("Firebase Reset Error:", e);
    res.status(401).json({ error: "Invalid or expired token: " + e.message });
  }
};

// Default export for CJS compatibility
export default {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  resetPasswordViaFirebase,
  authenticate,
  requireAdmin
};
