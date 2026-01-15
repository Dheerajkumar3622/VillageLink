/**
 * QRTicket Component
 * Full-screen QR code display with animated styling,
 * auto-refresh, and ticket details for passengers
 */

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, RefreshCw, Clock, CheckCircle2, AlertTriangle, Ticket as TicketIcon, MapPin, Users, CreditCard } from 'lucide-react';
import { Ticket } from '../types';

interface QRTicketProps {
    ticket: Ticket;
    onClose: () => void;
    onRefresh?: () => Promise<string>; // Returns new QR payload
}

export const QRTicket: React.FC<QRTicketProps> = ({ ticket, onClose, onRefresh }) => {
    const [qrPayload, setQrPayload] = useState(ticket.qrPayload || '');
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Calculate time remaining
    useEffect(() => {
        if (ticket.expiresAt) {
            const updateTimer = () => {
                const remaining = Math.max(0, Math.floor((ticket.expiresAt! - Date.now()) / 1000));
                setTimeRemaining(remaining);
            };
            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }
    }, [ticket.expiresAt]);

    // Auto-refresh when time is low
    useEffect(() => {
        if (timeRemaining <= 30 && timeRemaining > 0 && onRefresh && !isRefreshing) {
            handleRefresh();
        }
    }, [timeRemaining]);

    const handleRefresh = async () => {
        if (!onRefresh || isRefreshing) return;
        setIsRefreshing(true);
        try {
            const newPayload = await onRefresh();
            setQrPayload(newPayload);
            setTimeRemaining(300);
        } catch (e) {
            console.error('QR refresh failed:', e);
        }
        setIsRefreshing(false);
    };

    // Format time display
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Status badge
    const getStatusBadge = () => {
        switch (ticket.status) {
            case 'PAID':
                return { bg: 'bg-green-500', text: 'Paid ✓', icon: CheckCircle2 };
            case 'PENDING':
                return { bg: 'bg-amber-500', text: 'Pay to Driver', icon: CreditCard };
            case 'BOARDED':
                return { bg: 'bg-blue-500', text: 'On Board', icon: TicketIcon };
            default:
                return { bg: 'bg-slate-500', text: ticket.status, icon: TicketIcon };
        }
    };

    const statusBadge = getStatusBadge();
    const StatusIcon = statusBadge.icon;

    // Increase screen brightness effect (CSS only simulation)
    useEffect(() => {
        document.body.style.background = '#ffffff';
        return () => {
            document.body.style.background = '';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <X size={24} className="text-slate-600" />
                </button>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${statusBadge.bg} text-white text-sm font-bold`}>
                        <StatusIcon size={14} />
                        {statusBadge.text}
                    </div>
                </div>
            </div>

            {/* Main QR Section */}
            <div className="flex flex-col items-center px-6">
                {/* Animated border container */}
                <div className="relative p-1 rounded-3xl bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500 animate-pulse">
                    <div className="bg-white p-6 rounded-[22px]">
                        {qrPayload ? (
                            <QRCodeSVG
                                value={qrPayload}
                                size={220}
                                level="H"
                                includeMargin={false}
                                bgColor="#ffffff"
                                fgColor="#1e293b"
                            />
                        ) : (
                            <div className="w-[220px] h-[220px] flex items-center justify-center bg-slate-100 rounded-xl">
                                <AlertTriangle size={48} className="text-amber-500" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-full ${timeRemaining <= 60 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                    <Clock size={16} />
                    <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                    {timeRemaining <= 60 && (
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="ml-2 p-1 rounded-full bg-white shadow hover:shadow-md transition-shadow"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>

                {/* Ticket Details Card */}
                <div className="mt-6 w-full max-w-xs bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
                    {/* Route */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <MapPin size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400 uppercase font-bold">Route</p>
                            <p className="text-sm font-bold text-slate-800">
                                {ticket.from} → {ticket.to}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-300 my-3" />

                    {/* Details grid */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Passengers</p>
                            <p className="text-lg font-bold text-slate-800">{ticket.passengerCount}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Amount</p>
                            <p className="text-lg font-bold text-green-600">₹{ticket.totalPrice}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Ticket #</p>
                            <p className="text-sm font-mono font-bold text-slate-800">{ticket.id.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <p className="mt-6 text-sm text-slate-500 text-center max-w-xs">
                    Show this QR code to the driver for verification. Keep screen brightness high.
                </p>
            </div>

            {/* Success animation overlay */}
            {showSuccess && (
                <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white animate-fade-in">
                    <CheckCircle2 size={80} className="mb-4" />
                    <p className="text-2xl font-bold">Verified!</p>
                    <p className="text-lg opacity-80">Have a safe journey</p>
                </div>
            )}
        </div>
    );
};

export default QRTicket;
