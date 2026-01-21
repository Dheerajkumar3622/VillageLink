/**
 * Universal QR Scanner - Smart QR Detection & Routing
 * USS v3.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    X, Camera, Flashlight, Image, Clock, AlertCircle,
    Store, CreditCard, Ticket, Package, User as UserIcon, ShoppingBag,
    Loader2, Check, ArrowRight
} from 'lucide-react';

interface UniversalQRScannerProps {
    user: User;
    onClose: () => void;
    onResult: (result: QRResult) => void;
}

interface QRResult {
    success: boolean;
    qrType: string;
    payload: any;
    navigateTo: string;
    entityDetails?: any;
}

interface ScanHistory {
    id: string;
    qrType: string;
    name: string;
    timestamp: Date;
}

const QR_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    SHOP: { icon: <Store />, color: '#22c55e', label: 'Shop' },
    PAYMENT: { icon: <CreditCard />, color: '#3b82f6', label: 'Payment' },
    TICKET: { icon: <Ticket />, color: '#8b5cf6', label: 'Ticket' },
    PARCEL: { icon: <Package />, color: '#f97316', label: 'Parcel' },
    USER: { icon: <UserIcon />, color: '#06b6d4', label: 'Profile' },
    PRODUCT: { icon: <ShoppingBag />, color: '#ec4899', label: 'Product' }
};

const UniversalQRScanner: React.FC<UniversalQRScannerProps> = ({ user, onClose, onResult }) => {
    const [scanning, setScanning] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [flashOn, setFlashOn] = useState(false);
    const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
    const [scannedResult, setScannedResult] = useState<QRResult | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        startCamera();
        loadScanHistory();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }

            // Start scanning loop
            requestAnimationFrame(scanLoop);
        } catch (err) {
            console.error('Camera error:', err);
            setError('Camera access denied. Please enable camera permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const scanLoop = () => {
        if (!scanning || processing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx?.drawImage(video, 0, 0);

            // Get image data for QR detection
            // In production, use a library like jsQR
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

            // Simulated QR detection - replace with actual library
            // const code = jsQR(imageData.data, imageData.width, imageData.height);
            // if (code) { handleQRCode(code.data); }
        }

        if (scanning) {
            requestAnimationFrame(scanLoop);
        }
    };

    const loadScanHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/qr/scan-history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setScanHistory(data.history.slice(0, 5));
            }
        } catch (error) {
            console.error('Load history error:', error);
        }
    };

    // Simulate QR scan for testing
    const simulateScan = async (qrData: string) => {
        setProcessing(true);
        setError(null);

        try {
            // Parse QR payload
            let payload;
            try {
                payload = JSON.parse(qrData);
            } catch {
                // Try to extract QR ID from URL format
                const match = qrData.match(/QR-[\w]+/i);
                if (match) {
                    payload = { id: match[0] };
                } else {
                    throw new Error('Invalid QR code format');
                }
            }

            // Check if VillageLink QR
            if (payload.app === 'villagelink' || payload.id?.startsWith('QR-')) {
                const qrId = payload.id || qrData;

                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/qr/${qrId}/scan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ action: 'VIEW' })
                });

                const data = await res.json();

                if (data.success) {
                    setScannedResult(data);
                    setScanning(false);

                    // Handle based on type
                    if (data.qrType === 'PAYMENT') {
                        setShowPaymentModal(true);
                    }
                } else {
                    throw new Error(data.error || 'QR scan failed');
                }
            } else {
                // External QR - show as link
                setError('This is not a VillageLink QR code');
            }
        } catch (error: any) {
            setError(error.message || 'Failed to process QR code');
        } finally {
            setProcessing(false);
        }
    };

    const handleAction = () => {
        if (scannedResult) {
            onResult(scannedResult);
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

        setProcessing(true);
        try {
            // Process payment
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/payments/quick-pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipientId: scannedResult?.payload?.id,
                    amount: parseFloat(paymentAmount)
                })
            });

            const data = await res.json();
            if (data.success) {
                onResult({ ...scannedResult!, success: true });
            } else {
                setError(data.error || 'Payment failed');
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="qr-scanner-modal">
            <div className="qr-scanner-container">
                {/* Header */}
                <div className="scanner-header">
                    <h2>Scan QR Code</h2>
                    <button className="close-btn" aria-label="Close scanner" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Camera View */}
                {scanning && !scannedResult && (
                    <div className="camera-view">
                        <video ref={videoRef} autoPlay playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />

                        {/* Scan Frame */}
                        <div className="scan-frame">
                            <div className="corner tl" />
                            <div className="corner tr" />
                            <div className="corner bl" />
                            <div className="corner br" />
                        </div>

                        {/* Processing Overlay */}
                        {processing && (
                            <div className="processing-overlay">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                <p>Processing...</p>
                            </div>
                        )}

                        {/* Camera Controls */}
                        <div className="camera-controls">
                            <button
                                className={`control-btn ${flashOn ? 'active' : ''}`}
                                aria-label="Toggle flashlight"
                                onClick={() => setFlashOn(!flashOn)}
                            >
                                <Flashlight className="w-5 h-5" />
                            </button>
                            <button className="control-btn" aria-label="Select from gallery">
                                <Image className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                        <button onClick={() => { setError(null); setScanning(true); }}>
                            Try Again
                        </button>
                    </div>
                )}

                {/* Scanned Result */}
                {scannedResult && !showPaymentModal && (
                    <div className="scan-result">
                        <div
                            ref={iconRef}
                            className="result-icon result-icon-dynamic"
                        >
                            {QR_TYPE_CONFIG[scannedResult.qrType]?.icon || <Store />}
                        </div>
                        <h3>{scannedResult.payload?.data?.name || 'VillageLink QR'}</h3>
                        <p className="result-type">
                            {QR_TYPE_CONFIG[scannedResult.qrType]?.label || scannedResult.qrType}
                        </p>

                        <Button onClick={handleAction} className="action-btn">
                            {scannedResult.qrType === 'SHOP' && 'View Shop'}
                            {scannedResult.qrType === 'PRODUCT' && 'View Product'}
                            {scannedResult.qrType === 'USER' && 'View Profile'}
                            {scannedResult.qrType === 'TICKET' && 'View Ticket'}
                            {scannedResult.qrType === 'PARCEL' && 'Track Parcel'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>

                        <button
                            className="scan-again-btn"
                            onClick={() => { setScannedResult(null); setScanning(true); }}
                        >
                            Scan Another QR
                        </button>
                    </div>
                )}

                {/* Payment Modal */}
                {showPaymentModal && scannedResult && (
                    <div className="payment-modal">
                        <div className="payment-header">
                            <CreditCard className="w-8 h-8 text-blue-500" />
                            <h3>Send Payment</h3>
                            <p>to {scannedResult.payload?.data?.name || 'User'}</p>
                        </div>

                        <div className="amount-input-wrapper">
                            <span className="currency">₹</span>
                            <input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0"
                                autoFocus
                            />
                        </div>

                        <div className="quick-amounts">
                            {[50, 100, 200, 500].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => setPaymentAmount(amt.toString())}
                                    className={paymentAmount === amt.toString() ? 'active' : ''}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>

                        <Button
                            onClick={handlePayment}
                            disabled={!paymentAmount || processing}
                            className="pay-btn"
                        >
                            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay Now'}
                        </Button>

                        <button
                            className="cancel-btn"
                            onClick={() => { setShowPaymentModal(false); setScannedResult(null); setScanning(true); }}
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Recent Scans */}
                {scanning && scanHistory.length > 0 && (
                    <div className="recent-scans">
                        <h4><Clock className="w-4 h-4" /> Recent Scans</h4>
                        <div className="history-list">
                            {scanHistory.map(item => (
                                <button key={item.id} className="history-item">
                                    {QR_TYPE_CONFIG[item.qrType]?.icon}
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Demo Buttons for Testing */}
                {scanning && (
                    <div className="demo-buttons">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => simulateScan(JSON.stringify({ app: 'villagelink', v: 1, type: 'SHOP', id: 'QR-SHOP123', data: { name: 'Sharma Dhaba' } }))}
                                className="px-3 py-1.5 rounded-md bg-green-500 text-white border-none text-[0.75rem]"
                            >
                                Shop QR
                            </button>
                            <button
                                onClick={() => simulateScan(JSON.stringify({ app: 'villagelink', v: 1, type: 'PAYMENT', id: 'QR-PAY456', data: { name: 'Ramesh Kumar' } }))}
                                className="px-3 py-1.5 rounded-md bg-blue-500 text-white border-none text-[0.75rem]"
                            >
                                Payment QR
                            </button>
                            <button
                                onClick={() => simulateScan(JSON.stringify({ app: 'villagelink', v: 1, type: 'PRODUCT', id: 'QR-PROD789', data: { name: 'Fresh Tomatoes' } }))}
                                className="px-3 py-1.5 rounded-md bg-pink-500 text-white border-none text-[0.75rem]"
                            >
                                Product QR
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .qr-scanner-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.9);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .qr-scanner-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .scanner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          color: white;
        }

        .scanner-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          padding: 8px;
          color: white;
          cursor: pointer;
        }

        .camera-view {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-view video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .scan-frame {
          position: absolute;
          width: 250px;
          height: 250px;
          border: 2px solid rgba(255,255,255,0.5);
        }

        .corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid white;
        }

        .corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
        .corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
        .corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
        .corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; }

        .processing-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          gap: 12px;
        }

        .camera-controls {
          position: absolute;
          bottom: 20px;
          display: flex;
          gap: 16px;
        }

        .control-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 50%;
          padding: 12px;
          color: white;
          cursor: pointer;
        }

        .control-btn.active {
          background: #fbbf24;
          color: #111827;
        }

        .error-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px;
          color: #ef4444;
        }

        .error-message button {
          background: #ef4444;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }

        .scan-result {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: white;
        }

        .result-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .result-icon svg {
          width: 32px;
          height: 32px;
          color: white;
        }

        .scan-result h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .result-type {
          color: #9ca3af;
          margin-bottom: 24px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        }

        .scan-again-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          text-decoration: underline;
        }

        .payment-modal {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: white;
        }

        .payment-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .payment-header h3 {
          font-size: 1.5rem;
          margin-top: 12px;
        }

        .payment-header p {
          color: #9ca3af;
        }

        .amount-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
        }

        .currency {
          font-size: 2rem;
          color: #9ca3af;
        }

        .amount-input-wrapper input {
          font-size: 3rem;
          width: 150px;
          background: none;
          border: none;
          color: white;
          text-align: center;
          outline: none;
        }

        .quick-amounts {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }

        .quick-amounts button {
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          cursor: pointer;
        }

        .quick-amounts button.active {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .pay-btn {
          width: 100%;
          max-width: 300px;
          margin-bottom: 16px;
        }

        .cancel-btn {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
        }

        .recent-scans {
          padding: 16px;
          background: rgba(255,255,255,0.05);
        }

        .recent-scans h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9ca3af;
          font-size: 0.875rem;
          margin-bottom: 12px;
        }

        .history-list {
          display: flex;
          gap: 8px;
          overflow-x: auto;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 8px;
          color: white;
          white-space: nowrap;
          cursor: pointer;
        }

        .demo-buttons {
          padding: 16px;
          text-align: center;
        }
      `}</style>
        </div>
    );
};

export default UniversalQRScanner;
