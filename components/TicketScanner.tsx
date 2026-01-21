/**
 * TicketScanner Component
 * Camera-based QR code scanner for drivers to verify passenger tickets
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle2, XCircle, AlertTriangle, Users, MapPin, CreditCard, Loader2, Volume2 } from 'lucide-react';
import { Ticket } from '../types';

interface VerificationResult {
    valid: boolean;
    ticket?: {
        id: string;
        from: string;
        to: string;
        passengerCount: number;
        totalPrice: number;
        status: string;
        paymentMethod: string;
    };
    error?: string;
    fraudReason?: string;
}

interface TicketScannerProps {
    onClose: () => void;
    onVerified: (ticketId: string, passengerCount: number) => void;
    driverId: string;
    onVerifyTicket: (qrData: string) => Promise<VerificationResult>;
}

export const TicketScanner: React.FC<TicketScannerProps> = ({
    onClose,
    onVerified,
    driverId,
    onVerifyTicket
}) => {
    const [isScanning, setIsScanning] = useState(true);
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize scanner
    useEffect(() => {
        const initScanner = async () => {
            try {
                if (!containerRef.current) return;

                scannerRef.current = new Html5Qrcode("qr-reader");

                await scannerRef.current.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    handleScanSuccess,
                    handleScanError
                );
            } catch (err) {
                console.error('Scanner init error:', err);
                setScannerError('Camera access denied. Please enable camera permissions.');
            }
        };

        initScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const handleScanSuccess = async (decodedText: string) => {
        if (isProcessing || result) return;

        setIsProcessing(true);
        setIsScanning(false);

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        // Play scan sound
        try {
            const audio = new Audio('/sounds/scan.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch { }

        try {
            const verificationResult = await onVerifyTicket(decodedText);
            setResult(verificationResult);

            // Success haptic
            if (verificationResult.valid && navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }

            // Error haptic
            if (!verificationResult.valid && navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
        } catch (error) {
            setResult({
                valid: false,
                error: 'Verification failed. Please try again.'
            });
        }

        setIsProcessing(false);
    };

    const handleScanError = (errorMessage: string) => {
        // Ignore common scan errors (no QR detected)
        if (!errorMessage.includes('No QR code')) {
            console.log('Scan error:', errorMessage);
        }
    };

    const handleConfirmBoarding = () => {
        if (result?.valid && result.ticket) {
            onVerified(result.ticket.id, result.ticket.passengerCount);
            onClose();
        }
    };

    const handleScanAgain = () => {
        setResult(null);
        setIsScanning(true);

        // Restart scanner
        if (scannerRef.current) {
            scannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                handleScanSuccess,
                handleScanError
            ).catch(console.error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    aria-label="Close Scanner"
                >
                    <X size={24} className="text-white" />
                </button>
                <h2 className="text-white font-bold text-lg">Scan Ticket</h2>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Scanner View */}
            {isScanning && !result && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div ref={containerRef} className="relative">
                        <div id="qr-reader" className="w-80 h-80 rounded-2xl overflow-hidden" />

                        {/* Scan frame overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-brand-500 rounded-tl-2xl" />
                            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-brand-500 rounded-tr-2xl" />
                            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-brand-500 rounded-bl-2xl" />
                            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-brand-500 rounded-br-2xl" />
                        </div>

                        {/* Scan line animation */}
                        <div className="absolute inset-x-4 h-1 bg-brand-500 opacity-50 animate-scan-line" />
                    </div>

                    <p className="mt-6 text-white/70 text-center px-8">
                        Point camera at passenger's QR code
                    </p>

                    {scannerError && (
                        <div className="mt-4 mx-4 p-4 bg-red-500/20 rounded-xl border border-red-500/50">
                            <p className="text-red-300 text-sm text-center">{scannerError}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 size={64} className="text-brand-500 animate-spin mb-4" />
                    <p className="text-white text-lg">Verifying ticket...</p>
                </div>
            )}

            {/* Result View */}
            {result && !isProcessing && (
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    {result.valid && result.ticket ? (
                        <>
                            {/* Success */}
                            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 animate-bounce-in">
                                <CheckCircle2 size={56} className="text-white" />
                            </div>

                            <h3 className="text-white text-2xl font-bold mb-2">Ticket Valid!</h3>

                            <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6 mt-4">
                                {/* Route */}
                                <div className="flex items-center gap-3 mb-4">
                                    <MapPin size={20} className="text-green-400" />
                                    <span className="text-white font-medium">
                                        {result.ticket.from} → {result.ticket.to}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 rounded-xl p-3 text-center">
                                        <Users size={20} className="text-blue-400 mx-auto mb-1" />
                                        <p className="text-white/60 text-xs">Passengers</p>
                                        <p className="text-white text-xl font-bold">{result.ticket.passengerCount}</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-3 text-center">
                                        <CreditCard size={20} className="text-green-400 mx-auto mb-1" />
                                        <p className="text-white/60 text-xs">Amount</p>
                                        <p className="text-white text-xl font-bold">₹{result.ticket.totalPrice}</p>
                                    </div>
                                </div>

                                {/* Payment status */}
                                <div className={`mt-4 p-3 rounded-xl text-center ${result.ticket.paymentMethod === 'CASH'
                                    ? 'bg-amber-500/20 border border-amber-500/50'
                                    : 'bg-green-500/20 border border-green-500/50'
                                    }`}>
                                    <p className={result.ticket.paymentMethod === 'CASH' ? 'text-amber-300' : 'text-green-300'}>
                                        {result.ticket.paymentMethod === 'CASH'
                                            ? '💵 Collect Cash from Passenger'
                                            : '✓ Already Paid Online'}
                                    </p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-4 mt-8 w-full max-w-sm">
                                <button
                                    onClick={handleScanAgain}
                                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold"
                                >
                                    Scan Another
                                </button>
                                <button
                                    onClick={handleConfirmBoarding}
                                    className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold"
                                >
                                    Confirm Boarding
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Error */}
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${result.fraudReason ? 'bg-red-500' : 'bg-amber-500'
                                }`}>
                                {result.fraudReason ? (
                                    <XCircle size={56} className="text-white" />
                                ) : (
                                    <AlertTriangle size={56} className="text-white" />
                                )}
                            </div>

                            <h3 className="text-white text-2xl font-bold mb-2">
                                {result.fraudReason ? 'Fraud Alert!' : 'Invalid Ticket'}
                            </h3>

                            <p className="text-white/70 text-center mb-4">
                                {result.error}
                            </p>

                            {result.fraudReason && (
                                <div className="w-full max-w-sm bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
                                    <p className="text-red-300 text-sm text-center">
                                        <strong>Reason:</strong> {result.fraudReason.replace('_', ' ')}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={handleScanAgain}
                                className="py-3 px-8 rounded-xl bg-white/20 text-white font-bold"
                            >
                                Try Again
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* CSS for animations */}
            <style>{`
                @keyframes scan-line {
                    0% { top: 10%; }
                    50% { top: 85%; }
                    100% { top: 10%; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
                @keyframes bounce-in {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.4s ease-out;
                }
            `}</style>
        </div>
    );
};

export default TicketScanner;
