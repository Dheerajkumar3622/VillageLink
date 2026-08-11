import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { z } from 'zod';
import mongoose from 'mongoose';
import Models from './models.js';
const { User, Shop } = Models;
import crypto from 'crypto';
import https from 'https';
import EmailService from './services/emailService.js';
import { getFirebaseAdmin } from './firebaseAdmin.js';
import { sendSMS } from './services/smsGateway.js';
const { sendEmail } = EmailService;

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn("🔒 SECURITY WARNING: No JWT_SECRET in env. Using ephemeral random key.");
}

// --- 1000x: SEPARATE VALIDATION SCHEMAS ---

// User Panel registration (consumers only)
const registerUserSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional().or(z.literal(''))
});

// Service Provider registration (must choose role)
const registerProviderSchema = z.object({
  name: z.string().min(2),
  role: z.enum(['DRIVER', 'FARMER', 'FOOD_VENDOR', 'MESS_MANAGER', 'SHOPKEEPER', 'LOGISTICS', 'CARGO_DRIVER', 'VILLAGE_MANAGER']),
  password: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10).optional().or(z.literal('')),
  vehicleCapacity: z.number().optional(),
  vehicleType: z.string().optional(),
  vehicleNumber: z.string().optional(),
  address: z.string().optional(),
  pincode: z.string().optional()
});

// Legacy register schema (backward compatibility)
const registerSchema = z.object({
  name: z.string().min(2),
  role: z.enum(['PASSENGER', 'DRIVER', 'SHOPKEEPER', 'MESS_MANAGER', 'VILLAGE_MANAGER', 'FARMER', 'FOOD_VENDOR', 'LOGISTICS', 'CARGO_DRIVER']),
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
  password: z.string(),
  expectedPanelType: z.string().optional()
});

// --- REAL FAST2SMS INTEGRATION ---
const sendFast2SMS = async (phone, otp) => {
  const apiKey = "3VZns2qWUdbyQm40oeEXa5RLpIF17TNfKkczhMP8OvYCgBiJxwVbMRPqE1BeoGA25SNzgiXhQpIcjTFW";
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
          resolve(false);
        }
      });
    }).on('error', (e) => {
      console.error("[Fast2SMS] Network Error:", e);
      resolve(false);
    });
  });
};

// Helper: Check existing user by email/phone
const checkExistingUser = async (email, phone) => {
  const query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });
  if (query.length === 0) return null;
  return await User.findOne({ $or: query });
};

// --- 1000x: USER PANEL REGISTRATION (auto PASSENGER) ---
export const registerUser = async (req, res) => {
  try {
    const validated = registerUserSchema.parse(req.body);
    
    const existing = await checkExistingUser(validated.email, validated.phone);
    if (existing) {
      return res.status(400).json({ error: "User already exists with this Email or Phone" });
    }

    const id = `USR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const user = new User({
      ...validated,
      id,
      role: 'PASSENGER',
      panelType: 'USER',
      isVerified: true
    });
    await user.save();

    if (validated.phone) console.log(`👤 New USER registered: ${validated.phone}`);

    const token = jwt.sign({ id: user.id, role: user.role, panelType: 'USER' }, JWT_SECRET, { expiresIn: '7d' });
    const { password, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType: 'USER' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: error.message });
  }
};

// --- 1000x: SERVICE PROVIDER REGISTRATION (role selection) ---
export const registerProvider = async (req, res) => {
  try {
    const validated = registerProviderSchema.parse(req.body);
    
    const existing = await checkExistingUser(validated.email, validated.phone);
    if (existing) {
      return res.status(400).json({ error: "User already exists with this Email or Phone" });
    }

    const id = `PRV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const user = new User({
      ...validated,
      id,
      panelType: 'PROVIDER',
      providerRoles: [validated.role],
      isVerified: false  // Providers need admin verification
    });
    await user.save();

    // Auto-create Shop for Mess Manager
    if (validated.role === 'MESS_MANAGER') {
      const shop = new Shop({
        id: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerId: user.id,
        name: validated.name,
        category: 'MESS',
        location: validated.address,
        pincode: validated.pincode,
        rating: 4.0,
        isOpen: true,
        themeColor: 'purple'
      });
      await shop.save();
    }

    if (validated.phone) console.log(`🔵 New PROVIDER (${validated.role}) registered: ${validated.phone}`);

    // DO NOT issue a token - provider must wait for admin verification
    const { password, ...safeUser } = user.toObject();

    res.json({
      success: true,
      pendingVerification: true,
      user: safeUser,
      panelType: 'PROVIDER',
      message: `Registration successful! Your ${validated.role} account is pending admin verification. You will be able to login once an admin verifies your account.`
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: error.message });
  }
};

