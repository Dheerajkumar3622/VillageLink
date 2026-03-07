/**
 * RoleSelector - Multi-role Registration Component
 * USS v3.0
 */

import React, { useState } from 'react';
import { User } from '@villagelink/shared';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Truck, Wheat, Store, UtensilsCrossed, ShoppingCart, Box,
    Check, ArrowRight, Loader2, Upload, X, Users
} from 'lucide-react';

type ProviderRole = 'DRIVER' | 'FARMER' | 'VENDOR' | 'RETAILER' | 'MESS_OWNER' | 'SHOPKEEPER' | 'LOGISTICS' | 'VILLAGE_MANAGER';

interface RoleSelectorProps {
    user: User;
    onComplete: (roles: ProviderRole[]) => void;
    onCancel: () => void;
}

interface RoleOption {
    id: ProviderRole;
    icon: React.ReactNode;
    label: string;
    description: string;
    color: string;
    colorAlpha?: string;
    requiredDocs: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        id: 'DRIVER',
        icon: <Truck className="w-6 h-6" />,
        label: 'Driver',
        description: 'Bus, Auto, Taxi, or Vehicle Owner',
        color: '#BE5103',
        colorAlpha: 'rgba(190, 81, 3, 0.1)',
        requiredDocs: ['Driving License', 'Vehicle RC', 'Aadhar Card']
    },
    {
        id: 'FARMER',
        icon: <Wheat className="w-6 h-6" />,
        label: 'Farmer (Kisan)',
        description: 'Sell your produce directly',
        color: '#069494',
        colorAlpha: 'rgba(6, 148, 148, 0.1)',
        requiredDocs: ['Aadhar Card', 'Land Papers (optional)']
    },
    {
        id: 'RETAILER',
        icon: <ShoppingCart className="w-6 h-6" />,
        label: 'Retailer',
        description: 'Buy from farmers/vendors for retail',
        color: '#FFCE1B',
        colorAlpha: 'rgba(255, 206, 27, 0.1)',
        requiredDocs: ['Shop License', 'Aadhar Card']
    },
    {
        id: 'SHOPKEEPER',
        icon: <Store className="w-6 h-6" />,
        label: 'Shopkeeper',
        description: 'General store or retail shop',
        color: '#FFCE1B',
        colorAlpha: 'rgba(255, 206, 27, 0.1)',
        requiredDocs: ['Shop License', 'Aadhar Card']
    },
    {
        id: 'LOGISTICS',
        icon: <Box className="w-6 h-6" />,
        label: 'Logistics Partner',
        description: 'Delivery and cargo transport',
        color: '#069494',
        colorAlpha: 'rgba(6, 148, 148, 0.1)',
        requiredDocs: ['Aadhar Card', 'Vehicle Docs']
    },
    {
        id: 'VILLAGE_MANAGER',
        icon: <Users className="w-6 h-6" />,
        label: 'Village Manager (ग्राम प्रबंधक)',
        description: 'Help villagers access digital services',
        color: '#FFCE1B',
        colorAlpha: 'rgba(255, 206, 27, 0.1)',
        requiredDocs: ['Aadhar Card', 'Gram Panchayat Authorization']
    }
];

