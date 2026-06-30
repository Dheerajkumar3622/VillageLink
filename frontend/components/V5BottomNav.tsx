/**
 * V5BottomNav - Premium Bottom Navigation Component
 * Features glassmorphic design and integrated quick actions
 */

import React from 'react';
import { Home, Bus, Sprout, Utensils, Film, Camera, User } from 'lucide-react';

export type TabType = 'home' | 'rides' | 'haat' | 'food' | 'reels' | 'scan' | 'profile';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
    <button 
        className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[75px] h-full transition-all duration-300 relative group`} 
        onClick={onClick}
    >
        <div className={`w-14 h-11 rounded-xl flex items-center justify-center transition-all duration-500 z-10 ${active ? 'nav-active-pill text-[#BE5103]' : 'text-white/60'}`}>
            <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                {icon}
            </div>
        </div>
        <span className={`text-[9px] font-[900] mt-1.5 uppercase tracking-wider transition-all duration-300 z-10 ${active ? 'text-white opacity-100' : 'text-white/50'}`}>
            {label}
        </span>
    </button>
);

interface V5BottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    progress?: number;
    isSwiping?: boolean;
}

export const V5BottomNav: React.FC<V5BottomNavProps> = ({
    activeTab,
    onTabChange,
    progress,
    isSwiping = false
}) => {
    return (
        <nav className="v5-bottom-nav fixed bottom-0 left-0 right-0 px-4 py-2 pb-6 h-22 flex items-center justify-center z-[100]">
            <div className="flex items-center justify-around w-full max-w-lg relative px-4">
                <NavItem
                    icon={<Bus size={22} />}
                    label="Rides"
                    active={activeTab === 'rides'}
                    onClick={() => onTabChange('rides')}
                />
                <NavItem
                    icon={<Sprout size={22} />}
                    label="Mandi"
                    active={activeTab === 'haat'}
                    onClick={() => onTabChange('haat')}
                />
                <NavItem
                    icon={<Utensils size={22} />}
                    label="Food"
                    active={activeTab === 'food'}
                    onClick={() => onTabChange('food')}
                />
                {/* Temporarily hidden 
                <NavItem
                    icon={<Film size={22} />}
                    label="Reels"
                    active={activeTab === 'reels'}
                    onClick={() => onTabChange('reels')}
                />
                <NavItem
                    icon={<Camera size={22} />}
                    label="Pay"
                    active={activeTab === 'scan'}
                    onClick={() => onTabChange('scan')}
                />
                */}
            </div>
        </nav>
    );
};

export default V5BottomNav;
