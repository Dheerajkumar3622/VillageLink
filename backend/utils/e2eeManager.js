import crypto from 'crypto';

/**
 * End-to-End Encryption (E2EE) Manager
 * Generates asymmetric cryptographic keypairs and handles envelope encryptions/decryptions.
 */

export class E2eeNode {
    constructor(nodeName) {
        this.nodeName = nodeName;
        
        // Generate asymmetric RSA keypair synchronously (modulusLength: 2048)
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        this.publicKey = publicKey;
        this.privateKey = privateKey;
    }

    /**
     * Gets the public key to share with other nodes
     */
    getPublicKey() {
        return this.publicKey;
    }
}

/**
 * Encrypts a message payload using the recipient's public key
 */
export function encryptPayload(recipientPublicKey, plainText) {
    try {
        const buffer = Buffer.from(plainText, 'utf8');
        // Encrypt with recipient's public key
        const encrypted = crypto.publicEncrypt(recipientPublicKey, buffer);
        return encrypted.toString('base64');
    } catch (err) {
        throw new Error(`[E2EE] Encryption failed: ${err.message}`);
    }
}

/**
 * Decrypts a message payload using the receiver's private key
 */
export function decryptPayload(receiverPrivateKey, ciphertextBase64) {
    try {
        const buffer = Buffer.from(ciphertextBase64, 'base64');
        // Decrypt with receiver's private key
        const decrypted = crypto.privateDecrypt(receiverPrivateKey, buffer);
        return decrypted.toString('utf8');
    } catch (err) {
        throw new Error(`[E2EE] Decryption failed: ${err.message}`);
    }
}
