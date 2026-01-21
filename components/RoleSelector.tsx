/**
 * RoleSelector - Multi-role Registration Component
 * USS v3.0
 */

import React, { useState } from 'react';
import { User } from '../types';
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
        color: '#3b82f6',
        colorAlpha: 'rgba(59, 130, 246, 0.1)',
        requiredDocs: ['Driving License', 'Vehicle RC', 'Aadhar Card']
    },
    {
        id: 'FARMER',
        icon: <Wheat className="w-6 h-6" />,
        label: 'Farmer (Kisan)',
        description: 'Sell your produce directly',
        color: '#22c55e',
        colorAlpha: 'rgba(34, 197, 94, 0.1)',
        requiredDocs: ['Aadhar Card', 'Land Papers (optional)']
    },
    {
        id: 'VENDOR',
        icon: <Store className="w-6 h-6" />,
        label: 'Vendor / Wholesaler',
        description: 'Trade goods in bulk',
        color: '#f97316',
        colorAlpha: 'rgba(249, 115, 22, 0.1)',
        requiredDocs: ['GST Certificate', 'Business License', 'Aadhar Card']
    },
    {
        id: 'RETAILER',
        icon: <ShoppingCart className="w-6 h-6" />,
        label: 'Retailer',
        description: 'Buy from farmers/vendors for retail',
        color: '#8b5cf6',
        colorAlpha: 'rgba(139, 92, 246, 0.1)',
        requiredDocs: ['Shop License', 'Aadhar Card']
    },
    {
        id: 'MESS_OWNER',
        icon: <UtensilsCrossed className="w-6 h-6" />,
        label: 'Mess / Hotel / Dhaba Owner',
        description: 'Food establishment owner',
        color: '#ef4444',
        colorAlpha: 'rgba(239, 68, 68, 0.1)',
        requiredDocs: ['FSSAI License', 'Business License', 'Aadhar Card']
    },
    {
        id: 'SHOPKEEPER',
        icon: <Store className="w-6 h-6" />,
        label: 'Shopkeeper',
        description: 'General store or retail shop',
        color: '#06b6d4',
        colorAlpha: 'rgba(6, 182, 212, 0.1)',
        requiredDocs: ['Shop License', 'Aadhar Card']
    },
    {
        id: 'LOGISTICS',
        icon: <Box className="w-6 h-6" />,
        label: 'Logistics Partner',
        description: 'Delivery and cargo transport',
        color: '#84cc16',
        colorAlpha: 'rgba(132, 204, 22, 0.1)',
        requiredDocs: ['Aadhar Card', 'Vehicle Docs']
    },
    {
        id: 'VILLAGE_MANAGER',
        icon: <Users className="w-6 h-6" />,
        label: 'Village Manager (ग्राम प्रबंधक)',
        description: 'Help villagers access digital services',
        color: '#059669',
        colorAlpha: 'rgba(5, 150, 105, 0.1)',
        requiredDocs: ['Aadhar Card', 'Gram Panchayat Authorization']
    }
];

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
            const token = localStorage.getItem('token');

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
        <div className="role-selector">
            <div className="role-selector-container">
                {/* Header */}
                <div className="selector-header">
                    <h1>Become a Partner</h1>
                    <p>Select your service type(s) to get started</p>
                </div>

                {/* Step Indicator */}
                <div className="step-indicator">
                    <div className={`step ${step === 'select' ? 'active' : 'completed'}`}>
                        <span className="step-num">1</span>
                        <span className="step-label">Select Role</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step === 'documents' ? 'active' : step === 'review' ? 'completed' : ''}`}>
                        <span className="step-num">2</span>
                        <span className="step-label">Documents</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step === 'review' ? 'active' : ''}`}>
                        <span className="step-num">3</span>
                        <span className="step-label">Review</span>
                    </div>
                </div>

                {/* Step Content */}
                const RoleCard: React.FC<{
    role: any,
                isSelected: boolean,
    onClick: () => void
}> = ({role, isSelected, onClick}) => {
    const cardRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
        if (cardRef.current) {
                        cardRef.current.style.setProperty('--role-color', role.color);
                    cardRef.current.style.setProperty('--role-color-alpha', role.colorAlpha || (role.color + '22'));
        }
    }, [role]);

                    return (
                    <button
                        ref={cardRef}
                        className={`role-card ${isSelected ? 'selected' : ''}`}
                        onClick={onClick}
                    >
                        <div className="role-icon">
                            {role.icon}
                        </div>
                        <div className="role-info">
                            <h3>{role.label}</h3>
                            <p>{role.description}</p>
                        </div>
                        {isSelected && (
                            <div className="check-badge">
                                <Check className="w-4 h-4" />
                            </div>
                        )}
                    </button>
                    );
};

                    // ... inside Step Content ...
                    {step === 'select' && (
                        <div className="role-grid">
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
                        <div className="documents-section">
                            <div className="business-info">
                                <h3>Business Information</h3>
                                <input
                                    type="text"
                                    placeholder="Business Name (optional)"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="input-field"
                                />
                                <input
                                    type="text"
                                    placeholder="Business Address"
                                    value={businessAddress}
                                    onChange={(e) => setBusinessAddress(e.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <h3>Required Documents</h3>
                            <p className="hint">Upload clear images of your documents</p>

                            <div className="doc-list">
                                {getRequiredDocs().map(doc => (
                                    <div key={doc} className="doc-item">
                                        <div className="doc-info">
                                            <span className="doc-name">{doc}</span>
                                            {documents[doc] && (
                                                <span className="doc-status">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                    {documents[doc]?.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="doc-actions">
                                            <label className="upload-btn">
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
                                                    className="remove-btn"
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
                    )}

                    {step === 'review' && (
                        <div className="review-section">
                            <h3>Review Your Application</h3>

                            <div className="review-card">
                                <h4>Selected Roles</h4>
                                const RoleTag: React.FC<{ label: string, color: string }> = ({label, color}) => {
    const tagRef = React.useRef<HTMLSpanElement>(null);

    React.useEffect(() => {
        if (tagRef.current) {
                                        tagRef.current.style.background = color;
        }
    }, [color]);

                                    return (
                                    <span ref={tagRef} className="role-tag">
                                        {label}
                                    </span>
                                    );
};

                                    // ... inside review-section ...
                                    <div className="selected-roles">
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

                            <div className="review-card">
                                <h4>Business Details</h4>
                                <p>{businessName || 'N/A'}</p>
                                <p className="address">{businessAddress || 'N/A'}</p>
                            </div>

                            <div className="review-card">
                                <h4>Documents Uploaded</h4>
                                <p>{Object.keys(documents).filter(k => documents[k]).length} / {getRequiredDocs().length} documents</p>
                            </div>

                            <div className="terms">
                                <p>By submitting, you agree to our Terms of Service and Partner Agreement.</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="error-msg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="selector-actions">
                        {step !== 'select' && (
                            <Button
                                variant="secondary"
                                onClick={() => setStep(step === 'documents' ? 'select' : 'documents')}
                            >
                                Back
                            </Button>
                        )}

                        {step === 'select' && (
                            <>
                                <Button variant="secondary" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => setStep('documents')}
                                    disabled={selectedRoles.length === 0}
                                >
                                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </>
                        )}

                        {step === 'documents' && (
                            <Button onClick={() => setStep('review')}>
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}

                        {step === 'review' && (
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Application'}
                            </Button>
                        )}
                    </div>
            </div>

            <style>{`
        .role-selector {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
          padding: 20px;
        }

        .role-selector-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .selector-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .selector-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .selector-header p {
          color: #6b7280;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .step.active .step-num {
          background: #3b82f6;
          color: white;
        }

        .step.completed .step-num {
          background: #22c55e;
          color: white;
        }

        .step-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .step-line {
          width: 40px;
          height: 2px;
          background: #e5e7eb;
          margin: 0 8px;
          margin-bottom: 20px;
        }

        .role-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .role-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          position: relative;
        }

        .role-card:hover {
          border-color: #9ca3af;
        }

        .role-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .role-info h3 {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .role-info p {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .check-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .documents-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .documents-section h3 {
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
        }

        .hint {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 16px;
        }

        .business-info {
          margin-bottom: 24px;
        }

        .input-field {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 1rem;
        }

        .doc-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .doc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .doc-name {
          font-weight: 500;
          color: #111827;
        }

        .doc-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.875rem;
          color: #22c55e;
        }

        .doc-actions {
          display: flex;
          gap: 8px;
        }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #3b82f6;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .remove-btn {
          padding: 8px;
          background: #fee2e2;
          color: #ef4444;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .review-section {
          margin-bottom: 24px;
        }

        .review-section h3 {
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }

        .review-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .review-card h4 {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .selected-roles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .role-tag {
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
        }

        .address {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .terms {
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          margin-top: 16px;
        }

        .terms p {
          font-size: 0.875rem;
          color: #92400e;
        }

        .error-msg {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          text-align: center;
        }

        .selector-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
      `}</style>
        </div>
    );
};

export default RoleSelector;
