import crypto from 'crypto';

/**
 * mTLS (Mutual TLS) Handshake Coordinator & Certificate Authority
 * Simulates bidirectional TLS certificate checks.
 */

export class CertificateAuthority {
    constructor(caName = 'VillageLink CA') {
        this.caName = caName;
        // Generate a mock CA private key signature string
        this.caPrivateKeyHash = crypto.createHash('sha256').update(caName + '_secret').digest('hex');
    }

    /**
     * Issues a cryptographically signed client/server certificate
     */
    issueCertificate(subject, isRevoked = false) {
        // Sign the subject identifier with the CA secret key
        const signature = crypto.createHmac('sha256', this.caPrivateKeyHash)
            .update(subject)
            .digest('hex');

        return {
            subject,
            issuer: this.caName,
            signature,
            isRevoked,
            validUntil: Date.now() + 1000 * 60 * 60 // 1 hour validity
        };
    }

    /**
     * Cryptographically verifies certificate signatures against the CA
     */
    verifyCertificate(cert) {
        if (!cert) return false;
        if (cert.issuer !== this.caName) return false;
        if (cert.isRevoked) return false;
        if (Date.now() > cert.validUntil) return false;

        // Recompute signature to verify integrity
        const expectedSignature = crypto.createHmac('sha256', this.caPrivateKeyHash)
            .update(cert.subject)
            .digest('hex');

        return cert.signature === expectedSignature;
    }
}

export class MtlsServer {
    constructor(serverName, caInstance) {
        this.serverName = serverName;
        this.ca = caInstance;
    }

    /**
     * Performs mutual TLS handshake verification
     * Server verifies client certificate and client verifies server certificate
     */
    performHandshake(clientCert, serverCert) {
        // 1. Client verifies server certificate (Standard TLS)
        const serverCertValid = this.ca.verifyCertificate(serverCert);
        if (!serverCertValid) {
            throw new Error(`[mTLS] Client rejected server certificate for: "${serverCert?.subject || 'Unknown'}"`);
        }

        // 2. Server verifies client certificate (Mutual TLS)
        const clientCertValid = this.ca.verifyCertificate(clientCert);
        if (!clientCertValid) {
            throw new Error(`[mTLS] Server rejected client certificate for: "${clientCert?.subject || 'Unknown'}"`);
        }

        console.log(`   [mTLS] Handshake complete: "${clientCert.subject}" <== Mutual TLS ==> "${serverCert.subject}"`);

        return {
            status: 'ESTABLISHED',
            sessionCipher: 'TLS_AES_256_GCM_SHA384',
            protocolVersion: 'TLSv1.3'
        };
    }
}
