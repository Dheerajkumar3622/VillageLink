/**
 * ProfilePill - V5 User Profile Header Component
 * Displays user avatar, name, and wallet balance in a pill-shaped container
 */

import React from 'react';

interface ProfilePillProps {
    name: string;
    balance?: number | string;
    avatarUrl?: string;
    onClick?: () => void;
}

export const ProfilePill: React.FC<ProfilePillProps> = ({
    name,
    balance,
    avatarUrl,
    onClick
}) => {
    const initial = name?.charAt(0)?.toUpperCase() || 'U';
    const displayBalance = typeof balance === 'number' ? `₹${balance.toLocaleString()}` : balance || '₹0';
    const firstName = name?.split(' ')[0] || 'User';

    return (
        <div
            className="v5-profile-pill"
            onClick={onClick}
            role="button"
            tabIndex={0}
        >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-tertiary)] to-[var(--accent-hot)] flex items-center justify-center text-xs font-bold text-white">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full rounded-full object-cover" />
                ) : (
                    initial
                )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {firstName}
                </span>
                {balance !== undefined && (
                    <span className="text-[10px] font-semibold text-[var(--accent-primary)] font-mono">
                        {displayBalance}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ProfilePill;