const RoleCard: React.FC<{
    role: any,
    isSelected: boolean,
    onClick: () => void
}> = ({ role, isSelected, onClick }) => {
    const cardRef = React.useRef<HTMLButtonElement>(null);

    return (
        <button
            ref={cardRef}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden backdrop-blur-md hover:-translate-y-1 hover:shadow-xl ${isSelected ? 'border-transparent shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-white dark:bg-slate-800' : 'border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'}`}
            style={isSelected ? { borderColor: role.color, backgroundColor: role.colorAlpha || (role.color + '11') } : {}}
            onClick={onClick}
        >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner" style={{ background: role.color }}>
                {role.icon}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1">{role.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-tight">{role.description}</p>
            </div>
            {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-md animate-scale-in" style={{ backgroundColor: role.color }}>
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}
        </button>
    );
};

const RoleTag: React.FC<{ label: string, color: string }> = ({ label, color }) => {
    return (
        <span className="px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm" style={{ background: color }}>
            {label}
        </span>
    );
};

const RoleSelector: React.FC<RoleSelectorProps> = ({ user, onComplete, onCancel }) => {
    const [step, setStep] = useState<'select' | 'documents' | 'review'>('select');
    const [selectedRoles, setSelectedRoles] = useState<ProviderRole[]>([]);
    const [documents, setDocuments] = useState<Record<string, File | null>>({});
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleRole = (role: ProviderRole) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    const getRequiredDocs = (): string[] => {
        const docs = new Set<string>();
        selectedRoles.forEach(role => {
            const roleOption = ROLE_OPTIONS.find(r => r.id === role);
            roleOption?.requiredDocs.forEach(d => docs.add(d));
        });
        return Array.from(docs);
    };

    const handleFileChange = (docType: string, file: File | null) => {
        setDocuments({ ...documents, [docType]: file });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('villagelink_token');

            // Upload documents first
            const uploadedDocs: { docType: string; url: string }[] = [];

            for (const [docType, file] of Object.entries(documents)) {
                if (file) {
                    // In production, upload to cloud storage
                    // For now, create a local URL
                    const url = `/uploads/${user.id}/${docType.replace(/\s+/g, '_')}_${Date.now()}`;
                    uploadedDocs.push({ docType, url });
                }
            }

            // Register roles
            const res = await fetch(`${API_BASE_URL}/api/user/register-roles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    roles: selectedRoles.map(role => ({
                        roleType: role,
                        documents: uploadedDocs,
                        businessName: businessName || undefined,
                        businessAddress: businessAddress || undefined
                    }))
                })
            });

            const data = await res.json();

            if (data.success) {
                onComplete(selectedRoles);
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (error: any) {
            setError(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF9F5] to-[#FFF0E5] dark:from-slate-950 dark:to-slate-900 p-4 md:p-8 flex flex-col justify-center relative">
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#BE5103]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#069494]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-[600px] w-full mx-auto relative z-10 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex py-1 px-3 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#BE5103] mb-4 uppercase tracking-widest shadow-sm">
                        Partner Registration
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight drop-shadow-sm">Become a Partner</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Select your service type(s) to get started</p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-10 text-sm font-bold">
                    <div className={`flex flex-col items-center gap-2 ${step === 'select' ? 'text-[#BE5103] scale-110 transition-transform' : 'text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${step === 'select' ? 'bg-gradient-to-br from-[#BE5103] to-[#FFCE1B] text-white' : 'bg-white dark:bg-slate-800'}`}>1</div>
                        <span>Role</span>
                    </div>
                    <div className={`w-12 h-1 mx-2 rounded-full ${step === 'select' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-[#069494] shadow-[0_0_10px_#069494]'}`} />
                    <div className={`flex flex-col items-center gap-2 ${step === 'documents' ? 'text-[#069494] scale-110 transition-transform' : (step === 'review' ? 'text-emerald-500' : 'text-slate-400')}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${step === 'documents' ? 'bg-gradient-to-br from-[#069494] to-[#12b4b4] text-white' : (step === 'review' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800')}`}>2</div>
                        <span>Docs</span>
                    </div>
                    <div className={`w-12 h-1 mx-2 rounded-full ${step === 'review' ? 'bg-[#BE5103] shadow-[0_0_10px_#BE5103]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    <div className={`flex flex-col items-center gap-2 ${step === 'review' ? 'text-[#BE5103] scale-110 transition-transform' : 'text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${step === 'review' ? 'bg-gradient-to-br from-[#BE5103] to-[#e66a1a] text-white' : 'bg-white dark:bg-slate-800'}`}>3</div>
                        <span>Review</span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all">
                    {step === 'select' && (
                        <div className="flex flex-col gap-4">
                            {ROLE_OPTIONS.map(role => (
                                <RoleCard
                                    key={role.id}
                                    role={role}
                                    isSelected={selectedRoles.includes(role.id)}
                                    onClick={() => toggleRole(role.id)}
                                />
                            ))}
                        </div>
                    )}

                    {step === 'documents' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Business Information</h3>
                                <input
                                    type="text"
                                    placeholder="Business Name (optional)"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mb-4 focus:ring-2 focus:ring-[#BE5103] outline-none transition-all shadow-inner placeholder:text-slate-400"
                                />
                                <input
                                    type="text"
                                    placeholder="Business Address"
                                    value={businessAddress}
                                    onChange={(e) => setBusinessAddress(e.target.value)}
                                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#BE5103] outline-none transition-all shadow-inner placeholder:text-slate-400"
                                />
                            </div>

                            <div className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">Required Documents</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Upload clear images of your documents</p>

                                <div className="flex flex-col gap-3">
                                    {getRequiredDocs().map(doc => (
                                        <div key={doc} className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{doc}</span>
                                                {documents[doc] && (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-500 mt-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded w-fit">
                                                        <Check className="w-3 h-3" />
                                                        {documents[doc]?.name.substring(0, 15)}...
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#12b4b4] to-[#069494] hover:from-[#069494] hover:to-[#058080] text-white font-bold rounded-lg cursor-pointer transition-all shadow-md shadow-[#069494]/20 hover:-translate-y-0.5 whitespace-nowrap text-sm">
                                                    <Upload className="w-4 h-4" />
                                                    Upload
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        onChange={(e) => handleFileChange(doc, e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </label>
                                                {documents[doc] && (
                                                    <button
                                                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                                        aria-label="Remove document"
                                                        onClick={() => handleFileChange(doc, null)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-5 animate-fade-in-up">
                            <div className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Selected Roles</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRoles.map(role => {
                                        const roleOption = ROLE_OPTIONS.find(r => r.id === role);
                                        if (!roleOption) return null;
                                        return (
                                            <RoleTag
                                                key={role}
                                                label={roleOption.label}
                                                color={roleOption.color}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md flex flex-col gap-1">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Business Details</h4>
                                <p className="font-bold text-slate-900 dark:text-white text-lg">{businessName || 'No Business Name'}</p>
                                <p className="text-slate-500 dark:text-slate-400">{businessAddress || 'No Address Provided'}</p>
                            </div>

                            <div className="bg-white/70 dark:bg-slate-800/70 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm backdrop-blur-md flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Documents Uploaded</h4>
                                <span className="bg-[#BE5103] text-white px-3 py-1 rounded-full text-xs font-bold shadow-md shadow-[#BE5103]/20">
                                    {Object.keys(documents).filter(k => documents[k]).length} / {getRequiredDocs().length}
                                </span>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl shadow-inner mt-4">
                                <p className="text-sm text-amber-800 dark:text-amber-500 font-medium">
                                    By submitting, you agree to our Terms of Service and Partner Agreement.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 p-4 rounded-xl text-center font-bold text-sm shadow-sm animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-4 justify-end mt-8 border-t border-slate-200/50 dark:border-slate-700/50 pt-6">
                        {step !== 'select' && (
                            <Button
                                variant="secondary"
                                onClick={() => setStep(step === 'documents' ? 'select' : 'documents')}
                                className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-bold"
                            >
                                Back
                            </Button>
                        )}

                        {step === 'select' && (
                            <>
                                <Button variant="secondary" onClick={onCancel} className="px-6 py-3 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => setStep('documents')}
                                    disabled={selectedRoles.length === 0}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#BE5103] to-[#FFce1B] hover:shadow-lg hover:shadow-[#BE5103]/20 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                                >
                                    Continue <ArrowRight className="w-5 h-5 ml-2 inline-block" />
                                </Button>
                            </>
                        )}

                        {step === 'documents' && (
                            <Button onClick={() => setStep('review')} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#069494] to-[#12b4b4] hover:shadow-lg hover:shadow-[#069494]/20 text-white font-bold transition-all hover:-translate-y-0.5">
                                Continue <ArrowRight className="w-5 h-5 ml-2 inline-block" />
                            </Button>
                        )}

                        {step === 'review' && (
                            <Button onClick={handleSubmit} disabled={loading} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#BE5103] to-[#e66a1a] hover:shadow-lg hover:shadow-[#BE5103]/30 text-white font-bold transition-all hover:-translate-y-0.5 text-lg w-full md:w-auto">
                                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Submit Application'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleSelector;
