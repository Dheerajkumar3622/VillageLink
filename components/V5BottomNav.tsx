/**
 * V5BottomNav - Premium Bottom Navigation Component
 * Features glassmorphic design with floating center action button
 */

import React from 'react';
import { Home, Film, ShoppingBag, User, Camera } from 'lucide-react';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, badge }) => (
    <button className={`v5-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
        <div className="relative">
            <span className={`text-xl ${active ? 'opacity-100' : 'opacity-50'}`}>{icon}</span>
            {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent-hot)] rounded-full text-[8px] font-bold flex items-center justify-center text-white">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </div>
        <span className={`text-[10px] font-semibold ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
            {label}
        </span>
    </button>
);

export type TabType = 'home' | 'reels' | 'haat' | 'chat' | 'profile';

interface V5BottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    onCenterAction?: () => void;
    notificationBadge?: number;  // Badge count for notifications on Profile tab
}

export const V5BottomNav: React.FC<V5BottomNavProps> = ({
    activeTab,
    onTabChange,
    onCenterAction,
    notificationBadge = 0
}) => {
    return (
        <nav className="v5-bottom-nav">
            <NavItem
                icon={<Home size={22} />}
                label="Home"
                active={activeTab === 'home'}
                onClick={() => onTabChange('home')}
            />
            <NavItem
                icon={<Film size={22} />}
                label="Reels"
                active={activeTab === 'reels'}
                onClick={() => onTabChange('reels')}
            />

            {/* Center Floating Action */}
            <button
                className="v5-nav-center"
                onClick={onCenterAction}
                aria-label="Quick Action"
            >
                <Camera size={24} />
            </button>

            <NavItem
                icon={<ShoppingBag size={22} />}
                label="Mandi"
                active={activeTab === 'haat'}
                onClick={() => onTabChange('haat')}
            />
            <NavItem
                icon={<User size={22} />}
                label="Profile"
                active={activeTab === 'profile'}
                onClick={() => onTabChange('profile')}
                badge={notificationBadge}
            />
        </nav>
    );
};

export default V5BottomNav;
