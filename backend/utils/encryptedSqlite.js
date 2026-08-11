import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.resolve(__dirname, './mock_sqlite.json');

// Derive 256-bit key from a fixed secret for testing purposes
const FIXED_PASSWORD = 'villagelink-secure-vault-key-super-app';
const ENCRYPTION_KEY = crypto.scryptSync(FIXED_PASSWORD, 'salt-constant', 32);

/**
 * Encrypts plaintext string using AES-256-GCM
 */
export const encrypt = (plaintext) => {
    const iv = crypto.randomBytes(12); // GCM standard IV size
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
        iv: iv.toString('hex'),
        content: encrypted,
        authTag
    };
};

/**
 * Decrypts ciphertext using AES-256-GCM and verifies authenticity
 */
export const decrypt = (encryptedObj) => {
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedObj.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
};

/**
 * Saves a record securely to the local simulated SQLite store file
 */
export const secureSaveRecord = (id, payload) => {
    const plainText = JSON.stringify(payload);
    const encryptedData = encrypt(plainText);
    
    let db = {};
    if (fs.existsSync(dbFilePath)) {
        try {
            db = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
        } catch (e) {
            db = {};
        }
    }
    
    db[id] = encryptedData;
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf8');
    return encryptedData;
};

/**
 * Reads and decrypts a record from the local simulated SQLite store file
 */
export const secureReadRecord = (id) => {
    if (!fs.existsSync(dbFilePath)) return null;
    
    try {
        const db = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
        const encryptedData = db[id];
        if (!encryptedData) return null;
        
        const decryptedText = decrypt(encryptedData);
        return JSON.parse(decryptedText);
    } catch (err) {
        console.error('⚠️ Secure Read Error:', err.message);
        return null;
    }
};