// Legacy register (backward compatibility)
export const register = async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);
    
    const existing = await checkExistingUser(validated.email, validated.phone);
    if (existing) {
      return res.status(400).json({ error: "User already exists with this Email or Phone" });
    }

    const id = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    const isVerified = validated.role === 'PASSENGER';
    const panelType = validated.role === 'PASSENGER' ? 'USER' : 'PROVIDER';

    const user = new User({ ...validated, id, isVerified, panelType });
    await user.save();

    if (validated.role === 'MESS_MANAGER') {
      const shop = new Shop({
        id: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerId: user.id, name: validated.name, category: 'MESS',
        location: validated.address, pincode: validated.pincode,
        rating: 4.0, isOpen: true, themeColor: 'purple'
      });
      await shop.save();
    }

    if (validated.phone) console.log(`New User registered: ${validated.phone}`);

    const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
    const { password, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    res.status(500).json({ error: error.message });
  }
};

// --- 1000x: LOGIN (unified, returns panelType for auto-redirect) ---
export const login = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database offline. Please whitelist your IP in MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0)." });
    }
    const { loginId, password, expectedPanelType } = loginSchema.parse(req.body);

    const query = {
      $or: [{ id: loginId }, { email: loginId }, { phone: loginId }]
    };

    let user;
    if (expectedPanelType === 'PROVIDER') {
        user = await User.findOne({
            $and: [
                query,
                { $or: [{ panelType: 'PROVIDER' }, { role: { $ne: 'PASSENGER' } }] }
            ]
        });
    } else if (expectedPanelType === 'USER') {
        user = await User.findOne({
            $and: [
                query,
                { $or: [{ panelType: 'USER' }, { role: 'PASSENGER' }] }
            ]
        });
    }

    if (!user) {
        user = await User.findOne(query);
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account Suspended by Administrator" });
    }

    // Block unverified providers from logging in
    if (user.role !== 'PASSENGER' && user.role !== 'ADMIN' && !user.isVerified) {
      return res.status(403).json({ error: "Your account is pending admin verification. Please wait for approval before logging in.", pendingVerification: true });
    }

    // Determine panel type from user role
    const panelType = user.panelType || (user.role === 'PASSENGER' ? 'USER' : 'PROVIDER');

    const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || 'Invalid request' });
    }
    console.error('[auth.login]', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

// --- UNIFIED OTP ENGINE (EMAIL & MOBILE) ---
export const sendOtp = async (req, res) => {
  try {
    const identifier = (req.body.identifier || req.body.phone || req.body.email || '').trim();
    if (!identifier) {
      return res.status(400).json({ error: "Mobile number or Email address is required." });
    }

    const isEmail = identifier.includes('@');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 300000; // 5 minutes

    let user = null;
    if (isEmail) {
      user = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(identifier)}$`, 'i') } });
    } else {
      const d = identifier.replace(/\D/g, '');
      const last10 = d.length >= 10 ? d.slice(-10) : d;
      user = await User.findOne({
        $or: [{ phone: last10 }, { phone: `+91${last10}` }, { phone: `91${last10}` }]
      });
    }

    if (user) {
      user.resetOTP = otp;
      user.resetOTPExpiry = expiry;
      await user.save();
    }

    let sent = false;
    let message = '';
    let smsRes = null;

    if (isEmail) {
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
          <h2 style="color: #7c3aed;">VillageLink Security Verification</h2>
          <p>Your One-Time Password (OTP) for login/registration is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 4px; margin: 20px 0;">${otp}</div>
          <p style="color: #64748b; font-size: 12px;">Valid for 5 minutes. Do not share this OTP with anyone.</p>
        </div>
      `;
      sent = await sendEmail(identifier, 'VillageLink Verification OTP', htmlBody);
      message = sent ? `OTP sent to ${identifier}` : `OTP generated for ${identifier}`;
    } else {
      // SMS sending engine
      console.log(`[SMS OTP ENGINE] Sending OTP for ${identifier}: ${otp}`);
      smsRes = await sendSMS(identifier, `Your VillageLink OTP is: ${otp}`);
      sent = smsRes.success;
      message = `OTP sent to ${identifier}`;
    }

    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
      success: true,
      message: message,
      isExistingUser: !!user,
      otp: otp,
      simulated: smsRes?.simulated
    });
  } catch (error) {
    console.error('[sendOtp]', error);
    res.status(500).json({ error: error.message || "Failed to send OTP" });
  }
};

