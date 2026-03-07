/**
 * QRScanner - Real Camera-based QR Code Scanner
 * Uses html5-qrcode library for cross-browser QR scanning
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, X, RotateCcw, Loader2 } from 'lucide-react';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(true);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scannedRef = useRef(false);

    const startScanner = async () => {
        setIsStarting(true);
        setError(null);
        scannedRef.current = false;

        // Small delay to ensure DOM is fully painted and any previous camera streams are fully released
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // If the component is unmounted during the delay, stop
        if (!containerRef.current) return;

        try {
            const scannerId = 'qr-scanner-viewport';
            
            // Cleanup previous instance if any
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) {
                    console.warn("Cleanup error (ignored):", e);
                }
                scannerRef.current = null;
            }

            const html5QrCode = new Html5Qrcode(scannerId);
            scannerRef.current = html5QrCode;

            // start() returns a Promise. We await it to catch any rejection properly.
            await html5QrCode.start(
                { facingMode: 'environment' }, // Rear camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    if (!scannedRef.current) {
                        scannedRef.current = true;
                        // Vibrate for haptic feedback
                        if (navigator.vibrate) navigator.vibrate(200);
                        onScan(decodedText);
                    }
                },
                () => {
                    // QR code not found in frame — ignore
                }
            );

            setIsStarting(false);
        } catch (err: any) {
            console.error('QR Scanner Error:', err);
            setIsStarting(false);
            const errMsg = err?.toString() || err?.message || '';
            if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
                setError('Camera permission denied. Please allow camera access to scan QR codes.');
            } else if (errMsg.includes('NotFoundError') || errMsg.includes('devices')) {
                setError('No camera found on this device.');
            } else {
                setError(err?.message || 'Failed to start camera. Please try again.');
            }
        }
    };

    useEffect(() => {
        startScanner();

        return () => {
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        scannerRef.current.stop().then(() => {
                             scannerRef.current?.clear();
                        }).catch(console.warn);
                    } else {
                        scannerRef.current.clear();
                    }
                } catch (e) {
                    // Ignore
                }
            }
        };
    }, []);

    return (
        <div className="relative rounded-3xl overflow-hidden bg-black">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-2">
                    <Camera size={16} className="text-luxe-teal" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">QR Scanner</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                >
                    <X size={16} className="text-white" />
                </button>
            </div>

            {/* Scanner Viewport */}
            <div
                id="qr-scanner-viewport"
                ref={containerRef}
                className="w-full aspect-square bg-slate-900"
                style={{ minHeight: 280 }}
            />

            {/* Loading State */}
            {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                    <Loader2 size={40} className="text-luxe-teal animate-spin mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Starting Camera...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-20 px-6">
                    <div className="text-4xl mb-4">📷</div>
                    <p className="text-xs font-bold text-red-400 text-center mb-4">{error}</p>
                    <button
                        onClick={startScanner}
                        className="flex items-center gap-2 px-4 py-2 bg-luxe-teal/20 text-luxe-teal rounded-xl text-xs font-black uppercase tracking-widest hover:bg-luxe-teal/30 transition-all"
                    >
                        <RotateCcw size={14} />
                        Retry
                    </button>
                </div>
            )}

            {/* Bottom Guide */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-center z-10">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Point camera at ticket QR code
                </p>
            </div>
        </div>
    );
};

export default QRScanner;
