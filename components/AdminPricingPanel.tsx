/**
 * AdminPricingPanel - Admin UI for Transport Rate Control
 * USS v3.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { Button } from './Button';
import {
    Settings, Truck, Car, Bike, Package, Save,
    RefreshCw, AlertTriangle, Check, ChevronDown, ChevronUp,
    IndianRupee, Loader2
} from 'lucide-react';

interface AdminPricingPanelProps {
    user: User;
}

interface VehiclePricing {
    vehicleType: string;
    baseFare: number;
    perKmRate: number;
    perKgRate: number;
    minimumFare: number;
    nightSurcharge: number;
    peakMultiplier: number;
    isActive: boolean;
}

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
    AUTO: <Truck className="w-5 h-5" />,
    TEMPO: <Truck className="w-5 h-5" />,
    PICKUP: <Truck className="w-5 h-5" />,
    MINI_TRUCK: <Truck className="w-5 h-5" />,
    BUS: <Car className="w-5 h-5" />,
    BIKE: <Bike className="w-5 h-5" />
};

const VEHICLE_LABELS: Record<string, string> = {
    AUTO: 'Auto Rickshaw',
    TEMPO: 'Tempo / Loading Van',
    PICKUP: 'Pickup Truck',
    MINI_TRUCK: 'Mini Truck (1-3 Ton)',
    BUS: 'Bus / Tata Magic',
    BIKE: 'Bike Delivery'
};

const AdminPricingPanel: React.FC<AdminPricingPanelProps> = ({ user }) => {
    const [pricingData, setPricingData] = useState<VehiclePricing[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pricing/all`);
            const data = await res.json();

            if (data.success) {
                setPricingData(data.pricing);
            }
        } catch (error) {
            console.error('Fetch pricing error:', error);
            // Demo data
            setPricingData([
                { vehicleType: 'AUTO', baseFare: 30, perKmRate: 15, perKgRate: 2, minimumFare: 50, nightSurcharge: 1.25, peakMultiplier: 1.5, isActive: true },
                { vehicleType: 'TEMPO', baseFare: 50, perKmRate: 20, perKgRate: 1.5, minimumFare: 100, nightSurcharge: 1.25, peakMultiplier: 1.3, isActive: true },
                { vehicleType: 'PICKUP', baseFare: 80, perKmRate: 25, perKgRate: 1, minimumFare: 150, nightSurcharge: 1.25, peakMultiplier: 1.3, isActive: true },
                { vehicleType: 'MINI_TRUCK', baseFare: 150, perKmRate: 30, perKgRate: 0.5, minimumFare: 300, nightSurcharge: 1.3, peakMultiplier: 1.2, isActive: true },
                { vehicleType: 'BIKE', baseFare: 15, perKmRate: 8, perKgRate: 5, minimumFare: 30, nightSurcharge: 1.2, peakMultiplier: 1.5, isActive: true }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (vehicleType: string, field: keyof VehiclePricing, value: number | boolean) => {
        setPricingData(prev => prev.map(p =>
            p.vehicleType === vehicleType ? { ...p, [field]: value } : p
        ));
    };

    const savePricing = async (vehicleType: string) => {
        const pricing = pricingData.find(p => p.vehicleType === vehicleType);
        if (!pricing) return;

        setSaving(vehicleType);
        setErrorMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/pricing/${vehicleType}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(pricing)
            });

            const data = await res.json();

            if (data.success) {
                setSuccessMessage(`${VEHICLE_LABELS[vehicleType]} rates updated!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setErrorMessage(data.error || 'Update failed');
            }
        } catch (error: any) {
            setErrorMessage(error.message || 'Something went wrong');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="admin-pricing-loading">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>Loading pricing data...</p>
            </div>
        );
    }

    return (
        <div className="admin-pricing-panel">
            <div className="pricing-header">
                <div className="header-title">
                    <Settings className="w-6 h-6 text-blue-500" />
                    <h1>Transport Pricing Control</h1>
                </div>
                <Button variant="secondary" onClick={fetchPricing}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="success-message">
                    <Check className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="error-message">
                    <AlertTriangle className="w-5 h-5" />
                    {errorMessage}
                </div>
            )}

            {/* Pricing Cards */}
            <div className="pricing-list">
                {pricingData.map(pricing => (
                    <div
                        key={pricing.vehicleType}
                        className={`pricing-card ${!pricing.isActive ? 'inactive' : ''}`}
                    >
                        <div
                            className="card-header"
                            onClick={() => setExpandedVehicle(
                                expandedVehicle === pricing.vehicleType ? null : pricing.vehicleType
                            )}
                        >
                            <div className="vehicle-info">
                                <div className="vehicle-icon">
                                    {VEHICLE_ICONS[pricing.vehicleType] || <Package className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3>{VEHICLE_LABELS[pricing.vehicleType] || pricing.vehicleType}</h3>
                                    <p className="quick-stats">
                                        ₹{pricing.baseFare} base + ₹{pricing.perKmRate}/km
                                    </p>
                                </div>
                            </div>
                            <div className="card-toggle">
                                {expandedVehicle === pricing.vehicleType ?
                                    <ChevronUp className="w-5 h-5" /> :
                                    <ChevronDown className="w-5 h-5" />
                                }
                            </div>
                        </div>

                        {expandedVehicle === pricing.vehicleType && (
                            <div className="card-content">
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label htmlFor={`baseFare-${pricing.vehicleType}`}>Base Fare</label>
                                        <div className="input-with-icon">
                                            <IndianRupee className="w-4 h-4" />
                                            <input
                                                id={`baseFare-${pricing.vehicleType}`}
                                                type="number"
                                                aria-label="Base fare amount"
                                                value={pricing.baseFare}
                                                onChange={(e) => updateField(pricing.vehicleType, 'baseFare', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`perKmRate-${pricing.vehicleType}`}>Per KM Rate</label>
                                        <div className="input-with-icon">
                                            <IndianRupee className="w-4 h-4" />
                                            <input
                                                id={`perKmRate-${pricing.vehicleType}`}
                                                type="number"
                                                aria-label="Per kilometer rate"
                                                value={pricing.perKmRate}
                                                onChange={(e) => updateField(pricing.vehicleType, 'perKmRate', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`perKgRate-${pricing.vehicleType}`}>Per KG Rate</label>
                                        <div className="input-with-icon">
                                            <IndianRupee className="w-4 h-4" />
                                            <input
                                                id={`perKgRate-${pricing.vehicleType}`}
                                                type="number"
                                                aria-label="Per kilogram rate"
                                                value={pricing.perKgRate}
                                                onChange={(e) => updateField(pricing.vehicleType, 'perKgRate', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`minimumFare-${pricing.vehicleType}`}>Minimum Fare</label>
                                        <div className="input-with-icon">
                                            <IndianRupee className="w-4 h-4" />
                                            <input
                                                id={`minimumFare-${pricing.vehicleType}`}
                                                type="number"
                                                aria-label="Minimum fare amount"
                                                value={pricing.minimumFare}
                                                onChange={(e) => updateField(pricing.vehicleType, 'minimumFare', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`nightSurcharge-${pricing.vehicleType}`}>Night Surcharge</label>
                                        <input
                                            id={`nightSurcharge-${pricing.vehicleType}`}
                                            type="number"
                                            step="0.1"
                                            aria-label="Night surcharge multiplier"
                                            value={pricing.nightSurcharge}
                                            onChange={(e) => updateField(pricing.vehicleType, 'nightSurcharge', parseFloat(e.target.value) || 1)}
                                        />
                                        <span className="field-hint">Multiplier (1.25 = +25%)</span>
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor={`peakMultiplier-${pricing.vehicleType}`}>Peak Multiplier</label>
                                        <input
                                            id={`peakMultiplier-${pricing.vehicleType}`}
                                            type="number"
                                            step="0.1"
                                            aria-label="Peak time multiplier"
                                            value={pricing.peakMultiplier}
                                            onChange={(e) => updateField(pricing.vehicleType, 'peakMultiplier', parseFloat(e.target.value) || 1)}
                                        />
                                        <span className="field-hint">Surge pricing (1.5 = +50%)</span>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={pricing.isActive}
                                            onChange={(e) => updateField(pricing.vehicleType, 'isActive', e.target.checked)}
                                        />
                                        <span>Active</span>
                                    </label>

                                    <Button onClick={() => savePricing(pricing.vehicleType)} disabled={saving === pricing.vehicleType}>
                                        {saving === pricing.vehicleType ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style>{`
        .admin-pricing-panel {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .admin-pricing-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          gap: 16px;
          color: #6b7280;
        }

        .pricing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #dcfce7;
          color: #166534;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .pricing-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pricing-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .pricing-card.inactive {
          opacity: 0.6;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .card-header:hover {
          background: #f9fafb;
        }

        .vehicle-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vehicle-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .vehicle-info h3 {
          font-weight: 600;
          color: #111827;
        }

        .quick-stats {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .card-toggle {
          color: #9ca3af;
        }

        .card-content {
          padding: 0 16px 16px;
          border-top: 1px solid #e5e7eb;
          margin-top: -1px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          padding-top: 16px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-field label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .input-with-icon input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 1rem;
        }

        .form-field input:not(.input-with-icon input) {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
        }

        .field-hint {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .toggle-label input {
          width: 18px;
          height: 18px;
        }

        @media (prefers-color-scheme: dark) {
          .pricing-card {
            background: #1f2937;
            border-color: #374151;
          }
          .card-header:hover {
            background: #374151;
          }
          .header-title h1, .vehicle-info h3 {
            color: white;
          }
          .form-field input,
          .input-with-icon {
            background: #374151;
            border-color: #4b5563;
            color: white;
          }
        }
      `}</style>
        </div>
    );
};

export default AdminPricingPanel;