// --- OTP-BASED LOGIN & AUTO-SIGNUP ---
export const verifyOtpLogin = async (req, res) => {
  try {
    const { phone, email, identifier, otp, name, role } = req.body;
    const inputId = (identifier || phone || email || '').trim();
    if (!inputId || !otp) {
      return res.status(400).json({ error: "Identifier (Mobile/Email) and OTP are required." });
    }

    const isEmail = inputId.includes('@');
    let user = null;

    if (isEmail) {
      user = await User.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(inputId)}$`, 'i') },
        resetOTP: otp,
        resetOTPExpiry: { $gt: Date.now() }
      });
    } else {
      const d = inputId.replace(/\D/g, '');
      const last10 = d.length >= 10 ? d.slice(-10) : d;
      user = await User.findOne({
        $or: [{ phone: last10 }, { phone: `+91${last10}` }, { phone: `91${last10}` }],
        resetOTP: otp,
        resetOTPExpiry: { $gt: Date.now() }
      });
    }

    // Special fallback: Check if user exists but OTP stored was on requestPasswordReset
    if (!user) {
      if (isEmail) {
        user = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegex(inputId)}$`, 'i') } });
      } else {
        const d = inputId.replace(/\D/g, '');
        const last10 = d.length >= 10 ? d.slice(-10) : d;
        user = await User.findOne({
          $or: [{ phone: last10 }, { phone: `+91${last10}` }, { phone: `91${last10}` }]
        });
      }

      if (user && user.resetOTP === otp && user.resetOTPExpiry > Date.now()) {
        // OTP matches
      } else if (!user) {
        // Create NEW User via OTP Auto-Registration
        const newUserId = `USR-${Math.floor(100000 + Math.random() * 900000)}`;
        const userRole = role || 'PASSENGER';
        user = new User({
          id: newUserId,
          name: name || (isEmail ? inputId.split('@')[0] : `User_${inputId.slice(-4)}`),
          email: isEmail ? inputId : undefined,
          phone: !isEmail ? inputId : undefined,
          role: userRole,
          password: `pass_${Date.now()}`,
          isVerified: true
        });
        await user.save();
      } else {
        return res.status(401).json({ error: "Invalid or expired OTP." });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account Suspended by Administrator" });
    }

    // Clear OTP after successful verification
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    const panelType = user.panelType || (user.role === 'PASSENGER' ? 'USER' : 'PROVIDER');
    const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType });
  } catch (error) {
    console.error('[verifyOtpLogin]', error);
    res.status(500).json({ error: error.message });
  }
};

