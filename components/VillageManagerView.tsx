/**
 * VillageManagerView - Dashboard for Village Managers
 * Enables proxy booking services for villagers without smartphones
 * USS v3.0 / VillageLink v19.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, Beneficiary, ProxyTransaction, VillageManagerStats } from '../types';
import { API_BASE_URL } from '../config';
import {
    Users, Ticket, Package, UtensilsCrossed, Plus, Search,
    Clock, IndianRupee, CheckCircle, XCircle, Phone,
    MapPin, User as UserIcon, FileText, RefreshCw, ArrowRight
} from 'lucide-react';

interface VillageManagerViewProps {
    user: User;
}

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
});

export const VillageManagerView: React.FC<VillageManagerViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'beneficiaries' | 'book' | 'history'>('dashboard');
    const [stats, setStats] = useState<VillageManagerStats | null>(null);
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [transactions, setTransactions] = useState<ProxyTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, benefRes, txnRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/village-manager/stats`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/village-manager/beneficiaries`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/api/village-manager/transactions?limit=20`, { headers: getAuthHeaders() })
            ]);

            const statsData = await statsRes.json();
            const benefData = await benefRes.json();
            const txnData = await txnRes.json();

            if (statsData.success) setStats(statsData.stats);
            if (benefData.success) setBeneficiaries(benefData.beneficiaries);
            if (txnData.success) setTransactions(txnData.transactions);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter beneficiaries by search
    const filteredBeneficiaries = beneficiaries.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.village?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone?.includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="village-manager-view">
            {/* Header */}
            <div className="vm-header">
                <div className="vm-header-info">
                    <h1>ग्राम प्रबंधक</h1>
                    <p>Village Manager Dashboard</p>
                </div>
                <div className="vm-header-badge">
                    <Users className="w-5 h-5" />
                    <span>{stats?.activeBeneficiaries || 0} Villagers</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="vm-tabs">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: <FileText className="w-4 h-4" /> },
                    { id: 'beneficiaries', label: 'Villagers', icon: <Users className="w-4 h-4" /> },
                    { id: 'book', label: 'Book Service', icon: <Ticket className="w-4 h-4" /> },
                    { id: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`vm-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="vm-dashboard">
                    {/* Stats Grid */}
                    <div className="vm-stats-grid">
                        <div className="vm-stat-card">
                            <Users className="w-6 h-6 text-emerald-600" />
                            <div className="vm-stat-info">
                                <span className="vm-stat-value">{stats?.activeBeneficiaries || 0}</span>
                                <span className="vm-stat-label">Active Villagers</span>
                            </div>
                        </div>
                        <div className="vm-stat-card">
                            <Ticket className="w-6 h-6 text-blue-600" />
                            <div className="vm-stat-info">
                                <span className="vm-stat-value">{stats?.todaysTransactions || 0}</span>
                                <span className="vm-stat-label">Today's Bookings</span>
                            </div>
                        </div>
                        <div className="vm-stat-card">
                            <IndianRupee className="w-6 h-6 text-amber-600" />
                            <div className="vm-stat-info">
                                <span className="vm-stat-value">₹{stats?.totalRevenue || 0}</span>
                                <span className="vm-stat-label">Total Revenue</span>
                            </div>
                        </div>
                        <div className="vm-stat-card">
                            <Clock className="w-6 h-6 text-purple-600" />
                            <div className="vm-stat-info">
                                <span className="vm-stat-value">{stats?.totalTransactions || 0}</span>
                                <span className="vm-stat-label">All Transactions</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="vm-quick-actions">
                        <h3>Quick Actions</h3>
                        <div className="vm-action-grid">
                            <button className="vm-action-btn" onClick={() => { setShowAddForm(true); setActiveTab('beneficiaries'); }}>
                                <Plus className="w-6 h-6" />
                                <span>Add Villager</span>
                            </button>
                            <button className="vm-action-btn" onClick={() => setActiveTab('book')}>
                                <Ticket className="w-6 h-6" />
                                <span>Book Ticket</span>
                            </button>
                            <button className="vm-action-btn" onClick={() => setActiveTab('book')}>
                                <Package className="w-6 h-6" />
                                <span>Send Parcel</span>
                            </button>
                            <button className="vm-action-btn" onClick={() => setActiveTab('book')}>
                                <UtensilsCrossed className="w-6 h-6" />
                                <span>Book Food</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="vm-recent">
                        <h3>Recent Transactions</h3>
                        {transactions.slice(0, 5).map(txn => (
                            <div key={txn.id} className="vm-txn-item">
                                <div className="vm-txn-icon">
                                    {txn.transactionType === 'TICKET_BOOKING' && <Ticket className="w-5 h-5" />}
                                    {txn.transactionType === 'PARCEL_BOOKING' && <Package className="w-5 h-5" />}
                                    {txn.transactionType === 'MESS_BOOKING' && <UtensilsCrossed className="w-5 h-5" />}
                                </div>
                                <div className="vm-txn-info">
                                    <span className="vm-txn-name">{txn.beneficiaryName}</span>
                                    <span className="vm-txn-type">{txn.transactionType.replace('_', ' ')}</span>
                                </div>
                                <div className="vm-txn-amount">
                                    <span>₹{txn.amount}</span>
                                    <span className={`vm-txn-status ${txn.status.toLowerCase()}`}>{txn.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Beneficiaries Tab */}
            {activeTab === 'beneficiaries' && (
                <BeneficiariesTab
                    beneficiaries={filteredBeneficiaries}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showAddForm={showAddForm}
                    setShowAddForm={setShowAddForm}
                    onRefresh={fetchData}
                />
            )}

            {/* Booking Tab */}
            {activeTab === 'book' && (
                <BookingTab
                    beneficiaries={beneficiaries}
                    onRefresh={fetchData}
                />
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <HistoryTab transactions={transactions} />
            )}

            <style>{`
        .village-manager-view {
          padding-bottom: 80px;
        }

        .vm-header {
          background: linear-gradient(135deg, #059669, #10b981);
          border-radius: 16px;
          padding: 24px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .vm-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .vm-header p {
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .vm-header-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
        }

        .vm-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .vm-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .vm-tab.active {
          background: #059669;
          color: white;
        }

        .vm-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .vm-stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .vm-stat-info {
          display: flex;
          flex-direction: column;
        }

        .vm-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .vm-stat-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .vm-quick-actions {
          margin-bottom: 24px;
        }

        .vm-quick-actions h3,
        .vm-recent h3 {
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .vm-action-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .vm-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          color: #374151;
        }

        .vm-action-btn:hover {
          border-color: #059669;
          color: #059669;
        }

        .vm-txn-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 10px;
          margin-bottom: 8px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .vm-txn-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
        }

        .vm-txn-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .vm-txn-name {
          font-weight: 600;
          color: #111827;
        }

        .vm-txn-type {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: capitalize;
        }

        .vm-txn-amount {
          text-align: right;
          display: flex;
          flex-direction: column;
        }

        .vm-txn-amount span:first-child {
          font-weight: 600;
          color: #111827;
        }

        .vm-txn-status {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }

        .vm-txn-status.completed { background: #d1fae5; color: #059669; }
        .vm-txn-status.pending { background: #fef3c7; color: #d97706; }
        .vm-txn-status.cancelled { background: #fee2e2; color: #dc2626; }

        .dark .vm-stat-card,
        .dark .vm-action-btn,
        .dark .vm-txn-item {
          background: #1e293b;
        }

        .dark .vm-stat-value,
        .dark .vm-txn-name,
        .dark .vm-quick-actions h3,
        .dark .vm-recent h3 {
          color: #f1f5f9;
        }

        .dark .vm-tab {
          background: #334155;
          color: #94a3b8;
        }

        .dark .vm-action-btn {
          border-color: #475569;
          color: #cbd5e1;
        }
      `}</style>
        </div>
    );
};

// ==================== BENEFICIARIES TAB ====================
interface BeneficiariesTabProps {
    beneficiaries: Beneficiary[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    showAddForm: boolean;
    setShowAddForm: (v: boolean) => void;
    onRefresh: () => void;
}

const BeneficiariesTab: React.FC<BeneficiariesTabProps> = ({
    beneficiaries, searchQuery, setSearchQuery, showAddForm, setShowAddForm, onRefresh
}) => {
    const [formData, setFormData] = useState({
        name: '', phone: '', aadharNumber: '', address: '', village: '', panchayat: '', district: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.village) {
            alert('Name and Village are required');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/village-manager/beneficiaries`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setFormData({ name: '', phone: '', aadharNumber: '', address: '', village: '', panchayat: '', district: '' });
                setShowAddForm(false);
                onRefresh();
            } else {
                alert(data.error || 'Failed to add');
            }
        } catch (error) {
            alert('Error adding beneficiary');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="vm-beneficiaries">
            {/* Search & Add */}
            <div className="vm-search-bar">
                <div className="vm-search-input">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search villagers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="vm-add-btn" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <form className="vm-add-form" onSubmit={handleSubmit}>
                    <h4>Register New Villager</h4>
                    <input
                        type="text"
                        placeholder="Name *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <input
                        type="tel"
                        placeholder="Phone (optional)"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Aadhar Number (optional)"
                        value={formData.aadharNumber}
                        onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <div className="vm-form-row">
                        <input
                            type="text"
                            placeholder="Village *"
                            value={formData.village}
                            onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Panchayat"
                            value={formData.panchayat}
                            onChange={(e) => setFormData({ ...formData, panchayat: e.target.value })}
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="District"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                    <div className="vm-form-actions">
                        <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
                        <button type="submit" className="primary" disabled={submitting}>
                            {submitting ? 'Saving...' : 'Register Villager'}
                        </button>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="vm-list">
                {beneficiaries.length === 0 ? (
                    <div className="vm-empty">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p>No villagers registered yet</p>
                        <button onClick={() => setShowAddForm(true)}>Register First Villager</button>
                    </div>
                ) : (
                    beneficiaries.map(ben => (
                        <div key={ben.id} className="vm-beneficiary-card">
                            <div className="vm-ben-avatar">
                                <UserIcon className="w-6 h-6" />
                            </div>
                            <div className="vm-ben-info">
                                <span className="vm-ben-name">{ben.name}</span>
                                <span className="vm-ben-village">
                                    <MapPin className="w-3 h-3" /> {ben.village}
                                </span>
                                {ben.phone && (
                                    <span className="vm-ben-phone">
                                        <Phone className="w-3 h-3" /> {ben.phone}
                                    </span>
                                )}
                            </div>
                            <button className="vm-book-for-btn">
                                Book <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <style>{`
        .vm-search-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .vm-search-input {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border-radius: 10px;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
        }

        .vm-search-input input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
        }

        .vm-add-btn {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #059669;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .vm-add-form {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .vm-add-form h4 {
          font-weight: 600;
          margin-bottom: 16px;
          color: #111827;
        }

        .vm-add-form input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 1rem;
        }

        .vm-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .vm-form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .vm-form-actions button {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid #e5e7eb;
          background: white;
        }

        .vm-form-actions button.primary {
          background: #059669;
          color: white;
          border: none;
        }

        .vm-empty {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .vm-empty button {
          margin-top: 16px;
          padding: 10px 20px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .vm-beneficiary-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .vm-ben-avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
        }

        .vm-ben-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .vm-ben-name {
          font-weight: 600;
          color: #111827;
        }

        .vm-ben-village,
        .vm-ben-phone {
          font-size: 0.75rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .vm-book-for-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: #ecfdf5;
          color: #059669;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
        }

        .dark .vm-search-input,
        .dark .vm-add-form,
        .dark .vm-beneficiary-card {
          background: #1e293b;
          border-color: #334155;
        }

        .dark .vm-add-form h4,
        .dark .vm-ben-name {
          color: #f1f5f9;
        }
      `}</style>
        </div>
    );
};

// ==================== BOOKING TAB ====================
interface BookingTabProps {
    beneficiaries: Beneficiary[];
    onRefresh: () => void;
}

const BookingTab: React.FC<BookingTabProps> = ({ beneficiaries, onRefresh }) => {
    const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
    const [bookingType, setBookingType] = useState<'ticket' | 'parcel' | 'food'>('ticket');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [passengerCount, setPassengerCount] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleBookTicket = async () => {
        if (!selectedBeneficiary || !from || !to) {
            alert('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/village-manager/proxy/ticket`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    beneficiaryId: selectedBeneficiary,
                    from,
                    to,
                    passengerCount,
                    paymentMethod
                })
            });

            const data = await res.json();
            if (data.success) {
                setResult({ success: true, message: data.message || 'Ticket booked successfully!' });
                setFrom('');
                setTo('');
                setPassengerCount(1);
                onRefresh();
            } else {
                setResult({ success: false, message: data.error || 'Booking failed' });
            }
        } catch (error) {
            setResult({ success: false, message: 'Network error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="vm-booking">
            {/* Beneficiary Selection */}
            <div className="vm-booking-section">
                <label>Select Villager</label>
                <select
                    value={selectedBeneficiary}
                    onChange={(e) => setSelectedBeneficiary(e.target.value)}
                >
                    <option value="">-- Choose Villager --</option>
                    {beneficiaries.map(b => (
                        <option key={b.id} value={b.id}>{b.name} - {b.village}</option>
                    ))}
                </select>
            </div>

            {/* Service Type */}
            <div className="vm-booking-types">
                <button
                    className={bookingType === 'ticket' ? 'active' : ''}
                    onClick={() => setBookingType('ticket')}
                >
                    <Ticket className="w-5 h-5" />
                    <span>Ticket</span>
                </button>
                <button
                    className={bookingType === 'parcel' ? 'active' : ''}
                    onClick={() => setBookingType('parcel')}
                >
                    <Package className="w-5 h-5" />
                    <span>Parcel</span>
                </button>
                <button
                    className={bookingType === 'food' ? 'active' : ''}
                    onClick={() => setBookingType('food')}
                >
                    <UtensilsCrossed className="w-5 h-5" />
                    <span>Food</span>
                </button>
            </div>

            {/* Ticket Booking Form */}
            {bookingType === 'ticket' && (
                <div className="vm-ticket-form">
                    <div className="vm-booking-section">
                        <label>From</label>
                        <input
                            type="text"
                            placeholder="Enter origin village/city"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                        />
                    </div>
                    <div className="vm-booking-section">
                        <label>To</label>
                        <input
                            type="text"
                            placeholder="Enter destination"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div className="vm-booking-section">
                        <label>Passengers</label>
                        <div className="vm-counter">
                            <button onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}>-</button>
                            <span>{passengerCount}</span>
                            <button onClick={() => setPassengerCount(passengerCount + 1)}>+</button>
                        </div>
                    </div>
                    <div className="vm-booking-section">
                        <label>Payment Method</label>
                        <div className="vm-payment-options">
                            <button
                                className={paymentMethod === 'CASH' ? 'active' : ''}
                                onClick={() => setPaymentMethod('CASH')}
                            >
                                <IndianRupee className="w-4 h-4" /> Cash
                            </button>
                            <button
                                className={paymentMethod === 'UPI' ? 'active' : ''}
                                onClick={() => setPaymentMethod('UPI')}
                            >
                                <CheckCircle className="w-4 h-4" /> UPI
                            </button>
                        </div>
                    </div>

                    <button
                        className="vm-book-btn"
                        onClick={handleBookTicket}
                        disabled={submitting || !selectedBeneficiary}
                    >
                        {submitting ? 'Booking...' : 'Book Ticket'}
                    </button>
                </div>
            )}

            {/* Result Message */}
            {result && (
                <div className={`vm-result ${result.success ? 'success' : 'error'}`}>
                    {result.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span>{result.message}</span>
                </div>
            )}

            <style>{`
        .vm-booking-section {
          margin-bottom: 16px;
        }

        .vm-booking-section label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .vm-booking-section select,
        .vm-booking-section input {
          width: 100%;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          background: white;
        }

        .vm-booking-types {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .vm-booking-types button {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          color: #6b7280;
        }

        .vm-booking-types button.active {
          border-color: #059669;
          background: #ecfdf5;
          color: #059669;
        }

        .vm-counter {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 16px;
          width: fit-content;
        }

        .vm-counter button {
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 1.25rem;
          cursor: pointer;
        }

        .vm-counter span {
          font-size: 1.25rem;
          font-weight: 600;
          min-width: 30px;
          text-align: center;
        }

        .vm-payment-options {
          display: flex;
          gap: 12px;
        }

        .vm-payment-options button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          cursor: pointer;
        }

        .vm-payment-options button.active {
          border-color: #059669;
          background: #ecfdf5;
          color: #059669;
        }

        .vm-book-btn {
          width: 100%;
          padding: 16px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 16px;
        }

        .vm-book-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .vm-result {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 10px;
          margin-top: 16px;
        }

        .vm-result.success {
          background: #d1fae5;
          color: #059669;
        }

        .vm-result.error {
          background: #fee2e2;
          color: #dc2626;
        }

        .dark .vm-booking-section label { color: #e2e8f0; }
        .dark .vm-booking-section select,
        .dark .vm-booking-section input,
        .dark .vm-counter,
        .dark .vm-payment-options button,
        .dark .vm-booking-types button {
          background: #1e293b;
          border-color: #475569;
          color: #e2e8f0;
        }
      `}</style>
        </div>
    );
};

// ==================== HISTORY TAB ====================
interface HistoryTabProps {
    transactions: ProxyTransaction[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ transactions }) => {
    const formatDate = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'TICKET_BOOKING': return <Ticket className="w-5 h-5" />;
            case 'PARCEL_BOOKING': return <Package className="w-5 h-5" />;
            case 'MESS_BOOKING': return <UtensilsCrossed className="w-5 h-5" />;
            default: return <FileText className="w-5 h-5" />;
        }
    };

    return (
        <div className="vm-history">
            {transactions.length === 0 ? (
                <div className="vm-empty">
                    <Clock className="w-12 h-12 text-gray-300" />
                    <p>No transactions yet</p>
                </div>
            ) : (
                transactions.map(txn => (
                    <div key={txn.id} className="vm-history-item">
                        <div className="vm-history-icon">{getIcon(txn.transactionType)}</div>
                        <div className="vm-history-info">
                            <span className="vm-history-name">{txn.beneficiaryName}</span>
                            <span className="vm-history-type">
                                {txn.transactionType.replace(/_/g, ' ')} • {formatDate(txn.timestamp)}
                            </span>
                        </div>
                        <div className="vm-history-right">
                            <span className="vm-history-amount">₹{txn.amount}</span>
                            <span className={`vm-history-status ${txn.status.toLowerCase()}`}>{txn.status}</span>
                        </div>
                    </div>
                ))
            )}

            <style>{`
        .vm-history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 14px;
          border-radius: 12px;
          margin-bottom: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        .vm-history-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #f0fdf4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
        }

        .vm-history-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .vm-history-name {
          font-weight: 600;
          color: #111827;
        }

        .vm-history-type {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: capitalize;
        }

        .vm-history-right {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .vm-history-amount {
          font-weight: 600;
          color: #111827;
        }

        .vm-history-status {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }

        .vm-history-status.completed { background: #d1fae5; color: #059669; }
        .vm-history-status.pending { background: #fef3c7; color: #d97706; }
        .vm-history-status.cancelled { background: #fee2e2; color: #dc2626; }

        .dark .vm-history-item {
          background: #1e293b;
        }

        .dark .vm-history-name,
        .dark .vm-history-amount {
          color: #f1f5f9;
        }
      `}</style>
        </div>
    );
};

export default VillageManagerView;
