/**
 * MyQRCode - Service Provider's QR Display
 * USS v3.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    X, Store, CreditCard, ShoppingBag, Download, Share2,
    Copy, Check, Printer, QrCode, Loader2
} from 'lucide-react';

interface MyQRCodeProps {
    user: User;
    role: string;
    onClose: () => void;
}

type QRType = 'SHOP' | 'PAYMENT' | 'PRODUCT';

interface QRData {
    id: string;
    type: string;
    name: string;
    payload: string;
    scanCount: number;
}

const MyQRCode: React.FC<MyQRCodeProps> = ({ user, role, onClose }) => {
    const [activeType, setActiveType] = useState<QRType>('SHOP');
    const [qrCodes, setQRCodes] = useState<Record<QRType, QRData | null>>({
        SHOP: null,
        PAYMENT: null,
        PRODUCT: null
    });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadMyQRCodes();
    }, []);

    const loadMyQRCodes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/qr/my-codes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.qrCodes) {
                const codes: Record<QRType, QRData | null> = { SHOP: null, PAYMENT: null, PRODUCT: null };
                data.qrCodes.forEach((qr: any) => {
                    if (qr.qrType === 'SHOP' || qr.qrType === 'PAYMENT' || qr.qrType === 'PRODUCT') {
                        codes[qr.qrType as QRType] = qr;
                    }
                });
                setQRCodes(codes);
            }
        } catch (error) {
            console.error('Load QR codes error:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateQRCode = async (type: QRType) => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/qr/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    qrType: type,
                    name: type === 'SHOP' ? (user as any).businessName || user.name :
                        type === 'PAYMENT' ? `Pay ${user.name}` :
                            'Product QR'
                })
            });

            const data = await res.json();
            if (data.success) {
                setQRCodes({
                    ...qrCodes,
                    [type]: data.qrCode
                });
            }
        } catch (error) {
            console.error('Generate QR error:', error);
        } finally {
            setGenerating(false);
        }
    };

    const generateQRImageUrl = (payload: string) => {
        // Using QR code API - in production use a proper QR library
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
    };

    const copyToClipboard = () => {
        const qr = qrCodes[activeType];
        if (qr) {
            navigator.clipboard.writeText(`https://villagelink.app/qr/${qr.id}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadQR = () => {
        const qr = qrCodes[activeType];
        if (qr) {
            const link = document.createElement('a');
            link.href = generateQRImageUrl(qr.payload);
            link.download = `villagelink-${qr.type.toLowerCase()}-qr.png`;
            link.click();
        }
    };

    const shareQR = async () => {
        const qr = qrCodes[activeType];
        if (qr && navigator.share) {
            try {
                await navigator.share({
                    title: `${user.name}'s VillageLink QR`,
                    text: `Scan this QR to ${activeType === 'SHOP' ? 'visit my shop' : activeType === 'PAYMENT' ? 'pay me' : 'view product'}`,
                    url: `https://villagelink.app/qr/${qr.id}`
                });
            } catch (err) {
                console.error('Share error:', err);
            }
        }
    };

    const printQR = () => {
        window.print();
    };

    const currentQR = qrCodes[activeType];

    return (
        <div className="my-qr-modal">
            <div className="my-qr-container">
                {/* Header */}
                <div className="qr-header">
                    <h2>My QR Codes</h2>
                    <button className="close-btn" aria-label="Close" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Type Tabs */}
                <div className="qr-type-tabs">
                    <button
                        className={`type-tab ${activeType === 'SHOP' ? 'active' : ''}`}
                        onClick={() => setActiveType('SHOP')}
                    >
                        <Store className="w-4 h-4" />
                        Shop
                    </button>
                    <button
                        className={`type-tab ${activeType === 'PAYMENT' ? 'active' : ''}`}
                        onClick={() => setActiveType('PAYMENT')}
                    >
                        <CreditCard className="w-4 h-4" />
                        Payment
                    </button>
                    <button
                        className={`type-tab ${activeType === 'PRODUCT' ? 'active' : ''}`}
                        onClick={() => setActiveType('PRODUCT')}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Product
                    </button>
                </div>

                {/* QR Display */}
                <div className="qr-display">
                    {loading ? (
                        <div className="qr-loading">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            <p>Loading QR codes...</p>
                        </div>
                    ) : currentQR ? (
                        <>
                            <div className="qr-card">
                                <div className="qr-name">{currentQR.name}</div>
                                <img
                                    src={generateQRImageUrl(currentQR.payload)}
                                    alt="QR Code"
                                    className="qr-image"
                                />
                                <p className="scan-hint">Scan to {
                                    activeType === 'SHOP' ? 'visit shop' :
                                        activeType === 'PAYMENT' ? 'make payment' :
                                            'view product'
                                }</p>
                            </div>

                            <div className="qr-stats">
                                <div className="stat">
                                    <span className="stat-value">{currentQR.scanCount || 0}</span>
                                    <span className="stat-label">Total Scans</span>
                                </div>
                            </div>

                            <div className="qr-actions">
                                <button className="action-btn" onClick={copyToClipboard}>
                                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button className="action-btn" onClick={downloadQR}>
                                    <Download className="w-5 h-5" />
                                    Download
                                </button>
                                <button className="action-btn" onClick={shareQR}>
                                    <Share2 className="w-5 h-5" />
                                    Share
                                </button>
                                <button className="action-btn" onClick={printQR}>
                                    <Printer className="w-5 h-5" />
                                    Print
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="no-qr">
                            <QrCode className="w-16 h-16 text-gray-300" />
                            <h3>No {activeType.toLowerCase()} QR code yet</h3>
                            <p>Generate a QR code to let customers easily find you</p>
                            <Button onClick={() => generateQRCode(activeType)} disabled={generating}>
                                {generating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>Generate {activeType} QR</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tips */}
                <div className="qr-tips">
                    <h4>Tips:</h4>
                    <ul>
                        <li>Print and display your Shop QR at your establishment</li>
                        <li>Share Payment QR for quick payments from customers</li>
                        <li>Create Product QRs for specific items</li>
                    </ul>
                </div>
            </div>

            <style>{`
        .my-qr-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .my-qr-container {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .qr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .qr-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
        }

        .qr-type-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }

        .type-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 12px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .type-tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .qr-display {
          padding: 24px;
        }

        .qr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: #6b7280;
        }

        .qr-card {
          text-align: center;
        }

        .qr-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }

        .qr-image {
          width: 200px;
          height: 200px;
          margin: 0 auto;
          border: 4px solid #111827;
          border-radius: 12px;
        }

        .scan-hint {
          margin-top: 12px;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .qr-stats {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .qr-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          color: #374151;
          cursor: pointer;
          font-size: 0.75rem;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: #e5e7eb;
        }

        .no-qr {
          text-align: center;
          padding: 40px 20px;
        }

        .no-qr h3 {
          font-weight: 600;
          color: #111827;
          margin: 16px 0 8px;
        }

        .no-qr p {
          color: #6b7280;
          margin-bottom: 20px;
        }

        .qr-tips {
          padding: 16px 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .qr-tips h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .qr-tips ul {
          list-style: disc;
          padding-left: 20px;
          color: #6b7280;
          font-size: 0.75rem;
        }

        .qr-tips li {
          margin-bottom: 4px;
        }

        @media print {
          .my-qr-modal {
            position: static;
            background: white;
          }
          .qr-header, .qr-type-tabs, .qr-actions, .qr-tips {
            display: none;
          }
          .qr-image {
            width: 300px;
            height: 300px;
          }
        }
      `}</style>
        </div>
    );
};

export default MyQRCode;
