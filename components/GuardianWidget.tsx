/**
 * Guardian Widget Component
 * 
 * Safety features UI for passengers:
 * - Live trip sharing
 * - SOS button
 * - Trusted contacts management
 * - Route deviation alerts
 */

import React, { useState, useEffect } from 'react';
import {
    Shield,
    Share2,
    Phone,
    AlertTriangle,
    Users,
    MapPin,
    Check,
    X,
    Plus,
    Heart,
    Eye,
    Copy,
    Send
} from 'lucide-react';
import {
    getTrustedContacts,
    addTrustedContact,
    startLiveShare,
    triggerSOS,
    recordSOSAudio,
    getGuardianStatus,
    formatShareMessage,
    getSafetyTips,
    TrustedContact,
    LiveShare
} from '../services/guardianService';

interface GuardianWidgetProps {
    tripId?: string;
    destination?: string;
    currentLocation?: { lat: number; lng: number };
    isExpanded?: boolean;
    onSOSTriggered?: () => void;
}

export const GuardianWidget: React.FC<GuardianWidgetProps> = ({
    tripId,
    destination,
    currentLocation,
    isExpanded = false,
    onSOSTriggered
}) => {
    const [expanded, setExpanded] = useState(isExpanded);
    const [contacts, setContacts] = useState<TrustedContact[]>([]);
    const [activeShare, setActiveShare] = useState<LiveShare | null>(null);
    const [showAddContact, setShowAddContact] = useState(false);
    const [sosActive, setSosActive] = useState(false);
    const [sosCountdown, setSosCountdown] = useState(5);
    const [showShareSuccess, setShowShareSuccess] = useState(false);
    const [safetyScore, setSafetyScore] = useState(0);

    // New contact form
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        relationship: 'FAMILY' as const
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (sosActive && sosCountdown > 0) {
            const timer = setTimeout(() => setSosCountdown(sosCountdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (sosActive && sosCountdown === 0) {
            executeSOS();
        }
    }, [sosActive, sosCountdown]);

    const loadData = async () => {
        try {
            const [contactsData, statusData] = await Promise.all([
                getTrustedContacts(),
                getGuardianStatus()
            ]);
            setContacts(contactsData);
            setSafetyScore(statusData.safetyScore);
        } catch (error) {
            console.error('Failed to load guardian data:', error);
        }
    };

    const handleAddContact = async () => {
        if (!newContact.name || !newContact.phone) return;

        try {
            const contact = await addTrustedContact({
                name: newContact.name,
                phone: newContact.phone,
                relationship: newContact.relationship,
                autoShare: true
            });

            if (contact) {
                setContacts([...contacts, contact]);
                setNewContact({ name: '', phone: '', relationship: 'FAMILY' });
                setShowAddContact(false);
            }
        } catch (error) {
            console.error('Failed to add contact:', error);
        }
    };

    const handleShareTrip = async () => {
        if (!tripId) return;

        try {
            const share = await startLiveShare(tripId, contacts.map(c => c.id));
            setActiveShare(share);
            setShowShareSuccess(true);
            setTimeout(() => setShowShareSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to share trip:', error);
        }
    };

    const handleCopyLink = () => {
        if (activeShare?.shareUrl) {
            navigator.clipboard.writeText(activeShare.shareUrl);
            setShowShareSuccess(true);
            setTimeout(() => setShowShareSuccess(false), 2000);
        }
    };

    const startSOS = () => {
        setSosActive(true);
        setSosCountdown(5);
    };

    const cancelSOS = () => {
        setSosActive(false);
        setSosCountdown(5);
    };

    const executeSOS = async () => {
        try {
            // Record audio
            const audio = await recordSOSAudio(5000);

            // Trigger SOS
            await triggerSOS(
                currentLocation || { lat: 0, lng: 0 },
                tripId,
                audio || undefined
            );

            onSOSTriggered?.();
        } catch (error) {
            console.error('SOS failed:', error);
        } finally {
            setSosActive(false);
        }
    };

    const tips = getSafetyTips();

    // Compact View
    if (!expanded) {
        return (
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-3 border border-blue-500/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Shield className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">Guardian Active</p>
                            <p className="text-gray-400 text-xs">
                                {contacts.length} trusted contacts
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Quick Share */}
                        {tripId && (
                            <button
                                onClick={handleShareTrip}
                                className="p-2 bg-emerald-500/20 rounded-lg hover:bg-emerald-500/30 transition-colors"
                                title="Share Trip"
                            >
                                <Share2 className="w-5 h-5 text-emerald-400" />
                            </button>
                        )}

                        {/* Quick SOS */}
                        <button
                            onClick={startSOS}
                            className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                            title="SOS"
                        >
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </button>

                        {/* Expand */}
                        <button
                            onClick={() => setExpanded(true)}
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                        >
                            <Plus className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Expanded View
    return (
        <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl border border-gray-700/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <Shield className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Guardian Mode</h3>
                            <p className="text-gray-400 text-sm">Keep your loved ones informed</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setExpanded(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* SOS Button */}
                {sosActive ? (
                    <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-6 text-center">
                        <p className="text-red-400 text-lg font-bold mb-2">
                            SOS in {sosCountdown} seconds
                        </p>
                        <p className="text-gray-400 text-sm mb-4">
                            Recording audio and sharing location...
                        </p>
                        <button
                            onClick={cancelSOS}
                            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel SOS
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startSOS}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <AlertTriangle className="w-6 h-6" />
                        EMERGENCY SOS
                    </button>
                )}

                {/* Live Sharing */}
                {tripId && (
                    <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-emerald-400" />
                                <span className="text-white font-medium">Live Trip Share</span>
                            </div>
                            {activeShare && (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                    Active
                                </span>
                            )}
                        </div>

                        {activeShare ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={activeShare.shareUrl}
                                        readOnly
                                        className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                                    >
                                        <Copy className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>
                                {showShareSuccess && (
                                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Link copied!
                                    </p>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={handleShareTrip}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <Share2 className="w-5 h-5" />
                                Share Your Trip
                            </button>
                        )}
                    </div>
                )}

                {/* Trusted Contacts */}
                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span className="text-white font-medium">Trusted Contacts</span>
                        </div>
                        <button
                            onClick={() => setShowAddContact(!showAddContact)}
                            className="p-1.5 bg-blue-500/20 rounded-lg hover:bg-blue-500/30"
                        >
                            <Plus className="w-4 h-4 text-blue-400" />
                        </button>
                    </div>

                    {/* Add Contact Form */}
                    {showAddContact && (
                        <div className="mb-4 p-3 bg-black/30 rounded-lg space-y-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={newContact.name}
                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                className="w-full bg-white/10 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={newContact.phone}
                                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                className="w-full bg-white/10 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                            <div className="flex gap-2">
                                <select
                                    value={newContact.relationship}
                                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value as any })}
                                    className="flex-1 bg-white/10 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                    <option value="FAMILY">Family</option>
                                    <option value="FRIEND">Friend</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                                <button
                                    onClick={handleAddContact}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Contacts List */}
                    <div className="space-y-2">
                        {contacts.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-3">
                                No trusted contacts yet
                            </p>
                        ) : (
                            contacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="flex items-center justify-between p-2 bg-black/20 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-full">
                                            <Heart className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{contact.name}</p>
                                            <p className="text-gray-500 text-xs">{contact.phone}</p>
                                        </div>
                                    </div>
                                    {contact.autoShare && (
                                        <span className="text-xs text-emerald-400">Auto-share</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <p className="text-amber-400 font-medium text-sm mb-2">💡 Safety Tips</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                        {tips.slice(0, 2).map((tip, idx) => (
                            <li key={idx}>• {tip}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default GuardianWidget;