// --- 1000x: FCM TOKEN UPDATE ---
export const updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ error: 'FCM token required' });

    await User.findOneAndUpdate(
      { id: req.user.id },
      { fcmToken }
    );

    res.json({ success: true, message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// --- REAL PASSWORD RESET FLOW ---

// ...

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const requestPasswordReset = async (req, res) => {
  try {
    const id = (req.body.identifier || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Email or phone is required.' });
    }

    const orConditions = [{ email: id }, { phone: id }];
    if (id.includes('@')) {
      orConditions.push({ email: { $regex: new RegExp(`^${escapeRegex(id)}$`, 'i') } });
    } else {
      const d = id.replace(/\D/g, '');
      if (d.length >= 10) {
        const last10 = d.slice(-10);
        orConditions.push({ phone: last10 }, { phone: `+91${last10}` }, { phone: `91${last10}` });
      }
    }

    const user = await User.findOne({ $or: orConditions });

    if (!user) {
      console.warn(`[PASSWORD RESET] No user matched identifier: ${id}`);
      const payload = { message: "If an account exists with this detail, an OTP has been sent." };
      if (process.env.NODE_ENV !== 'production') {
        payload.devHint =
          'Dev: koi account is email/phone se match nahi hua — spelling check karo ya pehle register karo. Spam folder bhi dekho agar account hai.';
        payload.matchedAccount = false;
      }
      return res.json(payload);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 300000; // 5 mins validity
    await user.save();

    const htmlBody = `<h3>Password Reset Request</h3><p>Your OTP is: <b>${otp}</b></p><p>Valid for 5 minutes.</p><p>If you did not request this, ignore this email.</p>`;

    if (user.email) {
      const emailSuccess = await sendEmail(user.email, 'Password Reset OTP - VillageLink', htmlBody);
      if (emailSuccess) {
        return res.json({ success: true, message: `OTP sent to ${user.email}` });
      }
      console.warn(`[PASSWORD RESET] Email delivery failed for ${user.email}. OTP=${otp}`);
    }

    if (user.phone) {
      const smsRes = await sendSMS(user.phone, `Your VillageLink OTP is: ${otp}`);
      return res.json({
        success: true,
        message: `OTP sent to mobile ending in ${user.phone.slice(-4)}`,
        otp: otp
      });
    }

    return res.json({
      success: true,
      message: `OTP generated for ${id}`,
      otp
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { identifier, token, newPassword } = req.body;
    const cleanId = (identifier || '').trim();

    const orConditions = [{ email: cleanId }, { phone: cleanId }];
    if (cleanId.includes('@')) {
      orConditions.push({ email: { $regex: new RegExp(`^${escapeRegex(cleanId)}$`, 'i') } });
    } else {
      const d = cleanId.replace(/\D/g, '');
      if (d.length >= 10) {
        const last10 = d.slice(-10);
        orConditions.push({ phone: last10 }, { phone: `+91${last10}` }, { phone: `91${last10}` });
      }
    }

    const user = await User.findOne({
      $or: orConditions,
      resetOTP: (token || '').trim(),
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

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Access denied" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ id: decoded.id }).lean();
    if (!user) return res.status(401).json({ error: "User not found" });
    
    req.user = { ...decoded, name: user.name, phone: user.phone, email: user.email };
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

    if (!idToken || !newPassword) {
      return res.status(400).json({ success: false, error: "Missing required fields.", message: "Missing required fields." });
    }

    let phoneNumber = null;

    // 1. Try Firebase Admin verification first
    try {
      const adminModule = await import('firebase-admin');
      const admin = adminModule.default;
      const apps = admin.apps || [];
      if (apps.length === 0) {
        try {
          const { getFirebaseAdmin } = await import('./firebaseAdmin.js');
          getFirebaseAdmin();
        } catch {
          // Ignore fallback init error if env credentials missing
        }
      }
      if (admin.apps && admin.apps.length > 0) {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        phoneNumber = decodedToken.phone_number;
      }
    } catch (adminErr) {
      console.warn("Firebase Admin verifyIdToken warning (falling back to JWT decode):", adminErr.message);
    }

    // 2. Fallback to JWT decode if firebase-admin verification was skipped or failed
    if (!phoneNumber) {
      try {
        const jwtModule = await import('jsonwebtoken');
        const jwt = jwtModule.default;
        const decoded = jwt.decode(idToken);
        if (decoded && decoded.phone_number) {
          phoneNumber = decoded.phone_number;
        }
      } catch (jwtErr) {
        console.error("JWT decode fallback error:", jwtErr);
      }
    }

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: "Token matched no phone number.", message: "Token matched no phone number." });
    }

    const normalizedPhone = phoneNumber.replace('+91', '').replace('+', '').trim();

    const user = await User.findOne({
      $or: [
        { phone: normalizedPhone },
        { phone: phoneNumber },
        { phone: `+91${normalizedPhone}` },
        { phone: `+${normalizedPhone}` }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found with this phone number.", message: "User not found with this phone number." });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    return res.json({ success: true, message: "Password updated successfully via Firebase Auth." });

  } catch (e) {
    console.error("Firebase Reset Error:", e);
    return res.status(400).json({ success: false, error: "Firebase Reset Failed: " + e.message, message: "Firebase Reset Failed: " + e.message });
  }
};

export const loginViaFirebase = async (req, res) => {
  try {
    const { idToken } = req.body;
    let decodedToken;
    try {
      const admin = getFirebaseAdmin();
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verErr) {
      console.warn("Firebase Admin verifyIdToken warning (using jwt.decode fallback):", verErr.message);
      decodedToken = jwt.decode(idToken);
    }

    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid Firebase token structure." });
    }

    const phoneNumber = decodedToken.phone_number || decodedToken.phone || decodedToken.firebase?.identities?.phone?.[0];

    if (!phoneNumber) {
      return res.status(400).json({ error: "Token matched no phone number" });
    }

    const normalizedPhone = phoneNumber.replace('+91', '').replace('+', '');

    let user = await User.findOne({
      $or: [{ phone: normalizedPhone }, { phone: phoneNumber }]
    });

    if (!user) {
      const requestedRole = req.body.role || 'PASSENGER';
      const id = `USR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const panelType = requestedRole === 'PASSENGER' ? 'USER' : 'PROVIDER';

      user = new User({
        id,
        name: `User ${normalizedPhone.slice(-4)}`,
        role: requestedRole,
        panelType,
        isVerified: true,
        phone: normalizedPhone,
        password: crypto.randomBytes(8).toString('hex')
      });
      await user.save();
    }

    if (user.isBanned) {
      return res.status(403).json({ error: "Account Suspended by Administrator" });
    }

    const panelType = user.panelType || (user.role === 'PASSENGER' ? 'USER' : 'PROVIDER');
    const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType });
  } catch (e) {
    console.error("Firebase Login Error:", e);
    res.status(401).json({ error: "Invalid or expired Firebase token." });
  }
};

export const registerViaFirebase = async (req, res) => {
  try {
    const { idToken, name, role, email, vehicleCapacity, vehicleType, address, pincode } = req.body;
    let decodedToken;
    try {
      const admin = getFirebaseAdmin();
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verErr) {
      console.warn("Firebase Admin verifyIdToken warning (using jwt.decode fallback):", verErr.message);
      decodedToken = jwt.decode(idToken);
    }

    if (!decodedToken) {
      return res.status(401).json({ error: "Invalid Firebase token structure." });
    }

    let phoneNumber = decodedToken.phone_number || decodedToken.phone || decodedToken.firebase?.identities?.phone?.[0];

    if (!phoneNumber) {
      return res.status(400).json({ error: "Token matched no phone number" });
    }
    const normalizedPhone = phoneNumber.replace('+91', '').replace('+', '');

    let user = await User.findOne({
      $or: [{ phone: normalizedPhone }, { phone: phoneNumber }]
    });

    if (user) {
      // User already exists - log them in seamlessly
      const panelType = user.panelType || (user.role === 'PASSENGER' ? 'USER' : 'PROVIDER');
      const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...safeUser } = user.toObject();
      return res.json({ success: true, user: safeUser, token, panelType, isExistingUser: true });
    }

    const id = `USR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isVerified = role === 'PASSENGER';
    const panelType = role === 'PASSENGER' ? 'USER' : 'PROVIDER';

    user = new User({
        id,
        name: name || `User ${normalizedPhone.slice(-4)}`,
        role: role || 'PASSENGER',
        panelType,
        isVerified,
        phone: normalizedPhone,
        email,
        vehicleCapacity,
        vehicleType,
        address,
        pincode,
        password: crypto.randomBytes(8).toString('hex') // Dummy password
    });
    
    if (role === 'MESS_MANAGER') {
      const shop = new Shop({
        id: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
        ownerId: user.id,
        name: name || 'Village Mess',
        category: 'MESS',
        location: address || 'Village Center',
        pincode: pincode || '800001',
        rating: 4.0,
        isOpen: true,
        themeColor: 'purple'
      });
      await shop.save();
    }

    await user.save();

    const token = jwt.sign({ id: user.id, role: user.role, panelType }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user.toObject();

    res.json({ success: true, user: safeUser, token, panelType });
  } catch (e) {
    console.error("Firebase Register Error:", e);
    res.status(401).json({ error: "Invalid or expired Firebase token." });
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
  requireAdmin,
  registerUser,
  registerProvider,
  updateFCMToken,
  loginViaFirebase,
  registerViaFirebase,
  verifyOtpLogin,
  sendOtp
};
