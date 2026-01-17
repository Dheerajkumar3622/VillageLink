/**
 * Enhanced QR Ticket Component V2
 * Features: Multi-modal display, offline indicator, enhanced animations,
 * better UX with ticket details and status updates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    X, RefreshCw, Clock, CheckCircle2, AlertTriangle, Ticket as TicketIcon,
    MapPin, Users, CreditCard, WifiOff, Wifi, Share2, Download, Volume2
} from 'lucide-react';
import { Ticket } from '../types';

interface QRTicketV2Props {
    ticket: Ticket;
    onClose: () => void;
    onRefresh?: () => Promise<string>;
    lang?: 'EN' | 'HI';
}

export const QRTicketV2: React.FC<QRTicketV2Props> = ({
    ticket,
    onClose,
    onRefresh,
    lang = 'EN'
}) => {
    const [qrPayload, setQrPayload] = useState(ticket.qrPayload || '');
    const [timeRemaining, setTimeRemaining] = useState(300);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [brightness, setBrightness] = useState(100);

    // Monitor network status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Timer countdown
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
        if (timeRemaining <= 30 && timeRemaining > 0 && onRefresh && !isRefreshing && isOnline) {
            handleRefresh();
        }
    }, [timeRemaining, isOnline]);

    // Increase screen brightness
    useEffect(() => {
        document.body.style.background = '#ffffff';
        return () => { document.body.style.background = ''; };
    }, []);

    const handleRefresh = async () => {
        if (!onRefresh || isRefreshing) return;
        setIsRefreshing(true);

        try {
            const newPayload = await onRefresh();
            setQrPayload(newPayload);
            setTimeRemaining(300);
            playSound('success');
        } catch (e) {
            console.error('QR refresh failed:', e);
            playSound('error');
        }

        setIsRefreshing(false);
    };

    const playSound = (type: 'success' | 'error') => {
        try {
            const audio = new Audio(`/sounds/${type}.mp3`);
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch { }
    };

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang === 'HI' ? 'hi-IN' : 'en-IN';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusBadge = () => {
        switch (ticket.status) {
            case 'PAID':
                return { bg: 'bg-green-500', text: lang === 'EN' ? 'Paid ✓' : 'भुगतान ✓', icon: CheckCircle2 };
            case 'PENDING':
                return { bg: 'bg-amber-500', text: lang === 'EN' ? 'Pay to Driver' : 'ड्राइवर को दें', icon: CreditCard };
            case 'BOARDED':
                return { bg: 'bg-blue-500', text: lang === 'EN' ? 'On Board' : 'सवार', icon: TicketIcon };
            default:
                return { bg: 'bg-slate-500', text: ticket.status, icon: TicketIcon };
        }
    };

    const statusBadge = getStatusBadge();
    const StatusIcon = statusBadge.icon;

    const handleShare = async () => {
        const shareData = {
            title: 'VillageLink Ticket',
            text: `${ticket.from} → ${ticket.to}\nTicket: ${ticket.id}\nAmount: ₹${ticket.totalPrice}`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.text);
                alert(lang === 'EN' ? 'Ticket details copied!' : 'टिकट कॉपी हो गया!');
            }
        } catch { }
    };

    const handleVoiceAnnounce = () => {
        const message = lang === 'EN'
            ? `Your ticket from ${ticket.from} to ${ticket.to}. ${ticket.passengerCount} passengers. Amount ${ticket.totalPrice} rupees. ${ticket.status === 'PAID' ? 'Already paid.' : 'Pay to driver.'}`
            : `${ticket.from} से ${ticket.to}। ${ticket.passengerCount} यात्री। ${ticket.totalPrice} रुपये। ${ticket.status === 'PAID' ? 'भुगतान हो गया।' : 'ड्राइवर को दें।'}`;
        speak(message);
    };

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
                    {/* Network Status */}
                    {isOnline ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full text-green-600 text-xs font-medium">
                            <Wifi size={12} />
                            {lang === 'EN' ? 'Online' : 'ऑनलाइन'}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full text-amber-600 text-xs font-medium">
                            <WifiOff size={12} />
                            {lang === 'EN' ? 'Offline' : 'ऑफ़लाइन'}
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${statusBadge.bg} text-white text-sm font-bold`}>
                        <StatusIcon size={14} />
                        {statusBadge.text}
                    </div>
                </div>
            </div>

            {/* Main QR Section */}
            <div className="flex flex-col items-center px-6">
                {/* QR Code with animated border */}
                <div className="relative">
                    {/* Pulsing glow effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 rounded-3xl opacity-30 blur-xl animate-pulse" />

                    {/* QR Container */}
                    <div className="relative p-1 rounded-3xl bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500">
                        <div className="bg-white p-6 rounded-[22px]">
                            {qrPayload ? (
                                <QRCodeSVG
                                    value={qrPayload}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                    bgColor="#ffffff"
                                    fgColor="#1e293b"
                                />
                            ) : (
                                <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 rounded-xl">
                                    <AlertTriangle size={48} className="text-amber-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-full 
          ${timeRemaining <= 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock size={16} />
                    <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                    {timeRemaining <= 60 && isOnline && (
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="ml-2 p-1 rounded-full bg-white shadow hover:shadow-md transition-shadow"
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>

                {/* Offline Warning */}
                {!isOnline && timeRemaining <= 60 && (
                    <div className="mt-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm text-center">
                        <WifiOff size={14} className="inline mr-1" />
                        {lang === 'EN' ? 'Go online to refresh QR' : 'QR रिफ्रेश करने के लिए ऑनलाइन हों'}
                    </div>
                )}

                {/* Ticket Details Card */}
                <div className="mt-6 w-full max-w-xs bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200 shadow-sm">
                    {/* Route */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm">
                            <MapPin size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">
                                {lang === 'EN' ? 'Route' : 'रूट'}
                            </p>
                            <p className="text-sm font-bold text-slate-800 truncate">
                                {ticket.from} → {ticket.to}
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-300 my-3" />

                    {/* Details grid */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                            <Users size={16} className="mx-auto text-blue-500 mb-1" />
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                                {lang === 'EN' ? 'Passengers' : 'यात्री'}
                            </p>
                            <p className="text-lg font-bold text-slate-800">{ticket.passengerCount}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                            <CreditCard size={16} className="mx-auto text-green-500 mb-1" />
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                                {lang === 'EN' ? 'Amount' : 'राशि'}
                            </p>
                            <p className="text-lg font-bold text-green-600">₹{ticket.totalPrice}</p>
                        </div>
                        <div className="bg-white rounded-xl p-2 shadow-sm">
                            <TicketIcon size={16} className="mx-auto text-purple-500 mb-1" />
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                                {lang === 'EN' ? 'Ticket #' : 'टिकट #'}
                            </p>
                            <p className="text-sm font-mono font-bold text-slate-800">{ticket.id.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 mt-6">
                    <button
                        onClick={handleVoiceAnnounce}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-medium transition-colors"
                    >
                        <Volume2 size={18} />
                        {lang === 'EN' ? 'Read Aloud' : 'बोलें'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-100 hover:bg-brand-200 rounded-xl text-brand-600 font-medium transition-colors"
                    >
                        <Share2 size={18} />
                        {lang === 'EN' ? 'Share' : 'शेयर'}
                    </button>
                </div>

                {/* Instructions */}
                <p className="mt-6 text-sm text-slate-500 text-center max-w-xs">
                    {lang === 'EN'
                        ? 'Show this QR code to the driver. Keep screen brightness high.'
                        : 'ड्राइवर को यह QR दिखाएं। स्क्रीन चमक बढ़ाएं।'}
                </p>
            </div>

            {/* Success animation overlay */}
            {showSuccess && (
                <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center text-white animate-fade-in">
                    <CheckCircle2 size={80} className="mb-4" />
                    <p className="text-2xl font-bold">{lang === 'EN' ? 'Verified!' : 'सत्यापित!'}</p>
                    <p className="text-lg opacity-80">{lang === 'EN' ? 'Have a safe journey' : 'शुभ यात्रा'}</p>
                </div>
            )}

            {/* Custom animations */}
            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
        </div>
    );
};

export default QRTicketV2;
